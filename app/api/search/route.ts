import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type SemanticPaper = {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  year?: number | null;
  authors?: { name?: string }[];
  url?: string | null;
  fieldsOfStudy?: string[] | null;
};

type OpenAlexWork = {
  id?: string;
  title?: string | null;
  publication_year?: number | null;
  authorships?: { author?: { display_name?: string } }[];
  abstract_inverted_index?: Record<string, number[]> | null;
  doi?: string | null;
  primary_location?: { landing_page_url?: string | null } | null;
  topics?: { field?: { display_name?: string } }[];
};

type RankedPaper = {
  id: string;
  score: number;
  explanation: string;
};

const PAPER_FIELDS = "title,abstract,year,authors,url,fieldsOfStudy";

function searchTerms(question: string) {
  const stopWords = new Set(["a", "an", "and", "are", "do", "does", "for", "how", "in", "is", "of", "on", "the", "to", "what", "when", "with"]);
  const terms: string[] = question.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [];
  return terms.filter((term) => term.length > 2 && !stopWords.has(term)).slice(0, 12).join(" ");
}

// Fetch with a few retries when the server says "too many requests" (429).
async function fetchWithRetry(url: URL, init: RequestInit): Promise<Response> {
  let response = await fetch(url, init);
  for (const waitMs of [800, 1600]) {
    if (response.status !== 429) break;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    response = await fetch(url, init);
  }
  return response;
}

async function semanticScholarSearch(query: string): Promise<SemanticPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "20");
  url.searchParams.set("fields", PAPER_FIELDS);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const response = await fetchWithRetry(url, { headers, cache: "no-store" });
  if (response.status === 429) throw new Error("Semantic Scholar is rate limiting requests.");
  if (!response.ok) throw new Error("Semantic Scholar could not retrieve papers right now.");

  const data = (await response.json()) as { data?: SemanticPaper[] };
  return Array.isArray(data.data) ? data.data.filter((paper) => paper.paperId && paper.title) : [];
}

// OpenAlex stores abstracts as {word: [positions]}; rebuild them into normal text.
function rebuildAbstract(index?: Record<string, number[]> | null): string | null {
  if (!index) return null;
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words[position] = word;
  }
  const text = words.filter(Boolean).join(" ").trim();
  return text ? text.slice(0, 1500) : null;
}

async function openAlexSearch(query: string): Promise<SemanticPaper[]> {
  const apiKey = process.env.OPENALEX_API_KEY;
  if (!apiKey) throw new Error("OpenAlex key is not set.");

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("filter", "has_abstract:true");
  url.searchParams.set("per_page", "20");
  url.searchParams.set("select", "id,title,publication_year,authorships,abstract_inverted_index,doi,primary_location,topics");
  url.searchParams.set("api_key", apiKey);

  const response = await fetchWithRetry(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 429) throw new Error("OpenAlex is rate limiting requests.");
  if (!response.ok) throw new Error("OpenAlex could not retrieve papers right now.");

  const data = (await response.json()) as { results?: OpenAlexWork[] };
  const works = Array.isArray(data.results) ? data.results : [];
  return works
    .filter((work) => work.id && work.title)
    .map((work) => {
      const fields = (work.topics ?? [])
        .map((topic) => topic.field?.display_name)
        .filter((name): name is string => Boolean(name));
      return {
        paperId: work.id,
        title: work.title ?? undefined,
        abstract: rebuildAbstract(work.abstract_inverted_index),
        year: work.publication_year ?? null,
        authors: (work.authorships ?? []).map((a) => ({ name: a.author?.display_name })),
        url: work.doi ?? work.primary_location?.landing_page_url ?? work.id ?? null,
        fieldsOfStudy: Array.from(new Set(fields)),
      };
    });
}

// Try OpenAlex first (if a key is set), then Semantic Scholar as a backup.
async function findCandidates(query: string): Promise<SemanticPaper[]> {
  const errors: string[] = [];
  let anySourceWorked = false;

  if (process.env.OPENALEX_API_KEY) {
    try {
      const results = await openAlexSearch(query);
      anySourceWorked = true;
      if (results.length) return results;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "OpenAlex failed.");
    }
  }

  try {
    const results = await semanticScholarSearch(query);
    anySourceWorked = true;
    if (results.length) return results;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Semantic Scholar failed.");
  }

  if (anySourceWorked) return [];
  throw new Error(`Could not retrieve papers right now. ${errors.join(" ")} Please try again in a moment.`);
}

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Gemini returned an invalid relevance response.");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

async function rankPapers(question: string, candidates: SemanticPaper[]): Promise<RankedPaper[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The server is missing GEMINI_API_KEY. Add it and try again.");

  const candidateText = candidates.map((paper, index) => ({
    id: paper.paperId,
    index: index + 1,
    title: paper.title,
    abstract: paper.abstract ?? "No abstract available.",
  }));
  const prompt = `You rank research papers for a user's actual research question. Score relevance from 0 to 10 based strictly on how well each candidate answers the question, not merely keyword overlap. Return a JSON array only. Each item must be {"id": string, "score": number, "explanation": string}. Include every candidate exactly once. Scores must be integers. For score 6 or higher, explanation must be one concise sentence explaining why it matches. For scores below 6, use an empty explanation.\n\nQuestion: ${question}\n\nCandidates:\n${JSON.stringify(candidateText)}`;
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  });
  // Try the main model first; if Google is overloaded (503) or limiting us (429), retry and then try backup models.
  const models = Array.from(new Set([process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]));
  let response: Response | null = null;
  let lastStatus = 0;
  let lastDetail = "";
  outer: for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const attemptResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: requestBody,
        cache: "no-store",
      });
      if (attemptResponse.ok) {
        response = attemptResponse;
        break outer;
      }
      lastStatus = attemptResponse.status;
      try {
        const errorBody = (await attemptResponse.json()) as { error?: { message?: string } };
        lastDetail = errorBody.error?.message ?? "";
      } catch {
        lastDetail = "";
      }
      // Only retry when the problem is temporary (busy or rate limited). Otherwise move on to the next model.
      if (lastStatus !== 503 && lastStatus !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  if (!response) {
    throw new Error(`Gemini could not evaluate paper relevance (status ${lastStatus}). ${lastDetail}`.trim());
  }
  const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  const parsed = extractJson(text);
  if (!Array.isArray(parsed)) throw new Error("Gemini returned an invalid relevance response.");

  const validIds = new Set(candidates.map((paper) => paper.paperId));
  return parsed.flatMap((item): RankedPaper[] => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id : "";
    const score = typeof record.score === "number" ? Math.max(0, Math.min(10, Math.round(record.score))) : -1;
    if (!validIds.has(id) || score < 0) return [];
    return [{ id, score, explanation: score >= 6 && typeof record.explanation === "string" ? record.explanation.trim() : "" }];
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as { question?: unknown };
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) return NextResponse.json({ error: "A research question is required." }, { status: 400 });
    if (question.length > 1000) return NextResponse.json({ error: "Keep your research question under 1,000 characters." }, { status: 400 });

    const candidates = await findCandidates(searchTerms(question) || question);
    if (!candidates.length) return NextResponse.json({ papers: [] });
    const rankings = await rankPapers(question, candidates);
    const rankById = new Map(rankings.map((ranking) => [ranking.id, ranking]));
    const papers = candidates.map((paper) => {
      const ranking = rankById.get(paper.paperId!);
      return {
        paperId: paper.paperId!, title: paper.title!, year: paper.year ?? null, url: paper.url ?? null,
        authors: (paper.authors ?? []).map((author) => author.name).filter((name): name is string => Boolean(name)),
        fieldsOfStudy: paper.fieldsOfStudy ?? [], score: ranking?.score ?? 0, explanation: ranking?.explanation ?? "",
      };
    }).filter((paper) => paper.score >= 6).sort((a, b) => b.score - a.score);
    return NextResponse.json({ papers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search for papers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

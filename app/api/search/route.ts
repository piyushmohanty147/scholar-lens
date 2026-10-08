import { NextResponse } from "next/server";
import { callGemini } from "../../../lib/gemini";
import { allow } from "../../../lib/rateLimit";

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
  source?: string;
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

async function semanticScholarSearch(query: string, finance = false): Promise<SemanticPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "20");
  url.searchParams.set("fields", PAPER_FIELDS);
  if (finance) url.searchParams.set("fieldsOfStudy", "Economics,Business");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const response = await fetchWithRetry(url, { headers, cache: "no-store" });
  if (response.status === 429) throw new Error("Semantic Scholar is rate limiting requests.");
  if (!response.ok) throw new Error("Semantic Scholar could not retrieve papers right now.");

  const data = (await response.json()) as { data?: SemanticPaper[] };
  return Array.isArray(data.data) ? data.data.filter((paper) => paper.paperId && paper.title).map((paper) => ({ ...paper, source: "Semantic Scholar" })) : [];
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

async function openAlexSearch(query: string, finance = false): Promise<SemanticPaper[]> {
  const apiKey = process.env.OPENALEX_API_KEY;
  if (!apiKey) throw new Error("OpenAlex key is not set.");

  const url = new URL("https://api.openalex.org/works");
  url.searchParams.set("search", query);
  url.searchParams.set("filter", finance ? "has_abstract:true,primary_topic.field.id:20|14" : "has_abstract:true");
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
        source: "OpenAlex",
      };
    });
}

// Best-effort RePEc/IDEAS search. IDEAS has no official search API, so this reads the public search page.
// Any problem (blocked, changed layout, timeout) returns an empty list and is ignored silently.
async function repecSearch(query: string): Promise<SemanticPaper[]> {
  try {
    const url = new URL("https://ideas.repec.org/cgi-bin/htsearch");
    url.searchParams.set("q", query);
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(6000), headers: { Accept: "text/html" } });
    if (!response.ok) return [];
    const html = await response.text();
    const results: SemanticPaper[] = [];
    const pattern = /<a href="(\/[pah]\/[^"#?]+\.html)"[^>]*>([^<]{10,300})<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(html)) && results.length < 8) {
      const link = `https://ideas.repec.org${match[1]}`;
      if (results.some((r) => r.url === link)) continue;
      results.push({ paperId: link, title: match[2].replace(/\s+/g, " ").trim(), abstract: null, year: null, authors: [], url: link, fieldsOfStudy: ["Economics"], source: "RePEc" });
    }
    return results;
  } catch {
    return [];
  }
}

function mergeUnique(lists: SemanticPaper[][]): SemanticPaper[] {
  const seen = new Set<string>();
  const merged: SemanticPaper[] = [];
  const longest = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < longest; i++) {
    for (const list of lists) {
      const paper = list[i];
      if (!paper?.title) continue;
      const key = paper.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(paper);
    }
  }
  return merged;
}

// Ask Gemini for 2 extra search phrasings, so one badly worded question does not hide good papers.
async function planQueries(question: string, fallback: string): Promise<string[]> {
  try {
    const text = await callGemini(`Write 2 short academic search queries (3 to 6 words each) that would find papers answering this question. Use different wording in each. Return JSON only: {"queries": ["...","..."]}\n\nQuestion: ${question}`, "plan the search");
    const parsed = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { queries?: unknown };
    const extra = (Array.isArray(parsed.queries) ? parsed.queries : []).filter((q): q is string => typeof q === "string" && q.trim().length > 2).slice(0, 2);
    return [fallback, ...extra];
  } catch {
    return [fallback];
  }
}

// Ask every source at once and mix the results. A failing source never breaks the search.
async function findCandidates(question: string, query: string, finance: boolean): Promise<SemanticPaper[]> {
  const queries = await planQueries(question, query);
  const jobs: Promise<SemanticPaper[]>[] = [];
  if (process.env.OPENALEX_API_KEY) for (const q of queries) jobs.push(openAlexSearch(q, finance));
  jobs.push(semanticScholarSearch(queries[0], finance));
  if (finance) jobs.push(repecSearch(queries[0]));
  const settled = await Promise.allSettled(jobs);
  if (settled.every((r) => r.status === "rejected")) {
    throw new Error("Could not retrieve papers right now. Please try again in a moment.");
  }
  return mergeUnique(settled.map((r) => (r.status === "fulfilled" ? r.value : [])));
}

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("Gemini returned an invalid relevance response.");
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
}

async function rankPapers(question: string, candidates: SemanticPaper[], finance = false): Promise<RankedPaper[]> {
  const candidateText = candidates.map((paper, index) => ({
    id: paper.paperId,
    index: index + 1,
    title: paper.title,
    abstract: (paper.abstract ?? "No abstract available.").slice(0, 600),
  }));
  const prompt = `You rank research papers for a user's actual research question. Score relevance from 0 to 10 based strictly on how well each candidate answers the question, not merely keyword overlap. Return a JSON array only. Each item must be {"id": string, "score": number, "explanation": string}. Include every candidate exactly once. Scores must be integers. For score 6 or higher, explanation must be one concise sentence explaining why it matches. For scores below 6, use an empty explanation.${finance ? " This is a finance and economics search. Treat terms like alpha, beta, herding, ESG, yield curve and market efficiency as finance terms, not general-science terms, and prefer empirical finance and economics papers (data-based studies) over purely theoretical or unrelated ones." : ""}\n\nQuestion: ${question}\n\nCandidates:\n${JSON.stringify(candidateText)}`;
  const text = await callGemini(prompt, "evaluate paper relevance");
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
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!allow(ip, 30)) {
      return NextResponse.json({ error: "You've reached the free limit. Please try again later." }, { status: 429 });
    }
    const body = await request.json() as { question?: unknown; field?: unknown };
    const finance = body.field === "finance";
    const question = typeof body.question === "string" ? body.question.trim() : "";
    if (!question) return NextResponse.json({ error: "A research question is required." }, { status: 400 });
    if (question.length > 1000) return NextResponse.json({ error: "Keep your research question under 1,000 characters." }, { status: 400 });

    const query = searchTerms(question) || question;
    const candidates = (await findCandidates(question, query, finance)).slice(0, 30);
    if (!candidates.length) return NextResponse.json({ papers: [] });

    // If ranking fails, still show the results instead of an error.
    let rankings: RankedPaper[] = [];
    try { rankings = await rankPapers(question, candidates, finance); } catch { rankings = []; }
    const rankById = new Map(rankings.map((ranking) => [ranking.id, ranking]));
    const ranked = rankings.length > 0;

    const papers = candidates.map((paper) => {
      const ranking = rankById.get(paper.paperId!);
      return {
        paperId: paper.paperId!, title: paper.title!, year: paper.year ?? null, url: paper.url ?? null,
        authors: (paper.authors ?? []).map((author) => author.name).filter((name): name is string => Boolean(name)),
        fieldsOfStudy: paper.fieldsOfStudy ?? [], source: paper.source ?? "", abstract: (paper.abstract ?? "").slice(0, 2000),
        score: ranking?.score ?? (ranked ? 0 : 6), explanation: ranking?.explanation ?? "",
      };
    }).filter((paper) => paper.score >= 6).sort((a, b) => b.score - a.score).slice(0, 15);
    return NextResponse.json({ papers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to search for papers.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

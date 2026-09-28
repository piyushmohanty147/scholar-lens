import { NextResponse } from "next/server";

export const runtime = "nodejs";

type SemanticPaper = {
  paperId?: string;
  title?: string;
  abstract?: string | null;
  year?: number | null;
  authors?: { name?: string }[];
  url?: string | null;
  fieldsOfStudy?: string[] | null;
};

type RankedPaper = {
  id: string;
  score: number;
  explanation: string;
};

const PAPER_FIELDS = "title,abstract,year,authors,url,fieldsOfStudy";

function searchTerms(question: string) {
  const stopWords = new Set(["a", "an", "and", "are", "do", "does", "for", "how", "in", "is", "of", "on", "the", "to", "what", "when", "with"]);
  const terms = question.toLowerCase().match(/[a-z0-9][a-z0-9-]*/g) ?? [];
  return terms.filter((term) => term.length > 2 && !stopWords.has(term)).slice(0, 12).join(" ");
}

async function semanticScholarSearch(query: string): Promise<SemanticPaper[]> {
  const url = new URL("https://api.semanticscholar.org/graph/v1/paper/search");
  url.searchParams.set("query", query);
  url.searchParams.set("limit", "20");
  url.searchParams.set("fields", PAPER_FIELDS);

  let response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  if (response.status === 429) {
    await new Promise((resolve) => setTimeout(resolve, 800));
    response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  }
  if (response.status === 429) throw new Error("Semantic Scholar is rate limiting requests. Please try again in a moment.");
  if (!response.ok) throw new Error("Semantic Scholar could not retrieve papers right now.");

  const data = (await response.json()) as { data?: SemanticPaper[] };
  return Array.isArray(data.data) ? data.data.filter((paper) => paper.paperId && paper.title) : [];
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
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Gemini could not evaluate paper relevance right now.");
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

    const candidates = await semanticScholarSearch(searchTerms(question) || question);
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

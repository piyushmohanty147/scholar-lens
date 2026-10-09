import { NextResponse } from "next/server";
import { callGemini } from "../../../lib/gemini";
import { allow } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Rec = Record<string, unknown>;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const get = (o: unknown, k: string): unknown => (o && typeof o === "object" ? (o as Rec)[k] : undefined);
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown) => (typeof x === "string" ? x : "");
const num = (x: unknown) => (typeof x === "number" ? x : 0);

async function oa(path: string, params: Record<string, string> = {}): Promise<Rec | null> {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) return null;
  try {
    const url = new URL(`https://api.openalex.org/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("api_key", key);
    const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as Rec;
  } catch {
    return null;
  }
}

async function resolveWork(paperId: string, title: string): Promise<Rec | null> {
  const m = paperId.match(/openalex\.org\/(W\d+)/i);
  if (m) return oa(`works/${m[1]}`);
  const data = await oa("works", { search: title, per_page: "3" });
  const hit = arr(data?.results).find((w) => norm(str(get(w, "title"))) === norm(title));
  return (hit as Rec | undefined) ?? null;
}

function shortWorks(data: Rec | null) {
  return arr(data?.results).map((w) => ({
    title: str(get(w, "title")) || "Untitled",
    year: num(get(w, "publication_year")) || null,
    citations: num(get(w, "cited_by_count")),
    url: str(get(w, "doi")) || str(get(w, "id")) || null,
  }));
}

function parseObject(text: string): Rec {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini returned an invalid analysis.");
  return JSON.parse(text.slice(start, end + 1)) as Rec;
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!allow(ip, 40)) {
      return NextResponse.json({ error: "You have reached the free limit. Please try again later." }, { status: 429 });
    }
    const body = (await request.json()) as { paperId?: unknown; title?: unknown; abstract?: unknown; question?: unknown };
    const paperId = str(body.paperId);
    const title = str(body.title).trim();
    const abstract = str(body.abstract).slice(0, 3000);
    const question = str(body.question).slice(0, 1000);
    if (!title) return NextResponse.json({ error: "A paper title is required." }, { status: 400 });

    const work = await resolveWork(paperId, title);
    const workId = str(get(work, "id")).match(/W\d+/)?.[0];

    // Related papers and the most influential papers that cite this one.
    const relatedIds = arr(get(work, "related_works")).map((u) => str(u).match(/W\d+/)?.[0]).filter((x): x is string => Boolean(x)).slice(0, 5);
    const [relatedData, citedByData] = await Promise.all([
      relatedIds.length ? oa("works", { filter: `openalex:${relatedIds.join("|")}`, select: "id,title,publication_year,doi,cited_by_count" }) : Promise.resolve(null),
      workId ? oa("works", { filter: `cites:${workId}`, sort: "cited_by_count:desc", per_page: "5", select: "id,title,publication_year,doi,cited_by_count" }) : Promise.resolve(null),
    ]);

    const meta = {
      citations: num(get(work, "cited_by_count")),
      references: num(get(work, "referenced_works_count")),
      year: num(get(work, "publication_year")) || null,
      type: str(get(work, "type")),
      venue: str(get(get(get(work, "primary_location"), "source"), "display_name")),
      openAccess: {
        isOa: Boolean(get(get(work, "open_access"), "is_oa")),
        pdfUrl: str(get(get(work, "best_oa_location"), "pdf_url")) || null,
        url: str(get(get(work, "open_access"), "oa_url")) || null,
      },
      topics: arr(get(work, "topics")).map((t) => str(get(t, "display_name"))).filter(Boolean).slice(0, 5),
      keywords: arr(get(work, "keywords")).map((t) => str(get(t, "display_name"))).filter(Boolean).slice(0, 8),
      authors: arr(get(work, "authorships")).slice(0, 8).map((a) => ({
        name: str(get(get(a, "author"), "display_name")),
        institution: str(get(arr(get(a, "institutions"))[0], "display_name")),
      })).filter((a) => a.name),
      citationsByYear: arr(get(work, "counts_by_year")).map((c) => ({ year: num(get(c, "year")), count: num(get(c, "cited_by_count")) })).sort((a, b) => a.year - b.year),
      related: shortWorks(relatedData),
      citedBy: shortWorks(citedByData),
    };

    const prompt = `You are a careful research analyst explaining a paper to someone who needs to deeply understand it without reading it. Use ONLY the title, abstract and metadata below. Never invent numbers, sample sizes or results. If something is not in the abstract, write "Not stated in the abstract". Mark anything you infer with "(inferred)".\n\n${question ? `The reader's question: ${question}\n\n` : ""}Title: ${title}\nAbstract: ${abstract || "Not available."}\nMetadata: ${JSON.stringify({ year: meta.year, type: meta.type, venue: meta.venue, citations: meta.citations, topics: meta.topics, keywords: meta.keywords })}\n\nReturn JSON with exactly this shape:\n{"plainSummary": string (5-7 sentences, plain language), "background": string, "researchQuestion": string, "studyDesign": {"type": string, "sample": string, "methods": string}, "keyFindings": [string], "numbers": [string] (exact figures that appear in the abstract; empty if none), "whyItMatters": string, "howItAnswersYourQuestion": string, "strengths": [string], "limitations": [string], "whoShouldRead": string, "concepts": [{"term": string, "meaning": string}], "questionsToAsk": [string], "reliability": {"level": "high"|"medium"|"low"|"unclear", "reason": string}}\nGive 4-8 keyFindings, 2-4 strengths, 3-5 limitations, 3-6 concepts and 3-5 questionsToAsk.`;
    const analysis = parseObject(await callGemini(prompt, "analyse the paper"));

    return NextResponse.json({ analysis, meta });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to analyse this paper.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

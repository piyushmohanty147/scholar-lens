import { NextResponse } from "next/server";
import { callGemini } from "../../../lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

type Evidence = { id: string; title: string; year: number | null; url: string | null; abstract: string };
type Trend = { query: string; counts: { year: number; count: number }[] };

const FIRST_YEAR = 2018;
const LAST_YEAR = new Date().getFullYear() - 1; // last full year

function parseObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini returned an invalid report.");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

async function openAlex(params: Record<string, string>): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.openalex.org/works");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("api_key", key);
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function rebuildAbstract(index: unknown): string {
  if (!index || typeof index !== "object") return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index as Record<string, number[]>)) {
    for (const p of positions) words[p] = word;
  }
  return words.filter(Boolean).join(" ").slice(0, 450);
}

async function getTrend(query: string): Promise<Trend> {
  const data = await openAlex({
    search: query,
    group_by: "publication_year",
    filter: `from_publication_date:${FIRST_YEAR}-01-01,to_publication_date:${LAST_YEAR}-12-31`,
  });
  const groups = (data?.group_by as { key?: string; count?: number }[] | undefined) ?? [];
  const counts = groups
    .map((g) => ({ year: Number(g.key), count: Number(g.count) }))
    .filter((g) => g.year >= FIRST_YEAR && g.year <= LAST_YEAR && Number.isFinite(g.count))
    .sort((a, b) => a.year - b.year);
  return { query, counts };
}

async function getPapers(query: string, startId: number): Promise<Evidence[]> {
  const data = await openAlex({
    search: query,
    filter: `has_abstract:true,from_publication_date:${LAST_YEAR - 3}-01-01`,
    per_page: "5",
    select: "id,title,publication_year,abstract_inverted_index,doi",
  });
  const results = (data?.results as Record<string, unknown>[] | undefined) ?? [];
  return results
    .filter((w) => typeof w.title === "string")
    .map((w, i) => ({
      id: `S${startId + i}`,
      title: String(w.title),
      year: typeof w.publication_year === "number" ? w.publication_year : null,
      url: typeof w.doi === "string" ? w.doi : typeof w.id === "string" ? w.id : null,
      abstract: rebuildAbstract(w.abstract_inverted_index),
    }));
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENALEX_API_KEY) {
      return NextResponse.json({ error: "The server is missing OPENALEX_API_KEY." }, { status: 500 });
    }
    const body = (await request.json()) as { project?: unknown; horizon?: unknown };
    const project = typeof body.project === "string" ? body.project.trim() : "";
    const horizon = ["1", "3", "5"].includes(String(body.horizon)) ? String(body.horizon) : "3";
    if (project.length < 20) return NextResponse.json({ error: "Describe your project in at least a sentence or two." }, { status: 400 });
    if (project.length > 1500) return NextResponse.json({ error: "Keep the description under 1,500 characters." }, { status: 400 });

    // Step 1: turn the project into 3 short research search queries.
    let queries: string[] = [];
    try {
      const q = parseObject(await callGemini(`Turn this project description into exactly 3 short academic search queries (3 to 6 words each) that cover: (1) the core topic, (2) the main risks or challenges, (3) the main opportunities or emerging approaches. Return JSON: {"queries": ["...","...","..."]}.\n\nProject: ${project}`, "plan the research"));
      queries = (Array.isArray(q.queries) ? q.queries : []).filter((x): x is string => typeof x === "string").slice(0, 3);
    } catch {
      queries = [];
    }
    if (!queries.length) queries = [project.split(/\s+/).slice(0, 8).join(" ")];

    // Step 2: gather evidence from OpenAlex (trend counts and recent papers).
    const trends = await Promise.all(queries.map(getTrend));
    const paperLists: Evidence[][] = [];
    let nextId = 1;
    for (const query of queries) {
      const list = await getPapers(query, nextId);
      nextId += list.length;
      paperLists.push(list);
    }
    const evidence = paperLists.flat();
    if (!evidence.length) {
      return NextResponse.json({ error: "Could not find enough evidence for this project. Try describing it with more specific terms." }, { status: 404 });
    }

    // Step 3: ask Gemini to write the outlook using ONLY this evidence.
    const prompt = `You are a careful research foresight analyst. Write an outlook for the project below, covering the next ${horizon} year(s). Use ONLY the evidence provided: yearly publication counts (research activity, NOT market outcomes) and recent paper abstracts. Do not invent statistics, companies or facts. When you infer something beyond the evidence, say so in the wording. Cite supporting papers by their ids (like "S1"). Be honest about uncertainty.\n\nReturn JSON with exactly this shape:\n{"summary": string (2-3 sentences), "trends": [{"name": string, "direction": "rising"|"flat"|"falling"|"unclear", "evidence": string}], "opportunities": [{"point": string, "why": string, "sources": [string]}], "risks": [{"point": string, "why": string, "sources": [string]}], "scenarios": [{"name": "Best case"|"Most likely"|"Worst case", "description": string, "confidence": "low"|"medium"|"high"}], "watch": [string], "caveat": string}\nGive 2-4 items per list. Scenarios must have exactly 3 entries.\n\nProject: ${project}\n\nYearly publication counts: ${JSON.stringify(trends)}\n\nRecent papers: ${JSON.stringify(evidence)}`;
    const report = parseObject(await callGemini(prompt, "write the outlook"));

    return NextResponse.json({
      report,
      trends,
      sources: evidence.map(({ id, title, year, url }) => ({ id, title, year, url })),
      horizon,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to build the outlook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

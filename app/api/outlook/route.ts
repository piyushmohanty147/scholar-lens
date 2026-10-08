import { NextResponse } from "next/server";
import { callGemini } from "../../../lib/gemini";
import { allow } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

type Evidence = { id: string; title: string; year: number | null; url: string | null; abstract: string; citations: number };
type Stats = { rawGrowthPct: number | null; relativeGrowthPct: number | null; signal: string } | null;
type Trend = { query: string; counts: { year: number; count: number }[]; stats?: Stats };

const FIRST_YEAR = 2018;
const LAST_YEAR = new Date().getFullYear() - 1; // last full year
const RANGE = `from_publication_date:${FIRST_YEAR}-01-01,to_publication_date:${LAST_YEAR}-12-31`;

const AUDIENCES: Record<string, string> = {
  student: "The reader is a student. Use simple, clear language, briefly explain technical terms, and make next actions about learning and project steps.",
  researcher: "The reader is an academic researcher. Use precise language and emphasise research gaps, methods and open questions.",
  startup: "The reader is a startup team. Emphasise practical opportunities, adoption and regulatory risks, and concrete next steps. Remember that papers do not show market data.",
  finance: "The reader is a finance or economics analyst. Use technical language and emphasise empirical findings, risk factors and signals to monitor.",
  consultant: "The reader is a consultant advising clients. Emphasise implications, risks to flag and a clear executive-style summary.",
};
const STRENGTHS = ["strong", "moderate", "weak", "inference"];

function parseObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini returned an invalid report.");
  return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
}

async function openAlex(params: Record<string, string>, revalidate = 0): Promise<Record<string, unknown> | null> {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.openalex.org/works");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("api_key", key);
    const res = await fetch(url, {
      ...(revalidate ? { next: { revalidate } } : { cache: "no-store" as const }),
      signal: AbortSignal.timeout(12_000),
    });
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
  return words.filter(Boolean).join(" ").slice(0, 700);
}

async function getTrend(query: string): Promise<Trend> {
  const data = await openAlex({ search: query, group_by: "publication_year", filter: RANGE }, 86400);
  const groups = (data?.group_by as { key?: string; count?: number }[] | undefined) ?? [];
  const counts = groups
    .map((g) => ({ year: Number(g.key), count: Number(g.count) }))
    .filter((g) => g.year >= FIRST_YEAR && g.year <= LAST_YEAR && Number.isFinite(g.count))
    .sort((a, b) => a.year - b.year);
  return { query, counts };
}

// All papers published per year (no search). Used to remove general growth in publishing.
async function getTotals(): Promise<Map<number, number>> {
  const data = await openAlex({ group_by: "publication_year", filter: RANGE }, 604800);
  const groups = (data?.group_by as { key?: string; count?: number }[] | undefined) ?? [];
  return new Map(groups.map((g) => [Number(g.key), Number(g.count)]));
}

function trendStats(counts: { year: number; count: number }[], totals: Map<number, number>): Stats {
  if (counts.length < 6) return null;
  const share = counts.map((c) => c.count / (totals.get(c.year) || Infinity));
  const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
  const pct = (recent: number, prior: number) => (prior > 0 ? +(((recent / prior) - 1) * 100).toFixed(1) : null);
  const rawRecent = avg(counts.slice(-3).map((c) => c.count));
  const rawPrior = avg(counts.slice(-6, -3).map((c) => c.count));
  const relative = pct(avg(share.slice(-3)), avg(share.slice(-6, -3)));
  return {
    rawGrowthPct: pct(rawRecent, rawPrior),
    relativeGrowthPct: relative,
    signal: relative === null ? "unclear" : relative > 15 ? "rising" : relative < -15 ? "falling" : "flat",
  };
}

// Half recent relevant papers, half the most-cited ones: new signals plus proven foundations.
async function getPapers(query: string): Promise<Omit<Evidence, "id">[]> {
  const select = "id,title,publication_year,abstract_inverted_index,doi,cited_by_count";
  const [recent, cited] = await Promise.all([
    openAlex({ search: query, select, per_page: "6", filter: `has_abstract:true,from_publication_date:${LAST_YEAR - 2}-01-01` }, 86400),
    openAlex({ search: query, select, per_page: "6", sort: "cited_by_count:desc", filter: `has_abstract:true,from_publication_date:${FIRST_YEAR}-01-01` }, 86400),
  ]);
  const rows = [recent, cited].flatMap((d) => (d?.results as Record<string, unknown>[] | undefined) ?? []);
  return rows
    .filter((w) => typeof w.title === "string")
    .map((w) => ({
      title: String(w.title),
      year: typeof w.publication_year === "number" ? w.publication_year : null,
      url: typeof w.doi === "string" ? w.doi : typeof w.id === "string" ? w.id : null,
      abstract: rebuildAbstract(w.abstract_inverted_index),
      citations: typeof w.cited_by_count === "number" ? w.cited_by_count : 0,
    }));
}

// Removes source ids that do not exist, and marks claims with no valid source as "inference".
function cleanItems(raw: unknown, valid: Set<string>) {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const r = item as Record<string, unknown>;
    const sources = (Array.isArray(r.sources) ? r.sources : []).filter((s): s is string => typeof s === "string" && valid.has(s));
    const claimed = typeof r.strength === "string" && STRENGTHS.includes(r.strength) ? r.strength : "inference";
    return [{ point: String(r.point ?? ""), why: String(r.why ?? ""), sources, strength: sources.length === 0 ? "inference" : claimed }];
  });
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!allow(ip)) {
      return NextResponse.json({ error: "You've reached the free limit. Please try again later." }, { status: 429 });
    }
    if (!process.env.OPENALEX_API_KEY) {
      return NextResponse.json({ error: "The server is missing OPENALEX_API_KEY." }, { status: 500 });
    }
    const body = (await request.json()) as { project?: unknown; horizon?: unknown; audience?: unknown };
    const project = typeof body.project === "string" ? body.project.trim() : "";
    const horizon = ["1", "3", "5"].includes(String(body.horizon)) ? String(body.horizon) : "3";
    const audience = typeof body.audience === "string" && body.audience in AUDIENCES ? body.audience : "researcher";
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

    // Step 2: gather evidence from OpenAlex (everything runs in parallel).
    const [rawTrends, totals, paperGroups] = await Promise.all([
      Promise.all(queries.map(getTrend)),
      getTotals(),
      Promise.all(queries.map(getPapers)),
    ]);
    const trends: Trend[] = rawTrends.map((t) => ({ ...t, stats: trendStats(t.counts, totals) }));

    const seen = new Set<string>();
    const evidence: Evidence[] = [];
    for (const p of paperGroups.flat()) {
      const key = p.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (seen.has(key)) continue;
      seen.add(key);
      evidence.push({ ...p, id: `S${evidence.length + 1}` });
    }
    if (!evidence.length) {
      return NextResponse.json({ error: "Could not find enough evidence for this project. Try describing it with more specific terms." }, { status: 404 });
    }

    // Step 3: ask Gemini to write the outlook using ONLY this evidence.
    const prompt = `You are a careful research foresight analyst. Write an outlook for the project below, covering the next ${horizon} year(s). ${AUDIENCES[audience]} Use ONLY the evidence provided: yearly publication counts (research activity, NOT market outcomes) and recent paper abstracts. Do not invent statistics, companies, laws or facts. If something is your own reasoning beyond the evidence, mark its strength as "inference". Cite supporting papers by their ids (like "S1"). Be honest about uncertainty, and use low or medium confidence for long horizons.\n\nEvidence strength labels: "strong" = several papers clearly agree; "moderate" = one clear paper supports it; "weak" = only loosely related papers; "inference" = your own reasoning.\n\nReturn JSON with exactly this shape:\n{"summary": string (2-3 sentences), "trends": [{"name": string, "direction": "rising"|"flat"|"falling"|"unclear", "evidence": string}], "opportunities": [{"point": string, "why": string, "sources": [string], "strength": "strong"|"moderate"|"weak"|"inference"}], "risks": [{"point": string, "why": string, "sources": [string], "strength": "strong"|"moderate"|"weak"|"inference"}], "scenarios": [{"name": "Best case"|"Most likely"|"Worst case", "description": string, "confidence": "low"|"medium"|"high"}], "nextActions": [string], "readingList": [{"source": string, "reason": string}], "watch": [string], "caveat": string}\nGive 2-4 items per list, exactly 3 scenarios, 3-5 nextActions, and up to 5 readingList entries (source must be an id).\n\nProject: ${project}\n\nYearly publication counts and growth stats: ${JSON.stringify(trends)}\n\nNote: relativeGrowthPct compares the topic's share of ALL papers in the last 3 years against the 3 years before, which removes general growth in publishing. Base each trend's direction on "signal" and cite the percentages. Papers include citation counts; highly cited older papers are foundations, recent ones are emerging signals.\n\nPapers: ${JSON.stringify(evidence)}`;
    const raw = parseObject(await callGemini(prompt, "write the outlook"));

    const valid = new Set(evidence.map((e) => e.id));
    const report = {
      ...raw,
      opportunities: cleanItems(raw.opportunities, valid),
      risks: cleanItems(raw.risks, valid),
      nextActions: (Array.isArray(raw.nextActions) ? raw.nextActions : []).filter((x): x is string => typeof x === "string"),
      readingList: (Array.isArray(raw.readingList) ? raw.readingList : []).filter(
        (x): x is { source: string; reason: string } => !!x && typeof x === "object" && valid.has(String((x as Record<string, unknown>).source)),
      ),
    };

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

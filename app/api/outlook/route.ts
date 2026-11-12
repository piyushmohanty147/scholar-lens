import { NextResponse } from "next/server";
import { callGemini } from "../../../lib/gemini";
import { allow } from "../../../lib/rateLimit";
import { recordUsage, saveRow } from "../../../lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

type Rec = Record<string, unknown>;
type Evidence = { id: string; title: string; year: number | null; url: string | null; abstract: string; citations: number };
type Stats = { rawGrowthPct: number | null; relativeGrowthPct: number | null; signal: string } | null;
type Trend = { query: string; counts: { year: number; count: number }[]; stats?: Stats };
type Group = { key: string; name: string; count: number };

const FIRST_YEAR = 2018;
const LAST_YEAR = new Date().getFullYear() - 1; // last full year
const RANGE = `from_publication_date:${FIRST_YEAR}-01-01,to_publication_date:${LAST_YEAR}-12-31`;
const RECENT = `from_publication_date:${LAST_YEAR - 2}-01-01,to_publication_date:${LAST_YEAR}-12-31`;
const PRIOR = `from_publication_date:${LAST_YEAR - 5}-01-01,to_publication_date:${LAST_YEAR - 3}-12-31`;

const AUDIENCES: Record<string, string> = {
  student: "The reader is a student. Use simple, clear language, briefly explain technical terms, and make next actions about learning and project steps.",
  researcher: "The reader is an academic researcher. Use precise language and emphasise research gaps, methods and open questions.",
  startup: "The reader is a startup team. Emphasise practical opportunities, adoption and regulatory risks, and concrete next steps. Remember that papers do not show market data.",
  finance: "The reader is a finance or economics analyst. Use technical language and emphasise empirical findings, risk factors and signals to monitor.",
  consultant: "The reader is a consultant advising clients. Emphasise implications, risks to flag and a clear executive-style summary.",
};
const STRENGTHS = ["strong", "moderate", "weak", "inference"];
const LEVELS = ["low", "medium", "high"];
const DIRECTIONS = ["rising", "flat", "falling", "unclear"];

const str = (x: unknown) => (typeof x === "string" ? x : "");
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const obj = (x: unknown): Rec => (x && typeof x === "object" ? (x as Rec) : {});
const strs = (x: unknown) => arr(x).filter((v): v is string => typeof v === "string" && v.trim().length > 0);

function parseObject(text: string): Rec {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Gemini returned an invalid report.");
  return JSON.parse(text.slice(start, end + 1)) as Rec;
}

async function openAlex(params: Record<string, string>, revalidate = 0): Promise<Rec | null> {
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
    return (await res.json()) as Rec;
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
  const rows = [recent, cited].flatMap((d) => (d?.results as Rec[] | undefined) ?? []);
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

// Counts papers on a topic, grouped by something (country, journal, funder, subtopic...).
async function groupBy(query: string, field: string, filter: string): Promise<Group[]> {
  const data = await openAlex({ search: query, group_by: field, filter }, 86400);
  const groups = (data?.group_by as { key?: string; key_display_name?: string; count?: number }[] | undefined) ?? [];
  return groups
    .filter((g) => g.key && g.key !== "unknown" && Number.isFinite(g.count))
    .map((g) => ({ key: String(g.key), name: String(g.key_display_name ?? g.key), count: Number(g.count) }));
}

// Which subtopics gained or lost share of the field (last 3 years vs the 3 before).
async function getSubtopics(query: string) {
  const [recent, prior] = await Promise.all([groupBy(query, "primary_topic.id", RECENT), groupBy(query, "primary_topic.id", PRIOR)]);
  const total = (g: Group[]) => g.reduce((s, x) => s + x.count, 0) || 1;
  const rt = total(recent);
  const pt = total(prior);
  const priorMap = new Map(prior.map((g) => [g.key, g.count]));
  return recent.slice(0, 6).map((g) => {
    const p = priorMap.get(g.key) ?? 0;
    return { name: g.name, recent: g.count, prior: p, shareChangePct: p > 0 ? Math.round(((g.count / rt) / (p / pt) - 1) * 100) : null };
  });
}

// Who is doing the research on the core topic (last 3 years).
async function getLandscape(query: string) {
  const [countries, institutions, journals, funders] = await Promise.all([
    groupBy(query, "authorships.countries", RECENT),
    groupBy(query, "authorships.institutions.lineage", RECENT),
    groupBy(query, "primary_location.source.id", RECENT),
    groupBy(query, "grants.funder", RECENT),
  ]);
  const top = (g: Group[]) => g.slice(0, 6).map(({ name, count }) => ({ name, count }));
  return { countries: top(countries), institutions: top(institutions), journals: top(journals), funders: top(funders) };
}

// Removes source ids that do not exist, and marks claims with no valid source as "inference".
function cleanSources(raw: unknown, valid: Set<string>) {
  return strs(raw).filter((s) => valid.has(s));
}
function cleanItems(raw: unknown, valid: Set<string>) {
  return arr(raw).flatMap((item) => {
    const r = obj(item);
    if (!str(r.point)) return [];
    const sources = cleanSources(r.sources, valid);
    const claimed = STRENGTHS.includes(str(r.strength)) ? str(r.strength) : "inference";
    return [{ point: str(r.point), why: str(r.why), action: str(r.action) || undefined, sources, strength: sources.length === 0 ? "inference" : claimed }];
  });
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await allow(ip, 8, "outlook"))) {
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
      queries = strs(q.queries).slice(0, 3);
    } catch {
      queries = [];
    }
    if (!queries.length) queries = [project.split(/\s+/).slice(0, 8).join(" ")];
    const core = queries[0];

    // Step 2: gather evidence from OpenAlex (everything runs in parallel).
    const [rawTrends, totals, paperGroups, subtopics, landscape] = await Promise.all([
      Promise.all(queries.map(getTrend)),
      getTotals(),
      Promise.all(queries.map(getPapers)),
      getSubtopics(core),
      getLandscape(core),
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

    // Research-activity data gets its own ids (D1, D2...) so claims can cite data as well as papers.
    const dataFacts = trends.map((t, i) => ({ id: `D${i + 1}`, ...t }));
    const valid = new Set([...evidence.map((e) => e.id), ...dataFacts.map((d) => d.id)]);

    // Step 3: ask Gemini to write the outlook using ONLY this evidence.
    const prompt = `You are a careful research foresight analyst. Write an outlook for the project below, covering the next ${horizon} year(s). ${AUDIENCES[audience]} Use ONLY the evidence provided: yearly publication counts (research activity, NOT market outcomes), subtopic shifts, and recent paper abstracts. Do not invent statistics, companies, laws or facts. If something is your own reasoning beyond the evidence, mark its strength as "inference". Cite supporting papers by their ids (like "S1") and supporting research-activity data by its id (like "D1"). Be honest about uncertainty, and use low or medium confidence for long horizons.\n\nEvidence strength labels: "strong" = several papers clearly agree; "moderate" = one clear paper supports it; "weak" = only loosely related papers; "inference" = your own reasoning.\n\nReturn JSON with exactly this shape:\n{"summary": string (2-3 sentences), "bottomLine": string (one sentence the reader should remember), "trends": [{"name": string, "direction": "rising"|"flat"|"falling"|"unclear", "evidence": string, "sources": [string]}], "consensus": [{"point": string, "sources": [string]}], "debates": [{"point": string, "why": string, "sources": [string], "strength": "strong"|"moderate"|"weak"|"inference"}], "opportunities": [{"point": string, "why": string, "action": string, "sources": [string], "strength": "strong"|"moderate"|"weak"|"inference"}], "risks": [{"point": string, "why": string, "action": string, "sources": [string], "strength": "strong"|"moderate"|"weak"|"inference"}], "scenarios": [{"name": "Best case"|"Most likely"|"Worst case", "description": string, "likelihood": "low"|"medium"|"high", "confidence": "low"|"medium"|"high", "drivers": [string], "signals": [string]}], "timeline": [{"period": string, "expect": string}], "indicators": [{"signal": string, "why": string}], "nextActions": [{"action": string, "when": string}], "questionsForExperts": [string], "glossary": [{"term": string, "meaning": string}], "readingList": [{"source": string, "reason": string}], "watch": [string], "gaps": [string], "caveat": string}\nGive 2-4 items per list, exactly 3 scenarios, 3-5 nextActions, 3-5 timeline entries, 3-5 indicators, 3-5 glossary terms, and up to 5 readingList entries (source must be a paper id like "S1"). "action" in opportunities is how to act on it; "action" in risks is how to reduce it. "gaps" lists what this evidence does NOT cover (for example market data, regulation, costs).\n\nProject: ${project}\n\nYearly publication counts and growth stats (ids D1, D2...): ${JSON.stringify(dataFacts)}\n\nNote: relativeGrowthPct compares the topic's share of ALL papers in the last 3 years against the 3 years before, which removes general growth in publishing. Base each trend's direction on "signal" and cite the percentages. Papers include citation counts; highly cited older papers are foundations, recent ones are emerging signals.\n\nSubtopic shifts for the core topic "${core}" (last 3 years vs the 3 before): ${JSON.stringify(subtopics)}\n\nPapers: ${JSON.stringify(evidence)}`;
    const raw = parseObject(await callGemini(prompt, "write the outlook", { timeoutMs: 40_000, budgetMs: 45_000 }));

    const report = {
      summary: str(raw.summary),
      bottomLine: str(raw.bottomLine),
      trends: arr(raw.trends).flatMap((t) => {
        const r = obj(t);
        if (!str(r.name)) return [];
        return [{ name: str(r.name), direction: DIRECTIONS.includes(str(r.direction)) ? str(r.direction) : "unclear", evidence: str(r.evidence), sources: cleanSources(r.sources, valid) }];
      }),
      consensus: arr(raw.consensus).flatMap((c) => {
        const r = obj(c);
        return str(r.point) ? [{ point: str(r.point), sources: cleanSources(r.sources, valid) }] : [];
      }),
      debates: cleanItems(raw.debates, valid),
      opportunities: cleanItems(raw.opportunities, valid),
      risks: cleanItems(raw.risks, valid),
      scenarios: arr(raw.scenarios).flatMap((s) => {
        const r = obj(s);
        if (!str(r.name)) return [];
        return [{
          name: str(r.name), description: str(r.description),
          likelihood: LEVELS.includes(str(r.likelihood)) ? str(r.likelihood) : "unclear",
          confidence: LEVELS.includes(str(r.confidence)) ? str(r.confidence) : "low",
          drivers: strs(r.drivers), signals: strs(r.signals),
        }];
      }),
      timeline: arr(raw.timeline).flatMap((t) => { const r = obj(t); return str(r.expect) ? [{ period: str(r.period), expect: str(r.expect) }] : []; }),
      indicators: arr(raw.indicators).flatMap((t) => { const r = obj(t); return str(r.signal) ? [{ signal: str(r.signal), why: str(r.why) }] : []; }),
      nextActions: arr(raw.nextActions).flatMap((a) => {
        if (typeof a === "string") return a.trim() ? [{ action: a, when: "" }] : [];
        const r = obj(a);
        return str(r.action) ? [{ action: str(r.action), when: str(r.when) }] : [];
      }),
      questionsForExperts: strs(raw.questionsForExperts),
      glossary: arr(raw.glossary).flatMap((g) => { const r = obj(g); return str(r.term) ? [{ term: str(r.term), meaning: str(r.meaning) }] : []; }),
      readingList: arr(raw.readingList).flatMap((x) => {
        const r = obj(x);
        return valid.has(str(r.source)) ? [{ source: str(r.source), reason: str(r.reason) }] : [];
      }),
      watch: strs(raw.watch),
      gaps: strs(raw.gaps),
      caveat: str(raw.caveat),
    };

    const payload = {
      report,
      trends,
      subtopics,
      landscape,
      sources: evidence.map(({ id, title, year, url }) => ({ id, title, year, url })),
      horizon,
      papersAnalysed: evidence.length,
    };

    // Only a finished outlook is counted and saved, so errors never cost the user a use.
    await Promise.allSettled([
      saveRow(request, "saved_reports", { project, audience, horizon, result: payload }),
      recordUsage(request, "outlook"),
    ]);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to build the outlook.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

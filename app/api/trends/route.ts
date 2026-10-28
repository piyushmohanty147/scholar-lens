import { NextResponse } from "next/server";
import { allow } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Rec = Record<string, unknown>;
type Point = { year: number; count: number };
type Group = { key: string; name: string; count: number };

const LAST_YEAR = new Date().getFullYear() - 1; // last full year
const FIRST_YEAR = LAST_YEAR - 11;
const RANGE = `from_publication_date:${FIRST_YEAR}-01-01,to_publication_date:${LAST_YEAR}-12-31`;
const RECENT = `from_publication_date:${LAST_YEAR - 2}-01-01,to_publication_date:${LAST_YEAR}-12-31`;
const PRIOR = `from_publication_date:${LAST_YEAR - 5}-01-01,to_publication_date:${LAST_YEAR - 3}-12-31`;

async function openAlex(params: Record<string, string>, revalidate: number): Promise<Rec | null> {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) return null;
  try {
    const url = new URL("https://api.openalex.org/works");
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set("api_key", key);
    const res = await fetch(url, { next: { revalidate }, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as Rec;
  } catch {
    return null;
  }
}

async function groupBy(query: string | null, field: string, filter: string, revalidate = 86400): Promise<Group[]> {
  const params: Record<string, string> = { group_by: field, filter };
  if (query) params.search = query;
  const data = await openAlex(params, revalidate);
  const groups = (data?.group_by as { key?: string; key_display_name?: string; count?: number }[] | undefined) ?? [];
  return groups
    .filter((g) => g.key && g.key !== "unknown" && Number.isFinite(g.count))
    .map((g) => ({ key: String(g.key), name: String(g.key_display_name ?? g.key), count: Number(g.count) }));
}

const avg = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const pct = (recent: number, prior: number) => (prior > 0 ? Math.round(((recent / prior) - 1) * 1000) / 10 : null);

// Growth of the topic's share of ALL papers (removes the general rise in publishing).
function stats(counts: Point[], totals: Map<number, number>) {
  const share = counts.map((c) => c.count / (totals.get(c.year) || Infinity));
  const relative = pct(avg(share.slice(-3)), avg(share.slice(-6, -3)));
  const raw = pct(avg(counts.slice(-3).map((c) => c.count)), avg(counts.slice(-6, -3).map((c) => c.count)));
  const signal = relative === null ? "unclear" : relative > 15 ? "rising" : relative < -15 ? "falling" : "flat";
  return { rawGrowthPct: raw, relativeGrowthPct: relative, signal };
}

// A simple exponential trend over the last 6 years, with a rough range that widens over time.
function project(counts: Point[], ahead = 3) {
  const pts = counts.slice(-6).filter((c) => c.count > 0);
  if (pts.length < 5) return null;
  const xs = pts.map((p) => p.year);
  const ys = pts.map((p) => Math.log(p.count));
  const mx = avg(xs);
  const my = avg(ys);
  const sxx = xs.reduce((s, x) => s + (x - mx) * (x - mx), 0);
  if (sxx === 0) return null;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx;
  const intercept = my - slope * mx;
  const resid = ys.map((y, i) => y - (intercept + slope * xs[i]));
  const sd = Math.max(0.05, Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / Math.max(1, pts.length - 2)));
  return Array.from({ length: ahead }, (_, i) => {
    const year = LAST_YEAR + 1 + i;
    const mid = Math.exp(intercept + slope * year);
    const spread = 1.28 * sd * (1 + i * 0.5);
    return { year, mid: Math.round(mid), low: Math.round(mid * Math.exp(-spread)), high: Math.round(mid * Math.exp(spread)) };
  });
}

// Which subtopics gained or lost share of the field (last 3 years vs the 3 before).
async function subtopics(query: string) {
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

async function analyse(query: string, totals: Map<number, number>) {
  const [yearly, subs, countries] = await Promise.all([
    groupBy(query, "publication_year", RANGE),
    subtopics(query),
    groupBy(query, "authorships.countries", RECENT),
  ]);
  const byYear = new Map(yearly.map((g) => [Number(g.key), g.count]));
  const counts: Point[] = [];
  for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) counts.push({ year: y, count: byYear.get(y) ?? 0 });
  return {
    query,
    counts,
    totalPapers: counts.reduce((s, c) => s + c.count, 0),
    stats: stats(counts, totals),
    projection: project(counts),
    subtopics: subs,
    countries: countries.slice(0, 6).map(({ name, count }) => ({ name, count })),
  };
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!allow(ip, 20)) {
      return NextResponse.json({ error: "You have reached the limit for now. Please try again later." }, { status: 429 });
    }
    if (!process.env.OPENALEX_API_KEY) {
      return NextResponse.json({ error: "The server is missing OPENALEX_API_KEY." }, { status: 500 });
    }
    const body = (await request.json()) as { topics?: unknown };
    const topics = (Array.isArray(body.topics) ? body.topics : [])
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length >= 3 && t.length <= 120)
      .slice(0, 2);
    if (topics.length === 0) return NextResponse.json({ error: "Enter a topic of at least 3 characters." }, { status: 400 });

    const totals = await groupBy(null, "publication_year", RANGE, 604800);
    const totalMap = new Map(totals.map((g) => [Number(g.key), g.count]));
    const results = await Promise.all(topics.map((t) => analyse(t, totalMap)));
    const empty = results.find((r) => r.totalPapers === 0);
    if (empty) return NextResponse.json({ error: `No papers found for "${empty.query}". Try more specific wording.` }, { status: 404 });

    return NextResponse.json({ lastYear: LAST_YEAR, topics: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not analyse these topics.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

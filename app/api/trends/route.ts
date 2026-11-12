import { NextResponse } from "next/server";
import { allow } from "../../../lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

type Rec = Record<string, unknown>;
type Point = { year: number; count: number };
type Group = { key: string; name: string; count: number };
type Fit = { slope: number; intercept: number };
type Horizon = { h: number; n: number; rmse: number; medianPctError: number; naiveMedianPctError: number };

const LAST_YEAR = new Date().getFullYear() - 1; // last full year
const FIRST_YEAR = LAST_YEAR - 11;
const RANGE = `from_publication_date:${FIRST_YEAR}-01-01,to_publication_date:${LAST_YEAR}-12-31`;
const RECENT = `from_publication_date:${LAST_YEAR - 2}-01-01,to_publication_date:${LAST_YEAR}-12-31`;
const PRIOR = `from_publication_date:${LAST_YEAR - 5}-01-01,to_publication_date:${LAST_YEAR - 3}-12-31`;

const WINDOW = 6; // the forecast learns from the last 6 years
const MAX_H = 3; // and looks up to 3 years ahead
const MIN_TESTS = 3; // fewer past tests than this and we do not trust the measured error

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
const median = (a: number[]) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const pct = (recent: number, prior: number) => (prior > 0 ? Math.round(((recent / prior) - 1) * 1000) / 10 : null);

// Growth of the topic's share of ALL papers (removes the general rise in publishing).
function stats(counts: Point[], totals: Map<number, number>) {
  const share = counts.map((c) => c.count / (totals.get(c.year) || Infinity));
  const relative = pct(avg(share.slice(-3)), avg(share.slice(-6, -3)));
  const raw = pct(avg(counts.slice(-3).map((c) => c.count)), avg(counts.slice(-6, -3).map((c) => c.count)));
  const signal = relative === null ? "unclear" : relative > 15 ? "rising" : relative < -15 ? "falling" : "flat";
  return { rawGrowthPct: raw, relativeGrowthPct: relative, signal };
}

// A simple exponential trend (a straight line through the logs of the yearly counts).
function fitTrend(points: Point[]): Fit | null {
  const pts = points.filter((c) => c.count > 0);
  if (pts.length < 5) return null;
  const xs = pts.map((p) => p.year);
  const ys = pts.map((p) => Math.log(p.count));
  const mx = avg(xs);
  const my = avg(ys);
  const sxx = xs.reduce((s, x) => s + (x - mx) * (x - mx), 0);
  if (sxx === 0) return null;
  const slope = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0) / sxx;
  return { slope, intercept: my - slope * mx };
}
const predict = (f: Fit, year: number) => Math.exp(f.intercept + f.slope * year);

// The track record. Pretend it is an earlier year, forecast the years that came after it using only
// the data available then, and compare with what really happened. Also scores the laziest possible
// forecast ("same as the last known year") so we can say honestly whether the trend adds anything.
function backtest(counts: Point[]): Horizon[] {
  const rows: Record<number, { logErr: number[]; pctErr: number[]; naiveErr: number[] }> = {};
  for (let h = 1; h <= MAX_H; h++) rows[h] = { logErr: [], pctErr: [], naiveErr: [] };

  for (let end = WINDOW - 1; end < counts.length - 1; end++) {
    const fit = fitTrend(counts.slice(end - WINDOW + 1, end + 1));
    if (!fit) continue;
    for (let h = 1; h <= MAX_H; h++) {
      const target = counts[end + h];
      if (!target || target.count <= 0) continue;
      const guess = predict(fit, target.year);
      rows[h].logErr.push(Math.log(target.count / guess));
      rows[h].pctErr.push(Math.abs(target.count - guess) / target.count);
      rows[h].naiveErr.push(Math.abs(target.count - counts[end].count) / target.count);
    }
  }

  return Object.entries(rows)
    .map(([h, r]) => ({
      h: Number(h),
      n: r.logErr.length,
      rmse: Math.sqrt(avg(r.logErr.map((e) => e * e))),
      medianPctError: Math.round(median(r.pctErr) * 1000) / 10,
      naiveMedianPctError: Math.round(median(r.naiveErr) * 1000) / 10,
    }))
    .filter((x) => x.n > 0);
}

// Forecast with a range sized from the real misses above. If there are too few past tests, falls back
// to a rougher in-sample range and says so (basis: "in-sample").
function project(counts: Point[], bt: Horizon[], ahead = MAX_H) {
  const recent = counts.slice(-WINDOW);
  const fit = fitTrend(recent);
  if (!fit) return null;
  const pts = recent.filter((c) => c.count > 0);
  const resid = pts.map((p) => Math.log(p.count) - (fit.intercept + fit.slope * p.year));
  const inSample = Math.max(0.05, Math.sqrt(resid.reduce((s, r) => s + r * r, 0) / Math.max(1, pts.length - 2)));

  let prevSd = 0;
  return Array.from({ length: ahead }, (_, i) => {
    const year = LAST_YEAR + 1 + i;
    const mid = predict(fit, year);
    const tested = bt.find((b) => b.h === i + 1 && b.n >= MIN_TESTS);
    // With only a handful of past tests the measured error is optimistic, so it gets a floor and a
    // small-sample bump. The range never gets narrower for later years.
    const measured = tested ? Math.max(0.08, tested.rmse) * (1 + 1 / Math.max(1, tested.n - 1)) : inSample * (1 + i * 0.5);
    const sd = Math.max(measured, prevSd);
    prevSd = sd;
    const spread = 1.28 * sd; // roughly an 80% range
    return {
      year, mid: Math.round(mid), low: Math.round(mid * Math.exp(-spread)), high: Math.round(mid * Math.exp(spread)),
      basis: tested ? "backtest" : "in-sample",
    };
  });
}

// One plain sentence about how this forecast has done on this topic's own past.
function trackRecord(bt: Horizon[]): string | null {
  const one = bt.find((b) => b.h === 1 && b.n >= MIN_TESTS);
  if (!one) return null;
  const verdict =
    one.medianPctError < one.naiveMedianPctError * 0.9 ? "did better than"
    : one.medianPctError > one.naiveMedianPctError * 1.1 ? "did worse than"
    : "was about as good as";
  return `Tested on this topic's own past (${one.n} one-year-ahead forecasts), the trend was typically off by ${one.medianPctError}%. ` +
    `Simply guessing "same as last year" was off by ${one.naiveMedianPctError}%, so the trend ${verdict} that simple guess.`;
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
  const bt = backtest(counts);
  return {
    query,
    counts,
    totalPapers: counts.reduce((s, c) => s + c.count, 0),
    stats: stats(counts, totals),
    projection: project(counts, bt),
    backtest: { horizons: bt, summary: trackRecord(bt) },
    subtopics: subs,
    countries: countries.slice(0, 6).map(({ name, count }) => ({ name, count })),
  };
}

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await allow(ip, 20, "trends"))) {
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

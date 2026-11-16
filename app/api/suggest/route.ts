import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 15;

// Suggestions while typing: matching authors and papers from OpenAlex's own autocomplete.
// No AI is used here, so it is fast and costs nothing per keystroke.
type Hit = { id?: string; display_name?: string; hint?: string | null; cited_by_count?: number; works_count?: number | null; external_id?: string | null };

// Light per-instance limit (this endpoint is called as people type).
const hits = new Map<string, number[]>();
function allowed(ip: string, max = 90, windowMs = 60_000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 2000) hits.clear();
  return true;
}

async function autocomplete(kind: "authors" | "works", q: string): Promise<Hit[]> {
  const key = process.env.OPENALEX_API_KEY;
  if (!key) return [];
  try {
    const url = new URL(`https://api.openalex.org/autocomplete/${kind}`);
    url.searchParams.set("q", q);
    url.searchParams.set("api_key", key);
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: Hit[] };
    return Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!allowed(ip)) return NextResponse.json({ authors: [], works: [] }, { status: 429 });
  let q = "";
  try {
    const body = (await request.json()) as { q?: unknown };
    q = typeof body.q === "string" ? body.q.trim().slice(0, 80) : "";
  } catch { /* empty */ }
  if (q.length < 3) return NextResponse.json({ authors: [], works: [] });

  const [authors, works] = await Promise.all([autocomplete("authors", q), autocomplete("works", q)]);
  return NextResponse.json({
    authors: authors.filter((a) => a.id && a.display_name).slice(0, 4).map((a) => ({ id: a.id!, name: a.display_name!, hint: a.hint ?? "", worksCount: a.works_count ?? 0, citedBy: a.cited_by_count ?? 0 })),
    works: works.filter((w) => w.id && w.display_name).slice(0, 5).map((w) => ({ id: w.id!, title: w.display_name!, hint: w.hint ?? "" })),
  });
}

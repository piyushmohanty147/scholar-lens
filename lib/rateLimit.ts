// Per-IP rate limit. The count lives in Supabase (rate_hit function), so it is shared by every server
// instance and cannot be dodged by hitting a fresh one. If the database call fails, it falls back to a
// per-instance memory count, so a database hiccup never takes the site down.
const hits = new Map<string, number[]>();

function allowInMemory(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(key, recent);
  return true;
}

// Allows `max` requests per IP per hour for one kind of request (scope).
export async function allow(ip: string, max = 8, scope = "api", windowMs = 60 * 60 * 1000): Promise<boolean> {
  const key = `${scope}:${ip}`.slice(0, 200);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && anon) {
    try {
      const res = await fetch(`${url}/rest/v1/rpc/rate_hit`, {
        method: "POST",
        headers: { apikey: anon, Authorization: `Bearer ${anon}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_key: key, p_max: max, p_window_seconds: Math.round(windowMs / 1000) }),
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) return (await res.json()) === true;
    } catch { /* fall through to the memory count */ }
  }
  return allowInMemory(key, max, windowMs);
}

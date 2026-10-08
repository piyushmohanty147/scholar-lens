const hits = new Map<string, number[]>();

// Allows `max` requests per IP per window (default 8 per hour).
export function allow(ip: string, max = 8, windowMs = 60 * 60 * 1000) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return false;
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

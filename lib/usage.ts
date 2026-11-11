// Server-side helpers that talk to Supabase as the signed-in user (never with an admin key).
// They are best effort: a problem here must never break the answer the user already got.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// The sign-in token the browser stores in the sl_token cookie.
function tokenFrom(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)sl_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// middleware.ts verifies the token and sets this header. The browser cannot set it,
// because the middleware deletes any copy that arrives with the request.
export function userIdFrom(request: Request): string | null {
  return request.headers.get("x-sl-user");
}

function authHeaders(token: string): Record<string, string> {
  return { apikey: SUPABASE_ANON ?? "", Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

// Counts one finished use against the user's daily limit. Call it only after a successful answer,
// so errors never cost the user a free use.
export async function recordUsage(request: Request, kind: string): Promise<void> {
  const token = tokenFrom(request);
  if (!token || !SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/bump_usage`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ p_kind: kind }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* best effort */ }
}

// Saves a row for the signed-in user. Database security rules still decide what is allowed.
export async function saveRow(request: Request, table: string, row: Record<string, unknown>, onConflict?: string): Promise<void> {
  const token = tokenFrom(request);
  const userId = userIdFrom(request);
  if (!token || !userId || !SUPABASE_URL || !SUPABASE_ANON) return;
  try {
    const url = `${SUPABASE_URL}/rest/v1/${table}${onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : ""}`;
    await fetch(url, {
      method: "POST",
      headers: { ...authHeaders(token), Prefer: onConflict ? "resolution=merge-duplicates,return=minimal" : "return=minimal" },
      body: JSON.stringify({ ...row, user_id: userId }),
      signal: AbortSignal.timeout(5000),
    });
  } catch { /* best effort */ }
}

import { NextRequest, NextResponse } from "next/server";

// Per-day limits per account. Raise "pro" numbers when you add payments.
const RULES: Record<string, { kind: string; label: string; free: number; pro: number }> = {
  "/api/outlook": { kind: "outlook", label: "project outlooks", free: 3, pro: 100 },
  "/api/search": { kind: "search", label: "searches", free: 15, pro: 500 },
  "/api/paper-detail": { kind: "detail", label: "paper deep dives", free: 20, pro: 500 },
};

const fail = (error: string, status: number, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });

// This only CHECKS the limit. The route counts the use itself (lib/usage.ts) after it succeeds,
// so a failed request never costs the user a free use.
export async function middleware(req: NextRequest) {
  // Never trust a user id sent by the browser. Only the check below may set it.
  const forwarded = new Headers(req.headers);
  forwarded.delete("x-sl-user");
  const pass = () => NextResponse.next({ request: { headers: forwarded } });

  if (req.method !== "POST") return pass();
  const rule = RULES[req.nextUrl.pathname];
  if (!rule) return pass();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return fail("Sign-in is not set up on the server yet.", 500);

  const token = req.cookies.get("sl_token")?.value;
  if (!token) return fail("Please sign in to continue.", 401);

  const headers = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    // The three checks are independent, so they run at the same time.
    const [who, planRes, usageRes] = await Promise.all([
      fetch(`${url}/auth/v1/user`, { headers }),
      fetch(`${url}/rest/v1/profiles?select=plan&limit=1`, { headers }).catch(() => null),
      fetch(`${url}/rest/v1/rpc/get_usage`, { method: "POST", headers, body: JSON.stringify({ p_kind: rule.kind }) }),
    ]);

    if (!who.ok) return fail("Your session expired. Please sign out and sign in again.", 401);
    const user = (await who.json()) as { id?: string };
    if (!user.id) return fail("Your session expired. Please sign out and sign in again.", 401);

    let plan = "free";
    try {
      if (planRes?.ok) {
        const rows = (await planRes.json()) as { plan?: string }[];
        if (rows[0]?.plan) plan = rows[0].plan;
      }
    } catch { /* default to free */ }

    if (!usageRes.ok) return fail("Could not check your usage right now. Please try again.", 500);
    const used = Number(await usageRes.json());

    const limit = plan === "free" ? rule.free : rule.pro;
    if (used >= limit) {
      return fail(`You have used your ${limit} free ${rule.label} for today.`, 429, { code: "limit_reached", kind: rule.label, limit, plan });
    }
    forwarded.set("x-sl-user", user.id);
  } catch {
    return fail("Could not verify your sign-in right now. Please try again.", 500);
  }
  return pass();
}

export const config = { matcher: ["/api/outlook", "/api/search", "/api/paper-detail"] };

import { NextRequest, NextResponse } from "next/server";

// Per-day limits per account. Raise "pro" numbers when you add payments.
const RULES: Record<string, { kind: string; label: string; free: number; pro: number }> = {
  "/api/outlook": { kind: "outlook", label: "project outlooks", free: 3, pro: 100 },
  "/api/search": { kind: "search", label: "searches", free: 15, pro: 500 },
  "/api/paper-detail": { kind: "detail", label: "paper deep dives", free: 20, pro: 500 },
};

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();
  const rule = RULES[req.nextUrl.pathname];
  if (!rule) return NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return fail("Sign-in is not set up on the server yet.", 500);

  const token = req.cookies.get("sl_token")?.value;
  if (!token) return fail("Please sign in to continue.", 401);

  const headers = { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  try {
    const who = await fetch(`${url}/auth/v1/user`, { headers });
    if (!who.ok) return fail("Your session expired. Please sign out and sign in again.", 401);

    let plan = "free";
    try {
      const p = await fetch(`${url}/rest/v1/profiles?select=plan`, { headers });
      if (p.ok) {
        const rows = (await p.json()) as { plan?: string }[];
        if (rows[0]?.plan) plan = rows[0].plan;
      }
    } catch { /* default to free */ }

    const bump = await fetch(`${url}/rest/v1/rpc/bump_usage`, { method: "POST", headers, body: JSON.stringify({ p_kind: rule.kind }) });
    if (!bump.ok) return fail("Could not check your usage right now. Please try again.", 500);
    const used = Number(await bump.json());

    const limit = plan === "free" ? rule.free : rule.pro;
    if (used > limit) {
      return fail(`You have used your ${limit} free ${rule.label} for today. Come back tomorrow, or upgrade for more.`, 429);
    }
  } catch {
    return fail("Could not verify your sign-in right now. Please try again.", 500);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/outlook", "/api/search", "/api/paper-detail"] };

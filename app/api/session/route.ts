import { NextResponse } from "next/server";
import { allow } from "../../../lib/rateLimit";

export const runtime = "nodejs";

// Keeps the sign-in token in an httpOnly cookie, which page scripts (and so injected scripts) cannot read.
// The browser sends its Supabase token here once after sign-in; we check it with Supabase first.
const NAME = "sl_token";
const MAX_AGE = 60 * 60 * 24 * 7;

function cookie(value: string, maxAge: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

// Seconds until the token expires, read from the token itself (never trusted beyond the check below).
function secondsLeft(token: string): number {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: number };
    if (typeof payload.exp === "number") return Math.min(MAX_AGE, Math.max(60, payload.exp - Math.floor(Date.now() / 1000)));
  } catch { /* use the default */ }
  return 3600;
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!(await allow(ip, 120, "session"))) return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return NextResponse.json({ error: "Sign-in is not set up on the server yet." }, { status: 500 });

  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch { /* handled below */ }
  if (!token || token.length > 4000) return NextResponse.json({ error: "Missing token." }, { status: 400 });

  try {
    const who = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!who.ok) return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  } catch {
    return NextResponse.json({ error: "Could not verify the session." }, { status: 502 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookie(token, secondsLeft(token)));
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", cookie("", 0));
  return res;
}

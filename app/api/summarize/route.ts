import { NextResponse } from "next/server";
import { callGemini } from "../../../lib/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

const NOT_STATED = "Not stated in the abstract.";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { title?: unknown; abstract?: unknown };
    const title = typeof body.title === "string" ? body.title.slice(0, 300) : "";
    const abstract = typeof body.abstract === "string" ? body.abstract.trim().slice(0, 3000) : "";
    if (abstract.length < 40) {
      return NextResponse.json({ error: "This paper has no abstract to summarize." }, { status: 400 });
    }

    const prompt = `Summarize this research paper using ONLY its abstract below. Do not use outside knowledge and do not invent details. Return a JSON object with exactly these keys: "coreClaim", "method", "keyResult", "limitation". Each value must be ONE plain sentence. If the abstract does not state something, use exactly "${NOT_STATED}" for that key.\n\nTitle: ${title}\n\nAbstract: ${abstract}`;
    const text = await callGemini(prompt, "summarize this paper");

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("Gemini returned an invalid summary.");
    const parsed = JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>;
    const pick = (key: string) => (typeof parsed[key] === "string" && parsed[key] ? (parsed[key] as string).trim() : NOT_STATED);
    return NextResponse.json({
      summary: { coreClaim: pick("coreClaim"), method: pick("method"), keyResult: pick("keyResult"), limitation: pick("limitation") },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to summarize this paper.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

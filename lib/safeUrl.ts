// Only plain web links may be turned into clickable links. Anything else (javascript:, data:, etc.) is dropped.
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text || text.length > 2000) return null;
  try {
    const parsed = new URL(text);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

// Rejects obviously oversized requests before reading them (best effort: uses the declared size).
export function tooLarge(request: Request, maxBytes: number): boolean {
  const declared = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(declared) && declared > maxBytes;
}

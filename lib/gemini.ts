// Shared helper: calls Gemini with retries and backup models. Returns the model's text.
export async function callGemini(prompt: string, task: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("The server is missing GEMINI_API_KEY. Add it and try again.");

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0.1 },
  });
  const models = Array.from(new Set([process.env.GEMINI_MODEL || "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"]));
  let lastStatus = 0;
  let lastDetail = "";
  const deadline = Date.now() + 40_000;

  outer: for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() > deadline) break outer;
      let response: Response;
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: requestBody,
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        });
      } catch {
        lastStatus = 504;
        lastDetail = "Gemini took too long to answer.";
        break;
      }
      if (response.ok) {
        const payload = (await response.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        return payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
      }
      lastStatus = response.status;
      try {
        const errorBody = (await response.json()) as { error?: { message?: string } };
        lastDetail = errorBody.error?.message ?? "";
      } catch {
        lastDetail = "";
      }
      if (lastStatus !== 503 && lastStatus !== 429) break;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error(`Gemini could not ${task} (status ${lastStatus}). ${lastDetail}`.trim());
}

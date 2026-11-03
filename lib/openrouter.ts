import "server-only";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
export const OPENROUTER_MODEL = "z-ai/glm-5.3-flash";

/**
 * Single OpenRouter call used by both chat surfaces. The key stays server-side.
 */
export async function askOpenRouter(system: string, prompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set.");

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Title": "Grounds to Glow",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 600,
    }),
    signal: AbortSignal.timeout(25_000),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`OpenRouter ${response.status}: ${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("OpenRouter returned an empty response.");
  }
  return content.trim();
}

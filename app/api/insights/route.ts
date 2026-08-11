// Server-only. Reads GOOGLE_API_KEY (never sent to the browser), validates an
// aggregates-only payload, asks Gemini for one short narrative paragraph.
// Every failure returns a status the client treats as "keep the on-device bullets".
import { GoogleGenAI } from "@google/genai";
import { insightPayloadSchema } from "@/lib/ai-insights";

export const runtime = "nodejs";

const SYSTEM_INSTRUCTION =
  "You are a Nigerian catfish-farming P&L analyst. Given these per-pond metrics, " +
  "write ONE short paragraph (max 4 sentences) a smallholder farmer can act on today. " +
  "Use Naira and plain language. No preamble, no bullet points, no markdown, no asterisks.";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export async function POST(req: Request): Promise<Response> {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return json({ error: "ai_unavailable" }, 503);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const parsed = insightPayloadSchema.safeParse(raw);
  if (!parsed.success) return json({ error: "bad_request" }, 400);

  try {
    const ai = new GoogleGenAI({ apiKey: key });
    const res = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL ?? "gemini-3.5-flash",
      contents: JSON.stringify(parsed.data),
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        maxOutputTokens: 400,
        temperature: 0.4,
        // Gemini 3.x "thinks" by default; on a one-paragraph task the reasoning
        // tokens eat the output budget and the SDK returns the leaked thought
        // preamble instead of the answer. Disable thinking for a clean summary.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const summary = res.text?.trim();
    if (!summary) return json({ error: "no_summary" }, 422);
    return json({ summary }, 200);
  } catch (err) {
    // Log server-side (visible in Netlify function logs) but never leak provider detail to the client.
    console.error("[insights] Gemini call failed:", err);
    return json({ error: "ai_error" }, 502);
  }
}

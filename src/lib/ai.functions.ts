import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

async function callLovableAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (res.status === 429) throw new Error("AI rate limit reached. Try again in a moment.");
  if (res.status === 402) throw new Error("AI credits exhausted. Add credits in workspace billing.");
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI request failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content?.toString().trim() ?? "";
}

/** Draft a polished, SARS-friendly line-item description from a short prompt. */
export const draftQuoteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        brief: z.string().min(2).max(500),
        tone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const system = `You write concise, professional line-item descriptions for South African business quotations.
Rules:
- One sentence, 8–22 words.
- Plain, specific language. No marketing fluff.
- SARS-friendly: clear enough that a tax invoice would not be queried.
- Currency is ZAR. Do not include prices or VAT in the description.
- Reply with ONLY the description text — no quotes, no labels.`;
    const tone = data.tone ? `\nBusiness tone preference: ${data.tone}` : "";
    const out = await callLovableAI(system, `Brief: ${data.brief}${tone}`);
    return { description: out.replace(/^["'\s]+|["'\s]+$/g, "") };
  });

/** Generate intro + closing notes for the whole quote. */
export const draftQuoteNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessName: z.string().optional(),
        clientName: z.string().optional(),
        scope: z.string().min(2).max(800),
        tone: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const system = `You write short, warm-but-professional quote notes for South African SMEs.
Output JSON only, no prose around it:
{"intro": "...", "terms": "..."}
- intro: 1–2 sentences thanking the client and summarising scope.
- terms: 1–2 sentences covering validity, payment terms (50% deposit standard), and that prices are VAT-inclusive at 15%.`;
    const userPrompt = `Business: ${data.businessName ?? "(unspecified)"}
Client: ${data.clientName ?? "(unspecified)"}
Scope: ${data.scope}
Tone: ${data.tone ?? "professional, warm"}`;
    const raw = await callLovableAI(system, userPrompt);
    try {
      const cleaned = raw.replace(/^```json|```$/gi, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        intro: String(parsed.intro ?? ""),
        terms: String(parsed.terms ?? ""),
      };
    } catch {
      return { intro: raw, terms: "" };
    }
  });

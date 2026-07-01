import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { callAIWithFallback } from "./ai-call.server";

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
  .handler(async ({ data, context }) => {
    const system = `You write concise, professional line-item descriptions for South African business quotations.
Rules:
- One sentence, 8–22 words.
- Plain, specific language. No marketing fluff.
- SARS-friendly: clear enough that a tax invoice would not be queried.
- Currency is ZAR. Do not include prices or VAT in the description.
- Reply with ONLY the description text — no quotes, no labels.`;
    const tone = data.tone ? `\nBusiness tone preference: ${data.tone}` : "";
    const res = await callAIWithFallback({
      kind: "quote_item",
      systemPrompt: system,
      userPrompt: `Brief: ${data.brief}${tone}`,
      minLength: 15,
      retryOnce: true,
      supabase: context.supabase,
      userId: context.userId,
    });
    return {
      description: res.content.replace(/^["'\s]+|["'\s]+$/g, ""),
      modelUsed: res.modelUsed,
    };
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
  .handler(async ({ data, context }) => {
    const system = `You write short, warm-but-professional quote notes for South African SMEs.
Output JSON only, no prose around it:
{"intro": "...", "terms": "..."}
- intro: 1–2 sentences thanking the client and summarising scope.
- terms: 1–2 sentences covering validity, payment terms (50% deposit standard), and that prices are VAT-inclusive at 15%.`;
    const userPrompt = `Business: ${data.businessName ?? "(unspecified)"}
Client: ${data.clientName ?? "(unspecified)"}
Scope: ${data.scope}
Tone: ${data.tone ?? "professional, warm"}`;

    // Try up to 2 full fallback passes to get parseable JSON.
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await callAIWithFallback({
        kind: "quote_notes",
        systemPrompt: system,
        userPrompt,
        minLength: 20,
        retryOnce: attempt === 0,
        supabase: context.supabase,
        userId: context.userId,
      });
      const cleaned = res.content.replace(/^```json|```$/gi, "").trim();
      try {
        const parsed = JSON.parse(cleaned);
        const intro = String(parsed.intro ?? "").trim();
        const terms = String(parsed.terms ?? "").trim();
        if (intro.length >= 10) {
          return { intro, terms, modelUsed: res.modelUsed };
        }
      } catch {
        // fall through to next attempt
      }
    }
    throw new Error(
      "AI returned an unusable response. Please try again or write the notes manually.",
    );
  });

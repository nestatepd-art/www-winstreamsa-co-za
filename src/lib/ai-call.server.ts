/**
 * Shared Lovable AI Gateway call helper with:
 *  - Fallback model chain (if one model errors, try the next)
 *  - Response validation (non-empty, minimum length, finish_reason check)
 *  - 1 retry on transient failure (network / 5xx / short output)
 *  - Audit log to `ai_generations` for every attempt
 *
 * Server-only. Only import from *.functions.ts handlers or *.server.ts files.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const DEFAULT_MODEL_CHAIN = [
  "google/gemini-3-flash-preview",
  "openai/gpt-5-mini",
  "google/gemini-2.5-flash",
] as const;

export type CallOpts = {
  systemPrompt: string;
  userPrompt: string;
  /** Ordered fallback chain — first is tried first. */
  models?: readonly string[];
  /** Minimum useful output length (chars). Shorter output triggers retry/fallback. */
  minLength?: number;
  /** Optional retry on the same model before falling back. */
  retryOnce?: boolean;
  /** Audit metadata */
  kind: string;
  supabase: SupabaseClient<Database>;
  userId: string;
};

export type CallResult = {
  content: string;
  modelUsed: string;
  finishReason: string | null;
};

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

async function attempt(
  model: string,
  system: string,
  user: string,
  key: string,
): Promise<{ content: string; finishReason: string | null; status: number; error?: string }> {
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return { content: "", finishReason: null, status: res.status, error: txt.slice(0, 300) };
    }
    const data = await res.json();
    const choice = data?.choices?.[0];
    const content = choice?.message?.content?.toString().trim() ?? "";
    const finishReason = choice?.finish_reason ?? null;
    return { content, finishReason, status: 200 };
  } catch (e) {
    return {
      content: "",
      finishReason: null,
      status: 0,
      error: e instanceof Error ? e.message : "network error",
    };
  }
}

export async function callAIWithFallback(opts: CallOpts): Promise<CallResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("AI is not configured");

  const models = opts.models ?? DEFAULT_MODEL_CHAIN;
  const minLength = opts.minLength ?? 10;
  const started = Date.now();
  const tried: string[] = [];
  let lastErr = "";
  let lastFinish: string | null = null;

  for (const model of models) {
    for (let a = 0; a < (opts.retryOnce ? 2 : 1); a++) {
      tried.push(model);
      const r = await attempt(model, opts.systemPrompt, opts.userPrompt, key);
      lastFinish = r.finishReason;

      // Terminal payment/billing errors — don't waste further attempts.
      if (r.status === 402) {
        await log(opts, tried, null, "error", null, started, 0, "AI credits exhausted");
        throw new Error("AI credits exhausted. Add credits in workspace billing.");
      }

      const good =
        r.status === 200 &&
        r.content.length >= minLength &&
        (r.finishReason === null ||
          r.finishReason === "stop" ||
          r.finishReason === "end_turn");

      if (good) {
        await log(
          opts,
          tried,
          model,
          "ok",
          r.finishReason,
          started,
          r.content.length,
          null,
        );
        return { content: r.content, modelUsed: model, finishReason: r.finishReason };
      }

      lastErr =
        r.error ||
        (r.status !== 200
          ? `HTTP ${r.status}`
          : r.content.length < minLength
            ? `output too short (${r.content.length} chars)`
            : `bad finish_reason=${r.finishReason}`);

      // Non-retryable HTTP status → break inner retry, move to next model.
      if (r.status !== 0 && !RETRYABLE_STATUS.has(r.status) && r.status !== 200) break;
    }
  }

  await log(opts, tried, null, "error", lastFinish, started, 0, lastErr);
  throw new Error(
    `AI draft failed after trying ${tried.length} attempt(s): ${lastErr}. Please try again.`,
  );
}

async function log(
  opts: CallOpts,
  tried: string[],
  modelUsed: string | null,
  status: "ok" | "error",
  finishReason: string | null,
  started: number,
  outputLength: number,
  error: string | null,
) {
  try {
    await opts.supabase.from("ai_generations").insert({
      user_id: opts.userId,
      kind: opts.kind,
      model_used: modelUsed,
      models_tried: tried,
      status,
      finish_reason: finishReason,
      duration_ms: Date.now() - started,
      output_length: outputLength,
      error,
    });
  } catch {
    // Never let audit logging fail the caller.
  }
}

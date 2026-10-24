import { createLovableAiGatewayRunIdFetch } from "./run-id.ts";
import { DRAFTING_MODEL, DRAFTING_REASONING_EFFORT, draftingSchema } from "./drafting";

export async function modernDraft(system: string, user: string, kind: string, key: string, model = DRAFTING_MODEL) {
  const run = createLovableAiGatewayRunIdFetch();
  const schema = draftingSchema(kind);
  const response = await run.fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model, stream: true, store: false,
      reasoning: { effort: DRAFTING_REASONING_EFFORT, summary: "auto" }, include: ["reasoning.encrypted_content"],
      input: [{ role: "system", content: system }, { role: "user", content: user }],
      ...(schema ? { text: { format: { type: "json_schema", name: kind, strict: true, schema } } } : {}),
    }),
  });
  if (!response.ok) {
    const raw = await response.text();
    let message = raw;
    try { const parsed = JSON.parse(raw); message = parsed.error?.message ?? parsed.message ?? raw; } catch { /* plain error */ }
    throw Object.assign(new Error(message || `AI request failed (${response.status})`), { status: response.status });
  }
  if (!response.body) throw new Error("AI returned no response stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "", content = "", completed = false;
  try {
    while (true) {
      const chunk = await reader.read();
      pending += decoder.decode(chunk.value, { stream: !chunk.done });
      const lines = pending.split("\n"); pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ") || line.slice(6).trim() === "[DONE]") continue;
        const event = JSON.parse(line.slice(6));
        if (event.type === "response.output_text.delta") content += event.delta;
        if (event.type === "response.refusal.delta" || event.type === "response.refusal.done") throw new Error(event.refusal ?? event.delta ?? "The AI provider declined this request.");
        if (event.type === "error" || event.type === "response.failed") throw new Error(event.message ?? event.response?.error?.message ?? "AI drafting failed.");
        if (event.type === "response.incomplete") throw new Error("AI draft was incomplete. Your original work has been kept.");
        if (event.type === "response.completed") completed = true;
      }
      if (chunk.done) break;
    }
  } finally { reader.releaseLock(); }
  if (!completed || !content.trim()) throw new Error("AI returned an empty or incomplete draft. Your original work has been kept.");
  return content.trim();
}
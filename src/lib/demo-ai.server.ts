/**
 * Minimal AI helper for the public demo workspace.
 * No auth, no credit ledger — instead a small per-IP budget so the
 * sandbox cannot be abused as a free AI endpoint.
 */
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 6;
const buckets = new Map<string, { count: number; resetAt: number }>();

export function demoRateLimit(ip: string) {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_PER_WINDOW) return false;
  bucket.count += 1;
  return true;
}

const SYSTEM = `You write content for South African small-business quotes and invoices.
Return JSON only, no markdown fences:
{"title":"...","items":[{"description":"...","qty":1,"unitPrice":0}],"notes":"..."}
Rules:
- 2 to 4 realistic line items with plain, specific descriptions (8-18 words).
- unitPrice is a realistic ZAR amount (numbers only, VAT inclusive at 15%).
- notes: 1-2 sentences covering validity and payment terms.`;

export type DemoDraft = {
  title: string;
  items: { description: string; qty: number; unitPrice: number }[];
  notes: string;
};

export async function demoDraftDocument(brief: string, clientName: string): Promise<DemoDraft> {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("AI is not configured right now.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Client: ${clientName || "(not specified)"}\nJob brief: ${brief}` },
      ],
    }),
  });

  if (!res.ok) throw new Error("The AI assistant is busy — please try again in a moment.");

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = (json.choices?.[0]?.message?.content ?? "").replace(/^```json|```$/gi, "").trim();

  let parsed: DemoDraft;
  try {
    parsed = JSON.parse(raw) as DemoDraft;
  } catch {
    throw new Error("AI returned an unusable response. Please try again.");
  }

  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .slice(0, 6)
    .map((i) => ({
      description: String(i.description ?? "").slice(0, 200),
      qty: Number(i.qty) > 0 ? Number(i.qty) : 1,
      unitPrice: Number(i.unitPrice) > 0 ? Number(i.unitPrice) : 0,
    }))
    .filter((i) => i.description.length > 3);

  if (!items.length) throw new Error("AI returned no usable line items. Please try again.");

  return {
    title: String(parsed.title ?? brief).slice(0, 120),
    items,
    notes: String(parsed.notes ?? "").slice(0, 500),
  };
}

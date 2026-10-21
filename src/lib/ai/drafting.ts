export const DRAFTING_MODEL = "openai/gpt-6-astra";

const objectSchema = (properties: Record<string, unknown>) => ({
  type: "object", properties, required: Object.keys(properties), additionalProperties: false,
});
export function draftingSchema(kind: string) {
  const text = { type: "string" };
  if (kind === "quote_notes") return objectSchema({ intro: text, terms: text });
  if (kind === "client_msg_email") return objectSchema({ subject: text, body: text });
  if (kind === "public_document") return objectSchema({
    title: text, notes: text,
    items: { type: "array", items: objectSchema({ description: text, qty: { type: "number" }, unitPrice: { type: "number" } }) },
  });
  return undefined;
}
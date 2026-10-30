export function formatZAR(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (!Number.isFinite(n)) return "R 0.00";
  return `R ${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)}`;
}

export function cleanDocumentText(value: string | null | undefined): string {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function cleanDocumentTitle(value: string | null | undefined, fallback = "Invoice"): string {
  const clean = cleanDocumentText(value)
    .replace(/^invoice\s+for\s+/i, "")
    .replace(/^(quote|quotation)\s*[:#-]?\s*/i, "")
    .trim();
  return clean || fallback;
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export const DISCOUNT_TIERS = [0, 10, 15, 20, 30] as const;
export const DISCOUNT_VALID_DAYS = 7;

/** Discount is applied before VAT. */
export function computeQuoteTotals(
  items: { quantity: number; unit_price: number }[],
  vatRate: number,
  discountRate = 0,
) {
  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
  const discount_amount = +(subtotal * (discountRate / 100)).toFixed(2);
  const net = subtotal - discount_amount;
  const vat_amount = +(net * (vatRate / 100)).toFixed(2);
  const total = +(net + vat_amount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), discount_amount, vat_amount, total };
}

/** Date (YYYY-MM-DD) the discount expires: 7 days from the given start. */
export function discountValidUntil(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + DISCOUNT_VALID_DAYS);
  return d.toISOString().slice(0, 10);
}

export function discountClause(rate: number, validUntil: string | null | undefined): string | null {
  if (!rate || !validUntil) return null;
  const nice = new Date(validUntil + "T00:00:00").toLocaleDateString("en-ZA", { day: "2-digit", month: "long", year: "numeric" });
  return `${rate}% discount is valid for 7 days only, until ${nice}. After this date the discount lapses and standard pricing applies.`;
}

export function generateQuoteNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `Q-${y}${m}-${rnd}`;
}

export function generateInvoiceNumber(): string {
  const d = new Date();
  const y = d.getFullYear().toString().slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const rnd = Math.floor(Math.random() * 9000 + 1000);
  return `INV-${y}${m}-${rnd}`;
}

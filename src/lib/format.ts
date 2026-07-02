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

export function computeQuoteTotals(
  items: { quantity: number; unit_price: number }[],
  vatRate: number,
) {
  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);
  const vat_amount = +(subtotal * (vatRate / 100)).toFixed(2);
  const total = +(subtotal + vat_amount).toFixed(2);
  return { subtotal: +subtotal.toFixed(2), vat_amount, total };
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

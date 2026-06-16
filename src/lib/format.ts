export function formatZAR(amount: number | string | null | undefined): string {
  const n = typeof amount === "string" ? parseFloat(amount) : (amount ?? 0);
  if (Number.isNaN(n)) return "R 0.00";
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
  }).format(n);
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
  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
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

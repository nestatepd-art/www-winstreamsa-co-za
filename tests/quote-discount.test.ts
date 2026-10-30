import { describe, it, expect } from "vitest";
import { computeQuoteTotals, discountValidUntil, DISCOUNT_TIERS } from "../src/lib/format";

describe("quote discount", () => {
  it("offers 10, 15, 20 and 30% tiers", () => {
    expect(DISCOUNT_TIERS.filter((t) => t > 0)).toEqual([10, 15, 20, 30]);
  });
  it("applies discount before 15% VAT", () => {
    const t = computeQuoteTotals([{ quantity: 1, unit_price: 1000 }], 15, 20);
    expect(t.discount_amount).toBe(200);
    expect(t.vat_amount).toBe(120);
    expect(t.total).toBe(920);
  });
  it("expires 7 days after issue", () => {
    expect(discountValidUntil(new Date("2026-10-30T10:00:00Z"))).toBe("2026-11-06");
  });
});

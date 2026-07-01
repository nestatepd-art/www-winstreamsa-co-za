// Single source of truth — must match (a) public pricing page, (b) DB consume_quota.
// If you change a number here, update the pricing page and the consume_quota
// migration in the same commit.

export type QuotaKind = "quote" | "proposal" | "ai_draft";

export const FREE_LIMITS: Record<QuotaKind, number> = {
  quote: 20,
  proposal: 1,
  ai_draft: 20,
};

export const QUOTA_LABEL: Record<QuotaKind, string> = {
  quote: "Quotes",
  proposal: "Proposals",
  ai_draft: "AI drafts",
};

// 1 credit = 1 overflow action (proposal = 5).
export const CREDIT_COST: Record<QuotaKind, number> = {
  quote: 1,
  proposal: 5,
  ai_draft: 1,
};

// Public-pricing-page plan prices.
export const STARTER_PRICE_ZAR = 299;
export const GROWTH_PRICE_ZAR = 599;

export type PlanTier = "free" | "starter" | "growth";

export const PLAN_BY_PRICE_ID: Record<string, PlanTier> = {
  starter_monthly: "starter",
  growth_monthly: "growth",
  // Legacy — treat as growth (unlimited quotes) for any historical subscriber.
  scale_monthly: "growth",
};

export const CREDIT_PACKS = [
  { credits: 100, price_zar: 99, label: "100 Credits", priceId: "credits_100" },
  { credits: 500, price_zar: 399, label: "500 Credits", priceId: "credits_500", popular: true },
  { credits: 2000, price_zar: 1299, label: "2,000 Credits", priceId: "credits_2000" },
];

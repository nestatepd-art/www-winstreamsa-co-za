// Single source of truth for Freemium + Usage Credits.
// Tweak numbers here; UI & server enforcement read from this file.

export type QuotaKind = "quote" | "proposal" | "ai_draft";

export const FREE_LIMITS: Record<QuotaKind, number> = {
  quote: 5,
  proposal: 1,
  ai_draft: 20,
};

export const QUOTA_LABEL: Record<QuotaKind, string> = {
  quote: "Quotes",
  proposal: "Proposals",
  ai_draft: "AI drafts",
};

// 1 credit = 1 overflow action of any kind.
export const CREDIT_COST: Record<QuotaKind, number> = {
  quote: 1,
  proposal: 5,
  ai_draft: 1,
};

export const PRO_PRICE_ZAR = 299;

export const CREDIT_PACKS = [
  { credits: 50, price_zar: 100, label: "Starter" },
  { credits: 150, price_zar: 250, label: "Team", popular: true },
  { credits: 400, price_zar: 600, label: "Agency" },
];

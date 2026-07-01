## New tier structure

| Plan | Price | Quotes/mo | Branding | Follow-ups (marketing) |
|---|---|---|---|---|
| Free | R0 | 20 | WinStream branded | 1 |
| Starter | R299 | 100 | Unbranded | 3-step |
| Growth | R599 | Unlimited | Unbranded + priority | Unlimited |

Top-up credit packs (R99/R399/R1,299) unchanged. Scale removed entirely.

## Changes

### 1. Database migration
- Extend `billing_plan` enum: add `'starter'` and `'growth'` (keep `'pro'` for backward compat, treat as alias of growth).
- Rewrite `consume_quota` so per-plan quote limits are: free=20, starter=100, growth/pro=unlimited. Proposals and AI drafts stay unlimited on any paid plan; free keeps current proposal=1, ai_draft=20 limits.
- Update `claim_pending_purchases` to set plan based on `price_id` (`starter_monthly` → starter, `growth_monthly` → growth).

### 2. `src/lib/billing.constants.ts`
- `FREE_LIMITS.quote = 20`.
- Replace `GROWTH_PRICE_ZAR`/`SCALE_PRICE_ZAR` with `STARTER_PRICE_ZAR = 299`, `GROWTH_PRICE_ZAR = 599`.
- Add `PLAN_BY_PRICE_ID` map.

### 3. Paddle catalog
- Create `starter_plan` product with `starter_monthly` price at R299/mo (ZAR).
- Update existing `growth_monthly` price from R499 → R599.
- Archive `scale_plan` product (keeps existing subs valid; removes from checkout).

### 4. Webhook handler (`src/routes/api/public/payments/webhook.ts`)
- Map `price_id` → plan when writing subscription so `user_credits.plan` is set correctly.

### 5. `src/routes/pricing.tsx`
- Replace 3 plans with Free / Starter / Growth featuring Starter as "Most popular".
- Update feature lists and CTAs.
- Update JSON-LD offers.

### 6. Copy
- Update home/features pages if they reference "R499 Growth" or "Scale".

## Notes
- Follow-up automation is marketing copy only for now (per your answer).
- No existing Scale customers, so straight archive is safe.
- Test in preview with test card 4242 4242 4242 4242 after publish-sync of new Paddle prices.
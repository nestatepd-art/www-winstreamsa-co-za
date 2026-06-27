
-- 1) Fix free-plan limits & proposal cost to match pricing-page source of truth.
CREATE OR REPLACE FUNCTION public.consume_quota(_kind text, _related_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.user_credits;
  used int;
  limit_val int;
  cost int;
  new_balance int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _kind NOT IN ('quote','proposal','ai_draft') THEN RAISE EXCEPTION 'Invalid kind'; END IF;

  row := public.init_user_credits();

  limit_val := CASE _kind
    WHEN 'quote' THEN 5
    WHEN 'proposal' THEN 1
    WHEN 'ai_draft' THEN 20
  END;
  cost := CASE _kind
    WHEN 'quote' THEN 1
    WHEN 'proposal' THEN 5
    WHEN 'ai_draft' THEN 1
  END;
  used := CASE _kind
    WHEN 'quote' THEN row.quotes_used
    WHEN 'proposal' THEN row.proposals_used
    WHEN 'ai_draft' THEN row.ai_drafts_used
  END;

  IF row.plan = 'pro' THEN
    UPDATE public.user_credits
       SET quotes_used    = quotes_used    + CASE WHEN _kind='quote' THEN 1 ELSE 0 END,
           proposals_used = proposals_used + CASE WHEN _kind='proposal' THEN 1 ELSE 0 END,
           ai_drafts_used = ai_drafts_used + CASE WHEN _kind='ai_draft' THEN 1 ELSE 0 END
     WHERE user_id = uid
     RETURNING * INTO row;
    RETURN jsonb_build_object('ok',true,'used',used+1,'limit',null,'balance',row.credit_balance,'charged',0);
  END IF;

  IF used < limit_val THEN
    UPDATE public.user_credits
       SET quotes_used    = quotes_used    + CASE WHEN _kind='quote' THEN 1 ELSE 0 END,
           proposals_used = proposals_used + CASE WHEN _kind='proposal' THEN 1 ELSE 0 END,
           ai_drafts_used = ai_drafts_used + CASE WHEN _kind='ai_draft' THEN 1 ELSE 0 END
     WHERE user_id = uid
     RETURNING * INTO row;
    RETURN jsonb_build_object('ok',true,'used',used+1,'limit',limit_val,'balance',row.credit_balance,'charged',0);
  END IF;

  IF row.credit_balance < cost THEN
    RETURN jsonb_build_object('ok',false,'reason','insufficient_credits','used',used,'limit',limit_val,'balance',row.credit_balance,'cost',cost,'kind',_kind);
  END IF;

  new_balance := row.credit_balance - cost;
  UPDATE public.user_credits
     SET credit_balance = new_balance,
         quotes_used    = quotes_used    + CASE WHEN _kind='quote' THEN 1 ELSE 0 END,
         proposals_used = proposals_used + CASE WHEN _kind='proposal' THEN 1 ELSE 0 END,
         ai_drafts_used = ai_drafts_used + CASE WHEN _kind='ai_draft' THEN 1 ELSE 0 END
   WHERE user_id = uid;
  INSERT INTO public.credit_transactions (user_id, delta, reason, related_id)
  VALUES (uid, -cost, 'consume:' || _kind, _related_id);

  RETURN jsonb_build_object('ok',true,'used',used+1,'limit',limit_val,'balance',new_balance,'charged',cost);
END;
$$;

-- 2) 30-day rolling reset (was tied to calendar month).
CREATE OR REPLACE FUNCTION public.init_user_credits()
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.user_credits;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO row FROM public.user_credits WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO row FROM public.user_credits WHERE user_id = uid;
  END IF;

  -- Roll the period when 30+ days have elapsed since the last reset.
  IF row.period_start < (CURRENT_DATE - INTERVAL '30 days') THEN
    UPDATE public.user_credits
       SET period_start = CURRENT_DATE,
           quotes_used = 0,
           proposals_used = 0,
           ai_drafts_used = 0
     WHERE user_id = uid
     RETURNING * INTO row;
    INSERT INTO public.credit_transactions (user_id, delta, reason)
    VALUES (uid, 0, 'monthly_reset');
  END IF;

  RETURN row;
END;
$$;

-- 3) Pending purchases table for guest checkouts.
CREATE TABLE IF NOT EXISTS public.pending_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('subscription','credits')),
  plan text,
  credits int,
  price_id text,
  paddle_subscription_id text,
  paddle_customer_id text,
  paddle_transaction_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  status text NOT NULL DEFAULT 'pending',
  claimed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pending_purchases_email ON public.pending_purchases (lower(email)) WHERE status = 'pending';

GRANT SELECT ON public.pending_purchases TO authenticated;
GRANT ALL ON public.pending_purchases TO service_role;

ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view pending purchases for their email"
  ON public.pending_purchases FOR SELECT
  USING (lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid())));

-- 4) Claim function: applies any pending entitlements for the caller's email.
CREATE OR REPLACE FUNCTION public.claim_pending_purchases()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  user_email text;
  rec record;
  claimed_count int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT email INTO user_email FROM auth.users WHERE id = uid;
  IF user_email IS NULL THEN RETURN 0; END IF;

  PERFORM public.init_user_credits();

  FOR rec IN
    SELECT * FROM public.pending_purchases
     WHERE status = 'pending' AND lower(email) = lower(user_email)
     ORDER BY created_at ASC
  LOOP
    IF rec.kind = 'subscription' AND rec.paddle_subscription_id IS NOT NULL THEN
      INSERT INTO public.subscriptions (
        user_id, paddle_subscription_id, paddle_customer_id,
        product_id, price_id, status, environment, updated_at
      ) VALUES (
        uid, rec.paddle_subscription_id, COALESCE(rec.paddle_customer_id, ''),
        COALESCE(rec.plan, 'pro'), COALESCE(rec.price_id, ''),
        'active', rec.environment, now()
      )
      ON CONFLICT (paddle_subscription_id) DO UPDATE SET user_id = uid, updated_at = now();

      UPDATE public.user_credits
         SET plan = 'pro',
             credit_balance = credit_balance + COALESCE(rec.credits, 0),
             quotes_used = 0, proposals_used = 0, ai_drafts_used = 0
       WHERE user_id = uid;
      INSERT INTO public.credit_transactions (user_id, delta, reason)
      VALUES (uid, COALESCE(rec.credits, 0), 'claim_subscription:' || COALESCE(rec.price_id, ''));
    ELSIF rec.kind = 'credits' THEN
      UPDATE public.user_credits
         SET credit_balance = credit_balance + COALESCE(rec.credits, 0)
       WHERE user_id = uid;
      INSERT INTO public.credit_transactions (user_id, delta, reason)
      VALUES (uid, COALESCE(rec.credits, 0), 'claim_topup:' || COALESCE(rec.paddle_transaction_id, ''));
    END IF;

    UPDATE public.pending_purchases
       SET status = 'claimed', claimed_by = uid, claimed_at = now()
     WHERE id = rec.id;
    claimed_count := claimed_count + 1;
  END LOOP;

  RETURN claimed_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_pending_purchases() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_pending_purchases() TO authenticated;

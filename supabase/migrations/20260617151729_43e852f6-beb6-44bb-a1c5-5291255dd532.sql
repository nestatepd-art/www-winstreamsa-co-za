
-- 1) Remove client write policies on user_credits (read stays).
DROP POLICY IF EXISTS "Users insert own credits" ON public.user_credits;
DROP POLICY IF EXISTS "Users update own credits" ON public.user_credits;

-- Revoke direct write privileges; SECURITY DEFINER functions handle writes.
REVOKE INSERT, UPDATE, DELETE ON public.user_credits FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM authenticated;

-- 2) Initialise / fetch credit row, with monthly reset. Returns the row.
CREATE OR REPLACE FUNCTION public.init_user_credits()
RETURNS public.user_credits
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  row public.user_credits;
  this_period date := date_trunc('month', now())::date;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO row FROM public.user_credits WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id) VALUES (uid)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO row FROM public.user_credits WHERE user_id = uid;
  END IF;

  IF row.period_start <> this_period THEN
    UPDATE public.user_credits
       SET period_start = this_period,
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

-- 3) Consume quota atomically. Returns jsonb result.
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
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _kind NOT IN ('quote','proposal','ai_draft') THEN
    RAISE EXCEPTION 'Invalid kind';
  END IF;

  row := public.init_user_credits();

  -- Free-plan limits and costs (kept in sync with src/lib/billing.constants.ts)
  limit_val := CASE _kind
    WHEN 'quote' THEN 5
    WHEN 'proposal' THEN 3
    WHEN 'ai_draft' THEN 10
  END;
  cost := CASE _kind
    WHEN 'quote' THEN 1
    WHEN 'proposal' THEN 2
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

-- 4) Simulated top-up.
CREATE OR REPLACE FUNCTION public.topup_credits(_credits int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_balance int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _credits IS NULL OR _credits < 1 OR _credits > 10000 THEN
    RAISE EXCEPTION 'Invalid credit amount';
  END IF;
  PERFORM public.init_user_credits();
  UPDATE public.user_credits
     SET credit_balance = credit_balance + _credits
   WHERE user_id = uid
   RETURNING credit_balance INTO new_balance;
  INSERT INTO public.credit_transactions (user_id, delta, reason)
  VALUES (uid, _credits, 'topup:simulated');
  RETURN new_balance;
END;
$$;

-- 5) Simulated plan change.
CREATE OR REPLACE FUNCTION public.set_user_plan(_plan text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _plan NOT IN ('free','pro') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  PERFORM public.init_user_credits();
  UPDATE public.user_credits SET plan = _plan::billing_plan WHERE user_id = uid;
  INSERT INTO public.credit_transactions (user_id, delta, reason)
  VALUES (uid, 0, 'plan:' || _plan || ':simulated');
  RETURN _plan;
END;
$$;

GRANT EXECUTE ON FUNCTION public.init_user_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_quota(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.topup_credits(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_plan(text) TO authenticated;

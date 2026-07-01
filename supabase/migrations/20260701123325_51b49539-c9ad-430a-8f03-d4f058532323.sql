
CREATE OR REPLACE FUNCTION public.consume_quota(_kind text, _related_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  row public.user_credits;
  sub_price text;
  used int;
  limit_val int;
  cost int;
  new_balance int;
  is_paid boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _kind NOT IN ('quote','proposal','ai_draft') THEN RAISE EXCEPTION 'Invalid kind'; END IF;

  row := public.init_user_credits();

  SELECT price_id INTO sub_price
    FROM public.subscriptions
   WHERE user_id = uid
     AND status IN ('active','trialing','past_due')
     AND (current_period_end IS NULL OR current_period_end > now())
   ORDER BY created_at DESC
   LIMIT 1;

  is_paid := row.plan = 'pro' OR sub_price IS NOT NULL;

  cost := CASE _kind WHEN 'quote' THEN 1 WHEN 'proposal' THEN 5 WHEN 'ai_draft' THEN 1 END;
  used := CASE _kind
    WHEN 'quote' THEN row.quotes_used
    WHEN 'proposal' THEN row.proposals_used
    WHEN 'ai_draft' THEN row.ai_drafts_used
  END;

  IF _kind = 'quote' THEN
    limit_val := CASE
      WHEN sub_price IN ('growth_monthly','scale_monthly') THEN NULL
      WHEN sub_price = 'starter_monthly' THEN 100
      ELSE 20
    END;
  ELSE
    IF is_paid THEN
      limit_val := NULL;
    ELSE
      limit_val := CASE _kind WHEN 'proposal' THEN 1 WHEN 'ai_draft' THEN 20 END;
    END IF;
  END IF;

  IF limit_val IS NULL THEN
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
$function$;

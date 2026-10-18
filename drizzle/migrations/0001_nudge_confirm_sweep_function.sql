CREATE OR REPLACE FUNCTION public.nudge_confirm_sweep()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $func$
DECLARE
  r record;
  new_count int;
BEGIN
  FOR r IN
    SELECT id, user_id, followup_id, record_type
    FROM public.nudge_confirmations
    WHERE status = 'pending' AND expires_at < now()
  LOOP
    UPDATE public.nudge_confirmations
       SET status = 'expired', resolved_at = now()
     WHERE id = r.id;
    IF r.record_type = 'quote' THEN
      UPDATE public.quote_followups SET status = 'skipped' WHERE id = r.followup_id AND status = 'scheduled';
    ELSE
      UPDATE public.invoice_followups SET status = 'skipped' WHERE id = r.followup_id AND status = 'scheduled';
    END IF;
    UPDATE public.business_profiles
       SET nudge_unanswered_count = nudge_unanswered_count + 1
     WHERE user_id = r.user_id
    RETURNING nudge_unanswered_count INTO new_count;
    IF COALESCE(new_count, 0) >= 3 THEN
      UPDATE public.business_profiles SET auto_nudge_enabled = false WHERE user_id = r.user_id;
      UPDATE public.quote_followups SET status = 'skipped' WHERE user_id = r.user_id AND status = 'scheduled';
      UPDATE public.invoice_followups SET status = 'skipped' WHERE user_id = r.user_id AND status = 'scheduled';
    END IF;
  END LOOP;
END;
$func$;
REVOKE ALL ON FUNCTION public.nudge_confirm_sweep() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nudge_confirm_sweep() TO service_role;
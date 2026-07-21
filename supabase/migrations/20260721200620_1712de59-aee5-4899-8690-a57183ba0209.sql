
-- 1. Revoke public execute on internal email queue helpers and set search_path
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_invoice_followups() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.seed_quote_followups() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;

-- 2. Fix business-logos read policy to enforce ownership
DROP POLICY IF EXISTS "Authenticated read business logos" ON storage.objects;
CREATE POLICY "Users read own business logo"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'business-logos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

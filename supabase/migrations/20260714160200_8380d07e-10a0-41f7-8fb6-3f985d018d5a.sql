
-- Fix 1: Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.topup_credits(integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_user_plan(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.init_user_credits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_pending_purchases() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.consume_quota(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.topup_credits(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_plan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.init_user_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_pending_purchases() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_quota(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Fix 2: Explicit write protection for pending_purchases.
-- Writes must only happen via service_role (webhook) or the SECURITY DEFINER
-- claim_pending_purchases() RPC. Block all direct writes from anon/authenticated.
REVOKE INSERT, UPDATE, DELETE ON public.pending_purchases FROM anon, authenticated, public;

CREATE POLICY "No direct inserts by users"
  ON public.pending_purchases FOR INSERT TO authenticated, anon
  WITH CHECK (false);

CREATE POLICY "No direct updates by users"
  ON public.pending_purchases FOR UPDATE TO authenticated, anon
  USING (false) WITH CHECK (false);

CREATE POLICY "No direct deletes by users"
  ON public.pending_purchases FOR DELETE TO authenticated, anon
  USING (false);

REVOKE EXECUTE ON FUNCTION public.consume_quota FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.topup_credits FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_user_plan FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.init_user_credits FROM PUBLIC, anon, authenticated;
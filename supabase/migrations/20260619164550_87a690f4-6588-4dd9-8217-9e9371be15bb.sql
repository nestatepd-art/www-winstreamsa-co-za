GRANT EXECUTE ON FUNCTION public.init_user_credits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_quota(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.topup_credits(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_plan(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
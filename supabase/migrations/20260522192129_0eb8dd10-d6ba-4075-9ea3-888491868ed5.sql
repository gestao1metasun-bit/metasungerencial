
-- Trigger functions: nunca devem ser chamadas diretamente
REVOKE EXECUTE ON FUNCTION public.tg_audit_row() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_guard_operacional() FROM PUBLIC, anon, authenticated;

-- Helpers: somente autenticados
REVOKE EXECUTE ON FUNCTION public.is_period_closed(text, date) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_operacional(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_period_closed(text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_operacional(uuid, text, text, date) TO authenticated;

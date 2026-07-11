-- has_role só deve ser usada internamente pelas policies RLS.
-- Postgres continua conseguindo chamá-la ao avaliar policies (privilégio do dono da função).
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;

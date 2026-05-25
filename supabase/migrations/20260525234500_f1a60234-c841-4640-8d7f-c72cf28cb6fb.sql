DROP TRIGGER IF EXISTS audit_contratos ON public.contratos;
DROP TRIGGER IF EXISTS tg_contratos_snapshot ON public.contratos;
DROP TRIGGER IF EXISTS trg_contratos_updated ON public.contratos;

DROP TRIGGER IF EXISTS tg_leads_audit ON public.leads;
CREATE TRIGGER tg_leads_audit
AFTER INSERT OR UPDATE OR DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'leads');

DROP TRIGGER IF EXISTS tg_leads_versao ON public.leads;
CREATE TRIGGER tg_leads_versao
AFTER INSERT OR UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();

DROP TRIGGER IF EXISTS tg_propostas_audit ON public.propostas;
CREATE TRIGGER tg_propostas_audit
AFTER INSERT OR UPDATE OR DELETE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.tg_audit_row('comercial', 'propostas');

DROP TRIGGER IF EXISTS tg_propostas_versao ON public.propostas;
CREATE TRIGGER tg_propostas_versao
AFTER INSERT OR UPDATE ON public.propostas
FOR EACH ROW EXECUTE FUNCTION public.tg_snapshot_version();
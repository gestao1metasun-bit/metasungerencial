-- FIN.MIG.1c — Completar campos usados pela tela
ALTER TABLE public.financiamentos_pendencias
  ADD COLUMN IF NOT EXISTS cliente_nome text,
  ADD COLUMN IF NOT EXISTS gerente text,
  ADD COLUMN IF NOT EXISTS kwp numeric(10,2),
  ADD COLUMN IF NOT EXISTS andamento text;

ALTER TABLE public.financiamentos_pendencias DROP CONSTRAINT IF EXISTS financiamentos_pendencias_status_check;
ALTER TABLE public.financiamentos_pendencias ADD CONSTRAINT financiamentos_pendencias_status_check
  CHECK (status IN ('PENDENTE','EM_ANALISE','PENDENTE_BANCO','PENDENTE_CLIENTE','AGUARDANDO_DOCUMENTACAO','AGUARDANDO_LIBERACAO','APROVADO','REPROVADO','LIBEROU_ENGENHARIA','CANCELADO'));

ALTER TABLE public.financiamentos_operacoes
  ADD COLUMN IF NOT EXISTS liberacao_em date,
  ADD COLUMN IF NOT EXISTS status_lib text;
---
name: C-ENT.5 — Contratos Supabase (lista + workspace)
description: Tela oficial /comercial/contratos + workspace /comercial/contratos/$contratoId + RPC rpc_contrato_cancelar + integração Cliente 360º (aba Projetos)
type: feature
---
APLICADA 2026-06-16. Rotas `/comercial/contratos` (lista enriquecida com cliente_nome/consultor_nome/projetos_count) e `/comercial/contratos/$contratoId` (Workspace c/ 6 abas: Resumo/Propostas origem/Projetos/Documentos/Timeline/Auditoria — últimas 3 são placeholder honesto). RPC `rpc_contrato_cancelar(_id,_motivo,_observacao)` SECURITY DEFINER, motivo≥5, bloqueia se já cancelado, NÃO exclui propostas/projetos. Permissões reutilizadas C-ENT.4 (`comercial.contrato.visualizar/cancelar`). Repo `contratos-supabase-repo.ts` ampliado: `useContratosSupabase`, `useContratoSupabaseById`, `usePropostasDoContrato`, `useProjetosPorContrato`, `useProjetosPorCliente`, `useCancelarContratoSupabase`. Cliente 360º ganhou aba Projetos + botão "Abrir contrato" na aba Contratos. ZERO LS como fonte oficial, ZERO edição técnica, ZERO aditivo/assinatura/financeiro. Doc: docs/c-ent-5-contratos-workspace-relatorio.md. Próximo: C-ENT.6 (Documentos+Timeline do contrato).

-- Limpeza total de leads/propostas/contratos e dependências (dados de teste)
SET LOCAL session_replication_role = 'replica';

-- Comissões e eventos
DELETE FROM comercial_comissao_eventos;
DELETE FROM comercial_comissoes;
DELETE FROM comercial_assinatura_eventos;
DELETE FROM comercial_carteira_transferencias;

-- Aditivos
DELETE FROM aditivos;

-- Faturamentos comerciais vinculados
DELETE FROM faturamentos_comercial;

-- Contratos e seus vínculos
DELETE FROM contrato_propostas;
DELETE FROM contratos;

-- Propostas
DELETE FROM propostas;

-- Oportunidades
DELETE FROM oportunidades;

-- Leads
DELETE FROM leads;

SET LOCAL session_replication_role = 'origin';

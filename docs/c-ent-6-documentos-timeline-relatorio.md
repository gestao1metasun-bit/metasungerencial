# C-ENT.6 — Documentos e Timeline Universais (Contrato)

## Migrations
- `eventos_timeline` (append-only) + RPC `rpc_timeline_registrar` + triggers `tg_eventos_timeline_imutavel` (anti UPDATE/DELETE).
- `rpc_contrato_cancelar` reescrito: agora emite evento `CONTRATO_CANCELADO` na mesma transação (payload: codigo, status_anterior, status_novo, motivo, observacao).

## Tabelas
- **Reutilizada:** `anexos` (já cobre `contratos` no CHECK constraint, RLS via `pode_acessar_entidade`).
- **Nova:** `eventos_timeline` (RLS: SELECT/INSERT authenticated, append-only por trigger).

## Storage
- Bucket `anexos` (privado) reutilizado. Nenhum bucket novo.

## RLS
- `eventos_timeline_select_authenticated` (SELECT true)
- `eventos_timeline_insert_authenticated` (INSERT: usuario_id = auth.uid() OR null para SECURITY DEFINER)
- Triggers DB bloqueiam UPDATE/DELETE → impossível editar/excluir pela UI.

## Componentes criados (universais, reutilizáveis)
- `src/components/app/universal/DocumentosObjetoPanel.tsx` — props `objetoTipo`/`objetoId`/`readonly?`/`permissaoVisualizar?`/`permissaoUpload?`/`timelineObjetoTipo?`. Versão atual destacada; anteriores recolhidas/cinza; download via signed URL 5 min. Registra evento `DOCUMENTO_ANEXADO` se `timelineObjetoTipo` informado.
- `src/components/app/universal/TimelineObjetoPanel.tsx` — props `objetoTipo`/`objetoId`/`limite?`. Estados loading/erro/vazio. Lista append-only com tipo, título, descrição, payload colapsável, autor (uid 8 chars) e data/hora.

## Repos
- `src/lib/repositories/timeline-repo.ts` — `timelineRepo.listar/registrar` + hooks `useTimeline` / `useRegistrarEventoTimeline`.

## Aplicação ao Contrato
- `src/routes/comercial.contratos.$contratoId.tsx`:
  - aba **Documentos** → `DocumentosObjetoPanel` (`contratos` / id, gate `comercial.contrato.visualizar` + upload `comercial.contrato.editar_cadastro`).
  - aba **Timeline** → `TimelineObjetoPanel` (`contrato` / id).
  - aba **Auditoria** → mensagem honesta apontando para Timeline.

## Eventos registrados
- `CONTRATO_CANCELADO` — dentro de `rpc_contrato_cancelar` (DB).
- `DOCUMENTO_ANEXADO` — emitido pelo `DocumentosObjetoPanel` no client após upload.
- Contratos antigos: estado vazio "Nenhum evento registrado ainda."

## Permissões
- Nenhuma permissão nova (reaproveitadas: `comercial.contrato.visualizar`, `comercial.contrato.editar_cadastro`, `comercial.contrato.cancelar`).

## Arquivos
- **Criados:** `src/lib/repositories/timeline-repo.ts`, `src/components/app/universal/DocumentosObjetoPanel.tsx`, `src/components/app/universal/TimelineObjetoPanel.tsx`, `docs/c-ent-6-documentos-timeline-relatorio.md`.
- **Migrações:** 1 (eventos_timeline + RPC timeline + reescrita rpc_contrato_cancelar).
- **Editados:** `src/routes/comercial.contratos.$contratoId.tsx`.

## Riscos
- Eventos do passado (contratos anteriores a esta onda) não existem na timeline — comportamento esperado, comunicado na UI.
- `DOCUMENTO_ANEXADO` é registrado pelo client após upload bem-sucedido. Falha pontual no registro do evento NÃO desfaz o anexo (logged em `error_log`, severidade warn).
- Trigger DB ainda não emite `DOCUMENTO_ANEXADO` automaticamente — propositalmente client-side para não acoplar `anexos` a `eventos_timeline` nesta onda.

## Pendências (próximas ondas)
- Estender emissão automática de timeline a outros pontos críticos (proposta aprovada, contrato gerado, projeto criado etc.).
- Auditoria completa (diff antes/depois) consolidando `audit_log` + `eventos_timeline`.
- Versionamento avançado, assinatura digital, PDF — fora do escopo.

## Próxima onda recomendada
**C-ENT.7 — Aditivos Supabase** ou **C-ENT.6.b — Emissão automática de timeline em RPCs comerciais (gerar contrato, aprovar proposta, transferir carteira)**.

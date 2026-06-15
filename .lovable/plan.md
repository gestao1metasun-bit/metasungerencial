## Governança Enterprise — Camada Propostas

Reestruturação da camada Propostas seguindo o comando. Escopo grande e sensível (toca regras comerciais, status, auditoria e geração de contrato), portanto entrego em 4 ondas curtas e auditáveis, cada uma fechada antes da próxima.

Arquivos principais hoje:
- `src/modules/propostas/PropostasPage.tsx` (2.444 linhas)
- `src/modules/propostas/components/PropostaList.tsx` (2.332 linhas)
- `src/modules/propostas/store.ts` (modelo da proposta + ações)

### Onda P1 — UI e regras de bloqueio (frontend)

1. Renomear ação "Editar Dados do Cliente" → **"Corrigir Dados Cadastrais"** em toolbar, processos e atalhos.
2. Modal `CorrigirCadastraisDialog`:
   - Apenas campos do bloco CLIENTE / ENDEREÇO / CONTATO listados no comando (nome, CPF/CNPJ, RG/IE, telefone, WhatsApp, e-mail, CEP, logradouro, número, bairro, complemento, cidade, UF, responsável de contato, observações).
   - Campo **Motivo da correção** obrigatório (mín. 5 chars).
   - Bloqueado quando status ∈ {CANCELADA, EXPIRADA, SUBSTITUÍDA}.
3. Botão **Gerar Nova Proposta**:
   - Mantém comportamento atual (mesmo do botão laranja, novaProposta(lead)).
   - Adiciona prompt: *"Deseja marcar esta nova proposta como proposta ativa do lead?"* (Sim marca anteriores EM ABERTO como **SUBSTITUÍDA**, Não apenas cria).
4. Mensagens de bloqueio padronizadas (constantes) para:
   - Tentativa de editar campo comercial/técnico/financeiro.
   - Aprovar proposta expirada.
   - Tentativa de excluir.
5. Toolbars por status (em aberto / fechada / reprovada / cancelada / expirada / substituída) — gating dos botões `availableProcesses` e `statusActions` conforme seção 7 do comando.
6. Remover qualquer caminho remanescente para: editar livremente, duplicar, excluir, gerar contrato manual, enviar engenharia/financiamento/assinatura na camada Propostas.

### Onda P2 — Status SUBSTITUÍDA + EXPIRADA + Proposta Ativa

1. Estender enum/string de status no `store.ts` para incluir `SUBSTITUIDA` e garantir `EXPIRADA`.
2. Campo `propostaAtivaId` por lead (derivado) + ação `marcarComoAtiva(propostaId)`.
3. Job leve no carregamento da página: propostas EM ABERTO com `validade < hoje` → marcar `EXPIRADA` automaticamente (com log).
4. Filtros da lista: nova aba/chip **Substituídas** e **Expiradas**; abas existentes (Aberto / Reprovado / Fechadas) revisadas para refletir os novos status.

### Onda P3 — Auditoria obrigatória

Schema novo (mínimo) — entrega via migração Supabase:
- Tabela `propostas_audit` (id, proposta_id, lead_id, usuario_id, usuario_email, acao, status_anterior, status_novo, campo, valor_anterior, valor_novo, motivo, ip, user_agent, created_at) com RLS leitura authenticated, INSERT só via RPC `rpc_proposta_audit_log`.

Eventos cobertos: criação, correção cadastral, geração de nova proposta, aprovação, reprovação, cancelamento, reabertura, expiração automática, marcação como substituída, criação automática do contrato.

UI: substituir o `historico` da proposta hoje genérico por leitura desta tabela no `ModuloHistoricoDrawer` (com diff antes/depois e motivo).

### Onda P4 — Contrato automático ao aprovar

1. Ao executar APROVAR PROPOSTA (após validação dos campos obrigatórios cliente/comercial/técnico listados na seção 6):
   - Status → `APROVADA`.
   - Bloqueio definitivo de edição comercial/técnica.
   - Criação automática de **Contrato Pendente** vinculado à proposta (reusando a estrutura atual de contratos do módulo Comercial).
   - Auditoria registra `CONTRATO_AUTO_CRIADO`.
2. Remover de vez quaisquer botões manuais "Gerar Contrato / Enviar Engenharia / Enviar Financiamento / Enviar Assinatura" remanescentes na camada Propostas.
3. Em PROPOSTAS FECHADAS, adicionar ação **Visualizar Contrato Vinculado** (link para o contrato gerado).

### Fora de escopo (explícito)

- Não mexer em workflow de Contratos, Engenharia, Financiamento ou Assinatura (apenas garantir que Propostas não os dispara manualmente).
- Não mexer no módulo Financeiro nem em Comissões.
- Não criar permissões novas além das estritamente necessárias para `proposta.corrigir_cadastral` e `proposta.reabrir` (se ainda não existirem).

### Pergunta antes de começar

Posso iniciar pela **Onda P1 (UI + regras de bloqueio + Corrigir Dados Cadastrais + prompt de proposta ativa)** sem alterar banco? Ou prefere que eu já entregue Onda P1 + P3 (auditoria) juntas para não passar duas vezes nos mesmos arquivos?

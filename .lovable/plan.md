## Escopo aprovado

O pedido cobre 4 frentes grandes simultâneas. Pela densidade (E.OS.4.b sozinho envolve canvas de assinatura, upload de fotos via Storage, anexos, geo, histórico visual; E.OS.5 envolve dashboard executivo com vários gráficos), proponho dividir em **4 entregas sequenciais**, cada uma com build limpo e relatório, em vez de tentar tudo em um único turno (o que produziria código não verificado).

## Plano

### Entrega 1 — E.OS.shell + Validação de botões (este turno)
- Adicionar links **Gestão de Serviços / Modelos / Dashboard O.S. / Produtividade** no header de `/engenharia` (4 botões de navegação no card de header).
- Varredura dos botões já existentes na camada O.S. (`gestao-servicos.*`, `modelos`, `$osId`): qualquer botão sem `onClick` ganha handler real ou `toast.info("Em breve — disponível em E.OS.X")` para evitar botão morto.
- Diagnóstico do "Tabela" em Gestão de Projetos: o código atual JÁ funciona (linhas 2369-2370 + 2375-2424). Vou validar no preview e, se houver bug visual, corrigir.

### Entrega 2 — E.OS.4.b Formulários avançados
- Bucket `os-anexos` (público=false) + RLS por `os_id`.
- `SignaturePadField` (canvas → PNG → upload Storage → URL salvo na resposta).
- `PhotoField` / `AnexoField` (upload múltiplo + preview + URL no jsonb).
- Renderer de histórico mostra fotos/anexos/assinatura embarcados.
- `rpc_os_formulario_responder` já existe; reusar.

### Entrega 3 — E.OS.5 Dashboard executivo + Produtividade
- Nova rota `/engenharia/gestao-servicos/dashboard` com cards (orçado/realizado/lucro/margem/faturável) + alertas estouro.
- Nova rota `/engenharia/gestao-servicos/produtividade` com gráficos por técnico e por equipe (recharts), hrs previstas×realizadas, tarefas abertas×concluídas.
- Aba **Produtividade** dentro de `$osId` reusando os mesmos componentes filtrados por O.S.

### Entrega 4 — Hardening & relatório 95%
- Auditoria final de botões.
- Documento `docs/e-os-95-fechamento.md` com matriz de cobertura (10 perguntas do critério).
- Build limpo final.

## Restrições respeitadas
- Sem alterar RLS existente (somente políticas novas para bucket Storage).
- Sem mudar regras de negócio ou workflow.
- Toda escrita via RPC oficial.

## Aprovação
Aprova começar pela **Entrega 1** agora?

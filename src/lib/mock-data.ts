// Dados fictícios — Meta Sun Gerencial
export const clientes = [
  { id: "CLI-001", nome: "João Pereira da Silva", doc: "123.456.789-00", cidade: "Manaus", uf: "AM", telefone: "(92) 99999-1234", status: "Ativo", contratos: 2, atualizado: "2025-05-08" },
  { id: "CLI-002", nome: "Construtora Norte LTDA", doc: "12.345.678/0001-90", cidade: "Belém", uf: "PA", telefone: "(91) 98888-2345", status: "Ativo", contratos: 1, atualizado: "2025-05-09" },
  { id: "CLI-003", nome: "Maria Souza Rodrigues", doc: "987.654.321-00", cidade: "Boa Vista", uf: "RR", telefone: "(95) 97777-3456", status: "Ativo", contratos: 1, atualizado: "2025-05-04" },
  { id: "CLI-004", nome: "Agropecuária Sol Nascente", doc: "98.765.432/0001-10", cidade: "Porto Velho", uf: "RO", telefone: "(69) 96666-4567", status: "Inativo", contratos: 3, atualizado: "2025-04-22" },
  { id: "CLI-005", nome: "Carlos Eduardo Lima", doc: "456.789.123-00", cidade: "Manaus", uf: "AM", telefone: "(92) 95555-5678", status: "Ativo", contratos: 1, atualizado: "2025-05-10" },
  { id: "CLI-006", nome: "Supermercado Bom Preço", doc: "11.222.333/0001-44", cidade: "Macapá", uf: "AP", telefone: "(96) 94444-6789", status: "Ativo", contratos: 2, atualizado: "2025-05-07" },
  { id: "CLI-007", nome: "Ana Beatriz Castro", doc: "321.654.987-00", cidade: "Manaus", uf: "AM", telefone: "(92) 93333-7890", status: "Ativo", contratos: 1, atualizado: "2025-05-06" },
];

export const vendedores = [
  { id: "VEN-01", nome: "Rafael Mendes", email: "rafael@metasun.com", contratos: 18, vendido: 1850000, kwp: 245.6, conversao: 62, meta: 2000000, status: "Ativo" },
  { id: "VEN-02", nome: "Patrícia Lopes", email: "patricia@metasun.com", contratos: 14, vendido: 1320000, kwp: 188.2, conversao: 58, meta: 1500000, status: "Ativo" },
  { id: "VEN-03", nome: "Diego Almeida", email: "diego@metasun.com", contratos: 11, vendido: 980000, kwp: 142.0, conversao: 48, meta: 1200000, status: "Ativo" },
  { id: "VEN-04", nome: "Juliana Reis", email: "juliana@metasun.com", contratos: 9, vendido: 760000, kwp: 110.5, conversao: 41, meta: 1000000, status: "Ativo" },
];

export const contratos = [
  { id: "CT-2025-0142", cliente: "João Pereira da Silva", vendedor: "Rafael Mendes", valor: 89000, kwp: 12.5, status: "Assinado", data: "2025-05-02", pagamento: "Financiamento" },
  { id: "CT-2025-0141", cliente: "Construtora Norte LTDA", vendedor: "Patrícia Lopes", valor: 245000, kwp: 38.4, status: "Assinado", data: "2025-04-28", pagamento: "Entrada + Financiamento" },
  { id: "CT-2025-0140", cliente: "Maria Souza Rodrigues", vendedor: "Diego Almeida", valor: 62000, kwp: 8.1, status: "Pendente", data: "2025-05-01", pagamento: "Cartão" },
  { id: "CT-2025-0139", cliente: "Agropecuária Sol Nascente", vendedor: "Rafael Mendes", valor: 410000, kwp: 65.0, status: "Assinado", data: "2025-04-20", pagamento: "Financiamento" },
  { id: "CT-2025-0138", cliente: "Carlos Eduardo Lima", vendedor: "Juliana Reis", valor: 74500, kwp: 10.2, status: "Gerado", data: "2025-05-09", pagamento: "À vista" },
  { id: "CT-2025-0137", cliente: "Supermercado Bom Preço", vendedor: "Patrícia Lopes", valor: 320000, kwp: 52.0, status: "Assinado", data: "2025-04-15", pagamento: "Financiamento" },
  { id: "CT-2025-0136", cliente: "Ana Beatriz Castro", vendedor: "Diego Almeida", valor: 56000, kwp: 7.5, status: "Cancelado", data: "2025-04-10", pagamento: "Financiamento" },
  { id: "CT-2025-0135", cliente: "João Pereira da Silva", vendedor: "Rafael Mendes", valor: 134000, kwp: 18.2, status: "Assinado", data: "2025-04-05", pagamento: "Entrada + Financiamento" },
];

export const financiamentos = [
  { id: "FIN-0089", cliente: "João Pereira da Silva", contrato: "CT-2025-0142", banco: "BASA", gerente: "Cláudio Ramos", valorContrato: 89000, valorFinanciado: 89000, statusOp: "Aprovado", statusLib: "8 a 15 dias", prazo: 10, dataBase: "2025-05-05", previsao: "2025-05-15", restantes: 3, obs: "" },
  { id: "FIN-0088", cliente: "Construtora Norte LTDA", contrato: "CT-2025-0141", banco: "SICREDI", gerente: "Beatriz Tavares", valorContrato: 245000, valorFinanciado: 195000, statusOp: "Em análise", statusLib: "16 a 30 dias", prazo: 25, dataBase: "2025-05-01", previsao: "2025-05-26", restantes: 14, obs: "Aguardando engenharia do banco" },
  { id: "FIN-0087", cliente: "Agropecuária Sol Nascente", contrato: "CT-2025-0139", banco: "BASA", gerente: "Cláudio Ramos", valorContrato: 410000, valorFinanciado: 360000, statusOp: "Liberado", statusLib: "Até 7 dias", prazo: 5, dataBase: "2025-05-08", previsao: "2025-05-13", restantes: 1, obs: "" },
  { id: "FIN-0086", cliente: "Supermercado Bom Preço", contrato: "CT-2025-0137", banco: "Banco do Brasil", gerente: "Henrique Costa", valorContrato: 320000, valorFinanciado: 280000, statusOp: "Aguardando documentação", statusLib: "31 a 60 dias", prazo: 45, dataBase: "2025-04-25", previsao: "2025-06-09", restantes: 28, obs: "" },
  { id: "FIN-0085", cliente: "Ana Beatriz Castro", contrato: "CT-2025-0136", banco: "SICREDI", gerente: "Beatriz Tavares", valorContrato: 56000, valorFinanciado: 56000, statusOp: "Cancelado", statusLib: "Sem prazo", prazo: 0, dataBase: "2025-04-12", previsao: "—", restantes: 0, obs: "Cliente desistiu" },
  { id: "FIN-0084", cliente: "João Pereira da Silva", contrato: "CT-2025-0135", banco: "BASA", gerente: "Cláudio Ramos", valorContrato: 134000, valorFinanciado: 100000, statusOp: "Finalizado", statusLib: "Sem prazo", prazo: 0, dataBase: "2025-04-08", previsao: "2025-04-25", restantes: 0, obs: "" },
];

export const obras = [
  { id: "OB-0231", cliente: "João Pereira da Silva", contrato: "CT-2025-0142", modulos: 24, potencia: 12.5, inversor: "Growatt MIN 10000", telhado: "Cerâmico", equipe: "Equipe A", inicio: "2025-05-10", previsto: "2025-05-13", finalizacao: null, status: "Executando instalação", obs: "" },
  { id: "OB-0230", cliente: "Agropecuária Sol Nascente", contrato: "CT-2025-0139", modulos: 120, potencia: 65.0, inversor: "Solis 60K", telhado: "Metálico", equipe: "Equipe B", inicio: "2025-05-15", previsto: "2025-05-22", finalizacao: null, status: "Aguardando instalação", obs: "" },
  { id: "OB-0229", cliente: "Supermercado Bom Preço", contrato: "CT-2025-0137", modulos: 96, potencia: 52.0, inversor: "Sungrow 50K", telhado: "Fibrocimento", equipe: "Equipe C", inicio: "2025-05-12", previsto: "2025-05-18", finalizacao: null, status: "Em projeto/aprovação", obs: "Aguardando ART" },
  { id: "OB-0228", cliente: "Construtora Norte LTDA", contrato: "CT-2025-0141", modulos: 72, potencia: 38.4, inversor: "Deye 40K", telhado: "Metálico", equipe: "Equipe A", inicio: "2025-06-02", previsto: "2025-06-08", finalizacao: null, status: "Standby", obs: "Cliente solicitou adiar" },
  { id: "OB-0227", cliente: "Carlos Eduardo Lima", contrato: "CT-2025-0138", modulos: 20, potencia: 10.2, inversor: "Growatt MIN 8000", telhado: "Cerâmico", equipe: "Equipe B", inicio: "2025-04-22", previsto: "2025-04-25", finalizacao: "2025-04-26", status: "Finalizado", obs: "" },
  { id: "OB-0226", cliente: "João Pereira da Silva", contrato: "CT-2025-0135", modulos: 36, potencia: 18.2, inversor: "Solis 15K", telhado: "Cerâmico", equipe: "Equipe C", inicio: "2025-04-15", previsto: "2025-04-19", finalizacao: "2025-04-20", status: "Finalizado", obs: "" },
];

export const pendencias = [
  { id: "PD-014", equipe: "Equipe A", cliente: "João Pereira da Silva", obra: "OB-0231", problema: "String 2 sem geração", solucao: "Trocar conector MC4", status: "Aguardando resolução", abertura: "2025-05-11", resolucao: null },
  { id: "PD-013", equipe: "Equipe C", cliente: "Supermercado Bom Preço", obra: "OB-0229", problema: "Telhado precisa reforço estrutural", solucao: "Reforço com perfil U", status: "Aguardando resolução", abertura: "2025-05-09", resolucao: null },
  { id: "PD-012", equipe: "Equipe B", cliente: "Carlos Eduardo Lima", obra: "OB-0227", problema: "Disjuntor incompatível", solucao: "Substituído por DPS 40A", status: "Problema resolvido", abertura: "2025-04-23", resolucao: "2025-04-25" },
];

export const equipes = [
  { id: "EQ-A", nome: "Equipe A", lider: "Marcos Vinícius", membros: 4, obrasAtivas: 2, status: "Ativo" },
  { id: "EQ-B", nome: "Equipe B", lider: "Roberto Carlos", membros: 3, obrasAtivas: 1, status: "Ativo" },
  { id: "EQ-C", nome: "Equipe C", lider: "Felipe Andrade", membros: 5, obrasAtivas: 1, status: "Ativo" },
];

export const bancos = [
  { id: "BCO-01", nome: "BASA", operacoes: 24, total: 3250000, status: "Ativo" },
  { id: "BCO-02", nome: "SICREDI", operacoes: 18, total: 2180000, status: "Ativo" },
  { id: "BCO-03", nome: "Banco do Brasil", operacoes: 9, total: 1420000, status: "Ativo" },
  { id: "BCO-04", nome: "Santander", operacoes: 4, total: 580000, status: "Ativo" },
];

export const gerentes = [
  { id: "GER-01", nome: "Cláudio Ramos", banco: "BASA", telefone: "(92) 98111-0001", operacoes: 14, status: "Ativo" },
  { id: "GER-02", nome: "Beatriz Tavares", banco: "SICREDI", telefone: "(92) 98111-0002", operacoes: 11, status: "Ativo" },
  { id: "GER-03", nome: "Henrique Costa", banco: "Banco do Brasil", telefone: "(92) 98111-0003", operacoes: 7, status: "Ativo" },
];

export const usuarios = [
  { id: "U-01", nome: "Admin Master", email: "admin@metasun.com", perfil: "Administrador", status: "Ativo" },
  { id: "U-02", nome: "Rafael Mendes", email: "rafael@metasun.com", perfil: "Comercial", status: "Ativo" },
  { id: "U-03", nome: "Marcos Vinícius", email: "marcos@metasun.com", perfil: "Engenharia", status: "Ativo" },
  { id: "U-04", nome: "Sandra Oliveira", email: "sandra@metasun.com", perfil: "Financeiro", status: "Ativo" },
];

export const evolucaoMensal = [
  { mes: "Jan", contratos: 12, vendido: 980000, financiado: 720000 },
  { mes: "Fev", contratos: 14, vendido: 1120000, financiado: 880000 },
  { mes: "Mar", contratos: 18, vendido: 1480000, financiado: 1100000 },
  { mes: "Abr", contratos: 22, vendido: 1850000, financiado: 1430000 },
  { mes: "Mai", contratos: 16, vendido: 1320000, financiado: 980000 },
];

export const receitaDespesa = [
  { mes: "Jan", receita: 380000, despesa: 240000 },
  { mes: "Fev", receita: 420000, despesa: 270000 },
  { mes: "Mar", receita: 510000, despesa: 290000 },
  { mes: "Abr", receita: 620000, despesa: 340000 },
  { mes: "Mai", receita: 480000, despesa: 310000 },
];

export const contasReceber = [
  { id: "CR-001", descricao: "CT-2025-0142 — Parcela 1/3", cliente: "João Pereira", valor: 29667, vencimento: "2025-05-20", status: "A receber" },
  { id: "CR-002", descricao: "CT-2025-0139 — Repasse BASA", cliente: "Agropecuária Sol Nascente", valor: 360000, vencimento: "2025-05-13", status: "A receber" },
  { id: "CR-003", descricao: "CT-2025-0138 — À vista", cliente: "Carlos Eduardo Lima", valor: 74500, vencimento: "2025-05-15", status: "A receber" },
  { id: "CR-004", descricao: "CT-2025-0135 — Quitação", cliente: "João Pereira", valor: 100000, vencimento: "2025-04-25", status: "Recebido" },
];

export const contasPagar = [
  { id: "CP-001", descricao: "Compra de módulos 540W", fornecedor: "Canadian Solar", valor: 142000, vencimento: "2025-05-22", status: "A pagar" },
  { id: "CP-002", descricao: "Inversores Growatt", fornecedor: "Distribuidora SolarTech", valor: 86000, vencimento: "2025-05-18", status: "A pagar" },
  { id: "CP-003", descricao: "Folha de pagamento", fornecedor: "Interno", valor: 78000, vencimento: "2025-05-05", status: "Vencido" },
  { id: "CP-004", descricao: "Aluguel sede", fornecedor: "Imobiliária Centro", valor: 12000, vencimento: "2025-05-10", status: "Pago" },
];

export const propostas = [
  { id: "PROP-2025-088", cliente: "João Pereira da Silva", vendedor: "Rafael Mendes", valor: 89000, kwp: 12.5, status: "Convertida", data: "2025-04-28", validade: "2025-05-12" },
  { id: "PROP-2025-087", cliente: "Maria Souza Rodrigues", vendedor: "Diego Almeida", valor: 62000, kwp: 8.1, status: "Em negociação", data: "2025-04-29", validade: "2025-05-13" },
  { id: "PROP-2025-086", cliente: "Carlos Eduardo Lima", vendedor: "Juliana Reis", valor: 74500, kwp: 10.2, status: "Enviada", data: "2025-05-02", validade: "2025-05-16" },
  { id: "PROP-2025-085", cliente: "Empresa Lumen Indústria", vendedor: "Patrícia Lopes", valor: 540000, kwp: 88.0, status: "Em negociação", data: "2025-05-03", validade: "2025-05-20" },
  { id: "PROP-2025-084", cliente: "Padaria São Jorge", vendedor: "Diego Almeida", valor: 38000, kwp: 5.4, status: "Recusada", data: "2025-04-22", validade: "2025-05-06" },
];

export const finsSemContrato = [
  { id: "FIN-SC-021", cliente: "Roberto Pinheiro", doc: "234.567.890-11", telefone: "(92) 99000-1100", banco: "BASA", gerente: "Cláudio Ramos", valor: 45000, statusOp: "Em análise", obs: "Lead vindo de indicação" },
  { id: "FIN-SC-020", cliente: "Mercearia Bom Jesus", doc: "33.444.555/0001-66", telefone: "(91) 99000-1101", banco: "SICREDI", gerente: "Beatriz Tavares", valor: 120000, statusOp: "Aprovado", obs: "Aguardando criação de contrato" },
  { id: "FIN-SC-019", cliente: "Lúcia Fernandes", doc: "555.666.777-88", telefone: "(95) 99000-1102", banco: "Banco do Brasil", gerente: "Henrique Costa", valor: 68000, statusOp: "Aguardando documentação", obs: "" },
];

export const estoqueItens = [
  { id: "EST-001", produto: "Módulo Solar 540W Mono", categoria: "Módulo", marca: "Canadian", quantidade: 480, minimo: 200, custo: 720, status: "OK" },
  { id: "EST-002", produto: "Módulo Solar 580W Bifacial", categoria: "Módulo", marca: "JA Solar", quantidade: 120, minimo: 150, custo: 850, status: "Baixo" },
  { id: "EST-003", produto: "Inversor Growatt MIN 8000", categoria: "Inversor", marca: "Growatt", quantidade: 22, minimo: 10, custo: 4200, status: "OK" },
  { id: "EST-004", produto: "Inversor Solis 60K", categoria: "Inversor", marca: "Solis", quantidade: 4, minimo: 3, custo: 18500, status: "OK" },
  { id: "EST-005", produto: "Estrutura cerâmico — kit 4 módulos", categoria: "Estrutura", marca: "Romagnole", quantidade: 60, minimo: 80, custo: 320, status: "Baixo" },
  { id: "EST-006", produto: "Cabo solar 6mm² preto (m)", categoria: "Cabo", marca: "Cobrecom", quantidade: 1850, minimo: 500, custo: 8.5, status: "OK" },
  { id: "EST-007", produto: "Conector MC4 par", categoria: "Acessório", marca: "Stäubli", quantidade: 8, minimo: 50, custo: 18, status: "Crítico" },
  { id: "EST-008", produto: "String Box CC 1000V", categoria: "Proteção", marca: "Clamper", quantidade: 32, minimo: 15, custo: 580, status: "OK" },
];

export const movimentacoesEstoque = [
  { id: "MOV-0142", data: "2025-05-11", produto: "Módulo Solar 540W Mono", tipo: "Saída", quantidade: 24, obra: "OB-0231", responsavel: "Marcos Vinícius" },
  { id: "MOV-0141", data: "2025-05-10", produto: "Inversor Growatt MIN 8000", tipo: "Saída", quantidade: 1, obra: "OB-0231", responsavel: "Marcos Vinícius" },
  { id: "MOV-0140", data: "2025-05-09", produto: "Módulo Solar 540W Mono", tipo: "Entrada", quantidade: 200, obra: null, responsavel: "Sandra Oliveira" },
  { id: "MOV-0139", data: "2025-05-08", produto: "Conector MC4 par", tipo: "Saída", quantidade: 12, obra: "OB-0229", responsavel: "Felipe Andrade" },
];

export const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

// ============================================================================
// DEV-SEED — limpa o estado local e cria 5 clientes percorrendo todas as
// camadas do sistema (Comercial → Engenharia → Estoque → Financeiro).
//
// Cada cliente representa um cenário diferente:
//   1) PIX à vista — assinado, material 100% entregue
//   2) Boleto 12x — assinado, material parcialmente entregue
//   3) Financiamento BASA — assinado, sem entrega ainda, com compra em trânsito
//   4) Cartão de crédito (à vista) — assinado, sem entrega
//   5) Misto (entrada PIX + boletos) — NÃO assinado (em aprovação)
//
// Saída: necessidades em Estoque, AR no Financeiro, obras em Engenharia,
// estoque físico inicial, entregas parciais, e 1 compra em trânsito.
// ============================================================================
import { addClienteFull, type ClienteRecord } from "@/lib/clientes-store";
import { upsertContrato, type ContratoFull, type ProjetoVinculado } from "@/lib/contratos-store";
import { gerarARsDoContratoAssinado } from "@/lib/fin-titulos-store";
import { setObrasSnapshot, type ObraSnapshot } from "@/lib/obras-snapshot-store";
import {
  garantirNecessidadeObra,
  recalcularNecessidade,
  setEstoqueAtual,
  marcarEntrega,
  setSelecionadaCompra,
} from "@/lib/estoque-store";
import { addCompraTransito } from "@/lib/compras-transito-store";

const PREFIXOS_LIMPAR = [
  "ms.contratos.v2",
  "ms.clientes.full.v1",
  "ms.clientes.extra.v1",
  "ms.aditivos.v1",
  "ms.fin.titulos.v1",
  "ms.fin.compras.v1",
  "ms.fin.pendencias.v1",
  "ms.fin.conciliacao.v1",
  "ms.fin.fechamentos.v1",
  "ms.fin.fechamentos.v2",
  "ms.estoque.itens.v1",
  "ms.estoque.necessidades.v1",
  "ms.estoque.log.v1",
  "ms.estoque.mov.v1",
  "ms.estoque.compras.transito.v1",
  "ms.engenharia.obras.snapshot.v1",
  "ms.engenharia.obras.kanban",
  "ms.obras.finalizacao.v1",
  "ms.posvenda.chamados.v1",
  "ms.posvenda.gatilhos.v1",
  "ms.posvenda.seq.v1",
  "ms.audit.v1",
];

export function limparTudoLocal() {
  if (typeof window === "undefined") return;
  for (const k of PREFIXOS_LIMPAR) window.localStorage.removeItem(k);
}

type Cenario = {
  cliente: Omit<ClienteRecord, "id" | "atualizado">;
  contratoId: string;
  valor: number;
  modulos: number;
  potencia: number; // kWp
  inversor: string;
  telhadoTipo: "Cerâmica" | "Metálico" | "Fibrocimento";
  pagamento: {
    descricao: string;
    formas: ContratoFull["pagamentoDetalhes"]["formas"];
  };
  assinado: boolean;
  entregaPct: number; // 0..1 — fração do material total a entregar
  compraTransito?: { itemId: string; qtd: number; fornecedor: string };
  selecionarParaCompra?: boolean;
};

const hoje = () => new Date().toISOString().slice(0, 10);

const CENARIOS: Cenario[] = [
  {
    cliente: {
      nome: "Ana Paula Souza", doc: "111.222.333-44", telefone: "(92) 99100-0001",
      email: "ana@example.com", cep: "69000-001", rua: "Av. Eduardo Ribeiro", numero: "100",
      bairro: "Centro", complemento: "", cidade: "Manaus", uf: "AM", status: "Ativo",
    },
    contratoId: "101/2026", valor: 28000, modulos: 10, potencia: 5.5, inversor: "Growatt 5kW",
    telhadoTipo: "Cerâmica",
    pagamento: {
      descricao: "PIX à vista",
      formas: [{ id: "L1", tipo: "PIX", momento: "assinatura", valor: 28000, parcelas: 1, primeiroVencDias: 0, intervaloDias: 30 }],
    },
    assinado: true, entregaPct: 1.0, selecionarParaCompra: false,
  },
  {
    cliente: {
      nome: "Bruno Mendes Lima", doc: "222.333.444-55", telefone: "(92) 99100-0002",
      email: "bruno@example.com", cep: "69010-002", rua: "Rua Leonardo Malcher", numero: "250",
      bairro: "Centro", complemento: "Apto 12", cidade: "Manaus", uf: "AM", status: "Ativo",
    },
    contratoId: "102/2026", valor: 42000, modulos: 16, potencia: 8.8, inversor: "WEG 8kW",
    telhadoTipo: "Metálico",
    pagamento: {
      descricao: "Boleto 12x",
      formas: [{ id: "L1", tipo: "Boleto", momento: "ato", valor: 42000, parcelas: 12, primeiroVencDias: 30, intervaloDias: 30, multaPct: 2, jurosMesPct: 1 }],
    },
    assinado: true, entregaPct: 0.5, selecionarParaCompra: true,
  },
  {
    cliente: {
      nome: "Construtora Cordeiro LTDA", doc: "12.345.678/0001-99", telefone: "(92) 99100-0003",
      email: "fin@cordeiro.com.br", cep: "69050-010", rua: "Av. Djalma Batista", numero: "1500",
      bairro: "Chapada", complemento: "Sala 802", cidade: "Manaus", uf: "AM", status: "Ativo",
    },
    contratoId: "103/2026", valor: 145000, modulos: 50, potencia: 27.5, inversor: "Sungrow 25kW",
    telhadoTipo: "Fibrocimento",
    pagamento: {
      descricao: "Financiamento BASA",
      formas: [{ id: "L1", tipo: "Financiamento", momento: "pos-instalacao", valor: 145000, parcelas: 1, banco: "BASA" }],
    },
    assinado: true, entregaPct: 0,
    compraTransito: { itemId: "MOD-550", qtd: 30, fornecedor: "Solar Distribuidora SP" },
    selecionarParaCompra: true,
  },
  {
    cliente: {
      nome: "Carla Ribeiro", doc: "333.444.555-66", telefone: "(92) 99100-0004",
      email: "carla@example.com", cep: "69060-020", rua: "Rua Recife", numero: "75",
      bairro: "Adrianópolis", complemento: "", cidade: "Manaus", uf: "AM", status: "Ativo",
    },
    contratoId: "104/2026", valor: 35500, modulos: 12, potencia: 6.6, inversor: "Deye 6kW",
    telhadoTipo: "Cerâmica",
    pagamento: {
      descricao: "Cartão de crédito",
      formas: [{ id: "L1", tipo: "Cartão de Crédito", momento: "assinatura", valor: 35500, parcelas: 1, jurosTipo: "empresa" }],
    },
    assinado: true, entregaPct: 0, selecionarParaCompra: true,
  },
  {
    cliente: {
      nome: "Diego Farias", doc: "444.555.666-77", telefone: "(92) 99100-0005",
      email: "diego@example.com", cep: "69070-030", rua: "Av. Constantino Nery", numero: "3000",
      bairro: "Flores", complemento: "", cidade: "Manaus", uf: "AM", status: "Ativo",
    },
    contratoId: "105/2026", valor: 52000, modulos: 18, potencia: 9.9, inversor: "Growatt 10kW",
    telhadoTipo: "Metálico",
    pagamento: {
      descricao: "Entrada PIX + Boleto",
      formas: [
        { id: "L1", tipo: "PIX", momento: "assinatura", valor: 12000, parcelas: 1, primeiroVencDias: 0, intervaloDias: 30 },
        { id: "L2", tipo: "Boleto", momento: "entrega-materiais", valor: 40000, parcelas: 8, primeiroVencDias: 30, intervaloDias: 30 },
      ],
    },
    assinado: false, entregaPct: 0,
  },
];

function projetoFromCenario(c: Cenario, contratoId: string, aprovadoEnviado: boolean): ProjetoVinculado {
  return {
    id: `${contratoId}-01`,
    contratoId,
    tipo: "Projeto 1",
    endereco: `${c.cliente.rua}, ${c.cliente.numero}`,
    bairro: c.cliente.bairro,
    cep: c.cliente.cep,
    cidade: c.cliente.cidade,
    uf: c.cliente.uf,
    modulos: c.modulos,
    potenciaModuloW: 550,
    kwp: c.potencia,
    inversor: c.inversor,
    equipe: "Equipe A",
    status: aprovadoEnviado ? "Aguardando instalação" : "Em projeto/aprovação",
    inicio: hoje(),
    previsto: hoje(),
    obs: "",
    cronograma: "",
    enviadoEngenharia: aprovadoEnviado,
    aprovado: aprovadoEnviado,
    dataAprovacao: aprovadoEnviado ? new Date().toISOString() : undefined,
    usuarioAprovacao: aprovadoEnviado ? "Demo" : undefined,
    valor: c.valor,
    financeiroGerado: aprovadoEnviado,
  };
}

/** Cria 5 clientes + contratos + obras + financeiro + entregas. */
export function seedSimulacao5Clientes(): { criados: number } {
  const snapshots: ObraSnapshot[] = [];

  for (const c of CENARIOS) {
    // 1) Cliente
    let cliente: ClienteRecord;
    try {
      cliente = addClienteFull(c.cliente);
    } catch {
      // duplicado — pula
      continue;
    }

    // 2) Contrato
    const projeto = projetoFromCenario(c, c.contratoId, c.assinado);
    const contrato: ContratoFull = {
      id: c.contratoId,
      cliente: cliente.nome,
      clienteId: cliente.id,
      vendedor: "Demo",
      valor: c.valor,
      kwp: c.potencia,
      status: c.assinado ? "Contrato assinado" : "Contrato gerado",
      data: hoje(),
      dataCadastro: hoje(),
      dataAssinatura: c.assinado ? hoje() : undefined,
      pagamento: c.pagamento.descricao,
      modulos: c.modulos,
      potencia: c.potencia,
      inv1: c.inversor,
      clienteFull: {
        nome: cliente.nome, doc: cliente.doc, telefone: cliente.telefone,
        email: cliente.email ?? "", cep: cliente.cep ?? "", rua: cliente.rua ?? "",
        numero: cliente.numero ?? "", bairro: cliente.bairro ?? "",
        complemento: cliente.complemento ?? "", cidade: cliente.cidade, uf: cliente.uf,
      },
      projetos: [projeto],
      pagamentoDetalhes: {
        formas: c.pagamento.formas,
        statusInicialObra: "Em projeto/aprovação",
      },
      possuiFinanciamento: c.pagamento.formas?.some((f) => f.tipo === "Financiamento"),
      financiamentoBanco: c.pagamento.formas?.find((f) => f.banco)?.banco,
      financiamentoLiberadoEng: c.assinado,
      assinadoAprovado: c.assinado,
      contratoAssinadoArquivo: c.assinado ? "contrato-assinado-demo.pdf" : undefined,
      auditoria: [{
        id: `A-${Date.now()}-${c.contratoId}`, data: new Date().toISOString(),
        usuario: "Demo", campo: "criação", de: "", para: `Contrato ${c.contratoId} criado pela simulação`,
      }],
    };
    upsertContrato(contrato);

    // 3) Financeiro (AR) — apenas se assinado
    if (c.assinado) {
      gerarARsDoContratoAssinado(contrato as any, "Demo");
    }

    // 4) Obras Snapshot (somente projetos aprovados/enviados)
    if (c.assinado) {
      snapshots.push({
        id: projeto.id, contrato: c.contratoId, cliente: cliente.nome,
        status: projeto.status, modulos: c.modulos, potencia: c.potencia,
        inversor: c.inversor, telhadoTipo: c.telhadoTipo, equipe: "Equipe A",
        tipo: projeto.tipo, finalizacao: null,
      });
    }
  }

  // 5) Publica snapshot e gera necessidades
  setObrasSnapshot(snapshots);
  for (const o of snapshots) {
    garantirNecessidadeObra(o);
    recalcularNecessidade(o);
  }

  // 6) Estoque inicial (suficiente para o cliente 1 e parte do 2)
  setEstoqueAtual("MOD-550", 30, "Demo");
  setEstoqueAtual("INV-PAD", 5, "Demo");
  setEstoqueAtual("CAB-6MM", 200, "Demo");
  setEstoqueAtual("MC4", 40, "Demo");
  setEstoqueAtual("DJ-CC", 10, "Demo");
  setEstoqueAtual("EST-CER", 30, "Demo");
  setEstoqueAtual("EST-MET", 20, "Demo");
  setEstoqueAtual("EST-FIB", 10, "Demo");

  // 7) Entregas conforme cenário
  for (const c of CENARIOS) {
    if (!c.assinado || c.entregaPct <= 0) continue;
    const obraId = `${c.contratoId}-01`;
    const estr = c.telhadoTipo === "Metálico" ? "EST-MET" : c.telhadoTipo === "Fibrocimento" ? "EST-FIB" : "EST-CER";
    const itens: Array<{ id: string; qtd: number }> = [
      { id: "MOD-550", qtd: c.modulos },
      { id: estr, qtd: c.modulos },
      { id: "CAB-6MM", qtd: Math.round(c.modulos * 3.5) },
      { id: "MC4", qtd: Math.max(2, Math.ceil(c.modulos / 8)) },
      { id: "DJ-CC", qtd: 1 },
      { id: "INV-PAD", qtd: 1 },
    ];
    for (const it of itens) {
      const qtd = Math.floor(it.qtd * c.entregaPct);
      if (qtd > 0) marcarEntrega(obraId, it.id, qtd, c.entregaPct >= 1, "Demo");
    }
  }

  // 8) Compras em trânsito + seleção para painel
  for (const c of CENARIOS) {
    if (!c.assinado) continue;
    if (c.compraTransito) {
      addCompraTransito({
        itemId: c.compraTransito.itemId, qtd: c.compraTransito.qtd,
        fornecedor: c.compraTransito.fornecedor, data: hoje(),
        obs: `Pedido vinculado ao contrato ${c.contratoId}`,
      }, "Demo");
    }
    if (c.selecionarParaCompra) {
      setSelecionadaCompra(`${c.contratoId}-01`, true);
    }
  }

  return { criados: CENARIOS.length };
}

/** Limpa tudo, semeia e recarrega a página para reidratar todos os stores. */
export function resetarESimular() {
  limparTudoLocal();
  // Recria estoque seed e tudo em memória precisa ser reidratado.
  // Forçamos reload para garantir estado consistente em todos os stores.
  if (typeof window !== "undefined") {
    // Marca para rodar o seed após o reload
    window.sessionStorage.setItem("ms.dev.runSeedOnLoad", "1");
    window.location.reload();
  }
}

/** Chamado no boot do app para concluir o seed após reload. */
export function bootstrapSeedIfPending() {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem("ms.dev.runSeedOnLoad") !== "1") return;
  window.sessionStorage.removeItem("ms.dev.runSeedOnLoad");
  try {
    seedSimulacao5Clientes();
  } catch (e) {
    console.error("[dev-seed] falha ao semear:", e);
  }
}

/**
 * D18.18 — Template padrão de cláusulas e helpers de variáveis do contrato.
 *
 * Frontend-only. Cláusulas vivem em `contratos.dados.clausulas` (jsonb).
 * Variáveis são substituídas no momento da prévia/render.
 */

export type ClausulaCategoria =
  | "IDENTIFICACAO"
  | "OBJETO"
  | "ESCOPO_TECNICO"
  | "VALOR_PAGAMENTO"
  | "PRAZO"
  | "OBRIG_CONTRATADA"
  | "OBRIG_CONTRATANTE"
  | "FINANCIAMENTO"
  | "ENERGIA_CONCESSIONARIA"
  | "GARANTIAS"
  | "ADITIVOS"
  | "CANCELAMENTO"
  | "ASSINATURA"
  | "FORO";

export const CATEGORIA_LABEL: Record<ClausulaCategoria, string> = {
  IDENTIFICACAO: "Identificação das Partes",
  OBJETO: "Objeto",
  ESCOPO_TECNICO: "Escopo Técnico",
  VALOR_PAGAMENTO: "Valor e Pagamento",
  PRAZO: "Prazo",
  OBRIG_CONTRATADA: "Obrigações da Contratada",
  OBRIG_CONTRATANTE: "Obrigações da Contratante",
  FINANCIAMENTO: "Financiamento",
  ENERGIA_CONCESSIONARIA: "Energia / Concessionária",
  GARANTIAS: "Garantias",
  ADITIVOS: "Aditivos",
  CANCELAMENTO: "Cancelamento",
  ASSINATURA: "Assinatura",
  FORO: "Foro",
};

export type Clausula = {
  id: string;
  ordem: number;
  categoria: ClausulaCategoria;
  titulo: string;
  texto: string;
  obrigatoria: boolean;
  oculta: boolean;
  revisada: boolean;
  complementar?: boolean;
};

const uid = () => `cl_${Math.random().toString(36).slice(2, 10)}`;

/** Cláusulas padrão Meta Sun (template base). */
export function clausulasPadrao(): Clausula[] {
  const base: Omit<Clausula, "id" | "ordem">[] = [
    {
      categoria: "IDENTIFICACAO",
      titulo: "Identificação das Partes",
      texto:
        "CONTRATANTE: {{cliente_nome}}, inscrito(a) sob o documento {{cliente_documento}}, residente/sediado em {{cliente_endereco}}. " +
        "CONTRATADA: META SUN, prestadora de serviços de instalação de sistemas fotovoltaicos.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "OBJETO",
      titulo: "Objeto",
      texto:
        "O presente contrato tem por objeto o fornecimento e instalação de sistema fotovoltaico de {{potencia_kwp}} kWp, " +
        "composto por {{quantidade_modulos}} módulos e inversor {{inversor}}, no endereço {{cliente_endereco}}.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "ESCOPO_TECNICO",
      titulo: "Escopo Técnico",
      texto:
        "Estão inclusos: projeto elétrico, homologação junto à concessionária, fornecimento dos equipamentos, " +
        "estrutura de fixação, cabeamento CC/CA, mão de obra de instalação, comissionamento e ART.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "VALOR_PAGAMENTO",
      titulo: "Valor e Forma de Pagamento",
      texto:
        "O valor total do contrato é de {{valor_total}} ({{valor_total_extenso}}), a ser pago conforme " +
        "a seguinte forma de pagamento: {{forma_pagamento}}.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "PRAZO",
      titulo: "Prazo de Execução",
      texto:
        "A CONTRATADA executará o objeto no prazo de {{prazo_execucao}} dias úteis, contados a partir do " +
        "recebimento da homologação pela concessionária e da quitação da parcela de entrada quando houver.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "OBRIG_CONTRATADA",
      titulo: "Obrigações da Contratada",
      texto:
        "Realizar o serviço com técnicos qualificados, fornecer ART, garantir a qualidade dos equipamentos " +
        "instalados conforme garantias de fábrica e prestar suporte de comissionamento.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "OBRIG_CONTRATANTE",
      titulo: "Obrigações da Contratante",
      texto:
        "Disponibilizar acesso ao local, fornecer informações verídicas para projeto e homologação, manter " +
        "as condições de pagamento acordadas e providenciar adequações estruturais quando necessárias.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "FINANCIAMENTO",
      titulo: "Financiamento Bancário",
      texto:
        "Quando aplicável, o pagamento será viabilizado por meio de financiamento bancário junto ao banco " +
        "informado na forma de pagamento, cabendo à CONTRATANTE assinar e cumprir todas as exigências da " +
        "instituição financeira.",
      obrigatoria: false, oculta: false, revisada: false,
    },
    {
      categoria: "ENERGIA_CONCESSIONARIA",
      titulo: "Energia e Concessionária",
      texto:
        "A CONTRATADA fica responsável pela elaboração e protocolo do pedido de acesso junto à " +
        "concessionária local, sendo a CONTRATANTE responsável por estar adimplente com a distribuidora.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "GARANTIAS",
      titulo: "Garantias",
      texto:
        "Módulos: garantia de fábrica conforme fabricante. Inversor: garantia de fábrica conforme fabricante. " +
        "Instalação e mão de obra: 12 (doze) meses contra defeitos de execução.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "ADITIVOS",
      titulo: "Aditivos Contratuais",
      texto:
        "Qualquer alteração de escopo, prazo ou valor deverá ser formalizada por meio de termo aditivo " +
        "assinado por ambas as partes, devidamente registrado neste sistema.",
      obrigatoria: false, oculta: false, revisada: false,
    },
    {
      categoria: "CANCELAMENTO",
      titulo: "Cancelamento e Rescisão",
      texto:
        "O cancelamento por parte da CONTRATANTE após início da execução implicará no ressarcimento dos " +
        "custos já incorridos pela CONTRATADA, bem como multa contratual de 10% do valor remanescente.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "ASSINATURA",
      titulo: "Assinatura",
      texto:
        "As partes assinam o presente contrato em {{cidade}}, em {{data_contrato}}, em duas vias de igual " +
        "teor e forma, na presença de testemunhas.",
      obrigatoria: true, oculta: false, revisada: false,
    },
    {
      categoria: "FORO",
      titulo: "Foro",
      texto:
        "Fica eleito o foro da comarca de {{cidade}} para dirimir quaisquer questões oriundas do presente " +
        "contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
      obrigatoria: true, oculta: false, revisada: false,
    },
  ];
  return base.map((c, i) => ({ ...c, id: uid(), ordem: i + 1 }));
}

export function novaClausulaComplementar(ordem: number): Clausula {
  return {
    id: uid(),
    ordem,
    categoria: "OBRIG_CONTRATADA",
    titulo: "Cláusula Complementar",
    texto: "",
    obrigatoria: false,
    oculta: false,
    revisada: false,
    complementar: true,
  };
}

// ---------- Variáveis ----------

export type Variaveis = Record<string, string | number | null | undefined>;

const NOMES_VAR = [
  "cliente_nome", "cliente_documento", "cliente_endereco",
  "valor_total", "valor_total_extenso",
  "potencia_kwp", "quantidade_modulos", "inversor",
  "forma_pagamento", "prazo_execucao", "cidade", "data_contrato",
] as const;
export type NomeVariavel = typeof NOMES_VAR[number];
export const VARIAVEIS_OBRIGATORIAS: NomeVariavel[] = [
  "cliente_nome", "cliente_documento", "cliente_endereco",
  "valor_total", "potencia_kwp", "forma_pagamento", "cidade",
];

export function substituirVariaveis(texto: string, vars: Variaveis): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    const v = vars[k];
    if (v == null || v === "") return `{{${k}}}`;
    return String(v);
  });
}

/** Detecta variáveis cujo valor está vazio. */
export function variaveisFaltando(vars: Variaveis): NomeVariavel[] {
  return VARIAVEIS_OBRIGATORIAS.filter((k) => {
    const v = vars[k];
    return v == null || String(v).trim() === "";
  });
}

// ---------- Forma de pagamento ----------

export type FormaPagamentoTipo =
  | "PIX" | "BOLETO" | "CARTAO" | "FINANCIAMENTO" | "ENTRADA_PARCELAS" | "MISTO";

export const FP_LABEL: Record<FormaPagamentoTipo, string> = {
  PIX: "PIX",
  BOLETO: "Boleto",
  CARTAO: "Cartão",
  FINANCIAMENTO: "Financiamento",
  ENTRADA_PARCELAS: "Entrada + Parcelas",
  MISTO: "Misto (combinado)",
};

export type FormaPagamentoConfig = {
  tipo: FormaPagamentoTipo;
  pix?: { valor: number; data: string; chave: string; observacao: string };
  boleto?: { valor: number; parcelas: number; valor_parcela: number; primeiro_venc: string; dia_fixo: number; observacao: string };
  cartao?: { valor: number; parcelas: number; bandeira: string; taxa: number; observacao: string };
  financiamento?: { banco: string; valor: number; entrada: number; prazo_meses: number; status: string; observacao: string; clausula: string };
  entrada_parcelas?: { entrada: number; entrada_data: string; saldo: number; parcelas: number; primeiro_venc: string };
  misto?: { componentes: Array<{ tipo: FormaPagamentoTipo; valor: number; obs: string }> };
};

export const BANCOS_FINANCIAMENTO = ["Sicredi", "Caixa", "BASA", "Banco do Brasil", "Outro"];

export function somaFormaPagamento(fp: FormaPagamentoConfig | null | undefined): number {
  if (!fp) return 0;
  switch (fp.tipo) {
    case "PIX": return Number(fp.pix?.valor) || 0;
    case "BOLETO": return Number(fp.boleto?.valor) || 0;
    case "CARTAO": return Number(fp.cartao?.valor) || 0;
    case "FINANCIAMENTO": {
      const f = fp.financiamento; return (Number(f?.valor) || 0) + (Number(f?.entrada) || 0);
    }
    case "ENTRADA_PARCELAS": {
      const e = fp.entrada_parcelas; return (Number(e?.entrada) || 0) + (Number(e?.saldo) || 0);
    }
    case "MISTO": return (fp.misto?.componentes ?? []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  }
}

export function descricaoFormaPagamento(fp: FormaPagamentoConfig | null | undefined): string {
  if (!fp) return "—";
  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  switch (fp.tipo) {
    case "PIX":
      return `PIX no valor de ${brl(fp.pix?.valor ?? 0)}${fp.pix?.data ? ` previsto para ${fp.pix.data}` : ""}.`;
    case "BOLETO": {
      const b = fp.boleto!;
      return `Boleto: ${b.parcelas}x de ${brl(b.valor_parcela)} (total ${brl(b.valor)}), 1º venc. em ${b.primeiro_venc || "—"}, dia fixo ${b.dia_fixo || "—"}.`;
    }
    case "CARTAO": {
      const c = fp.cartao!;
      return `Cartão ${c.bandeira || ""}: ${c.parcelas}x (total ${brl(c.valor)}).`.trim();
    }
    case "FINANCIAMENTO": {
      const f = fp.financiamento!;
      return `Financiamento ${f.banco || ""}, valor financiado ${brl(f.valor)}${f.entrada > 0 ? `, entrada ${brl(f.entrada)}` : ""}, prazo ${f.prazo_meses || "—"} meses.`;
    }
    case "ENTRADA_PARCELAS": {
      const e = fp.entrada_parcelas!;
      return `Entrada de ${brl(e.entrada)} em ${e.entrada_data || "—"} + ${e.parcelas}x do saldo ${brl(e.saldo)}, 1º venc. ${e.primeiro_venc || "—"}.`;
    }
    case "MISTO":
      return (fp.misto?.componentes ?? []).map((c) => `${FP_LABEL[c.tipo]} ${brl(c.valor)}`).join(" + ") || "—";
  }
}

export function formaPagamentoVazia(tipo: FormaPagamentoTipo): FormaPagamentoConfig {
  const base: FormaPagamentoConfig = { tipo };
  switch (tipo) {
    case "PIX": base.pix = { valor: 0, data: "", chave: "", observacao: "" }; break;
    case "BOLETO": base.boleto = { valor: 0, parcelas: 1, valor_parcela: 0, primeiro_venc: "", dia_fixo: 10, observacao: "" }; break;
    case "CARTAO": base.cartao = { valor: 0, parcelas: 1, bandeira: "", taxa: 0, observacao: "" }; break;
    case "FINANCIAMENTO": base.financiamento = { banco: "", valor: 0, entrada: 0, prazo_meses: 60, status: "EM_ANALISE", observacao: "", clausula: "" }; break;
    case "ENTRADA_PARCELAS": base.entrada_parcelas = { entrada: 0, entrada_data: "", saldo: 0, parcelas: 1, primeiro_venc: "" }; break;
    case "MISTO": base.misto = { componentes: [{ tipo: "PIX", valor: 0, obs: "" }] }; break;
  }
  return base;
}

// ---------- Número por extenso (simplificado) ----------
const UNI = ["", "um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","catorze","quinze","dezesseis","dezessete","dezoito","dezenove"];
const DEZ = ["", "", "vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
const CEN = ["", "cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
function ate999(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), d = Math.floor((n % 100) / 10), u = n % 10;
  const parts: string[] = [];
  if (c) parts.push(CEN[c]);
  if (d < 2) {
    const k = d * 10 + u;
    if (k) parts.push(UNI[k]);
  } else {
    parts.push(DEZ[d]);
    if (u) parts.push(UNI[u]);
  }
  return parts.join(" e ");
}
export function valorPorExtenso(v: number): string {
  const inteiro = Math.floor(v);
  const cent = Math.round((v - inteiro) * 100);
  const milhar = Math.floor(inteiro / 1000);
  const resto = inteiro % 1000;
  const partes: string[] = [];
  if (milhar > 0) partes.push(`${milhar === 1 ? "mil" : `${ate999(milhar)} mil`}`);
  if (resto > 0) partes.push(ate999(resto));
  const reais = partes.join(" e ") || "zero";
  const moeda = inteiro === 1 ? "real" : "reais";
  if (cent > 0) {
    const c = ate999(cent);
    const cm = cent === 1 ? "centavo" : "centavos";
    return `${reais} ${moeda} e ${c} ${cm}`;
  }
  return `${reais} ${moeda}`;
}

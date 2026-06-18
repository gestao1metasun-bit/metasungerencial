/**
 * D18.20 — Template padrão Meta Sun + numeração X.Y + operações
 *           "alterar / retirar / adicionar" com renumeração automática.
 *
 * Frontend-only. Cláusulas vivem em `contratos.dados.clausulas` (jsonb).
 *
 * Estrutura:
 *   - GRUPO: cabeçalho ("CLÁUSULA PRIMEIRA – DO OBJETO"), grupo = 1..N
 *   - ITEM:  conteúdo numerado "{grupo}.{subordem}" (ex. 3.2)
 *
 * O "número" exibido (1.1, 3.2 …) é recomputado via `renumerar()`.
 * A inserção respeita "antes/depois" da cláusula de referência e
 * desloca automaticamente as subsequentes do mesmo grupo
 * (3.3 vira 3.4, 3.4 vira 3.5 …).
 */

export type ClausulaCategoria =
  | "IDENTIFICACAO"
  | "OBJETO"
  | "VALOR_PAGAMENTO"
  | "PRAZO"
  | "GARANTIAS"
  | "OBRIG_CONTRATADA"
  | "OBRIG_CONTRATANTE"
  | "VINCULO"
  | "RESCISAO"
  | "FORO";

export const CATEGORIA_LABEL: Record<ClausulaCategoria, string> = {
  IDENTIFICACAO: "Identificação das Partes",
  OBJETO: "Objeto",
  VALOR_PAGAMENTO: "Valor e Pagamento",
  PRAZO: "Prazo, Cronograma e Garantias",
  GARANTIAS: "Garantias",
  OBRIG_CONTRATADA: "Obrigações da Contratada",
  OBRIG_CONTRATANTE: "Obrigações da Contratante",
  VINCULO: "Ausência de Vínculo",
  RESCISAO: "Multa e Rescisão",
  FORO: "Foro",
};

export type Clausula = {
  id: string;
  /** posição absoluta na lista (recomputada em renumerar). */
  ordem: number;
  /** "GRUPO" (cabeçalho) ou "ITEM" (subcláusula numerada). */
  tipo: "GRUPO" | "ITEM";
  /** Número do grupo (1..N). */
  grupo: number;
  /** Subordem dentro do grupo — só para ITEM. */
  subordem?: number;
  /** Número exibido: "1.1", "3.2" … (recomputado). */
  numero?: string;
  /** Cabeçalho do grupo (ex. "CLÁUSULA PRIMEIRA – DO OBJETO"). */
  titulo: string;
  /** Ordinal por extenso ("PRIMEIRA", "SEGUNDA" …) — só para GRUPO. */
  ordinal?: string;
  categoria: ClausulaCategoria;
  texto: string;
  obrigatoria: boolean;
  oculta: boolean;
  revisada: boolean;
  /** true se foi adicionada pelo usuário, fora do template padrão. */
  complementar?: boolean;
};

const uid = () => `cl_${Math.random().toString(36).slice(2, 10)}`;

const ORDINAIS = [
  "", "PRIMEIRA", "SEGUNDA", "TERCEIRA", "QUARTA", "QUINTA",
  "SEXTA", "SÉTIMA", "OITAVA", "NONA", "DÉCIMA",
];

function ordinalDoGrupo(n: number): string {
  return ORDINAIS[n] ?? `${n}ª`;
}

/** Recomputa ordem absoluta + subordem + numero "X.Y". */
export function renumerar(clausulas: Clausula[]): Clausula[] {
  // Ordena por grupo, mantendo cabeçalho antes dos itens do grupo
  const ord = [...clausulas].sort((a, b) => {
    if (a.grupo !== b.grupo) return a.grupo - b.grupo;
    if (a.tipo !== b.tipo) return a.tipo === "GRUPO" ? -1 : 1;
    return (a.subordem ?? 0) - (b.subordem ?? 0);
  });
  const contadorGrupo = new Map<number, number>();
  return ord.map((c, i) => {
    if (c.tipo === "GRUPO") {
      contadorGrupo.set(c.grupo, 0);
      return { ...c, ordem: i + 1, subordem: undefined, numero: undefined };
    }
    const next = (contadorGrupo.get(c.grupo) ?? 0) + 1;
    contadorGrupo.set(c.grupo, next);
    return { ...c, ordem: i + 1, subordem: next, numero: `${c.grupo}.${next}` };
  });
}

/** Insere um novo ITEM antes/depois de uma cláusula de referência. */
export function inserirItem(
  clausulas: Clausula[],
  referenciaId: string,
  posicao: "antes" | "depois",
  texto: string,
  categoria: ClausulaCategoria = "OBRIG_CONTRATADA",
): Clausula[] {
  const ref = clausulas.find((c) => c.id === referenciaId);
  if (!ref) return clausulas;
  // Determina grupo e subordem-alvo
  const grupo = ref.grupo;
  const refSub = ref.tipo === "ITEM" ? (ref.subordem ?? 0) : 0;
  const alvoSub = posicao === "antes" ? Math.max(refSub, 1) : refSub + 1;
  // Desloca subordem das cláusulas posteriores no mesmo grupo
  const next = clausulas.map((c) => {
    if (c.tipo !== "ITEM" || c.grupo !== grupo) return c;
    if ((c.subordem ?? 0) >= alvoSub) {
      return { ...c, subordem: (c.subordem ?? 0) + 1 };
    }
    return c;
  });
  const novo: Clausula = {
    id: uid(),
    ordem: 0,
    tipo: "ITEM",
    grupo,
    subordem: alvoSub,
    titulo: "",
    categoria,
    texto: texto.trim(),
    obrigatoria: false,
    oculta: false,
    revisada: true,
    complementar: true,
  };
  return renumerar([...next, novo]);
}

/** Remove um ITEM e renumera o grupo. */
export function removerItem(clausulas: Clausula[], id: string): Clausula[] {
  const ref = clausulas.find((c) => c.id === id);
  if (!ref || ref.tipo !== "ITEM") return clausulas;
  const grupo = ref.grupo;
  const sub = ref.subordem ?? 0;
  const next = clausulas
    .filter((c) => c.id !== id)
    .map((c) => {
      if (c.tipo !== "ITEM" || c.grupo !== grupo) return c;
      if ((c.subordem ?? 0) > sub) {
        return { ...c, subordem: (c.subordem ?? 0) - 1 };
      }
      return c;
    });
  return renumerar(next);
}

/** Substitui o texto de uma cláusula. */
export function alterarTextoItem(
  clausulas: Clausula[],
  id: string,
  novoTexto: string,
): Clausula[] {
  return clausulas.map((c) =>
    c.id === id ? { ...c, texto: novoTexto, revisada: true } : c,
  );
}

// =====================================================================
// TEMPLATE PADRÃO META SUN (extraído do contrato 120/2026)
// =====================================================================

type ItemSeed = { texto: string; obrigatoria?: boolean };
type GrupoSeed = {
  titulo: string;
  categoria: ClausulaCategoria;
  itens: ItemSeed[];
};

const TEMPLATE_META_SUN: GrupoSeed[] = [
  {
    titulo: "DO OBJETO",
    categoria: "OBJETO",
    itens: [
      {
        texto:
          "Prestação de serviços de compra e instalação de sistema de energia fotovoltaica On-Grid, " +
          "composto por {{quantidade_modulos}} módulos fotovoltaicos, totalizando {{potencia_kwp}} kWp, " +
          "incluindo elaboração de projeto, fornecimento de todos os materiais complementares (cabos solares, " +
          "estrutura de fixação, demais acessórios aplicáveis) e mão de obra completa de montagem e integração, " +
          "conforme padrão de entrada do CONTRATANTE.",
        obrigatoria: true,
      },
      {
        texto: "Os equipamentos serão instalados no endereço indicado pelo CONTRATANTE: {{endereco_instalacao}}.",
        obrigatoria: true,
      },
      {
        texto:
          "Caso já exista sistema fotovoltaico previamente instalado no local, a CONTRATADA realizará a devida " +
          "adequação, integração ou ajuste técnico necessário, de modo a garantir o pleno funcionamento e " +
          "compatibilidade entre o sistema existente e o novo conjunto de equipamentos, conforme as boas práticas " +
          "de engenharia e normas aplicáveis.",
        obrigatoria: false,
      },
    ],
  },
  {
    titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
    categoria: "VALOR_PAGAMENTO",
    itens: [
      {
        texto:
          "Pelos serviços e equipamentos descritos na Cláusula Primeira, o CONTRATANTE pagará à CONTRATADA o valor " +
          "total de {{valor_total}} ({{valor_total_extenso}}).",
        obrigatoria: true,
      },
      {
        texto: "Forma de pagamento ajustada entre as partes: {{forma_pagamento}}.",
        obrigatoria: true,
      },
      {
        texto:
          "O atraso no pagamento de qualquer parcela acarretará multa moratória de 2% (dois por cento) e juros de " +
          "1% (um por cento) ao mês, calculados sobre o valor em atraso, sem prejuízo das demais sanções previstas " +
          "neste contrato.",
        obrigatoria: false,
      },
    ],
  },
  {
    titulo: "DO PRAZO, CRONOGRAMA E GARANTIAS",
    categoria: "PRAZO",
    itens: [
      {
        texto:
          "A CONTRATADA executará o objeto no prazo de {{prazo_execucao}} dias úteis, contados a partir da " +
          "homologação junto à concessionária e da quitação da parcela de entrada, quando houver. O prazo " +
          "poderá ser automaticamente suspenso e prorrogado, sem caracterizar atraso, em caso de: " +
          "(I) pendências financeiras, atraso de parcelas, falta de liberação bancária; " +
          "(II) necessidade de documentos, autorizações ou acesso ao local sob responsabilidade do CONTRATANTE; " +
          "(III) exigências da concessionária Energisa/RO para aprovação, conexão, vistoria ou substituição do " +
          "medidor, nos termos da Resolução Normativa ANEEL nº 1.000/2021; " +
          "(IV) caso fortuito ou força maior.",
        obrigatoria: true,
      },
      {
        texto:
          "A instalação está sujeita a variáveis climáticas. Poderão ocorrer ajustes no cronograma em situações " +
          "de chuva ou condições adversas, ficando a CONTRATADA isenta de multas ou penalidades por atrasos " +
          "decorrentes dessas condições, com comunicação prévia ao CONTRATANTE.",
        obrigatoria: false,
      },
      {
        texto:
          "A CONTRATADA oferece 180 (cento e oitenta) dias de assistência técnica para problemas relacionados à " +
          "instalação dos painéis, contados a partir da conclusão. A garantia abrange exclusivamente falhas ou " +
          "problemas decorrentes do processo de instalação.",
        obrigatoria: true,
      },
      {
        texto:
          "Os equipamentos possuem garantia de fábrica conforme datasheet: 12 (doze) anos para os painéis e " +
          "10 (dez) anos para os inversores, cobrindo exclusivamente defeitos de fabricação.",
        obrigatoria: true,
      },
      {
        texto:
          "A garantia não cobre danos decorrentes de mau uso, anomalias climáticas (granizo, vendaval), roubo, " +
          "furto, ou modificações/consertos realizados por terceiros não autorizados.",
        obrigatoria: true,
      },
      {
        texto:
          "Modificações expressivas na estrutura base solicitadas pelo CONTRATANTE com finalidade estética não " +
          "estão contempladas no valor acordado, podendo ser executadas mediante aditivo contratual.",
        obrigatoria: false,
      },
      {
        texto:
          "Adequações, reformas, reforços ou desconstruções indicadas pela Engenharia da CONTRATADA como " +
          "necessários à segurança da instalação e da edificação são de responsabilidade do CONTRATANTE, " +
          "podendo a CONTRATADA executá-las mediante valor adicional previamente acordado.",
        obrigatoria: false,
      },
      {
        texto:
          "A localização do inversor será indicada em projeto. Alterações solicitadas pelo CONTRATANTE devem " +
          "respeitar distância máxima de 10 (dez) metros do padrão de entrada e não podem estar em áreas " +
          "úmidas (lavanderias, banheiros), sob pena de perda da garantia.",
        obrigatoria: false,
      },
    ],
  },
  {
    titulo: "DAS OBRIGAÇÕES",
    categoria: "OBRIG_CONTRATADA",
    itens: [
      {
        texto:
          "[CONTRATADA] Executar os serviços em conformidade com as normas dos órgãos públicos competentes e " +
          "as normas técnicas da ABNT, especialmente a NBR 16274.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATADA] Realizar os serviços dentro dos prazos estabelecidos, mantendo reuniões com o CONTRATANTE " +
          "sempre que necessárias modificações no projeto ou cronograma.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATADA] Apresentar as devidas Anotações de Responsabilidade Técnica (ARTs) emitidas por " +
          "profissional habilitado e registrado no CREA/RO, conforme art. 7º da Lei nº 6.496/1977.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATADA] Responsabilizar-se pelo levantamento e cálculo dos quantitativos de materiais a serem " +
          "utilizados na execução dos serviços.",
        obrigatoria: false,
      },
      {
        texto:
          "[CONTRATADA] Admitir e gerir, sob sua exclusiva responsabilidade penal, cível e fiscal, todo o pessoal " +
          "necessário, isentando o CONTRATANTE de qualquer responsabilidade trabalhista, previdenciária ou " +
          "tributária.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATADA] Garantir sigilo absoluto quanto ao conteúdo deste contrato e às informações a que tiver " +
          "acesso, salvo obrigação legal ou determinação judicial.",
        obrigatoria: false,
      },
      {
        texto:
          "[CONTRATANTE] Utilizar as informações técnicas e os serviços fornecidos pela CONTRATADA exclusivamente " +
          "para os fins aqui pactuados, sendo vedada a utilização para outro projeto ou finalidade diversa.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATANTE] Realizar o pagamento conforme configurado na Cláusula Segunda do presente contrato.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATANTE] Garantir o acesso ao local de execução dos serviços, fornecer apoio logístico, ponto de " +
          "energia e espaço adequado para armazenamento de materiais durante a realização dos trabalhos.",
        obrigatoria: true,
      },
      {
        texto:
          "[CONTRATANTE] Realizar a limpeza dos painéis ao menos 2 (duas) vezes por ano, a fim de assegurar o " +
          "máximo de eficiência energética e evitar perdas de geração pela obstrução da superfície dos módulos.",
        obrigatoria: false,
      },
    ],
  },
  {
    titulo: "DA AUSÊNCIA DE VÍNCULO",
    categoria: "VINCULO",
    itens: [
      {
        texto:
          "Não se estabelece, por força deste contrato, qualquer vínculo empregatício ou de outra natureza " +
          "jurídica entre as partes e os respectivos funcionários, colaboradores, prepostos ou subcontratados.",
        obrigatoria: true,
      },
      {
        texto:
          "A CONTRATADA será integralmente responsável pela contratação, pagamento de salários, encargos " +
          "trabalhistas, previdenciários e fiscais, incluindo FGTS, INSS e demais tributos incidentes sobre " +
          "seus empregados ou contratados.",
        obrigatoria: true,
      },
    ],
  },
  {
    titulo: "DA MULTA E RESCISÃO",
    categoria: "RESCISAO",
    itens: [
      {
        texto:
          "Este contrato poderá ser rescindido por qualquer das partes em caso de descumprimento de suas " +
          "disposições, desde que a parte inadimplente seja notificada previamente, com antecedência mínima " +
          "de 30 (trinta) dias.",
        obrigatoria: true,
      },
      {
        texto:
          "Em caso de rescisão por iniciativa do CONTRATANTE, este deverá pagar à CONTRATADA os serviços " +
          "efetivamente executados e/ou materiais adquiridos até a data da rescisão. Na rescisão por iniciativa " +
          "da CONTRATADA, esta deverá concluir os serviços equivalentes ao valor recebido ou reembolsar os " +
          "valores pagos antecipadamente.",
        obrigatoria: true,
      },
      {
        texto:
          "O descumprimento de quaisquer cláusulas deste contrato acarretará multa contratual de 10% (dez por " +
          "cento) do valor total do contrato à parte infratora, sem prejuízo de eventuais perdas e danos.",
        obrigatoria: true,
      },
    ],
  },
  {
    titulo: "DO FORO",
    categoria: "FORO",
    itens: [
      {
        texto:
          "Fica eleito o Foro Central da Comarca de {{cidade}} como o único competente para dirimir quaisquer " +
          "controvérsias oriundas da execução deste contrato, com renúncia expressa a qualquer outro foro, por " +
          "mais privilegiado que seja.",
        obrigatoria: true,
      },
      {
        texto:
          "E, por estarem justas e contratadas, as partes assinam o presente contrato em uma via digital ou, " +
          "preferencialmente, em duas vias de igual teor, forma e para um só efeito, na presença de 2 (duas) " +
          "testemunhas.",
        obrigatoria: true,
      },
    ],
  },
];

/** Cláusulas padrão Meta Sun (template base extraído do PDF oficial). */
export function clausulasPadrao(): Clausula[] {
  const arr: Clausula[] = [];
  TEMPLATE_META_SUN.forEach((g, gi) => {
    const grupoNum = gi + 1;
    arr.push({
      id: uid(),
      ordem: 0,
      tipo: "GRUPO",
      grupo: grupoNum,
      titulo: `CLÁUSULA ${ordinalDoGrupo(grupoNum)} – ${g.titulo}`,
      ordinal: ordinalDoGrupo(grupoNum),
      categoria: g.categoria,
      texto: "",
      obrigatoria: true,
      oculta: false,
      revisada: true,
    });
    g.itens.forEach((it) => {
      arr.push({
        id: uid(),
        ordem: 0,
        tipo: "ITEM",
        grupo: grupoNum,
        titulo: "",
        categoria: g.categoria,
        texto: it.texto,
        obrigatoria: it.obrigatoria ?? false,
        oculta: false,
        revisada: true, // template oficial já considerado revisado
      });
    });
  });
  return renumerar(arr);
}

/** Cria uma cláusula complementar simples (compat). */
export function novaClausulaComplementar(ordem: number): Clausula {
  return {
    id: uid(),
    ordem,
    tipo: "ITEM",
    grupo: 4,
    titulo: "",
    categoria: "OBRIG_CONTRATADA",
    texto: "",
    obrigatoria: false,
    oculta: false,
    revisada: false,
    complementar: true,
  };
}

// =====================================================================
// Template salvo pelo usuário (LS)
// =====================================================================
const LS_TEMPLATE_KEY = "ui.contratos.template-padrao.v1";

export function salvarTemplateUsuario(clausulas: Clausula[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      LS_TEMPLATE_KEY,
      JSON.stringify({
        salvo_em: new Date().toISOString(),
        clausulas: renumerar(clausulas),
      }),
    );
  } catch { /* ignore quota */ }
}

export function carregarTemplateUsuario(): Clausula[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_TEMPLATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { clausulas?: Clausula[] };
    if (!parsed?.clausulas?.length) return null;
    return renumerar(parsed.clausulas);
  } catch {
    return null;
  }
}

export function existeTemplateUsuario(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.localStorage.getItem(LS_TEMPLATE_KEY);
}

export function limparTemplateUsuario(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(LS_TEMPLATE_KEY); } catch { /* */ }
}

// =====================================================================
// Variáveis
// =====================================================================
export type Variaveis = Record<string, string | number | null | undefined>;

const NOMES_VAR = [
  "cliente_nome", "cliente_documento", "cliente_endereco",
  "valor_total", "valor_total_extenso",
  "potencia_kwp", "quantidade_modulos", "inversor",
  "forma_pagamento", "prazo_execucao", "cidade", "data_contrato",
  "endereco_instalacao",
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

export function variaveisFaltando(vars: Variaveis): NomeVariavel[] {
  return VARIAVEIS_OBRIGATORIAS.filter((k) => {
    const v = vars[k];
    return v == null || String(v).trim() === "";
  });
}

// =====================================================================
// Forma de pagamento
// =====================================================================
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

// =====================================================================
// Número por extenso
// =====================================================================
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

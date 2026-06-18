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
          "composto por {{quantidade_modulos}} ({{quantidade_modulos_extenso}}) módulos fotovoltaicos de " +
          "{{potencia_modulo_w}} W, marca {{marca_modulos}}. O serviço inclui a elaboração de projeto " +
          "fotovoltaico, bem como o fornecimento de todos os materiais complementares necessários, cabos " +
          "solares preto e vermelho, estrutura de fixação, demais acessórios aplicáveis e mão de obra " +
          "completa para montagem e integração ao padrão de entrada do CONTRATANTE.",
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
          "Pelos serviços e equipamentos descritos na Cláusula Primeira, o CONTRATANTE pagará à CONTRATADA o " +
          "valor total de {{valor_total}} ({{valor_total_extenso}}).",
        obrigatoria: true,
      },
      {
        texto: "Forma de pagamento ajustada entre as partes: {{forma_pagamento}}.",
        obrigatoria: true,
      },
      {
        texto:
          "O atraso no pagamento de qualquer parcela acarretará multa moratória de 2% (dois por cento) e juros " +
          "de 1% (um por cento) ao mês, calculados sobre o valor em atraso, sem prejuízo das demais sanções " +
          "previstas neste contrato.",
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
          "homologação junto à concessionária e da quitação da parcela de entrada, quando houver.\n\n" +
          "Parágrafo primeiro. O prazo previsto no caput poderá ser automaticamente suspenso e prorrogado, sem " +
          "caracterizar atraso da CONTRATADA, pelo período correspondente a:\n" +
          "I) pendências financeiras, inadimplemento, atraso de parcelas, falta de liberação bancária, retenções, " +
          "exigências da instituição financeira ou ausência de repasse de valores;\n" +
          "II) necessidade de documentos, informações, assinaturas, autorizações, acesso ao local ou demais " +
          "providências sob responsabilidade do CONTRATANTE;\n" +
          "III) na hipótese de a concessionária Energisa/RO exigir ou determinar a realização de obras/adequações " +
          "como condição para aprovação, conexão, vistoria ou substituição do medidor, o prazo contratual ficará " +
          "automaticamente prorrogado pelo tempo necessário ao cumprimento das exigências e à emissão da " +
          "aprovação/liberação final pela concessionária, sem caracterizar atraso da CONTRATADA, retomando-se o " +
          "cronograma a partir da efetiva liberação, nos termos da Resolução Normativa ANEEL nº 1.000, de 7 de " +
          "dezembro de 2021;\n" +
          "IV) na hipótese de o financiamento bancário já ter sido aprovado, com liberação/repasse e/ou início do " +
          "pagamento das parcelas pelo CONTRATANTE, e, no mesmo período, a concessionária Energisa/RO determinar " +
          "a realização de obra, adequação, reforço, substituição de padrão, ajustes de rede, medição ou qualquer " +
          "intervenção como condição para aprovação/conexão/substituição do medidor, o CONTRATANTE declara estar " +
          "ciente de que poderá haver, concomitantemente, (i) pagamento das parcelas do financiamento e (ii) " +
          "pagamento da fatura de energia elétrica da unidade consumidora até a efetiva liberação do sistema, " +
          "não constituindo tal circunstância atraso imputável à CONTRATADA;\n" +
          "V) caso fortuito ou força maior.\n\n" +
          "Parágrafo segundo. Em qualquer das hipóteses descritas no inciso III, a CONTRATADA não se " +
          "responsabiliza por quaisquer custos financeiros suportados pelo CONTRATANTE, incluindo, mas não se " +
          "limitando a: valores de energia elétrica consumida, juros, encargos, tarifas bancárias, seguros, " +
          "despesas do financiamento, multas, correção, bem como quaisquer perdas ou lucros cessantes decorrentes " +
          "de prazos, exigências e/ou obras determinadas pela concessionária ou pela instituição financeira, " +
          "salvo se comprovada falha exclusiva da CONTRATADA.",
        obrigatoria: true,
      },
      {
        texto:
          "A instalação do sistema fotovoltaico está sujeita a variáveis climáticas que podem impactar o " +
          "andamento dos trabalhos. Dessa forma, poderão ocorrer ajustes no cronograma inicialmente acordado " +
          "entre as partes, especialmente em situações de condições climáticas adversas, como chuva, visando " +
          "garantir qualidade e segurança, ficando a CONTRATADA isenta de multas ou penalidades por atrasos " +
          "decorrentes dessas condições. O CONTRATANTE será informado prontamente sobre quaisquer alterações " +
          "necessárias no cronograma.",
        obrigatoria: false,
      },
      {
        texto:
          "A CONTRATADA oferece ao CONTRATANTE um período de 180 (cento e oitenta) dias de assistência técnica " +
          "para quaisquer problemas relacionados à instalação dos painéis fotovoltaicos, contados a partir da " +
          "data de conclusão da instalação. Essa garantia abrange exclusivamente eventuais falhas ou problemas " +
          "decorrentes do processo de instalação, assegurando que serão solucionados prontamente e sem custos " +
          "adicionais para o CONTRATANTE.\n\n" +
          "Vícios ocultos: Caso sejam identificados vícios ocultos relacionados à instalação (defeitos não " +
          "aparentes no momento da entrega e que se manifestem posteriormente), a CONTRATADA realizará a " +
          "avaliação técnica e, confirmada a responsabilidade pela instalação, promoverá a correção sem custo " +
          "de mão de obra, desde que (i) não tenha havido intervenção de terceiros, modificações no sistema, " +
          "mau uso ou eventos externos; e (ii) o CONTRATANTE comunique o fato por escrito em prazo razoável " +
          "após a constatação. Caso, após a avaliação técnica, não seja constatada responsabilidade da " +
          "CONTRATADA, esta não ficará obrigada a realizar manutenção, reparo ou substituição.\n\n" +
          "Reforma de telhado executada pela CONTRATADA (garantia adicional): Na hipótese de o CONTRATANTE " +
          "contratar a CONTRATADA, por meio de aditivo e mediante valor adicional, para execução de reforma, " +
          "adequação, reforço ou substituição do telhado/estrutura de cobertura (troca de telhas, madeiramento, " +
          "estrutura metálica, impermeabilização, cumeeira, reforços estruturais, correção de infiltrações, " +
          "calhas e rufos), a garantia/assistência técnica prevista nesta cláusula será acrescida de mais 180 " +
          "(cento e oitenta) dias, exclusivamente em relação aos serviços de reforma/adequação executados e aos " +
          "pontos de fixação/instalação diretamente impactados.\n\n" +
          "Parágrafo único. A garantia adicional não abrangerá defeitos ou danos decorrentes de intervenções de " +
          "terceiros, mau uso, eventos externos (incluindo intempéries severas), ausência de manutenção " +
          "adequada, ou alterações posteriores na cobertura/estrutura realizadas após a conclusão dos serviços " +
          "pela CONTRATADA.",
        obrigatoria: true,
      },
      {
        texto:
          "Adicionalmente, os equipamentos fotovoltaicos instalados possuem garantia de fábrica conforme " +
          "especificado no datasheet anexo: 12 (doze) anos para os painéis e 10 (dez) anos para os inversores. " +
          "Essa garantia de fábrica cobre exclusivamente defeitos de fabricação, oferecendo ao CONTRATANTE " +
          "segurança adicional quanto à qualidade dos equipamentos.",
        obrigatoria: true,
      },
      {
        texto:
          "É importante ressaltar que a garantia não cobre danos decorrentes de mau uso ou utilização " +
          "inadequada dos equipamentos. A CONTRATADA compromete-se a fornecer todas as orientações necessárias " +
          "para o uso correto dos sistemas fotovoltaicos, garantindo ao CONTRATANTE o pleno aproveitamento dos " +
          "benefícios da instalação.",
        obrigatoria: true,
      },
      {
        texto:
          "Ressalta-se que qualquer modificação expressiva na estrutura base do sistema fotovoltaico, " +
          "solicitada pelo CONTRATANTE e que vise exclusivamente benefícios estéticos ao projeto, não estará " +
          "contemplada no valor acordado na Cláusula Segunda. No entanto, é possível a realização de aditivos " +
          "contratuais para incluir o custo adicional desses serviços.",
        obrigatoria: false,
      },
      {
        texto:
          "Fica acordado entre as partes que quaisquer adequações, reformas, reforços ou desconstruções " +
          "indicadas como necessários pela equipe de Engenharia da CONTRATADA, a fim de garantir a segurança da " +
          "instalação e da edificação, são de exclusiva responsabilidade do CONTRATANTE. Ressalta-se que a " +
          "CONTRATADA poderá ser contratada para realizar o reforço estrutural da superfície onde serão " +
          "instalados os painéis, mediante valor adicional previamente acordado. Em caso de determinação " +
          "unilateral em que qualquer serviço ou atividade seja realizada sem a aprovação da CONTRATADA, ou em " +
          "contrariedade às NDUs e NBRs aplicáveis, a CONTRATADA emitirá Termo de Ciência e Responsabilidade " +
          "Técnica, isentando-a de toda e qualquer responsabilidade técnica e garantias pela execução de tais " +
          "serviços.",
        obrigatoria: false,
      },
      {
        texto:
          "A localização do inversor fotovoltaico será indicada em projeto elaborado pela equipe da CONTRATADA. " +
          "Contudo, o CONTRATANTE poderá solicitar alteração desse local, desde que a nova área não ultrapasse " +
          "a distância máxima de 10 (dez) metros do relógio ou padrão, e não esteja situada em áreas " +
          "consideradas \"úmidas\" — tais como lavanderias, banheiros ou quaisquer locais que possam expor o " +
          "equipamento à umidade ou contato com água —, condições estas que contrariariam o manual de " +
          "instalação do equipamento e poderão comprometer a garantia do mesmo.",
        obrigatoria: false,
      },
      {
        texto:
          "As garantias não cobrem danos decorrentes de anomalias climáticas, tais como granizo, bem como " +
          "prejuízos resultantes de roubos, furtos ou mau uso dos equipamentos. Também ficam excluídos da " +
          "cobertura defeitos ou danos ocasionados por modificações ou consertos realizados pelo CONTRATANTE ou " +
          "por terceiros não autorizados.",
        obrigatoria: true,
      },
      {
        texto:
          "A garantia oferecida pela CONTRATADA não inclui a manutenção preventiva nem a limpeza das placas do " +
          "sistema fotovoltaico. No entanto, reconhecendo a importância da manutenção regular para o desempenho " +
          "ideal do sistema, a CONTRATADA disponibiliza esses serviços como opcionais, podendo ser contratados " +
          "separadamente, de acordo com o interesse do CONTRATANTE.",
        obrigatoria: false,
      },
      {
        texto:
          "Considerando que se trata de um investimento de valor expressivo, e visando garantir a segurança e " +
          "o conforto do CONTRATANTE, a CONTRATADA trabalha exclusivamente com fornecedor de reconhecida " +
          "credibilidade no mercado. Para atendimento direto com a fabricante, o CONTRATANTE poderá entrar em " +
          "contato pelos canais oficiais informados no datasheet anexo.",
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
          "A CONTRATADA obriga-se a executar os serviços em conformidade com as normas e especificações " +
          "estabelecidas pelos órgãos públicos competentes, bem como seguir rigorosamente as normas técnicas da " +
          "Associação Brasileira de Normas Técnicas (ABNT), especialmente a NBR 16274, que regulamenta os " +
          "sistemas fotovoltaicos.",
        obrigatoria: true,
      },
      {
        texto:
          "Realizar os serviços dentro dos prazos estabelecidos neste contrato, bem como manter reuniões com o " +
          "CONTRATANTE sempre que forem necessárias eventuais modificações no projeto ou no cronograma.",
        obrigatoria: true,
      },
      {
        texto:
          "Fornecer, sempre que solicitado pelo CONTRATANTE, informações atualizadas sobre a etapa e o " +
          "andamento dos serviços contratados.",
        obrigatoria: true,
      },
      {
        texto:
          "Comprometer-se a ser integralmente responsável pela execução dos serviços contratados, apresentando " +
          "as devidas Anotações de Responsabilidade Técnica (ARTs) devidamente recolhidas, emitidas por " +
          "profissional habilitado e registrado no Conselho Regional de Engenharia e Agronomia de Rondônia " +
          "(CREA/RO), conforme determina o artigo 7º da Lei nº 6.496/1977.",
        obrigatoria: true,
      },
      {
        texto:
          "Responsabilizar-se pelo levantamento e cálculo dos quantitativos de materiais a serem utilizados na " +
          "execução dos serviços objeto deste contrato.",
        obrigatoria: false,
      },
      {
        texto:
          "Admitir e gerir, sob sua inteira e exclusiva responsabilidade penal, cível e fiscal, todo o pessoal " +
          "necessário à execução do objeto deste contrato, isentando o CONTRATANTE de qualquer responsabilidade " +
          "trabalhista, previdenciária ou tributária decorrente da relação entre a CONTRATADA e seus " +
          "empregados, prepostos ou subcontratados.",
        obrigatoria: true,
      },
      {
        texto:
          "Garantir o sigilo absoluto quanto ao conteúdo deste contrato, aos serviços dele decorrentes, bem " +
          "como às informações, dados e documentos a que tiver acesso durante ou após a execução do presente " +
          "instrumento, comprometendo-se a não divulgar tais informações sob qualquer pretexto, salvo em caso " +
          "de obrigação legal ou determinação judicial.",
        obrigatoria: false,
      },
      {
        texto:
          "A CONTRATADA compromete-se a adotar todas as medidas necessárias para proteger as informações " +
          "confidenciais do CONTRATANTE, incluindo, mas não se limitando a restringir o acesso a tais " +
          "informações exclusivamente a funcionários e subcontratados que necessitem delas para a execução dos " +
          "serviços contratados.",
        obrigatoria: false,
      },
      {
        texto:
          "Permitir ao CONTRATANTE acesso irrestrito ao local de execução dos serviços, desde que sejam " +
          "respeitadas todas as normas de segurança aplicáveis, bem como a obrigatória utilização de " +
          "Equipamentos de Proteção Individual (EPIs).",
        obrigatoria: false,
      },
      {
        texto:
          "O CONTRATANTE obriga-se a utilizar as informações técnicas e os serviços fornecidos pela CONTRATADA " +
          "exclusivamente para os fins aqui pactuados, sendo expressamente vedada a utilização dessas " +
          "informações ou serviços para qualquer outro projeto ou finalidade diversa da contratada. O " +
          "descumprimento desta obrigação sujeitará o CONTRATANTE às sanções legais e contratuais aplicáveis.",
        obrigatoria: true,
      },
      {
        texto:
          "O período necessário para que o CONTRATANTE obtenha informações, documentos ou autorizações de sua " +
          "responsabilidade, indispensáveis à continuidade ou conclusão das etapas do projeto, será " +
          "automaticamente acrescido ao prazo de execução dos serviços pela CONTRATADA.",
        obrigatoria: false,
      },
      {
        texto:
          "Tal prorrogação será considerada plenamente justificada, não acarretando a aplicação de penalidades, " +
          "multas ou quaisquer encargos adicionais à CONTRATADA, de modo a garantir a adequada e segura " +
          "finalização dos serviços contratados.",
        obrigatoria: false,
      },
      {
        texto:
          "A CONTRATADA não poderá ser responsabilizada pelos custos de energia elétrica suportados pelo " +
          "CONTRATANTE durante os períodos em que o sistema fotovoltaico não estiver operacional, exceto nos " +
          "casos em que ficar comprovado que a inoperância está diretamente relacionada a falhas nos serviços " +
          "prestados pela CONTRATADA. Situações como falhas na rede da concessionária, desligamento acidental " +
          "ou eventos naturais que causem danos aos equipamentos não são de responsabilidade da CONTRATADA.",
        obrigatoria: false,
      },
      {
        texto:
          "A manutenção preventiva é fundamental para garantir o pleno funcionamento e a longevidade do sistema " +
          "de geração de energia solar fotovoltaica. Recomenda-se ao CONTRATANTE realizar a limpeza dos painéis " +
          "ao menos 2 (duas) vezes por ano, a fim de assegurar o máximo de eficiência energética e evitar " +
          "possíveis perdas de geração ocasionadas pela obstrução da superfície dos módulos.",
        obrigatoria: false,
      },
      {
        texto: "Realizar o pagamento conforme configurado na Cláusula Segunda do presente contrato.",
        obrigatoria: true,
      },
      {
        texto:
          "Garantir o acesso ao local de execução dos serviços, bem como fornecer o apoio logístico necessário, " +
          "incluindo o fornecimento de ponto de energia e espaço adequado para o armazenamento de materiais " +
          "durante a realização dos trabalhos.",
        obrigatoria: true,
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
          "trabalhistas, previdenciários e fiscais, incluindo o devido recolhimento de FGTS, INSS e demais " +
          "tributos incidentes sobre seus empregados ou contratados, por meio das guias apropriadas.",
        obrigatoria: true,
      },
      {
        texto:
          "A CONTRATADA também será exclusivamente responsável por quaisquer reclamações trabalhistas, ações " +
          "judiciais ou administrativas, ou outras demandas oriundas das relações de trabalho constituídas para " +
          "a execução dos serviços objeto deste contrato, isentando o CONTRATANTE de qualquer responsabilidade " +
          "solidária ou subsidiária.",
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
          "disposições, desde que a parte inadimplente seja notificada previamente, com antecedência mínima de " +
          "30 (trinta) dias.",
        obrigatoria: true,
      },
      {
        texto:
          "Em caso de rescisão por iniciativa do CONTRATANTE, este deverá efetuar o pagamento à CONTRATADA dos " +
          "serviços efetivamente executados e/ou materiais adquiridos até a data da rescisão. No caso de " +
          "rescisão por iniciativa da CONTRATADA, esta deverá concluir os serviços equivalentes ao valor já " +
          "recebido ou, alternativamente, reembolsar ao CONTRATANTE os valores pagos antecipadamente.",
        obrigatoria: true,
      },
      {
        texto:
          "O descumprimento de quaisquer cláusulas deste contrato acarretará a aplicação de multa contratual à " +
          "parte infratora, no valor correspondente a 10% (dez por cento) do valor total do contrato, sem " +
          "prejuízo de eventuais perdas e danos.",
        obrigatoria: true,
      },
      {
        texto:
          "Ambas as partes se comprometem a agir de boa-fé, cooperando mutuamente e adotando medidas razoáveis " +
          "para minimizar eventuais prejuízos decorrentes da rescisão contratual, incluindo, mas não se " +
          "limitando a garantir o acesso às instalações e o fornecimento das informações necessárias para " +
          "viabilizar a continuidade ou a adequada conclusão dos serviços contratados.",
        obrigatoria: false,
      },
    ],
  },
  {
    titulo: "DO FORO",
    categoria: "FORO",
    itens: [
      {
        texto:
          "Fica eleito o Foro Central da Comarca de {{cidade_foro}} como o único competente para dirimir " +
          "quaisquer controvérsias oriundas da execução deste contrato, com renúncia expressa a qualquer outro " +
          "foro, por mais privilegiado que seja. As partes concordam que este foro será exclusivo para a " +
          "solução de eventuais litígios, garantindo celeridade e eficácia na resolução dos conflitos.",
        obrigatoria: true,
      },
      {
        texto:
          "E, por estarem justas e contratadas, as partes assinam o presente contrato em uma via digital ou, " +
          "preferencialmente, em duas vias de igual teor, forma e para um só efeito, na presença de 2 (duas) " +
          "testemunhas, as quais também firmam este instrumento como forma de ratificação de seu conteúdo e " +
          "validade jurídica.",
        obrigatoria: true,
      },
      {
        texto:
          "As partes declaram que as cláusulas deste contrato foram livremente pactuadas e que estão cientes " +
          "de seus direitos e obrigações, conforme disposto no Código de Defesa do Consumidor (Lei nº 8.078/90).",
        obrigatoria: false,
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

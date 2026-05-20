// Template do contrato Meta Sun — cláusulas integrais do contrato padrão
// AQUISIÇÃO E INSTALAÇÃO DO SISTEMA DE ENERGIA FOTOVOLTAICA ON-GRID.
// Placeholders dinâmicos: CONTRATANTE, sistema (módulos/potência/marca/inversores),
// valor, forma de pagamento, foro. Demais cláusulas seguem o modelo.

import type { ContratoFull } from "./contratos-store";

export type ClausulaBase = {
  numero: string;          // "1", "2", "3", ... (cláusula raiz)
  titulo?: string;
  paragrafos: string[];    // cada parágrafo já com sua numeração inicial (ex. "1.1 ...")
};

export const CONTRATADA = {
  razao: "Meta Sun Instalações Elétricas LTDA",
  cnpj: "41.452.412/0001-40",
  endereco: "Av. Eng. Anysio da Rocha Compasso, nº 5055, Bairro Rio Madeira, CEP 76.821-381, Porto Velho/RO",
  telefone: "(69) 99289-7292",
  representante: "Vitor Sirioli Ribeiro",
  representanteCpf: "007.084.922-66",
  representanteRg: "998.679 - SESDEC/RO",
  representanteEstado: "solteiro",
  representanteProf: "empresário",
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function extenso(v: number) {
  return `${fmtBRL(v)} (valor por extenso)`;
}

/* ============== Cláusulas base ============== */

export function clausulasBase(c: ContratoFull): ClausulaBase[] {
  const cli = c.clienteFull;
  const isPJ = (cli?.doc ?? "").replace(/\D/g, "").length === 14;
  const endereco = cli
    ? `${cli.rua}, ${cli.numero}${cli.complemento ? " - " + cli.complemento : ""}, ${cli.bairro}, CEP ${cli.cep}, ${cli.cidade}/${cli.uf}`
    : "—";
  const modulos = c.modulos ?? 0;
  const potenciaModulo = c.potencia ?? 0;
  const marcaModulo = "Ourolux";
  const inversoresTxt = inversoresDescricao(c) || "—";
  const cidadeForo = `${cli?.cidade ?? "Porto Velho"}/${cli?.uf ?? "RO"}`;

  const responsavelTxt = isPJ && c.responsavel
    ? `, neste ato representada por ${c.responsavel}, ${c.responsavelDoc ? `CPF nº ${c.responsavelDoc}` : ""}${c.responsavelCargo ? `, ${c.responsavelCargo}` : ""}, telefone para contato ${cli?.telefone ?? "—"}`
    : "";
  const docLabel = isPJ ? "CNPJ" : "CPF";
  const contratanteTipo = isPJ ? "pessoa jurídica de direito privado" : "pessoa física";

  const list: ClausulaBase[] = [];

  // QUALIFICAÇÃO
  list.push({
    numero: "0",
    paragrafos: [
      `**CONTRATANTE:** ${cli?.nome ?? c.cliente}, ${contratanteTipo}, inscrita no ${docLabel} sob o nº ${cli?.doc ?? "—"}, com ${isPJ ? "sede" : "endereço"} na ${endereco}${responsavelTxt}.`,
      `**CONTRATADA:** ${CONTRATADA.razao}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${CONTRATADA.cnpj}, com sede na ${CONTRATADA.endereco}, telefone: ${CONTRATADA.telefone}, neste ato representada pelo Sr. ${CONTRATADA.representante}, ${CONTRATADA.representanteEstado}, ${CONTRATADA.representanteProf}, inscrito no CPF sob o nº ${CONTRATADA.representanteCpf} e no RG nº ${CONTRATADA.representanteRg}.`,
      "Têm, entre si, justo e acordado o que dispõem as cláusulas abaixo e às quais se obrigam mutuamente:",
    ],
  });

  // CLÁUSULA 1 — OBJETO
  list.push({
    numero: "1",
    titulo: "DO OBJETO",
    paragrafos: [
      `1.1 Prestação de serviços de **compra e instalação** de sistema de energia fotovoltaica On-Grid, composto por ${modulos} (${porExtensoInt(modulos)}) módulos fotovoltaicos de ${potenciaModulo} W, marca ${marcaModulo}, e ${inversoresTxt}. O serviço inclui também o fornecimento de **todo o kit de instalação necessário**, contendo cabos solares (preto e vermelho), estrutura solar e demais acessórios, contemplando material e mão de obra completos para a execução do sistema.`,
      "1.2 Os equipamentos serão instalados no endereço indicado pelo CONTRATANTE.",
      "1.3 Caso já exista sistema fotovoltaico previamente instalado no local, a CONTRATADA realizará a devida adequação, integração ou ajuste técnico necessário, de modo a garantir o pleno funcionamento e compatibilidade entre o sistema existente e o novo conjunto de equipamentos, conforme as boas práticas de engenharia e normas aplicáveis.",
      "1.4 Considera-se como entrega do sistema o cumprimento integral de todas as etapas e requisitos exigidos pela concessionária Energisa/RO, incluindo, mas não se limitando a: elaboração e aprovação do projeto fotovoltaico, solicitação do parecer de acesso, elaboração e acompanhamento do projeto executivo, bem como a vistoria realizada após a conclusão da instalação dos painéis.",
      "1.5 Todas essas fases estarão sujeitas à avaliação e validação da concessionária Energisa/RO, que, após aprovação final, efetuará a substituição do medidor da unidade consumidora do CONTRATANTE, implantando o medidor bidirecional. Concluídas essas providências, o sistema será considerado entregue, estando a usina fotovoltaica plenamente apta e liberada para uso pelo CONTRATANTE.",
    ],
  });

  // CLÁUSULA 2 — VALOR E PAGAMENTO
  list.push({
    numero: "2",
    titulo: "DO VALOR E CONDIÇÕES DE PAGAMENTO",
    paragrafos: [
      `2.1 O valor total do investimento a ser pago pela CONTRATANTE à CONTRATADA será de ${extenso(c.valor)}, referente à prestação dos serviços descritos na Cláusula 1.1 deste instrumento.`,
      ...formaPagamentoTexto(c),
    ],
  });

  // CLÁUSULA 3 — PRAZO E GARANTIA
  list.push({
    numero: "3",
    titulo: "DO PRAZO CONTRATUAL E GARANTIA",
    paragrafos: [
      "3.1 A CONTRATADA obriga-se a executar os serviços contratados no prazo máximo de 90 (noventa) dias, contados a partir do Marco Inicial, assim definido:",
      "a) havendo pagamento de entrada (parcial ou total) pelo CONTRATANTE, por PIX, transferência, boleto, cartão de crédito ou outro meio, o Marco Inicial será a data do efetivo pagamento/compensação, entendendo-se por efetivo pagamento o momento em que os valores estejam liberados e disponíveis à CONTRATADA;",
      "b) não havendo entrada, e sendo o pagamento integral ao final da obra, o Marco Inicial será a data de assinatura do presente contrato por ambas as partes;",
      "c) havendo financiamento bancário, o Marco Inicial será a data da aprovação do crédito pela instituição financeira, desde que não haja exigência de entrada; caso haja entrada, aplica-se o disposto na alínea \"a\" para início do prazo quanto à entrada, e o cronograma poderá ser ajustado conforme as liberações/repasse do financiamento.",
      "**Parágrafo primeiro.** O prazo previsto no caput poderá ser automaticamente suspenso e prorrogado, sem caracterizar atraso da CONTRATADA, pelo período correspondente a:",
      "I) pendências financeiras, inadimplemento, atraso de parcelas, falta de liberação bancária, retenções, exigências da instituição financeira ou ausência de repasse de valores;",
      "II) necessidade de documentos, informações, assinaturas, autorizações, acesso ao local ou demais providências sob responsabilidade do CONTRATANTE;",
      "III) Na hipótese de a concessionária Energisa/RO exigir ou determinar a realização de obras/adequações como condição para aprovação, conexão, vistoria ou substituição do medidor, o prazo contratual ficará automaticamente prorrogado pelo tempo necessário ao cumprimento das exigências e à emissão da aprovação/liberação final pela concessionária, sem caracterizar atraso da CONTRATADA, retomando-se o cronograma a partir da efetiva liberação. Prazos estes definidos e delimitados no que se faz definido por lei, através da: RESOLUÇÃO NORMATIVA ANEEL Nº 1.000, DE 7 DE DEZEMBRO DE 2021;",
      "IV) Na hipótese de o financiamento bancário já ter sido aprovado, com liberação/repasse e/ou início do pagamento das parcelas do financiamento pelo CONTRATANTE, e, no mesmo período, a concessionária Energisa/RO determinar a realização de obra, adequação, reforço, substituição de padrão, ajustes de rede, medição ou qualquer intervenção como condição para aprovação/conexão/substituição do medidor, o CONTRATANTE declara estar ciente de que poderá haver, concomitantemente, (i) pagamento das parcelas do financiamento e (ii) pagamento da fatura de energia elétrica da unidade consumidora até a efetiva liberação do sistema, não constituindo tal circunstância atraso imputável à CONTRATADA.",
      "**Parágrafo segundo.** Em qualquer das hipóteses descritas no inciso III (e seus subitens), a CONTRATADA não se responsabiliza por quaisquer custos financeiros suportados pelo CONTRATANTE, incluindo, mas não se limitando a: valores de energia elétrica consumida, juros, encargos, tarifas bancárias, seguros, despesas do financiamento, multas, correção, bem como quaisquer perdas ou lucros cessantes decorrentes de prazos, exigências e/ou obras determinadas pela concessionária ou pela instituição financeira, salvo se comprovada falha exclusiva da CONTRATADA.",
      "V) caso fortuito/força maior.",
      "3.2 A instalação do sistema fotovoltaico está sujeita a variáveis climáticas que podem impactar o andamento dos trabalhos. Dessa forma, poderão ocorrer ajustes no cronograma inicialmente acordado entre as partes, especialmente em situações de condições climáticas adversas, como chuva, visando garantir qualidade e segurança, ficando a CONTRATADA isenta de multas ou penalidades por atrasos decorrentes dessas condições. O CONTRATANTE será informado prontamente sobre quaisquer alterações necessárias no cronograma.",
      "3.3 A CONTRATADA oferece ao CONTRATANTE um período de 180 (cento e oitenta) dias de assistência técnica para quaisquer problemas relacionados à instalação dos painéis fotovoltaicos, contados a partir da data de conclusão da instalação. Essa garantia abrange exclusivamente eventuais falhas ou problemas decorrentes do processo de instalação, assegurando que serão solucionados prontamente e sem custos adicionais para o CONTRATANTE.",
      "3.3.1 **Vícios ocultos:** Caso sejam identificados vícios ocultos relacionados à instalação (defeitos não aparentes no momento da entrega e que se manifestem posteriormente), a CONTRATADA realizará a avaliação técnica e, confirmada a responsabilidade pela instalação, promoverá a correção sem custo de mão de obra, desde que (i) não tenha havido intervenção de terceiros, modificações no sistema, mau uso ou eventos externos; e o CONTRATANTE comunique o fato por escrito em prazo razoável após a constatação. Caso, após a avaliação técnica, não seja constatada responsabilidade da CONTRATADA pela ocorrência, a CONTRATADA não ficará obrigada a realizar manutenção, reparo ou substituição, ainda que o chamado seja efetuado dentro do período de assistência técnica vigente, podendo, se solicitado pelo CONTRATANTE, apresentar orçamento para execução do serviço.",
      "3.3.2 **Reforma de telhado executada pela CONTRATADA (garantia adicional):** Na hipótese de o CONTRATANTE contratar a CONTRATADA, por meio de aditivo contratual e mediante valor adicional, para execução de reforma, adequação, reforço ou substituição do telhado/estrutura de cobertura (incluindo, mas não se limitando a: troca de telhas, madeiramento, estrutura metálica, impermeabilização, problemas com cumeeira, reforços estruturais, correção de infiltrações, calhas e rufos), a garantia/assistência técnica prevista na Cláusula 3.3 será acrescida de mais 180 (cento e oitenta) dias, totalizando 360 (trezentos e sessenta) dias, exclusivamente em relação aos serviços de reforma/adequação executados pela CONTRATADA e aos pontos de fixação/instalação diretamente impactados por tais serviços, contados a partir da entrega do sistema.",
      "**Parágrafo único.** A garantia adicional não abrangerá defeitos ou danos decorrentes de intervenções de terceiros, mau uso, eventos externos (incluindo intempéries severas), ausência de manutenção adequada, ou alterações posteriores na cobertura/estrutura realizadas após a conclusão dos serviços pela CONTRATADA.",
      "3.4 Adicionalmente, os equipamentos fotovoltaicos instalados possuem garantia de fábrica conforme especificado no datasheet anexo: 12 (doze) anos para os painéis e 10 (dez) anos para os inversores. Essa garantia de fábrica cobre exclusivamente defeitos de fabricação, oferecendo ao CONTRATANTE segurança adicional quanto à qualidade dos equipamentos.",
      "3.5 É importante ressaltar que a garantia não cobre danos decorrentes de mau uso ou utilização inadequada dos equipamentos. A CONTRATADA compromete-se a fornecer todas as orientações necessárias para o uso correto dos sistemas fotovoltaicos, garantindo ao CONTRATANTE o pleno aproveitamento dos benefícios da instalação.",
      "3.6 Ressalta-se que qualquer modificação expressiva na estrutura base do sistema fotovoltaico, solicitada pela CONTRATANTE e que vise exclusivamente benefícios estéticos ao projeto, não estará contemplada no valor acordado na Cláusula 2ª, Item 2.1. No entanto, é possível a realização de aditivos contratuais para incluir o custo adicional desses serviços.",
      "3.7 Fica acordado entre as partes que quaisquer adequações, reformas, reforços ou desconstruções indicados como necessários pela equipe de Engenharia da CONTRATADA, a fim de garantir a segurança da instalação e da edificação, são de exclusiva responsabilidade da CONTRATANTE. Essas adequações visam assegurar a segurança da equipe, da instalação e da edificação. Ressalta-se que a CONTRATADA poderá ser contratada para realizar o reforço estrutural da superfície onde serão instalados os painéis, mediante valor adicional previamente acordado entre as partes. Em caso de determinação unilateral em que qualquer serviço ou atividade seja realizada sem a aprovação da CONTRATADA, ou seja, em contrariedade para com as NDU's e NBR's aplicáveis, a CONTRATADA emitirá um *Termo de Ciência e Responsabilidade Técnica*, de modo a isentá-la de toda e qualquer responsabilidade técnica e garantias pela execução de tais serviços, e, onde somente estes serão realizados após o aceite e assinatura do CONTRATANTE.",
      "3.8 A localização do inversor fotovoltaico será indicada em projeto elaborado pela equipe da CONTRATADA. Contudo, a CONTRATANTE poderá solicitar alteração desse local, desde que a nova área não ultrapasse a distância máxima de 10 (dez) metros do relógio ou padrão, e não esteja situada em áreas consideradas \"úmidas\" — tais como lavanderias, banheiros ou quaisquer locais que possam expor o equipamento à umidade ou contato com água —, condições estas que contrariariam o manual de instalação do equipamento e poderão comprometer a garantia do mesmo.",
      "3.9 As garantias não cobrem danos decorrentes de anomalias climáticas, tais como granizo, bem como prejuízos resultantes de roubos, furtos ou mau uso dos equipamentos. Também ficam excluídos da cobertura defeitos ou danos ocasionados por modificações ou consertos realizados pela CONTRATANTE ou por terceiros não autorizados.",
      "3.10 A garantia oferecida pela CONTRATADA não inclui a manutenção preventiva nem a limpeza das placas do sistema fotovoltaico. No entanto, reconhecendo a importância da manutenção regular para o desempenho ideal do sistema, a CONTRATADA disponibiliza esses serviços como opcionais, podendo ser contratados separadamente, de acordo com o interesse da CONTRATANTE. A contratação desses serviços adicionais contribui para que o sistema fotovoltaico opere com máxima eficiência e vida útil prolongada, proporcionando maior tranquilidade e conveniência ao CONTRATANTE.",
      "3.11 Considerando que se trata de um investimento de valor expressivo, e visando garantir a segurança e o conforto do CONTRATANTE, a CONTRATADA trabalha exclusivamente com fornecedor de reconhecida credibilidade no mercado, com 30 (trinta) anos de atuação. O fornecedor é a empresa Ourolux Comercial LTDA, inscrita no CNPJ sob o nº 05.393.234/0001-60, com sede na Avenida Bernardino do Campo, nº 98, Bairro Paraíso, CEP 04.004-040, São Paulo/SP. O responsável técnico pelo atendimento no estado de Rondônia é o Engenheiro Gustavo Rosa, contato telefônico: (69) 99281-8187, e-mail: grengenhariaro@gmail.com. Para atendimento direto com a fabricante, o CONTRATANTE poderá entrar em contato pelo telefone: (11) 2172-1000, ou pelo e-mail: sac@ourolux.com.br, de segunda a sexta-feira, no horário das 09h00 às 18h00.",
    ],
  });

  // CLÁUSULA 4 — OBRIGAÇÕES
  list.push({
    numero: "4",
    titulo: "DAS OBRIGAÇÕES",
    paragrafos: [
      "**A CONTRATADA obriga-se à:**",
      "4.1 Executar os serviços em conformidade com as normas e especificações estabelecidas pelos órgãos públicos competentes, bem como seguir rigorosamente as normas técnicas da Associação Brasileira de Normas Técnicas (ABNT), especialmente a NBR 16274, que regulamenta os sistemas fotovoltaicos.",
      "4.2 Realizar os serviços dentro dos prazos estabelecidos neste contrato, bem como manter reuniões com a CONTRATANTE sempre que forem necessárias eventuais modificações no projeto ou no cronograma.",
      "4.3 Fornecer, sempre que solicitado pela CONTRATANTE, informações atualizadas sobre a etapa e o andamento dos serviços contratados.",
      "4.4 Comprometer-se a ser integralmente responsável pela execução dos serviços contratados, apresentando as devidas Anotações de Responsabilidade Técnica (ARTs) devidamente recolhidas, emitidas por profissional habilitado e registrado no Conselho Regional de Engenharia e Agronomia de Rondônia (CREA/RO), conforme determina o artigo 7º da Lei nº 6.496/1977.",
      "4.5 Responsabilizar-se pelo levantamento e cálculo dos quantitativos de materiais a serem utilizados na execução dos serviços objeto deste contrato.",
      "4.6 Admitir e gerir, sob sua inteira e exclusiva responsabilidade penal, cível e fiscal, todo o pessoal necessário à execução do objeto deste contrato, isentando a CONTRATANTE de qualquer responsabilidade trabalhista, previdenciária ou tributária decorrente da relação entre a CONTRATADA e seus empregados, prepostos ou subcontratados.",
      "4.7 Garantir o sigilo absoluto quanto ao conteúdo deste contrato, aos serviços dele decorrentes, bem como às informações, dados e documentos a que tiver acesso durante ou após a execução do presente instrumento, comprometendo-se a não divulgar tais informações sob qualquer pretexto, salvo em caso de obrigação legal ou determinação judicial.",
      "4.8 A CONTRATADA compromete-se a adotar todas as medidas necessárias para proteger as informações confidenciais da CONTRATANTE, incluindo, mas não se limitando a, restringir o acesso a tais informações exclusivamente a funcionários e subcontratados que necessitem delas para a execução dos serviços contratados.",
      "4.9 Permitir à CONTRATANTE acesso irrestrito ao local de execução dos serviços, desde que sejam respeitadas todas as normas de segurança aplicáveis, bem como a obrigatória utilização de Equipamentos de Proteção Individual (EPIs). A CONTRATANTE terá o direito de inspecionar os serviços em andamento a qualquer momento, conforme julgar necessário, visando garantir que todas as atividades estejam sendo realizadas em conformidade com os padrões de qualidade, segurança e especificações contratuais previamente acordadas.",
      "**A CONTRATANTE obriga-se à:**",
      "4.10 As informações técnicas e os serviços fornecidos pela CONTRATADA no âmbito deste contrato deverão ser utilizados pela CONTRATANTE exclusivamente para os fins aqui pactuados. É expressamente vedada a utilização dessas informações ou serviços para qualquer outro projeto ou finalidade diversa da contratada. O descumprimento desta obrigação sujeitará a CONTRATANTE às sanções legais e contratuais aplicáveis, incluindo, mas não se limitando, à responsabilização por violação contratual.",
      "4.11 O período necessário para que a CONTRATANTE obtenha informações, documentos ou autorizações de sua responsabilidade, indispensáveis à continuidade ou conclusão das etapas do projeto, será automaticamente acrescido ao prazo de execução dos serviços pela CONTRATADA.",
      "4.12 Tal prorrogação será considerada plenamente justificada, não acarretando a aplicação de penalidades, multas ou quaisquer encargos adicionais à CONTRATADA, de modo a garantir a adequada e segura finalização dos serviços contratados.",
      "4.13 A CONTRATADA não poderá ser responsabilizada pelos custos de energia elétrica suportados pela CONTRATANTE durante os períodos em que o sistema fotovoltaico não estiver operacional, exceto nos casos em que ficar comprovado que a inoperância está diretamente relacionada a falhas nos serviços prestados pela CONTRATADA. Situações como falhas na rede da concessionária, desligamento acidental ou eventos naturais que causem danos aos equipamentos não são de responsabilidade da CONTRATADA e, portanto, não ensejarão compensação ou penalidade.",
      "4.14 A manutenção preventiva é fundamental para garantir o pleno funcionamento e a longevidade do sistema de geração de energia solar fotovoltaica. Recomenda-se à CONTRATANTE realizar a limpeza dos painéis ao menos duas (02) vezes por ano, a fim de assegurar o máximo de eficiência energética e evitar possíveis perdas de geração ocasionadas pela obstrução da superfície dos módulos;",
      "4.15 Realizar o pagamento conforme configurado na cláusula 2ª do presente contrato;",
      "4.16 Garantir o acesso ao local de execução dos serviços, bem como fornecer o apoio logístico necessário, incluindo o fornecimento de ponto de energia e espaço adequado para o armazenamento de materiais durante a realização dos trabalhos.",
    ],
  });

  // CLÁUSULA 5 — AUSÊNCIA DE VÍNCULO
  list.push({
    numero: "5",
    titulo: "DA AUSÊNCIA DE VÍNCULO",
    paragrafos: [
      "5.1 Não se estabelece, por força deste contrato, qualquer vínculo empregatício ou de outra natureza jurídica entre as partes e os respectivos funcionários, colaboradores, prepostos ou subcontratados.",
      "5.2 A CONTRATADA será integralmente responsável pela contratação, pagamento de salários, encargos trabalhistas, previdenciários e fiscais, incluindo o devido recolhimento de FGTS, INSS e demais tributos incidentes sobre seus empregados ou contratados, por meio das guias apropriadas.",
      "5.3 A CONTRATADA também será exclusivamente responsável por quaisquer reclamações trabalhistas, ações judiciais ou administrativas, ou outras demandas oriundas das relações de trabalho constituídas para a execução dos serviços objeto deste contrato, isentando a CONTRATANTE de qualquer responsabilidade solidária ou subsidiária.",
    ],
  });

  // CLÁUSULA 6 — MULTA E RESCISÃO
  list.push({
    numero: "6",
    titulo: "DA MULTA E RESCISÃO",
    paragrafos: [
      "6.1 Este contrato poderá ser rescindido por qualquer das partes em caso de descumprimento de suas disposições, desde que a parte inadimplente seja notificada previamente, com antecedência mínima de 30 (trinta) dias.",
      "6.2 Em caso de rescisão por iniciativa da CONTRATANTE, esta deverá efetuar o pagamento à CONTRATADA dos serviços efetivamente executados e/ou materiais adquiridos até a data da rescisão. No caso de rescisão por iniciativa da CONTRATADA, esta deverá concluir os serviços equivalentes ao valor já recebido ou, alternativamente, reembolsar à CONTRATANTE os valores pagos antecipadamente.",
      "6.3 O descumprimento de quaisquer cláusulas deste contrato acarretará a aplicação de multa contratual à parte infratora, no valor correspondente a 10% (dez por cento) do valor total do contrato, sem prejuízo de eventuais perdas e danos.",
      "6.4 Ambas as partes comprometem-se a agir de boa-fé, cooperando mutuamente e adotando medidas razoáveis para minimizar eventuais prejuízos decorrentes da rescisão contratual, incluindo, mas não se limitando a, garantir o acesso às instalações e o fornecimento das informações necessárias para viabilizar a continuidade ou a adequada conclusão dos serviços contratados.",
    ],
  });

  // CLÁUSULA 7 — FORO
  list.push({
    numero: "7",
    titulo: "DO FORO",
    paragrafos: [
      `7.1 Fica eleito o Foro Central da Comarca de ${cidadeForo} como o único competente para dirimir quaisquer controvérsias oriundas da execução deste contrato, com renúncia expressa a qualquer outro foro, por mais privilegiado que seja. As partes concordam que este foro será exclusivo para a solução de eventuais litígios, garantindo celeridade e eficácia na resolução dos conflitos.`,
      "7.2 E, por estarem justas e contratadas, as partes assinam o presente contrato em uma via digital ou, preferencialmente, em duas vias de igual teor, forma e para um só efeito, ratificando integralmente o seu conteúdo e validade jurídica.",
    ],
  });

  return list;
}

function inversoresDescricao(c: ContratoFull): string {
  // Tenta extrair "Nx KW" dos campos inv1..inv6 (ex. "INV-STD-40" → 40 kW)
  const ids = [c.inv1, c.inv2, c.inv3, c.inv4, c.inv5, c.inv6].filter(Boolean) as string[];
  if (ids.length === 0) return "";
  const count = new Map<string, number>();
  ids.forEach((id) => count.set(id, (count.get(id) ?? 0) + 1));
  const partes: string[] = [];
  count.forEach((n, id) => {
    const kwMatch = id.match(/(\d+(?:[.,]\d+)?)/);
    const kw = kwMatch ? `${kwMatch[1]} kW` : id;
    partes.push(`${String(n).padStart(2, "0")} (${porExtensoInt(n)}) de ${kw}`);
  });
  return `inversores sendo ${partes.join(" e ")}, marca Sofar`;
}

function porExtensoInt(n: number): string {
  const u = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez",
            "onze","doze","treze","quatorze","quinze","dezesseis","dezessete","dezoito","dezenove","vinte"];
  if (n <= 20) return u[n];
  return String(n);
}

function formaPagamentoTexto(c: ContratoFull): string[] {
  const det = c.pagamentoDetalhes ?? {};
  const formas = det.formas ?? [];
  const linhas: string[] = [];

  // === Modo COMPOSIÇÃO (múltiplas formas) — preferencial ===
  if (formas.length > 0) {
    const letras = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const partes = formas.map((f, i) => `${letras[i] ?? String(i + 1)}) ${descreveLinha(f)}`);
    linhas.push(
      `2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE da seguinte forma:\n${partes.join("\n")}`
    );

    // Cláusulas auxiliares dependentes do meio
    let n = 3;
    if (formas.some((f) => f.tipo === "Boleto")) {
      const boleto = formas.find((f) => f.tipo === "Boleto")!;
      const multa = boleto.multaPct ?? det.multaPct ?? 2;
      const juros = boleto.jurosMesPct ?? det.jurosMesPct ?? 1;
      const correcao = boleto.correcao ?? det.correcao ?? "IGP-M";
      linhas.push(`2.${n++} O atraso no pagamento de qualquer parcela via boleto implicará multa de ${multa}% sobre o valor em aberto, juros de mora de ${juros}% ao mês e correção monetária pelo índice ${correcao}.`);
    }
    if (formas.some((f) => f.tipo === "Financiamento")) {
      linhas.push(`2.${n++} Caso o financiamento bancário previsto na composição acima não seja aprovado pela instituição financeira, por qualquer motivo, o presente contrato poderá ser renegociado entre as partes, mediante **aditivo contratual**, ou cancelado sem ônus, multa ou encargo, antes da entrega dos materiais.`);
    }
    if (formas.some((f) => f.tipo.startsWith("Cartão") && f.jurosTipo === "cliente")) {
      linhas.push(`2.${n++} Nas parcelas pagas via cartão de crédito com juros do cliente, os encargos da operadora correrão por conta exclusiva do CONTRATANTE, conforme valor com juros descrito acima.`);
    }
    if (det.obs) linhas.push(`2.${n++} Observações: ${det.obs}`);
    return linhas;
  }

  // === Modo LEGADO (forma única via pagamentoTipo) ===
  const tipo = c.pagamentoTipo ?? "PIX";
  const entrada = det.entradaPct ?? 50;
  const parcelas = det.parcelas ?? 1;
  const valorFmt = extenso(c.valor);

  if (tipo === "Financiamento") {
    const banco = det.banco || "instituição financeira a ser definida";
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE da seguinte forma: ${valorFmt}, por meio de **financiamento junto ao ${banco}**, a ser aprovado junto à instituição financeira, ficando a CONTRATADA responsável pelo recebimento integral do valor contratado após a liberação do crédito.`);
    linhas.push("2.3 Caso o financiamento bancário mencionado na Cláusula 2.1 não seja aprovado pela instituição financeira, por qualquer motivo, o presente contrato poderá ser cancelado, sem qualquer ônus, multa ou encargo para ambas as partes, não gerando, portanto, nenhuma obrigação de pagamento ou indenização. Se ainda houver interesse de continuidade das negociações por ambas as partes, uma nova possibilidade de pagamento poderá ser negociada e efetivada através de **aditivo contratual**.");
  } else if (tipo === "PIX") {
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE da seguinte forma: ${valorFmt}, mediante PIX em ${parcelas} parcela(s), sendo ${entrada}% como entrada e o saldo conforme cronograma acordado entre as partes.`);
  } else if (tipo === "Boleto") {
    const multa = det.multaPct ?? 2;
    const juros = det.jurosMesPct ?? 1;
    const correcao = det.correcao ?? "IGP-M";
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE da seguinte forma: ${valorFmt}, mediante boleto bancário em ${parcelas} parcela(s), sendo ${entrada}% como entrada e o saldo conforme cronograma.`);
    linhas.push(`2.3 O atraso no pagamento de qualquer parcela implicará multa de ${multa}% sobre o valor em aberto, juros de mora de ${juros}% ao mês e correção monetária pelo índice ${correcao}.`);
  } else if (tipo === "Cartão") {
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE da seguinte forma: ${valorFmt}, mediante cartão de crédito em ${parcelas} parcela(s). Eventuais taxas da operadora correrão por conta do CONTRATANTE.`);
  } else if (tipo === "Misto") {
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE de forma mista, conforme cronograma e meios acordados entre as partes${det.obs ? `: ${det.obs}` : "."}`);
  } else if (tipo === "Dinheiro") {
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE da seguinte forma: ${valorFmt}, em espécie, em ${parcelas} parcela(s), sendo ${entrada}% como entrada.`);
  } else {
    linhas.push(`2.2 O valor mencionado na Cláusula 2.1 será pago pela CONTRATANTE em ${parcelas} parcela(s), sendo ${entrada}% como entrada.`);
  }
  if (det.obs && tipo !== "Misto") linhas.push(`2.${linhas.length + 2}. Observações: ${det.obs}`);
  return linhas;
}

function descreveLinha(f: import("./contratos-store").PagamentoLinha): string {
  const momentoTxt = {
    "entrada": "como entrada, na assinatura do contrato",
    "ato": "no ato",
    "entrega-materiais": "na entrega do material",
    "pos-instalacao": "iniciando após a conclusão do projeto",
    "conforme-cronograma": "conforme cronograma acordado",
  }[f.momento] ?? "";
  const momentoBase = {
    "entrada": "da assinatura",
    "ato": "do ato",
    "entrega-materiais": "da entrega do material",
    "pos-instalacao": "da conclusão do projeto",
    "conforme-cronograma": "do início do cronograma",
  }[f.momento] ?? "";

  function cronograma(parcelas: number, valorParcela: number): string {
    if (parcelas <= 1) return "";
    if (f.momento === "pos-instalacao") {
      return ` Cronograma: ${parcelas} parcela(s) de ${fmtBRL(valorParcela)}, iniciando após a conclusão do projeto.`;
    }
    const primeiro = f.primeiroVencDias ?? 30;
    const intervalo = f.intervaloDias ?? 30;
    const dias = Array.from({ length: parcelas }, (_, i) => primeiro + i * intervalo);
    return ` Cronograma: ${parcelas} parcela(s) de ${fmtBRL(valorParcela)}, com vencimentos em ${dias.join(", ")} dias ${momentoBase}.`;
  }

  if (f.tipo === "Financiamento") {
    return `${fmtBRL(f.valor)} via **financiamento junto ao ${f.banco || "banco a definir"}**, ${momentoTxt}${f.obs ? ` (${f.obs})` : ""}.`;
  }
  if (f.tipo.startsWith("Cartão")) {
    if (f.parcelas > 1) {
      if (f.jurosTipo === "cliente" && f.valorComJuros && f.valorComJuros > 0) {
        const par = f.valorComJuros / f.parcelas;
        return `${fmtBRL(f.valor)} via ${f.tipo} em ${f.parcelas}x de ${fmtBRL(par)} (valor com juros do cliente: ${fmtBRL(f.valorComJuros)}), ${momentoTxt}.${cronograma(f.parcelas, par)}${f.obs ? ` Obs.: ${f.obs}.` : ""}`;
      }
      const par = f.valor / f.parcelas;
      return `${fmtBRL(f.valor)} via ${f.tipo} em ${f.parcelas}x de ${fmtBRL(par)} (sem acréscimo ao CONTRATANTE), ${momentoTxt}.${cronograma(f.parcelas, par)}${f.obs ? ` Obs.: ${f.obs}.` : ""}`;
    }
    return `${fmtBRL(f.valor)} via ${f.tipo} à vista, ${momentoTxt}.`;
  }
  if (f.tipo === "Boleto") {
    if (f.parcelas > 1) {
      const par = f.valor / f.parcelas;
      return `${fmtBRL(f.valor)} via boleto bancário em ${f.parcelas} parcelas de ${fmtBRL(par)}, ${momentoTxt}.${cronograma(f.parcelas, par)}${f.obs ? ` Obs.: ${f.obs}.` : ""}`;
    }
    return `${fmtBRL(f.valor)} via boleto bancário, ${momentoTxt}${f.obs ? ` (${f.obs})` : ""}.`;
  }
  if (f.parcelas > 1) {
    const par = f.valor / f.parcelas;
    return `${fmtBRL(f.valor)} via ${f.tipo} em ${f.parcelas}x de ${fmtBRL(par)}, ${momentoTxt}.${cronograma(f.parcelas, par)}${f.obs ? ` Obs.: ${f.obs}.` : ""}`;
  }
  return `${fmtBRL(f.valor)} via ${f.tipo}, ${momentoTxt}${f.obs ? ` (${f.obs})` : ""}.`;
}

/* ============== Aplicar cláusulas personalizadas ============== */

export function aplicarCustom(base: ClausulaBase[], custom: ContratoFull["clausulasCustom"]): ClausulaBase[] {
  if (!custom || custom.length === 0) return base;
  let out = base.map((c) => ({ ...c, paragrafos: [...c.paragrafos] }));

  function refMatchesParagrafo(p: string, ref: string): boolean {
    const t = p.replace(/\*\*/g, "").trim();
    return t.startsWith(ref + " ") || t.startsWith(ref + ".") || t.startsWith(ref + "\t");
  }

  for (const cc of custom) {
    if (cc.acao === "remover") {
      // remove cláusula raiz inteira OU parágrafo específico
      if (cc.referencia.includes(".")) {
        const pai = cc.referencia.split(".")[0];
        const idx = out.findIndex((c) => c.numero === pai);
        if (idx >= 0) {
          out[idx].paragrafos = out[idx].paragrafos.filter((p) => !refMatchesParagrafo(p, cc.referencia));
        }
      } else {
        out = out.filter((c) => c.numero !== cc.referencia);
      }
    } else if (cc.acao === "substituir" && cc.texto) {
      const pai = cc.referencia.split(".")[0];
      const idx = out.findIndex((c) => c.numero === pai);
      if (idx >= 0) {
        out[idx].paragrafos = out[idx].paragrafos.map((p) =>
          refMatchesParagrafo(p, cc.referencia) ? `${cc.referencia} ${cc.texto}` : p
        );
      }
    } else if (cc.acao === "adicionar" && cc.texto) {
      const partes = cc.referencia.split(".");
      const pai = partes[0];
      const idx = out.findIndex((c) => c.numero === pai);
      if (idx >= 0) {
        const inserePos = out[idx].paragrafos.findIndex((p) => refMatchesParagrafo(p, cc.referencia));
        const novo = `${cc.referencia} ${cc.texto}`;
        if (inserePos >= 0) {
          out[idx].paragrafos.splice(inserePos, 0, novo);
        } else {
          out[idx].paragrafos.push(novo);
        }
      }
    }
  }

  // Renumera automaticamente os parágrafos "N.M" e sub "N.M.K" de cada cláusula
  // para refletir adições/remoções/substituições. Mantém parágrafos sem numeração
  // (cabeçalhos em negrito, alíneas a)/b), incisos I)/II), "Parágrafo único", etc.).
  for (const cl of out) {
    const N = cl.numero;
    if (!/^\d+$/.test(N)) continue;
    const reTop = new RegExp(`^(\\*\\*)?${N}\\.(\\d+)(?!\\.\\d)\\b\\.?`);
    const reSub = new RegExp(`^(\\*\\*)?${N}\\.(\\d+)\\.(\\d+)\\b\\.?`);
    let m = 0, k = 0;
    cl.paragrafos = cl.paragrafos.map((p) => {
      const mSub = p.match(reSub);
      if (mSub) {
        k += 1;
        return p.replace(reSub, `${mSub[1] ?? ""}${N}.${m || 1}.${k}`);
      }
      const mTop = p.match(reTop);
      if (mTop) {
        m += 1;
        k = 0;
        return p.replace(reTop, `${mTop[1] ?? ""}${N}.${m}`);
      }
      return p;
    });
  }

  return out;
}

// Template do contrato Meta Sun — cláusulas padrão de prestação de serviços
// de fornecimento e instalação de sistema fotovoltaico.
// As cláusulas são renderizadas dinamicamente em ContratoImpressao com base
// no ContratoFull (cliente, sistema, valor, pagamento e cláusulasCustom).

import type { ContratoFull } from "./contratos-store";

export type ClausulaBase = {
  numero: string;          // "1", "2.1", "2.2", ...
  titulo?: string;         // opcional (título da cláusula raiz)
  paragrafos: string[];    // parágrafos (cada item = um parágrafo)
};

export const CONTRATADA = {
  razao: "META SUN COMÉRCIO E SERVIÇOS DE ENERGIA SOLAR LTDA",
  cnpj: "00.000.000/0001-00",
  endereco: "Av. Calama, 0000 — Porto Velho/RO — CEP 76800-000",
  representante: "VITOR SIRIOLI RIBEIRO",
  representanteCpf: "000.000.000-00",
};

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function extenso(v: number) {
  // simplificação — em produção use uma lib (escrever-numero/numero-por-extenso).
  return `${fmtBRL(v)} (valor por extenso)`;
}

/* ============== Cláusulas base ============== */

export function clausulasBase(c: ContratoFull): ClausulaBase[] {
  const cli = c.clienteFull;
  const isPJ = (cli?.doc ?? "").replace(/\D/g, "").length === 14;
  const endereco = cli
    ? `${cli.rua}, ${cli.numero}${cli.complemento ? " - " + cli.complemento : ""} - ${cli.bairro} - ${cli.cidade}/${cli.uf} - CEP ${cli.cep}`
    : "—";
  const modulos = c.modulos ?? 0;
  const potenciaModulo = c.potencia ?? 0;
  const inversores = [c.inv1, c.inv2, c.inv3, c.inv4, c.inv5, c.inv6].filter(Boolean).join(" + ") || "—";

  const list: ClausulaBase[] = [];

  // Qualificação das partes
  list.push({
    numero: "1",
    titulo: "DAS PARTES",
    paragrafos: [
      `CONTRATANTE: ${cli?.nome ?? c.cliente}, ${isPJ ? "pessoa jurídica" : "pessoa física"}, inscrita no ${isPJ ? "CNPJ" : "CPF"} sob nº ${cli?.doc ?? "—"}, com endereço em ${endereco}${isPJ && c.responsavel ? `, neste ato representada por ${c.responsavel}${c.responsavelCargo ? `, ${c.responsavelCargo}` : ""}${c.responsavelDoc ? `, CPF ${c.responsavelDoc}` : ""}` : ""}.`,
      `CONTRATADA: ${CONTRATADA.razao}, inscrita no CNPJ ${CONTRATADA.cnpj}, com sede em ${CONTRATADA.endereco}, neste ato representada por ${CONTRATADA.representante}, CPF ${CONTRATADA.representanteCpf}.`,
    ],
  });

  // Objeto
  list.push({
    numero: "2",
    titulo: "DO OBJETO",
    paragrafos: [
      `O presente contrato tem por objeto o fornecimento e a instalação de sistema de geração de energia solar fotovoltaica conectado à rede (on-grid), composto por ${modulos} (${modulos}) módulos fotovoltaicos de ${potenciaModulo}Wp cada, e inversor(es) ${inversores}, totalizando potência aproximada de ${c.kwp ?? "—"} kWp.`,
      `A instalação ocorrerá no endereço do CONTRATANTE indicado na cláusula 1, conforme proposta comercial ${c.propostaNumero ?? "—"}, que passa a integrar este instrumento.`,
    ],
  });

  // Valor
  list.push({
    numero: "3",
    titulo: "DO VALOR E DA FORMA DE PAGAMENTO",
    paragrafos: [
      `3.1. Pelo objeto deste contrato, o CONTRATANTE pagará à CONTRATADA o valor total de ${extenso(c.valor)}.`,
      ...formaPagamentoTexto(c),
    ],
  });

  // Prazos e execução
  list.push({
    numero: "4",
    titulo: "DOS PRAZOS E DA EXECUÇÃO",
    paragrafos: [
      "4.1. O prazo de entrega dos materiais será de até 30 (trinta) dias corridos, contados da confirmação do pagamento da entrada ou liberação do financiamento.",
      "4.2. A instalação será concluída em até 15 (quinze) dias corridos, contados da entrega dos materiais no local da obra, salvo impedimentos atribuíveis ao CONTRATANTE ou à concessionária de energia.",
      "4.3. A homologação junto à concessionária seguirá os prazos regulatórios próprios do órgão.",
    ],
  });

  // Obrigações
  list.push({
    numero: "5",
    titulo: "DAS OBRIGAÇÕES DAS PARTES",
    paragrafos: [
      "5.1. Compete à CONTRATADA: fornecer os equipamentos, executar o projeto, realizar a instalação por equipe técnica habilitada, emitir ART/TRT e protocolar a solicitação de acesso junto à concessionária.",
      "5.2. Compete ao CONTRATANTE: disponibilizar local apto, energia para ferramentas, acesso à cobertura, e quitar pontualmente os valores devidos. Eventuais reforços estruturais, obras civis ou adequações elétricas no padrão de entrada não estão incluídos.",
    ],
  });

  // Garantia
  list.push({
    numero: "6",
    titulo: "DAS GARANTIAS",
    paragrafos: [
      "6.1. Os módulos fotovoltaicos possuem garantia de fábrica de 12 anos contra defeitos e 25 anos de geração linear, conforme fabricante.",
      "6.2. Os inversores possuem garantia de fábrica de 10 anos, conforme fabricante.",
      "6.3. A CONTRATADA garante a mão de obra de instalação pelo prazo de 12 meses contados da data de comissionamento.",
    ],
  });

  // Rescisão
  list.push({
    numero: "7",
    titulo: "DA RESCISÃO",
    paragrafos: [
      "7.1. O presente contrato poderá ser rescindido por descumprimento de qualquer cláusula, mediante notificação prévia de 10 (dez) dias.",
      `7.2. Em caso de desistência do CONTRATANTE após o pagamento da entrada e antes da entrega dos materiais, será retida multa de 20% (vinte por cento) sobre o valor total como compensação por custos de projeto e logística.${c.pagamentoTipo === "Financiamento" ? " No caso de financiamento bancário, fica facultado ao CONTRATANTE renegociar a forma de pagamento com a CONTRATADA antes da rescisão." : ""}`,
    ],
  });

  // Foro
  list.push({
    numero: "8",
    titulo: "DO FORO",
    paragrafos: [
      `8.1. Fica eleito o foro da comarca de ${cli?.cidade ?? "Porto Velho"}/${cli?.uf ?? "RO"} para dirimir quaisquer dúvidas oriundas do presente contrato, com renúncia de qualquer outro, por mais privilegiado que seja.`,
    ],
  });

  return list;
}

function formaPagamentoTexto(c: ContratoFull): string[] {
  const tipo = c.pagamentoTipo ?? "PIX";
  const det = c.pagamentoDetalhes ?? {};
  const entrada = det.entradaPct ?? 50;
  const parcelas = det.parcelas ?? 1;
  const marco = det.marcoInicial === "entrega-materiais"
    ? "na entrega dos materiais no local da obra"
    : det.marcoInicial === "pos-instalacao"
    ? "após a conclusão da instalação"
    : "na assinatura deste contrato";

  const linhas: string[] = [];
  if (tipo === "PIX") {
    linhas.push(`3.2. O pagamento será realizado via PIX em ${parcelas} parcela(s), sendo ${entrada}% ${marco} e o saldo conforme cronograma acordado entre as partes.`);
  } else if (tipo === "Boleto") {
    const multa = det.multaPct ?? 2;
    const juros = det.jurosMesPct ?? 1;
    const correcao = det.correcao ?? "IGP-M";
    linhas.push(`3.2. O pagamento será realizado mediante boleto bancário em ${parcelas} parcela(s), sendo ${entrada}% ${marco} e o saldo conforme cronograma.`);
    linhas.push(`3.3. O atraso no pagamento de qualquer parcela implicará multa de ${multa}% sobre o valor em aberto, juros de mora de ${juros}% ao mês e correção monetária pelo índice ${correcao}.`);
  } else if (tipo === "Financiamento") {
    linhas.push(`3.2. O pagamento será realizado mediante financiamento bancário junto à instituição ${det.banco ?? "a definir"}, com liberação dos recursos diretamente à CONTRATADA.`);
    linhas.push(`3.3. Caso o financiamento não seja aprovado, faculta-se ao CONTRATANTE renegociar a forma de pagamento com a CONTRATADA ou rescindir o contrato sem ônus, desde que antes da entrega dos materiais.`);
  } else if (tipo === "Cartão") {
    linhas.push(`3.2. O pagamento será realizado via cartão de crédito em ${parcelas} parcela(s). Eventuais taxas da operadora correrão por conta do CONTRATANTE.`);
  } else if (tipo === "Misto") {
    linhas.push(`3.2. O pagamento será realizado de forma mista, conforme cronograma e meios acordados entre as partes${det.obs ? `: ${det.obs}` : "."}`);
  } else {
    linhas.push(`3.2. O pagamento será realizado em ${parcelas} parcela(s), sendo ${entrada}% ${marco}.`);
  }
  if (det.obs && tipo !== "Misto") linhas.push(`3.${linhas.length + 1}. Observações: ${det.obs}`);
  return linhas;
}

/* ============== Aplicar cláusulas personalizadas ============== */

export function aplicarCustom(base: ClausulaBase[], custom: ContratoFull["clausulasCustom"]): ClausulaBase[] {
  if (!custom || custom.length === 0) return base;
  let out = base.map((c) => ({ ...c, paragrafos: [...c.paragrafos] }));

  for (const cc of custom) {
    if (cc.acao === "remover") {
      out = out.filter((c) => c.numero !== cc.referencia);
    } else if (cc.acao === "substituir" && cc.texto) {
      // substitui um parágrafo específico (ex. "3.2") dentro da cláusula pai ("3")
      const [pai] = cc.referencia.split(".");
      const idx = out.findIndex((c) => c.numero === pai);
      if (idx >= 0) {
        out[idx].paragrafos = out[idx].paragrafos.map((p) =>
          p.trim().startsWith(cc.referencia + ".") || p.trim().startsWith(cc.referencia + " ")
            ? `${cc.referencia}. ${cc.texto}`
            : p
        );
      }
    } else if (cc.acao === "adicionar" && cc.texto) {
      // adiciona novo parágrafo dentro da cláusula pai antes do existente de mesmo número
      const [pai] = cc.referencia.split(".");
      const idx = out.findIndex((c) => c.numero === pai);
      if (idx >= 0) {
        const inserePos = out[idx].paragrafos.findIndex((p) =>
          p.trim().startsWith(cc.referencia + ".") || p.trim().startsWith(cc.referencia + " ")
        );
        const novo = `${cc.referencia}. ${cc.texto}`;
        if (inserePos >= 0) {
          // renumera os seguintes (3.2 → 3.3, 3.3 → 3.4, ...)
          out[idx].paragrafos = out[idx].paragrafos.map((p) => {
            const m = p.match(/^\s*(\d+)\.(\d+)\.\s*/);
            if (!m) return p;
            const par = m[1], sub = parseInt(m[2], 10);
            const [refPar, refSubStr] = cc.referencia.split(".");
            const refSub = parseInt(refSubStr ?? "0", 10);
            if (par === refPar && sub >= refSub) {
              return p.replace(/^\s*\d+\.\d+\.\s*/, `${par}.${sub + 1}. `);
            }
            return p;
          });
          out[idx].paragrafos.splice(inserePos, 0, novo);
        } else {
          out[idx].paragrafos.push(novo);
        }
      }
    }
  }
  return out;
}

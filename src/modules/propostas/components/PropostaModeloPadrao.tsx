// Modelo padrão de proposta "Meta Sun 2026" — layout comercial A4.
// Renderiza somente apresentação; todos os números vêm dos cálculos oficiais do store.
import {
  type PropostaFV,
  useInversoresFV, calcDimensionamento, calcPrecificacao,
  consumoEfetivo, fmtBRL, fmtNum,
} from "@/modules/propostas/store";
import metaSunLogo from "@/assets/meta-sun-logo-v2.png.asset.json";
import metaSunRodape from "@/assets/meta-sun-rodape.png.asset.json";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
/** Sazonalidade média (fator sobre a geração média mensal). */
const SAZONALIDADE = [0.9397, 0.9911, 0.9643, 0.9710, 0.8862, 0.9554, 0.9978, 1.0803, 1.0848, 1.1049, 1.0379, 0.9889];

const INFLACAO_ENERGIA = 0.08;      // a.a.
const DEGRADACAO_GERACAO = 0.008;   // a.a.
const TAXA_CARTAO_AM = 0.0233;
const TAXA_BANCO_AM = 0.0102;

function pmt(pv: number, i: number, n: number) {
  if (pv <= 0 || n <= 0) return 0;
  if (i <= 0) return pv / n;
  return (pv * i) / (1 - Math.pow(1 + i, -n));
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mp-bloco">
      <h2 className="mp-h2">| {titulo}</h2>
      {children}
    </section>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="mp-linha">
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}

export function PropostaModeloPadrao({ proposta }: { proposta: PropostaFV }) {
  const p = proposta;
  const inversores = useInversoresFV();
  const dim = calcDimensionamento(p);
  const pre = calcPrecificacao(p);

  const consumo = consumoEfetivo(p);
  const tarifa = p.tarifa || 0;
  const investimento = pre.valorFinal;
  const economiaAnual = dim.geracaoAnualKwh * tarifa;
  const paybackMeses = economiaAnual > 0 ? Math.round((investimento / economiaAnual) * 12) : 0;

  const invLinhas = p.inversores
    .map((e) => {
      const inv = inversores.find((x) => x.id === e.inversorId);
      return inv ? `${e.quantidade} × ${inv.marca || "Inversor"} ${inv.modelo || ""} de ${fmtNum(inv.potenciaKw, 2)} kW` : null;
    })
    .filter(Boolean) as string[];

  const pagamentos = [
    { forma: "Pix / Transferência", parcelas: 1, valor: investimento },
    { forma: "Cartão até 21x", parcelas: 21, valor: pmt(investimento, TAXA_CARTAO_AM, 21) },
    { forma: "Financiamento bancário 48x", parcelas: 48, valor: pmt(investimento, TAXA_BANCO_AM, 48) },
    { forma: "Financiamento bancário 60x", parcelas: 60, valor: pmt(investimento, TAXA_BANCO_AM, 60) },
    { forma: "Financiamento bancário 72x", parcelas: 72, valor: pmt(investimento, TAXA_BANCO_AM, 72) },
    { forma: "Financiamento bancário 84x", parcelas: 84, valor: pmt(investimento, TAXA_BANCO_AM, 84) },
    { forma: "Financiamento bancário 96x", parcelas: 96, valor: pmt(investimento, TAXA_BANCO_AM, 96) },
  ];

  const projecao: { ano: number; tarifa: number; geracao: number; acumulada: number; resultado: number }[] = [];
  let acumulada = 0;
  for (let ano = 1; ano <= 16; ano++) {
    const tar = tarifa * Math.pow(1 + INFLACAO_ENERGIA, ano - 1);
    const ger = dim.geracaoAnualKwh * Math.pow(1 - DEGRADACAO_GERACAO, ano - 1);
    acumulada += ger * tar;
    projecao.push({ ano, tarifa: tar, geracao: ger, acumulada, resultado: acumulada - investimento });
  }

  return (
    <div className="proposta-modelo text-[11px] leading-snug text-foreground">
      <style>{`
        .proposta-modelo .mp-page { break-after: page; padding-bottom: 8mm; }
        .proposta-modelo .mp-page:last-child { break-after: auto; }
        .proposta-modelo .mp-h2 { font-weight: 700; letter-spacing: .06em; text-transform: uppercase; font-size: 12px; color: hsl(var(--primary)); margin: 14px 0 6px; border-bottom: 1px solid hsl(var(--border)); padding-bottom: 3px; }
        .proposta-modelo .mp-linha { display: flex; justify-content: space-between; gap: 12px; padding: 5px 8px; border-bottom: 1px dotted hsl(var(--border)); }
        .proposta-modelo table { width: 100%; border-collapse: collapse; }
        .proposta-modelo th, .proposta-modelo td { border: 1px solid hsl(var(--border)); padding: 3px 5px; text-align: center; font-size: 10px; }
        .proposta-modelo th { background: hsl(var(--muted)); font-weight: 600; }
        @media print { .proposta-modelo { font-size: 10.5px; } }
      `}</style>

      {/* ---------- Página 1 — capa / identificação ---------- */}
      <div className="mp-page">
        <div className="flex flex-col items-center gap-1 border-b pb-3 text-center">
          <img src={metaSunLogo.url} alt="Meta Sun Energia Solar" className="h-16 object-contain" />
          <div className="text-[13px] font-semibold uppercase tracking-widest">Proposta comercial fotovoltaica</div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-x-8">
          <Linha label="Cliente" valor={p.clienteNome || "—"} />
          <Linha label="Número da proposta" valor={p.numero} />
          <Linha label="Consultor" valor={p.consultor || "—"} />
          <Linha label="Emitida em" valor={p.criadoEm || "—"} />
          <Linha label="Cidade / UF" valor={`${p.cidade || "—"}/${p.estado || "—"}`} />
          <Linha label="Proposta válida até" valor={p.validade || "—"} />
          <Linha label="Potência do sistema" valor={`${fmtNum(dim.potenciaFinalKwp, 2)} kWp`} />
          <Linha label="Geração média mensal" valor={`${fmtNum(dim.geracaoMensalKwh, 2)} kWh`} />
        </div>

        <Bloco titulo="Quem somos">
          <p className="text-justify">
            Somos a Meta Sun, e iniciamos nossa trajetória em 2020. Em 2023 nos tornamos uma empresa independente, o que nos
            permitiu ampliar marcas e produtos para oferecer ainda mais economia e sustentabilidade aos nossos clientes. Desde
            então, já realizamos mais de 750 projetos de energia solar, sempre com foco em inovação, eficiência e impacto positivo
            no meio ambiente. Com uma equipe qualificada e parcerias estratégicas, nos destacamos pela qualidade, transparência e
            confiabilidade.
          </p>
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {["+ de 750 projetos realizados", "Atuamos em todo o Brasil", "Equipe de engenharia própria", "+ de 8 MW em operação"].map((t) => (
              <div key={t} className="rounded-md border bg-card p-2 text-[10px] font-medium">{t}</div>
            ))}
          </div>
        </Bloco>

        <Bloco titulo="Por que nos escolher">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Soluções assertivas", "Analisamos a viabilização de projetos financeiros para trazer as melhores condições técnico-comerciais do seu projeto solar."],
              ["Atendimento personalizado", "Muito mais que uma proposta comercial: nosso time é capacitado para realizar toda a consultoria da fatura de energia."],
              ["Análise de eficiência", "Atuamos em toda a interface de execução do projeto fotovoltaico, do início à entrega da usina."],
              ["Retorno garantido em contrato", "Asseguramos em contrato a geração do sistema fotovoltaico, sem surpresas para o cliente."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-md border bg-card p-2">
                <div className="text-[11px] font-semibold uppercase">{t}</div>
                <div className="text-[10px] text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </Bloco>
      </div>

      {/* ---------- Página 2 — projeto ---------- */}
      <div className="mp-page">
        <Bloco titulo="Seu projeto">
          <Linha label="Consumo médio mensal" valor={`${fmtNum(consumo, 2)} kWh`} />
          <Linha label="Produção média do sistema" valor={`${fmtNum(dim.geracaoMensalKwh, 2)} kWh`} />
          <Linha label="Área necessária para o sistema" valor={`${fmtNum(dim.areaTotal, 2)} m²`} />
          <Linha label="Tipo de instalação / telhado" valor={`${p.tipoInstalacao} · ${p.tipoTelhado || "—"}`} />
          <Linha label="Concessionária" valor={p.concessionaria || "—"} />
        </Bloco>

        <Bloco titulo="Descrição dos itens">
          <ul className="list-disc pl-5">
            <li>{dim.qtdFinal} módulos fotovoltaicos de {p.moduloPotenciaWp} W {p.moduloMarca ? `| ${p.moduloMarca}` : ""} {p.moduloModelo || ""}</li>
            {invLinhas.map((t) => <li key={t}>{t}</li>)}
            <li>Cabo solar preto e vermelho.</li>
            <li>Estrutura de fixação solar.</li>
            <li>Mão de obra de instalação.</li>
            <li>Projeto, homologação e ART junto à concessionária.</li>
          </ul>
        </Bloco>

        <Bloco titulo="Consumo × geração">
          <div className="mb-2 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-md border bg-card p-2"><div className="text-[9px] uppercase text-muted-foreground">Consumo médio mensal</div><div className="font-semibold">{fmtNum(consumo, 2)} kWh</div></div>
            <div className="rounded-md border bg-card p-2"><div className="text-[9px] uppercase text-muted-foreground">Geração média mensal</div><div className="font-semibold">{fmtNum(dim.geracaoMensalKwh, 2)} kWh</div></div>
            <div className="rounded-md border bg-card p-2"><div className="text-[9px] uppercase text-muted-foreground">Geração média anual</div><div className="font-semibold">{fmtNum(dim.geracaoAnualKwh, 2)} kWh</div></div>
            <div className="rounded-md border bg-card p-2"><div className="text-[9px] uppercase text-muted-foreground">Irradiação local</div><div className="font-semibold">{fmtNum(p.irradiacaoMedia / 30, 2)} kWh/m²</div></div>
          </div>
          <table>
            <thead>
              <tr><th>Detalhamento</th>{MESES.map((m) => <th key={m}>{m.slice(0, 3)}</th>)}</tr>
            </thead>
            <tbody>
              <tr><td>Geração</td>{SAZONALIDADE.map((f, i) => <td key={i}>{fmtNum(dim.geracaoMensalKwh * f, 0)}</td>)}</tr>
              <tr><td>Consumo</td>{MESES.map((_, i) => <td key={i}>{fmtNum(consumo, 0)}</td>)}</tr>
              <tr><td>Excedente</td>{SAZONALIDADE.map((f, i) => <td key={i}>{fmtNum(dim.geracaoMensalKwh * f - consumo, 0)}</td>)}</tr>
            </tbody>
          </table>
        </Bloco>
      </div>

      {/* ---------- Página 3 — investimento ---------- */}
      <div className="mp-page">
        <Bloco titulo="Retorno do investimento">
          <Linha label="Valor do investimento" valor={fmtBRL(investimento)} />
          <Linha label="Retorno do investimento" valor={`${Math.floor(paybackMeses / 12)} anos e ${paybackMeses % 12} meses`} />
          <Linha label="Economia estimada no 1º ano" valor={fmtBRL(economiaAnual)} />
          <Linha label="Prazo de entrega do sistema" valor="90 dias" />
        </Bloco>

        <Bloco titulo="Opções de pagamento">
          <table>
            <thead><tr><th>Forma de pagamento</th><th>Parcelas</th><th>Valor da parcela</th></tr></thead>
            <tbody>
              {pagamentos.map((o) => (
                <tr key={o.forma}><td>{o.forma}</td><td>{o.parcelas}</td><td>{fmtBRL(o.valor)}*</td></tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 text-center text-[9px] text-muted-foreground">*Valores estimativos, sujeitos à confirmação junto à instituição financeira.</div>
        </Bloco>

        <Bloco titulo="Garantias">
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ["Módulos", "Garantia do fabricante de 10 anos contra queda de eficiência em 20%."],
              ["Inversor(es)", "Garantia de 12 anos padrão, de acordo com o fabricante."],
              ["Infraestrutura", "Garantia de 1 ano para materiais elétricos e outros."],
              ["Mão de obra", "Garantia de 1 ano para todos os clientes."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-md border bg-card p-2">
                <div className="text-[10px] font-semibold uppercase">{t}</div>
                <div className="text-[9px] text-muted-foreground">{d}</div>
              </div>
            ))}
          </div>
        </Bloco>
      </div>

      {/* ---------- Página 4 — projeção ---------- */}
      <div className="mp-page">
        <Bloco titulo="Tabela de projeção">
          <table>
            <thead>
              <tr><th>Situação</th><th>Ano</th><th>Valor da tarifa (R$)</th><th>Geração (kWh/ano)</th><th>Economia acumulada (R$)</th><th>Resultado (R$)</th></tr>
            </thead>
            <tbody>
              {projecao.map((l) => (
                <tr key={l.ano}>
                  <td>{l.resultado < 0 ? "Investimento" : "Lucro"}</td>
                  <td>{l.ano}</td>
                  <td>{fmtBRL(l.tarifa)}</td>
                  <td>{fmtNum(l.geracao, 2)}</td>
                  <td>{fmtBRL(l.acumulada)}</td>
                  <td>{fmtBRL(l.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-1 text-center text-[9px] text-muted-foreground">*Considerando uma inflação energética de 8,0% ao ano.</div>
        </Bloco>

        {p.obsCliente && (
          <Bloco titulo="Observações">
            <p className="whitespace-pre-line text-justify">{p.obsCliente}</p>
          </Bloco>
        )}

        <div className="mt-8 grid grid-cols-2 gap-10 text-center text-[10px]">
          <div className="border-t border-foreground pt-1">{p.clienteNome || "Cliente"}</div>
          <div className="border-t border-foreground pt-1">Meta Sun · Energia Solar</div>
        </div>

        <div className="mt-6 flex justify-center">
          <img src={metaSunRodape.url} alt="Contato Meta Sun" className="h-14 object-contain" />
        </div>
      </div>
    </div>
  );
}

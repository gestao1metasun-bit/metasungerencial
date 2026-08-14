// Modelo oficial de proposta "Meta Sun 2026" — réplica visual do padrão comercial impresso.
// Renderiza somente apresentação; todos os números vêm dos cálculos oficiais do store.
import {
  type PropostaFV,
  useInversoresFV, calcDimensionamento, calcPrecificacao,
  consumoEfetivo, fmtBRL, fmtNum,
} from "@/modules/propostas/store";
import metaSunLogo from "@/assets/meta-sun-logo-v2.png.asset.json";
import metaSunRodape from "@/assets/meta-sun-rodape.png.asset.json";
import capaPaineis from "@/assets/capa-paineis.jpg";

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

/** Título de seção com a barra navy à esquerda (padrão Meta Sun). */
function Titulo({ children }: { children: React.ReactNode }) {
  return <h2 className="mp-title">{children}</h2>;
}

/** Linha "pílula": rótulo navy à esquerda + valor destacado com borda laranja. */
function Pilula({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="mp-pill">
      <div className="mp-pill-label">{label}</div>
      <div className="mp-pill-value">{valor}</div>
    </div>
  );
}

function Pagina({ numero, children }: { numero?: string; children: React.ReactNode }) {
  return (
    <div className="mp-page">
      <div className="mp-page-body">{children}</div>
      {numero && (
        <div className="mp-page-foot">
          <img src={metaSunLogo.url} alt="Meta Sun" className="mp-foot-logo" />
          <span className="mp-page-num">{numero}</span>
        </div>
      )}
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
    { forma: "Pix", parcelas: 1, valor: investimento },
    { forma: "Cartão até 21x", parcelas: 21, valor: pmt(investimento, TAXA_CARTAO_AM, 21) },
    { forma: "Financiamento BASA 48x", parcelas: 48, valor: pmt(investimento, TAXA_BANCO_AM, 48) },
    { forma: "Financiamento BASA 60x", parcelas: 60, valor: pmt(investimento, TAXA_BANCO_AM, 60) },
    { forma: "Financiamento BASA 72x", parcelas: 72, valor: pmt(investimento, TAXA_BANCO_AM, 72) },
    { forma: "Financiamento BASA 84x", parcelas: 84, valor: pmt(investimento, TAXA_BANCO_AM, 84) },
    { forma: "Financiamento BASA 96x", parcelas: 96, valor: pmt(investimento, TAXA_BANCO_AM, 96) },
  ];

  const projecao: { ano: number; tarifa: number; geracao: number; acumulada: number; resultado: number }[] = [];
  let acumulada = 0;
  for (let ano = 1; ano <= 16; ano++) {
    const tar = tarifa * Math.pow(1 + INFLACAO_ENERGIA, ano - 1);
    const ger = dim.geracaoAnualKwh * Math.pow(1 - DEGRADACAO_GERACAO, ano - 1);
    acumulada += ger * tar;
    projecao.push({ ano, tarifa: tar, geracao: ger, acumulada, resultado: acumulada - investimento });
  }

  const maxBarra = Math.max(consumo, ...SAZONALIDADE.map((f) => dim.geracaoMensalKwh * f), 1);
  const dataRef = (p.validade || p.criadoEm || "").slice(0, 10);
  const [ay, am, ad] = dataRef.split("-");
  const anoCapa = ay && ay.length === 4 ? ay : String(new Date().getFullYear());
  const validadeBR = ay && am && ad ? `${ad}/${am}/${ay}` : "—";
  const numeroCapa = (p.numero || "").replace(/^PROPOSTA\s*/i, "");

  return (
    <div className="proposta-modelo">
      <style>{`
        @page { size:A4 portrait; margin:0; }
        .proposta-modelo { --navy:#0d2a56; --orange:#f5a11b; --ink:#1b2430; --muted:#5b6672; --line:#dfe3e8;
          color:var(--ink); font-family:'Inter','Segoe UI',Arial,Helvetica,sans-serif; font-size:10.5pt; line-height:1.55;
          -webkit-font-smoothing:antialiased; font-variant-numeric:tabular-nums; }
        .proposta-modelo p { margin:0 0 8px; }
        .proposta-modelo .mp-page { position:relative; width:210mm; min-height:297mm; margin:0 auto 8mm; background:#fff; box-shadow:0 2px 14px rgba(13,42,86,.10); overflow:hidden; break-after:page; display:flex; flex-direction:column; }
        .proposta-modelo .mp-page:last-child { break-after:auto; }
        .proposta-modelo .mp-page-body { flex:1; padding:20mm 18mm 10mm; }
        .proposta-modelo .mp-page-foot { display:flex; align-items:center; justify-content:space-between; padding:0 18mm 12mm; border-top:1px solid var(--line); margin:0 18mm; padding-left:0; padding-right:0; padding-top:6px; }
        .proposta-modelo .mp-foot-logo { height:30px; object-fit:contain; }
        .proposta-modelo .mp-page-num { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:999px; background:var(--navy); color:#fff; font-size:9pt; font-weight:700; }

        .proposta-modelo .mp-title { display:flex; align-items:center; gap:10px; font-size:17pt; font-weight:800; color:var(--navy); text-transform:uppercase; letter-spacing:.005em; margin:0 0 12px; line-height:1.15; }
        .proposta-modelo .mp-title::before { content:""; width:6px; height:20px; background:var(--orange); border-radius:2px; display:block; }
        .proposta-modelo .mp-sec { margin-bottom:18px; break-inside:avoid; }

        .proposta-modelo .mp-pill { display:flex; gap:8px; margin-bottom:7px; align-items:stretch; }
        .proposta-modelo .mp-pill-label { flex:0 0 46%; background:var(--navy); color:#fff; font-weight:600; font-size:9.5pt; letter-spacing:.02em; text-transform:uppercase; padding:9px 14px; border-radius:5px; display:flex; align-items:center; }
        .proposta-modelo .mp-pill-value { flex:1; background:#f3f5f8; border:1.5px solid var(--orange); border-radius:5px; font-weight:700; font-size:11pt; color:var(--navy); display:flex; align-items:center; justify-content:center; }

        .proposta-modelo .mp-strip { background:var(--navy); color:#fff; border-radius:6px; display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:14px 10px; text-align:center; font-size:9.5pt; line-height:1.4; font-weight:600; }
        .proposta-modelo .mp-card { background:#f5f7fa; border:1px solid var(--line); border-left:3px solid var(--orange); border-radius:5px; padding:12px 14px; }
        .proposta-modelo .mp-card h4 { color:var(--navy); font-size:9.5pt; font-weight:800; text-transform:uppercase; letter-spacing:.03em; margin:0 0 5px; }
        .proposta-modelo .mp-card p { margin:0; text-align:justify; font-size:9pt; line-height:1.5; color:var(--muted); }

        .proposta-modelo table { width:100%; border-collapse:collapse; break-inside:avoid; }
        .proposta-modelo thead th { background:var(--navy); color:#fff; font-weight:700; font-size:9pt; letter-spacing:.02em; padding:8px 5px; text-align:center; }
        .proposta-modelo tbody td { border:1px solid var(--line); padding:6px 5px; text-align:center; font-size:9pt; }
        .proposta-modelo tbody tr:nth-child(even) td { background:#fafbfc; }
        .proposta-modelo .mp-mini td, .proposta-modelo .mp-mini th { font-size:7.2pt; padding:3px 2px; }
        .proposta-modelo .mp-tag { display:inline-block; border-radius:3px; padding:2px 7px; font-weight:700; font-size:7pt; letter-spacing:.03em; color:#fff; }

        .proposta-modelo .mp-chart { display:flex; align-items:flex-end; gap:6px; height:140px; margin-bottom:8px; padding-bottom:4px; border-bottom:1px solid var(--line); }
        .proposta-modelo .mp-chart .g { flex:1; display:flex; align-items:flex-end; gap:2px; height:100%; }
        .proposta-modelo .mp-chart .b { flex:1; border-radius:2px 2px 0 0; }

        .proposta-modelo .mp-kpi { background:#f5f7fa; border:1px solid var(--line); border-radius:5px; padding:10px 8px; text-align:center; }
        .proposta-modelo .mp-kpi span { display:block; font-size:8pt; color:var(--muted); text-transform:uppercase; letter-spacing:.03em; margin-bottom:3px; }
        .proposta-modelo .mp-kpi strong { font-size:11pt; color:var(--navy); }

        .proposta-modelo .mp-capa { position:relative; padding:0; overflow:hidden; background:#fff; }
        .proposta-modelo .mp-capa-inner { padding:18mm 16mm; position:relative; z-index:4; }
        .proposta-modelo .mp-capa-foto { position:absolute; left:0; right:0; bottom:0; width:100%; height:38%; object-fit:cover; z-index:1;
          clip-path:polygon(0 62%, 100% 0, 100% 100%, 0 100%); }
        .proposta-modelo .mp-capa-diag { position:absolute; right:0; bottom:26%; width:82%; height:20%; background:var(--orange); z-index:2;
          clip-path:polygon(0 52%, 100% 0, 100% 60%, 0 100%); }
        .proposta-modelo .mp-capa-diag2 { position:absolute; right:0; top:0; width:58%; height:100%; background:linear-gradient(150deg,#eef1f5 0%,#ffffff 65%); z-index:0;
          clip-path:polygon(42% 0, 100% 0, 100% 100%, 0 100%); }
        .proposta-modelo .mp-capa-ano { position:absolute; right:16mm; bottom:31%; z-index:3; font-size:34pt; font-weight:800; color:#1b2430; line-height:1; }


        @media print {
          .proposta-modelo { font-size:10pt; }
          .proposta-modelo .mp-page { box-shadow:none; margin:0; width:210mm; height:297mm; min-height:0; }
          .proposta-modelo .mp-page-body { padding:16mm 16mm 6mm; }
          .proposta-modelo .mp-page-foot { padding-bottom:8mm; }
          .proposta-modelo * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
        }
      `}</style>


      {/* ---------- Página 1 — capa ---------- */}
      <div className="mp-page mp-capa">
        <div className="mp-capa-diag2" />
        <img src={capaPaineis} alt="Painéis solares" className="mp-capa-foto" width={1024} height={768} />
        <div className="mp-capa-diag" />
        <div className="mp-capa-ano">{anoCapa}</div>
        <div className="mp-capa-inner">
          <div style={{ textAlign: "center" }}>
            <img src={metaSunLogo.url} alt="Meta Sun Energia Solar" style={{ height: 78, objectFit: "contain", display: "inline-block" }} />
          </div>

          <div style={{ marginTop: "18mm" }}>
            <div style={{ fontSize: "34pt", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-.02em", color: "#1b2430" }}>PROPOSTA</div>
            <div style={{ fontSize: "38pt", fontWeight: 800, lineHeight: 1.02, letterSpacing: "-.02em", color: "#0d2a56" }}>COMERCIAL</div>
            <div style={{ fontSize: "15pt", color: "#3d4854", marginTop: 4 }}>Sistema Fotovoltaico</div>
          </div>

          <div style={{ marginTop: "14mm", fontSize: "12.5pt", lineHeight: 1.55, color: "#1b2430" }}>
            <div>Cliente: {p.clienteNome || "—"}</div>
            <div>Geração média mensal: {fmtNum(dim.geracaoMensalKwh, 2)} kWh</div>
            <div>Potência do Sistema: {fmtNum(dim.potenciaFinalKwp, 2)} kWp</div>
            <div>Consultor: {p.consultor || "—"}</div>
          </div>

          <div style={{ marginTop: "8mm", fontSize: "9.5pt", color: "#3d4854", lineHeight: 1.6 }}>
            <div>Proposta válida até: {validadeBR}</div>
            <div>Número da Proposta: <strong>{numeroCapa}</strong></div>
          </div>
        </div>
      </div>



      {/* ---------- Página 2 — institucional ---------- */}
      <Pagina numero="01">
        <section className="mp-sec">
          <Titulo>Quem somos</Titulo>
          <p style={{ textAlign: "justify" }}>
            Somos a Meta Sun, e iniciamos nossa trajetória em 2020. Em 2023 nos tornamos uma empresa independente, o que nos
            permitiu ampliar marcas e produtos para oferecer ainda mais economia e sustentabilidade aos nossos clientes.
          </p>
          <p style={{ textAlign: "justify" }}>
            Desde então, já realizamos mais de 750 projetos de energia solar, sempre com foco em inovação, eficiência e impacto
            positivo no meio ambiente.
          </p>
          <p style={{ textAlign: "justify" }}>
            Com uma equipe qualificada e parcerias estratégicas, nos destacamos pela qualidade, transparência e confiabilidade,
            reafirmando todos os dias nosso compromisso de construir um futuro mais sustentável.
          </p>
          <div className="mp-strip" style={{ marginTop: 14 }}>
            <div>+ de 750 projetos<br />realizados</div>
            <div>Atuamos em todo<br />o Brasil.</div>
            <div>Equipe de Engenharia<br />própria</div>
            <div>+ de 8 MW<br />em operação</div>
          </div>
        </section>

        <section className="mp-sec">
          <Titulo>Porque nos escolher</Titulo>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Soluções assertivas", "Analisamos a viabilização de projetos financeiros (project finance) para trazer as melhores condições técnica-comercial do seu projeto solar."],
              ["Atendimento personalizado", "Muito mais que apenas uma proposta comercial, nosso time de consultores é capacitado e orientado a realizar toda consultoria de fatura de energia."],
              ["Análise de eficiência", "Trabalhamos em toda interface de execução de projetos fotovoltaicos, com a premissa de que nossos clientes não precisam se preocupar com nada dentro do processo de instalação e entrega das usinas."],
              ["Retorno garantido em contrato", "Asseguramos em contrato a geração do sistema fotovoltaico, para 100% de segurança e garantia do cliente."],
            ].map(([t, d]) => (
              <div key={t} className="mp-card">
                <h4>{t}</h4>
                <p>{d}</p>
              </div>
            ))}
          </div>
        </section>
      </Pagina>

      {/* ---------- Página 3 — projeto ---------- */}
      <Pagina numero="02">
        <section className="mp-sec">
          <Titulo>Seu projeto</Titulo>
          <Pilula label="Consumo médio mensal" valor={`${fmtNum(consumo, 2)} kWh`} />
          <Pilula label="Produção média do sistema" valor={`${fmtNum(dim.geracaoMensalKwh, 2)} kWh`} />
          <Pilula label="Área necessária para o sistema" valor={`${fmtNum(dim.areaTotal, 2)} m²`} />
        </section>

        <section className="mp-sec">
          <Titulo>Descrição dos itens</Titulo>
          <ul style={{ listStyle: "disc", paddingLeft: 22, fontSize: "10.5pt", lineHeight: 1.9 }}>
            <li>{dim.qtdFinal} Módulos Fotovoltaicos de {p.moduloPotenciaWp} W {p.moduloMarca ? `| ${p.moduloMarca}` : ""} {p.moduloModelo || ""}</li>
            {invLinhas.map((t) => <li key={t}>{t}</li>)}
            <li>Cabo Solar Preto.</li>
            <li>Cabo Solar Vermelho.</li>
            <li>Estrutura Solar.</li>
            <li>Mão de obra.</li>
          </ul>
        </section>

        <section className="mp-sec">
          <Titulo>Consumo x geração</Titulo>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 12 }}>
            <div className="mp-kpi"><span>Consumo médio mensal</span><strong>{fmtNum(consumo, 2)} kWh</strong></div>
            <div className="mp-kpi"><span>Geração média mensal</span><strong>{fmtNum(dim.geracaoMensalKwh, 2)} kWh</strong></div>
            <div className="mp-kpi"><span>Geração média anual</span><strong>{fmtNum(dim.geracaoAnualKwh, 2)} kWh/ano</strong></div>
            <div className="mp-kpi"><span>Irradiação Local</span><strong>{fmtNum(p.irradiacaoMedia / 30, 2)} kWh/m²</strong></div>
          </div>

          <div className="mp-chart">
            {SAZONALIDADE.map((f, i) => (
              <div className="g" key={i}>
                <div className="b" style={{ background: "#0d2a56", height: `${(consumo / maxBarra) * 100}%` }} />
                <div className="b" style={{ background: "#f5a11b", height: `${((dim.geracaoMensalKwh * f) / maxBarra) * 100}%` }} />
              </div>
            ))}
          </div>

          <table className="mp-mini">
            <thead>
              <tr><th>Detalhamento</th>{MESES.map((m) => <th key={m}>{m}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td><span className="mp-tag" style={{ background: "#f5a11b" }}>Geração</span></td>
                {SAZONALIDADE.map((f, i) => <td key={i}>{fmtNum(dim.geracaoMensalKwh * f, 2)}</td>)}
              </tr>
              <tr>
                <td><span className="mp-tag" style={{ background: "#0d2a56" }}>Consumo</span></td>
                {MESES.map((_, i) => <td key={i}>{fmtNum(consumo, 0)}</td>)}
              </tr>
              <tr>
                <td><span className="mp-tag" style={{ background: "#1f9d55" }}>Excedente</span></td>
                {SAZONALIDADE.map((f, i) => <td key={i}>{fmtNum(dim.geracaoMensalKwh * f - consumo, 2)}</td>)}
              </tr>
            </tbody>
          </table>
        </section>
      </Pagina>

      {/* ---------- Página 4 — investimento ---------- */}
      <Pagina numero="03">
        <section className="mp-sec">
          <Titulo>Retorno do investimento</Titulo>
          <Pilula label="Valor do investimento" valor={fmtBRL(investimento)} />
          <Pilula label="Retorno do investimento" valor={`${Math.floor(paybackMeses / 12)} anos e ${paybackMeses % 12} meses`} />
          <Pilula label="Prazo de entrega do sistema" valor="90 dias" />
        </section>

        <section className="mp-sec">
          <Titulo>Opções de <strong>pagamento</strong></Titulo>
          <table>
            <thead><tr><th>Forma de pagamento</th><th>Parcelas</th><th>Valor da parcela</th></tr></thead>
            <tbody>
              {pagamentos.map((o) => (
                <tr key={o.forma}><td>{o.forma}</td><td>{o.parcelas}</td><td>{fmtBRL(o.valor)}*</td></tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "center", fontSize: 10, marginTop: 6, color: "#5b6672" }}>*Valores estimativos, sujeitos à confirmação.</div>
        </section>

        <section className="mp-sec">
          <Titulo>Garantias</Titulo>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, background: "#f6f7f9", borderRadius: 6, padding: 14 }}>
            {[
              ["Módulos", "Garantia do fabricante de 10 anos contra queda de eficiência em 20%."],
              ["Inversor(es)", "Garantia de 12 anos padrão de acordo com o fabricante."],
              ["Infraestrutura", "Garantia de 1 ano para materiais elétricos e outros."],
              ["Mão de obra", "Garantia de 1 ano para todos os clientes."],
            ].map(([t, d]) => (
              <div key={t} style={{ textAlign: "center" }}>
                <div style={{ fontWeight: 800, textTransform: "uppercase", color: "#0d2a56", fontSize: 11, marginBottom: 8 }}>{t}</div>
                <div style={{ fontSize: 10.5 }}>{d}</div>
              </div>
            ))}
          </div>
        </section>
      </Pagina>

      {/* ---------- Página 5 — projeção ---------- */}
      <Pagina numero="04">
        <section className="mp-sec">
          <Titulo>Tabela de projeção</Titulo>
          <table className="mp-mini">
            <thead>
              <tr><th>Situação</th><th>Ano</th><th>Valor da tarifa (R$)</th><th>Geração (kWh/Ano)</th><th>Economia (R$)</th><th>Resultado (R$)</th></tr>
            </thead>
            <tbody>
              {projecao.map((l) => (
                <tr key={l.ano}>
                  <td style={{ background: l.resultado < 0 ? "#c7d2fe" : "#bbf7d0", fontWeight: 700, color: l.resultado < 0 ? "#3730a3" : "#166534" }}>
                    {l.resultado < 0 ? "Investimento" : "Lucro"}
                  </td>
                  <td>{l.ano}</td>
                  <td>{fmtBRL(l.tarifa)}</td>
                  <td>{fmtNum(l.geracao, 2)}</td>
                  <td>{fmtBRL(l.acumulada)}</td>
                  <td>{fmtBRL(l.resultado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, marginTop: 14 }}>*Considerando uma inflação energética de 8,0% ao ano.</div>
        </section>
      </Pagina>

      {/* ---------- Página 6 — aceite ---------- */}
      <div className="mp-page">
        <div className="mp-page-body">
          <div style={{ textAlign: "center", fontSize: "24pt", fontWeight: 800, letterSpacing: ".18em", color: "#0d2a56" }}>PARCEIROS</div>
          <div style={{ textAlign: "center", fontSize: "13pt", fontWeight: 800, letterSpacing: ".08em", color: "#f5a11b", marginTop: 8 }}>BANCOS FINANCIADORES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10, textAlign: "center", fontWeight: 800, color: "#0d2a56" }}>
            <div>BASA</div><div>SOL AGORA</div><div>SICREDI</div><div>BRADESCO</div>
          </div>
          <div style={{ textAlign: "center", fontSize: "13pt", fontWeight: 800, letterSpacing: ".08em", color: "#f5a11b", marginTop: 18 }}>PARCEIROS COMERCIAIS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginTop: 10, textAlign: "center", fontWeight: 800, color: "#0d2a56" }}>
            <div>SOFAR SOLAR</div><div>SUNGROW</div><div>OUROLUX SOLAR</div><div>EDELTEC</div>
          </div>

          <div style={{ textAlign: "center", fontSize: "17pt", marginTop: 26, color: "#0d2a56" }}>ACEITE DA <strong>PROPOSTA</strong></div>

          <div style={{ marginTop: 18, fontSize: 13 }}>
            {[
              ["NOME COMPLETO:", p.clienteNome || ""],
              ["CPF/ CNPJ:", p.clienteDoc || ""],
              ["TELEFONE:", p.clienteTelefone || ""],
              ["POTÊNCIA DA USINA:", `${fmtNum(dim.potenciaFinalKwp, 3)} kWp`],
              ["VALOR DA PROPOSTA:", fmtBRL(investimento)],
            ].map(([l, v]) => (
              <div key={l} style={{ borderBottom: "1px solid #6b5bb5", padding: "10px 0 4px" }}>
                <strong>{l}</strong> {v}
              </div>
            ))}
          </div>

          <p style={{ textAlign: "justify", marginTop: 22, fontSize: 12 }}>
            Declaro estar ciente da proposta e confirmo que através deste aceite estou de acordo com os termos propostos, e após
            visita técnica, confirmando as condições e valores descritos, concordo com a execução da obra.
          </p>

          <div style={{ textAlign: "center", fontWeight: 700, marginTop: 20 }}>{p.criadoEm || ""}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, marginTop: 40, textAlign: "center", fontSize: 12 }}>
            <div style={{ borderTop: "1px solid #4b5563", paddingTop: 6, fontWeight: 700 }}>
              ASSINATURA DO CLIENTE<div style={{ fontWeight: 400, marginTop: 6 }}>{p.clienteNome || ""}</div>
            </div>
            <div style={{ borderTop: "1px solid #4b5563", paddingTop: 6, fontWeight: 700 }}>
              META SUN ENERGIA SOLAR<div style={{ fontWeight: 400, marginTop: 6 }}>41.452.412/0001-40</div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <img src={metaSunRodape.url} alt="Entre em contato — Meta Sun" style={{ width: "100%", objectFit: "cover", display: "block" }} />
        </div>
      </div>
    </div>
  );
}

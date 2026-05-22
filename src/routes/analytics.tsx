import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useTabFromHash } from "@/lib/route-tabs";
import { useLancamentos, useRecorrentes, fmtBRLPrecise, type Lancamento } from "@/lib/financeiro-store";
import { useContratos } from "@/lib/contratos-store";
import { useObrasSnapshot } from "@/lib/obras-snapshot-store";
import { useAnalyticsAccess } from "@/hooks/use-analytics-access";
import { KPICard } from "@/components/app/analytics/KPICard";
import { ParecerLista } from "@/components/app/analytics/ParecerLista";
import { toast } from "sonner";
import {
  agregarFinanceiro,
  calcEbitda,
  calcROI,
  calcPayback,
  calcROCE,
  calcMargemLiquida,
  calcAlavancagem,
  calcCobertura,
  calcCapitalGiro,
  calcConversao,
  calcInadimplencia,
  classMargemEbitda,
  classROI,
  classPayback,
  classROCE,
  classMargemLiquida,
  classAlavancagem,
  classCobertura,
  classConversao,
  classInadimplencia,
  classCapitalGiro,
  gerarParecer,
  simularFinanciamento,
  necessidadeVendedores,
  necessidadeEquipes,
  fmtPct,
  fmtNum,
  fmtMeses,
  DEFAULT_BANDS,
} from "@/lib/analytics-kpis";
import { listarParametrosGerenciais, atualizarParametroGerencial } from "@/lib/parametros-gerenciais.functions";
import { Lock, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Meta Sun Gerencial" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [tab, setTab] = useTabFromHash("/analytics");
  const access = useAnalyticsAccess();
  const [lancs] = useLancamentos();
  const [recs] = useRecorrentes();
  const fixasMensais = recs.filter((r) => r.ativa && r.recorrencia === "Mensal").reduce((s, r) => s + r.valor, 0);
  const contratos = useContratos();
  const obras = useObrasSnapshot();

  // --- agregados financeiros ---
  const { receitas, custosObras, despAdmin } = useMemo(
    () => agregarFinanceiro(lancs as Lancamento[], fixasMensais),
    [lancs, fixasMensais],
  );
  const ebitdaCalc = calcEbitda({
    receitaOperacional: receitas,
    custosOperacionais: custosObras,
    despesasOperacionais: despAdmin,
  });

  // --- KPIs derivados de contratos/obras ---
  const totalContratos = contratos.length;
  const assinados = contratos.filter((c) => /assinad/i.test(c.status)).length;
  const conversaoPct = calcConversao(assinados, totalContratos);

  // Inadimplência: % lançamentos Saída/Entrada vencidos
  const totalReceber = lancs.filter((l) => l.tipo === "Entrada" && l.camada !== "Realizado").reduce((s, l) => s + l.valor, 0);
  const vencidos = lancs.filter((l) => l.tipo === "Entrada" && l.camada === "Previsto" && new Date(l.data) < new Date()).reduce((s, l) => s + l.valor, 0);
  const inadimplencia = calcInadimplencia(vencidos, totalReceber);

  // Capital de giro proxy: saldo realizado vs comprometido
  const ativoCirc = receitas + lancs.filter((l) => l.tipo === "Entrada" && l.camada === "Confirmado").reduce((s, l) => s + l.valor, 0);
  const passivoCirc = lancs.filter((l) => l.tipo === "Saída" && (l.camada === "Previsto" || l.camada === "Confirmado")).reduce((s, l) => s + l.valor, 0) + fixasMensais;
  const capitalGiro = calcCapitalGiro(ativoCirc, passivoCirc);

  // Dívida total proxy: financiamentos em contratos
  const dividaTotal = contratos.reduce((s, c) => s + (c.possuiFinanciamento ? Number(c.financiamentoValor || 0) : 0), 0);
  const parcelasMensais = dividaTotal / 60; // proxy: 60 meses
  const alavancagem = calcAlavancagem(dividaTotal, ebitdaCalc.ebitda);
  const cobertura = calcCobertura(ebitdaCalc.ebitda, parcelasMensais);

  // Margem líquida proxy
  const impostos = receitas * 0.12;
  const lucroLiquido = ebitdaCalc.ebitda - impostos;
  const margemLiq = calcMargemLiquida(lucroLiquido, receitas);

  // ROCE proxy — capital empregado = dívida + capital giro positivo
  const capitalEmpregado = Math.max(0, dividaTotal + Math.max(0, capitalGiro));
  const roce = calcROCE(ebitdaCalc.ebitda, capitalEmpregado);

  // Parecer (privado)
  const pareceres = useMemo(
    () => gerarParecer({
      margemEbitda: ebitdaCalc.margem,
      alavancagem,
      cobertura,
      capitalGiro,
      inadimplencia,
      conversao: conversaoPct,
    }),
    [ebitdaCalc.margem, alavancagem, cobertura, capitalGiro, inadimplencia, conversaoPct],
  );

  // Gates de UI
  if (access.loading) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Carregando..." />
      </>
    );
  }
  if (!access.amplo && !access.privado) {
    return (
      <>
        <PageHeader title="Analytics" subtitle="Você não tem permissão para acessar Analytics." />
        <Card className="p-6 text-sm text-muted-foreground">
          Solicite ao administrador as permissões <strong>analytics.amplo</strong> ou{" "}
          <strong>analytics.privado</strong>.
        </Card>
      </>
    );
  }
  const isPrivado = access.privado;

  return (
    <>
      <PageHeader
        title="Analytics"
        subtitle={isPrivado ? "Camada executiva — CFO / Controladoria / Diretoria" : "Indicadores gerenciais — gerentes & supervisores"}
      />
      <div className="mb-4 flex items-center gap-2">
        {isPrivado ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold border border-gold/30">
            <ShieldCheck className="h-3 w-3" /> Analytics Privado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border border-border">
            <Lock className="h-3 w-3" /> Analytics Amplo
          </span>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          {/* todas as abas */}
          <TabsTrigger value="visao">Visão</TabsTrigger>
          <TabsTrigger value="ebitda">EBITDA</TabsTrigger>
          <TabsTrigger value="roi">ROI</TabsTrigger>
          <TabsTrigger value="capital">Capital</TabsTrigger>
          <TabsTrigger value="alavancagem">Alav.</TabsTrigger>
          <TabsTrigger value="conversao">Conv.</TabsTrigger>
          <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          <TabsTrigger value="dre">DRE</TabsTrigger>
          <TabsTrigger value="financiamento">Fin</TabsTrigger>
          <TabsTrigger value="expansao">Exp</TabsTrigger>
          <TabsTrigger value="cfo">CFO</TabsTrigger>
          <TabsTrigger value="parecer">Parecer</TabsTrigger>
          <TabsTrigger value="parametros">Param</TabsTrigger>
        </TabsList>

        <TabsContent value="visao" className="mt-5">
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <KPICard titulo="Receita Operacional" valor={fmtBRLPrecise(receitas)} subtexto="Realizado + confirmado" />
            <KPICard titulo="EBITDA" valor={fmtBRLPrecise(ebitdaCalc.ebitda)} subtexto={`Margem ${fmtPct(ebitdaCalc.margem)}`} classificacao={classMargemEbitda(ebitdaCalc.margem)} />
            <KPICard titulo="Margem Líquida" valor={fmtPct(margemLiq)} classificacao={classMargemLiquida(margemLiq)} />
            <KPICard titulo="ROCE" valor={fmtPct(roce)} classificacao={classROCE(roce)} />
            <KPICard titulo="Alavancagem (Dívida/EBITDA)" valor={fmtNum(alavancagem)} classificacao={classAlavancagem(alavancagem)} />
            <KPICard titulo="Cobertura de Dívida" valor={fmtNum(cobertura)} classificacao={classCobertura(cobertura)} />
            <KPICard titulo="Capital de Giro" valor={fmtBRLPrecise(capitalGiro)} classificacao={classCapitalGiro(capitalGiro)} />
            <KPICard titulo="Conversão Comercial" valor={fmtPct(conversaoPct)} subtexto={`${assinados}/${totalContratos} contratos`} classificacao={classConversao(conversaoPct)} />
            <KPICard titulo="Inadimplência" valor={fmtPct(inadimplencia)} classificacao={classInadimplencia(inadimplencia)} />
          </div>
          {isPrivado && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Parecer executivo automático</h3>
              <ParecerLista pareceres={pareceres} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="ebitda" className="mt-5">
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard titulo="Receita Operacional" valor={fmtBRLPrecise(receitas)} />
            <KPICard titulo="Custos Operacionais" valor={fmtBRLPrecise(custosObras)} />
            <KPICard titulo="Despesas Operacionais" valor={fmtBRLPrecise(despAdmin)} subtexto="Inclui despesas fixas" />
            <KPICard titulo="EBITDA" valor={fmtBRLPrecise(ebitdaCalc.ebitda)} classificacao={classMargemEbitda(ebitdaCalc.margem)} subtexto={`Margem ${fmtPct(ebitdaCalc.margem)}`} />
          </div>
          {isPrivado && <ParecerExecBlock pareceres={pareceres.filter((p) => p.codigo.startsWith("EBITDA"))} />}
        </TabsContent>

        <TabsContent value="roi" className="mt-5">
          <ROIPaybackTab isPrivado={isPrivado} />
        </TabsContent>

        <TabsContent value="capital" className="mt-5">
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard titulo="Ativo Circulante" valor={fmtBRLPrecise(ativoCirc)} />
            <KPICard titulo="Passivo Circulante" valor={fmtBRLPrecise(passivoCirc)} />
            <KPICard titulo="Capital de Giro" valor={fmtBRLPrecise(capitalGiro)} classificacao={classCapitalGiro(capitalGiro)} />
          </div>
        </TabsContent>

        <TabsContent value="alavancagem" className="mt-5">
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard titulo="Dívida Total (financiamentos)" valor={fmtBRLPrecise(dividaTotal)} />
            <KPICard titulo="Alavancagem (D/EBITDA)" valor={fmtNum(alavancagem)} classificacao={classAlavancagem(alavancagem)} />
            <KPICard titulo="Cobertura (EBITDA/Parcelas)" valor={fmtNum(cobertura)} classificacao={classCobertura(cobertura)} />
          </div>
          {isPrivado && (
            <Card className="mt-4 p-4 text-sm">
              <h4 className="text-sm font-semibold">Parecer financeiro</h4>
              <p className="mt-1 text-muted-foreground">
                {alavancagem > 3
                  ? "Endividamento elevado — não recomendado tomar novo crédito agora."
                  : alavancagem > 2
                  ? "Endividamento sob atenção — avalie cuidadosamente novas captações."
                  : "Capacidade de alavancagem confortável para crescimento moderado."}
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="conversao" className="mt-5">
          <div className="grid gap-4 md:grid-cols-2">
            <KPICard titulo="Conversão Comercial" valor={fmtPct(conversaoPct)} subtexto={`${assinados} de ${totalContratos} contratos`} classificacao={classConversao(conversaoPct)} />
            <KPICard titulo="Inadimplência" valor={fmtPct(inadimplencia)} subtexto={`${fmtBRLPrecise(vencidos)} vencido / ${fmtBRLPrecise(totalReceber)} a receber`} classificacao={classInadimplencia(inadimplencia)} />
          </div>
        </TabsContent>

        <TabsContent value="vendedores" className="mt-5">
          <VendedoresTab contratos={contratos} isPrivado={isPrivado} />
        </TabsContent>
        <TabsContent value="equipes" className="mt-5">
          <EquipesTab obras={obras} isPrivado={isPrivado} />
        </TabsContent>

        <TabsContent value="dre" className="mt-5">
          <DRETab lancs={lancs as Lancamento[]} fixas={fixasMensais} />
        </TabsContent>

        <TabsContent value="financiamento" className="mt-5">
          {isPrivado ? (
            <FinanciamentoSimulador ebitda={ebitdaCalc.ebitda} />
          ) : (
            <PrivadoBloqueado />
          )}
        </TabsContent>
        <TabsContent value="expansao" className="mt-5">
          {isPrivado ? (
            <ExpansaoTab
              receita={receitas}
              ebitda={ebitdaCalc.ebitda}
              capitalGiro={capitalGiro}
              contratosMes={Math.max(1, Math.round(assinados / 3))}
            />
          ) : (
            <PrivadoBloqueado />
          )}
        </TabsContent>

        <TabsContent value="cfo" className="mt-5">
          {isPrivado ? (
            <CFOTab
              receita={receitas}
              ebitda={ebitdaCalc.ebitda}
              margem={ebitdaCalc.margem}
              alavancagem={alavancagem}
              cobertura={cobertura}
              capitalGiro={capitalGiro}
              roce={roce}
              pareceres={pareceres}
            />
          ) : (
            <PrivadoBloqueado />
          )}
        </TabsContent>

        <TabsContent value="parecer" className="mt-5">
          {isPrivado ? <ParecerLista pareceres={pareceres} /> : <PrivadoBloqueado />}
        </TabsContent>

        <TabsContent value="parametros" className="mt-5">
          {isPrivado ? <ParametrosGerenciaisTab /> : <PrivadoBloqueado />}
        </TabsContent>
      </Tabs>
    </>
  );
}

function PrivadoBloqueado() {
  return (
    <Card className="p-6 text-sm text-muted-foreground">
      <Lock className="mb-2 inline h-4 w-4" /> Esta análise é restrita ao <strong>Analytics Privado</strong> (CFO/Diretoria/Controladoria).
    </Card>
  );
}

function ParecerExecBlock({ pareceres }: { pareceres: ReturnType<typeof gerarParecer> }) {
  if (pareceres.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Parecer</h3>
      <ParecerLista pareceres={pareceres} />
    </div>
  );
}

function ROIPaybackTab({ isPrivado }: { isPrivado: boolean }) {
  const [investimento, setInv] = useState(50000);
  const [lucro, setLucro] = useState(70000);
  const [ganhoMes, setGanho] = useState(5000);
  const roi = calcROI(lucro, investimento);
  const payback = calcPayback(investimento, ganhoMes);
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <div>
          <Label>Investimento (R$)</Label>
          <Input type="number" value={investimento} onChange={(e) => setInv(Number(e.target.value))} />
        </div>
        <div>
          <Label>Lucro obtido / esperado (R$)</Label>
          <Input type="number" value={lucro} onChange={(e) => setLucro(Number(e.target.value))} />
        </div>
        <div>
          <Label>Ganho líquido mensal (R$)</Label>
          <Input type="number" value={ganhoMes} onChange={(e) => setGanho(Number(e.target.value))} />
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard titulo="ROI" valor={fmtPct(roi)} classificacao={classROI(roi)} />
        <KPICard titulo="Payback" valor={fmtMeses(payback)} classificacao={classPayback(payback)} />
      </div>
      {isPrivado && (
        <Card className="p-4 text-sm">
          <h4 className="font-semibold">Parecer</h4>
          <p className="mt-1 text-muted-foreground">
            {roi >= 20 && payback <= 24
              ? "Investimento recomendado — retorno saudável e prazo de retorno aceitável."
              : roi < 10
              ? "ROI abaixo do mínimo desejado — reavaliar premissas antes de aprovar."
              : "Avaliar trade-off entre retorno e prazo de imobilização do capital."}
          </p>
        </Card>
      )}
    </div>
  );
}

function VendedoresTab({ contratos, isPrivado }: { contratos: ReturnType<typeof useContratos>; isPrivado: boolean }) {
  const capacidade = DEFAULT_BANDS["capacidade.vendedor.mes"].valor;
  const [demanda, setDemanda] = useState(60);
  const vendedores = new Set(contratos.map((c) => c.vendedor).filter(Boolean));
  const necessidade = necessidadeVendedores(demanda, capacidade);
  const gap = necessidade - vendedores.size;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard titulo="Vendedores ativos" valor={String(vendedores.size)} />
        <KPICard titulo="Capacidade média (contratos/mês)" valor={String(capacidade)} subtexto="Editável em Parâmetros Gerenciais" />
        <Card className="bg-[image:var(--gradient-card)] p-5">
          <Label>Demanda projetada (contratos/mês)</Label>
          <Input type="number" value={demanda} onChange={(e) => setDemanda(Number(e.target.value))} className="mt-2" />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard titulo="Necessidade de vendedores" valor={String(necessidade)} />
        <KPICard titulo="Gap a contratar" valor={String(Math.max(0, gap))} classificacao={gap > 0 ? { label: "Contratar", tone: "atencao", cor: "text-amber-600" } : { label: "OK", tone: "bom", cor: "text-success" }} />
      </div>
      {isPrivado && (
        <Card className="p-4 text-sm text-muted-foreground">
          {gap > 0
            ? `Recomendação: contratar ${gap} vendedor(es) para suportar a demanda projetada.`
            : "A equipe atual suporta a demanda projetada — invista em conversão e ticket médio antes de contratar."}
        </Card>
      )}
    </div>
  );
}

function EquipesTab({ obras, isPrivado }: { obras: ReturnType<typeof useObrasSnapshot>; isPrivado: boolean }) {
  const capacidade = DEFAULT_BANDS["capacidade.equipe.modulos_mes"].valor;
  const [demanda, setDemanda] = useState(900);
  const equipes = new Set(obras.map((o) => o.equipe).filter(Boolean));
  const necessidade = necessidadeEquipes(demanda, capacidade);
  const gap = necessidade - equipes.size;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard titulo="Equipes ativas" valor={String(equipes.size)} />
        <KPICard titulo="Capacidade (módulos/mês por equipe)" valor={String(capacidade)} subtexto="Editável em Parâmetros Gerenciais" />
        <Card className="bg-[image:var(--gradient-card)] p-5">
          <Label>Demanda projetada (módulos/mês)</Label>
          <Input type="number" value={demanda} onChange={(e) => setDemanda(Number(e.target.value))} className="mt-2" />
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard titulo="Equipes necessárias" valor={String(necessidade)} />
        <KPICard titulo="Gap" valor={String(Math.max(0, gap))} classificacao={gap > 0 ? { label: "Contratar", tone: "atencao", cor: "text-amber-600" } : { label: "OK", tone: "bom", cor: "text-success" }} />
      </div>
      {isPrivado && (
        <Card className="p-4 text-sm text-muted-foreground">
          {gap > 0 ? `Recomendação: contratar ou terceirizar ${gap} equipe(s).` : "Capacidade operacional suporta a demanda projetada."}
        </Card>
      )}
    </div>
  );
}

function FinanciamentoSimulador({ ebitda }: { ebitda: number }) {
  const [valor, setValor] = useState(500000);
  const [taxa, setTaxa] = useState(1.49);
  const [prazo, setPrazo] = useState(60);
  const sim = simularFinanciamento({ valor, taxaMensal: taxa, prazoMeses: prazo });
  const cobertura = calcCobertura(ebitda, sim.parcela);
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <div><Label>Valor financiado (R$)</Label><Input type="number" value={valor} onChange={(e) => setValor(Number(e.target.value))} /></div>
        <div><Label>Taxa mensal (%)</Label><Input type="number" step="0.01" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} /></div>
        <div><Label>Prazo (meses)</Label><Input type="number" value={prazo} onChange={(e) => setPrazo(Number(e.target.value))} /></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard titulo="Parcela mensal" valor={fmtBRLPrecise(sim.parcela)} />
        <KPICard titulo="Custo total" valor={fmtBRLPrecise(sim.custoTotal)} />
        <KPICard titulo="Juros totais" valor={fmtBRLPrecise(sim.juros)} />
        <KPICard titulo="Cobertura pelo EBITDA" valor={fmtNum(cobertura)} classificacao={classCobertura(cobertura)} />
      </div>
      <Card className="p-4 text-sm">
        <h4 className="font-semibold">Parecer do CFO</h4>
        <p className="mt-1 text-muted-foreground">
          {cobertura >= 2
            ? "A operação suporta confortavelmente esse financiamento."
            : cobertura >= 1.5
            ? "Suporta com folga moderada — atenção a oscilações de caixa."
            : cobertura >= 1
            ? "Suporta no limite — risco elevado em mês de sazonalidade negativa."
            : "Não recomendado — EBITDA atual não cobre as parcelas projetadas."}
        </p>
      </Card>
    </div>
  );
}

function ExpansaoTab({ receita, ebitda, capitalGiro, contratosMes }: { receita: number; ebitda: number; capitalGiro: number; contratosMes: number }) {
  const [investimento, setInv] = useState(300000);
  const [receitaProj, setReceitaProj] = useState(receita * 0.5);
  const [margemProj, setMargemProj] = useState(15);
  const ebitdaProj = (receitaProj * margemProj) / 100;
  const payback = calcPayback(investimento, ebitdaProj / 12);
  const apto = capitalGiro > investimento * 0.3 && ebitda > 0;
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-5 md:grid-cols-3">
        <div><Label>Investimento na expansão (R$)</Label><Input type="number" value={investimento} onChange={(e) => setInv(Number(e.target.value))} /></div>
        <div><Label>Receita projetada (R$/ano)</Label><Input type="number" value={receitaProj} onChange={(e) => setReceitaProj(Number(e.target.value))} /></div>
        <div><Label>Margem EBITDA projetada (%)</Label><Input type="number" value={margemProj} onChange={(e) => setMargemProj(Number(e.target.value))} /></div>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard titulo="EBITDA projetado (ano)" valor={fmtBRLPrecise(ebitdaProj)} />
        <KPICard titulo="Payback" valor={fmtMeses(payback)} classificacao={classPayback(payback)} />
        <KPICard titulo="Contratos médios/mês (hoje)" valor={String(contratosMes)} />
      </div>
      <Card className="p-4 text-sm">
        <h4 className="font-semibold">Parecer da expansão</h4>
        <p className="mt-1 text-muted-foreground">
          {apto
            ? "Capital de giro e geração operacional suportam a expansão. Avaliar capacidade comercial e operacional antes da execução."
            : "Capital de giro insuficiente ou EBITDA negativo — financiar parcialmente ou postergar a expansão."}
        </p>
      </Card>
    </div>
  );
}

function CFOTab(props: {
  receita: number;
  ebitda: number;
  margem: number;
  alavancagem: number;
  cobertura: number;
  capitalGiro: number;
  roce: number;
  pareceres: ReturnType<typeof gerarParecer>;
}) {
  const { receita, ebitda, margem, alavancagem, cobertura, capitalGiro, roce, pareceres } = props;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard titulo="Receita Operacional" valor={fmtBRLPrecise(receita)} />
        <KPICard titulo="EBITDA" valor={fmtBRLPrecise(ebitda)} subtexto={`Margem ${fmtPct(margem)}`} classificacao={classMargemEbitda(margem)} />
        <KPICard titulo="ROCE" valor={fmtPct(roce)} classificacao={classROCE(roce)} />
        <KPICard titulo="Capital de Giro" valor={fmtBRLPrecise(capitalGiro)} classificacao={classCapitalGiro(capitalGiro)} />
        <KPICard titulo="Alavancagem" valor={fmtNum(alavancagem)} classificacao={classAlavancagem(alavancagem)} />
        <KPICard titulo="Cobertura" valor={fmtNum(cobertura)} classificacao={classCobertura(cobertura)} />
      </div>
      <Card className="p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Parecer CFO automático</h3>
        <ParecerLista pareceres={pareceres} />
      </Card>
      <Card className="p-5 text-sm">
        <h4 className="font-semibold">Atalhos</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link to="/analytics" hash="tab=financiamento"><Button size="sm" variant="outline">Simular financiamento</Button></Link>
          <Link to="/analytics" hash="tab=expansao"><Button size="sm" variant="outline">Análise de expansão</Button></Link>
          <Link to="/analytics" hash="tab=parametros"><Button size="sm" variant="outline">Editar parâmetros</Button></Link>
        </div>
      </Card>
    </div>
  );
}

function ParametrosGerenciaisTab() {
  const qc = useQueryClient();
  const { data: params = [], isLoading } = useQuery({
    queryKey: ["gerencial_parametros"],
    queryFn: () => listarParametrosGerenciais(),
  });
  const mut = useMutation({
    mutationFn: (v: { chave: string; valor: Record<string, number> }) =>
      atualizarParametroGerencial({ data: v }),
    onSuccess: () => {
      toast.success("Parâmetro atualizado.");
      qc.invalidateQueries({ queryKey: ["gerencial_parametros"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro"),
  });
  if (isLoading) return <Card className="p-6 text-sm text-muted-foreground">Carregando parâmetros...</Card>;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Edite as faixas usadas pelos classificadores e capacidades operacionais. Alterações
        impactam todos os indicadores automaticamente.
      </p>
      {params.map((p) => (
        <ParametroCard key={p.id} chave={p.chave} descricao={p.descricao ?? p.chave} valor={p.valor as Record<string, number>} onSave={(novo) => mut.mutate({ chave: p.chave, valor: novo })} />
      ))}
    </div>
  );
}

function ParametroCard({ chave, descricao, valor, onSave }: { chave: string; descricao: string; valor: Record<string, number>; onSave: (v: Record<string, number>) => void }) {
  const [draft, setDraft] = useState<Record<string, number>>(valor);
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{chave}</div>
          <div className="text-sm">{descricao}</div>
        </div>
        <Button size="sm" onClick={() => onSave(draft)}>Salvar</Button>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Object.entries(draft).map(([k, v]) => (
          <div key={k}>
            <Label className="text-[11px] uppercase">{k}</Label>
            <Input type="number" step="0.1" value={v} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
          </div>
        ))}
      </div>
    </Card>
  );
}

function DRETab({ lancs, fixas }: { lancs: Lancamento[]; fixas: number }) {
  const receitas = lancs.filter((l) => l.tipo === "Entrada" && (l.camada === "Realizado" || l.camada === "Confirmado")).reduce((s, l) => s + l.valor, 0);
  const custoObras = lancs.filter((l) => l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0);
  const despAdmin = lancs.filter((l) => !l.obra && l.tipo === "Saída").reduce((s, l) => s + l.valor, 0) + fixas;
  const impostos = receitas * 0.12;
  const liquida = receitas - impostos;
  const bruto = liquida - custoObras;
  const operacional = bruto - despAdmin;

  const rows = [
    { label: "Receita Bruta", valor: receitas, tone: "text-success" },
    { label: "(–) Impostos sobre vendas (12%)", valor: -impostos, tone: "text-destructive" },
    { label: "Receita Líquida", valor: liquida, tone: "font-semibold" },
    { label: "(–) Custos de obras", valor: -custoObras, tone: "text-destructive" },
    { label: "Lucro Bruto", valor: bruto, tone: "font-semibold" },
    { label: "(–) Despesas administrativas + fixas", valor: -despAdmin, tone: "text-destructive" },
    { label: "Resultado Operacional", valor: operacional, tone: "text-lg font-bold text-primary" },
  ];

  return (
    <Card className="bg-[image:var(--gradient-card)] p-6">
      <h2 className="text-lg font-semibold">DRE Gerencial</h2>
      <p className="mt-1 text-sm text-muted-foreground">Calculado a partir dos lançamentos realizados/confirmados + despesas fixas.</p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between border-b border-border pb-2 text-sm">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={r.tone}>{fmtBRLPrecise(r.valor)}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

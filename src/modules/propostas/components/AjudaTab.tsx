// Aba "Como funciona" do módulo Propostas.
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";

export function AjudaTab() {
  return (
    <Card className="p-6 leading-relaxed text-sm">
      <h3 className="text-lg font-semibold">Como o módulo funciona</h3>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li><strong>Cadastros:</strong> mantenha cidades, módulos, inversores, parâmetros e custos atualizados — eles alimentam os cálculos.</li>
        <li><strong>Nova proposta:</strong> selecione cliente e cidade — o sistema preenche endereço, concessionária, irradiação e tarifa automaticamente.</li>
        <li><strong>Consumo:</strong> informe a média mensal ou os 12 meses individualmente.</li>
        <li><strong>Dimensionamento:</strong> potência necessária = geração desejada / (irradiação × 30 × performance). Quantidade de módulos é arredondada para cima.</li>
        <li><strong>Inversores:</strong> adicione um ou mais. O sistema alerta se a soma de potência diverge muito da potência do sistema.</li>
        <li><strong>Precificação:</strong> parâmetro sugerido pela faixa de kWp. Aplique desconto em % ou R$, ou sobrescreva o valor final.</li>
        <li><strong>Custos:</strong> clique em <em>Recalcular sugeridos</em> — o sistema calcula quantidades por módulo (cabos, MC4, hooks, trilho, estrutura) e aplica % sobre valor final (comissão, risco).</li>
        <li><strong>Resultado:</strong> margem é destacada em verde, amarelo ou vermelho. Margem negativa exibe alerta.</li>
        <li><strong>Aprovar → contrato:</strong> bloqueia edição e gera um contrato no módulo Comercial automaticamente.</li>
      </ol>
      <div className="mt-4 text-xs text-muted-foreground">
        Atalhos no Comercial: <Link to="/comercial" className="underline">ir para Comercial</Link>.
      </div>
    </Card>
  );
}

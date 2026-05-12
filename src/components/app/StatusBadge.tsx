import { Badge } from "@/components/ui/badge";

const map: Record<string, string> = {
  // Contratos
  "Assinado": "bg-success/15 text-success border-success/30",
  "Gerado": "bg-info/15 text-info border-info/30",
  "Pendente": "bg-warning/15 text-warning border-warning/30",
  "Cancelado": "bg-destructive/15 text-destructive border-destructive/30",
  // Financiamento
  "Sem contrato": "bg-warning/15 text-warning border-warning/30",
  "Com contrato": "bg-info/15 text-info border-info/30",
  "Pendente banco": "bg-warning/15 text-warning border-warning/30",
  "Pendente cliente": "bg-warning/15 text-warning border-warning/30",
  "Aguardando liberação": "bg-info/15 text-info border-info/30",
  "Aprovado": "bg-success/15 text-success border-success/30",
  "Em análise": "bg-info/15 text-info border-info/30",
  "Reprovado": "bg-destructive/15 text-destructive border-destructive/30",
  "Aguardando documentação": "bg-warning/15 text-warning border-warning/30",
  "Aguardando assinatura": "bg-warning/15 text-warning border-warning/30",
  "Liberado": "bg-success/15 text-success border-success/30",
  "Finalizado": "bg-muted text-muted-foreground border-border",
  // Obras
  "Executando instalação": "bg-primary/15 text-primary border-primary/30",
  "Aguardando instalação": "bg-info/15 text-info border-info/30",
  "Em projeto/aprovação": "bg-warning/15 text-warning border-warning/30",
  "Standby": "bg-muted text-muted-foreground border-border",
  // Pendências
  "Aguardando resolução": "bg-warning/15 text-warning border-warning/30",
  "Problema resolvido": "bg-success/15 text-success border-success/30",
  // Generic
  "Ativo": "bg-success/15 text-success border-success/30",
  "Inativo": "bg-muted text-muted-foreground border-border",
  "A receber": "bg-info/15 text-info border-info/30",
  "Recebido": "bg-success/15 text-success border-success/30",
  "A pagar": "bg-warning/15 text-warning border-warning/30",
  "Pago": "bg-success/15 text-success border-success/30",
  "Vencido": "bg-destructive/15 text-destructive border-destructive/30",
  // Estoque
  "OK": "bg-success/15 text-success border-success/30",
  "Baixo": "bg-warning/15 text-warning border-warning/30",
  "Crítico": "bg-destructive/15 text-destructive border-destructive/30",
  "Entrada": "bg-success/15 text-success border-success/30",
  "Saída": "bg-info/15 text-info border-info/30",
  // Propostas
  "Enviada": "bg-info/15 text-info border-info/30",
  "Em negociação": "bg-warning/15 text-warning border-warning/30",
  "Aguardando retorno": "bg-warning/15 text-warning border-warning/30",
  "Fechada": "bg-success/15 text-success border-success/30",
  "Convertida": "bg-success/15 text-success border-success/30",
  "Perdida": "bg-destructive/15 text-destructive border-destructive/30",
  "Recusada": "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = map[status] ?? "bg-muted text-muted-foreground border-border";
  return (
    <Badge variant="outline" className={`${cls} font-medium`}>
      {status}
    </Badge>
  );
}

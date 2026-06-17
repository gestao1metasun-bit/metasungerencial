/**
 * D17.11.f — Helpers de UX consolidados para o Comercial Enterprise.
 *
 * Substituem o padrão antigo `toast.info("... chega em D27.x")` por uma
 * mensagem canônica única, evitando ruído e expectativa de funcionalidade.
 *
 * NÃO use estes helpers para confirmar ações reais — use `toast.success`
 * ou `toast(msg)` diretamente.
 */
import { toast } from "sonner";

const UNAVAILABLE_MSG =
  "Funcionalidade ainda não disponível nesta versão do ERP.";

/**
 * Aviso canônico para botões/menus que ainda não possuem backend conectado.
 * Mensagem fixa, sem nomes internos de waves nem datas.
 */
export function notifyUnavailable(): void {
  toast(UNAVAILABLE_MSG);
}

/**
 * Confirmação neutra para ações reais (refresh, recálculo local, etc).
 * Usa `toast(msg)` (sem variante info/success) para reduzir ruído visual.
 */
export function notifyDone(msg: string): void {
  toast(msg);
}

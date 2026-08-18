// PropostaList — visualizações Tabela e Kanban agrupadas por LEAD (cliente).
// - Cada lead = todas as propostas de um cliente (chave = clienteDoc ou nome).
// - Valor do lead = última proposta (mais recente).
// - Clicar em qualquer parte do card/linha do lead abre o detalhe.
// - No detalhe: dados do cliente + abas (Dados / Propostas) + botão "Gerar nova proposta".
// - Kanban: arrastar o card move o lead inteiro; reordenar colunas = arrastar header.
// - Botão "Colunas" abre um gerenciador (criar, renomear, ativar/desativar, reordenar).
import { useEffect, useMemo, useState } from "react";
import {
  Plus, Eye, Copy, Trash2, Sparkles, LayoutGrid, Table as TableIcon,
  Lock, Search, FilterX, Columns3, GripVertical, ArrowUp, ArrowDown,
  X, Check, Pencil, FilePlus2, MoreVertical, Ban, RotateCcw, FileText, ArrowRight, ArrowLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { ActionsMenu } from "@/components/app/ActionsMenu";
import { RowActions, type RowAction } from "@/components/app/enterprise";
import { fmtInversorNumero } from "@/lib/inversor-fmt";
import { toast } from "sonner";
import {
  type PropostaFV, type StatusProposta,
  upsertProposta, removeProposta, proximoNumeroProposta,
  calcPrecificacao, calcDimensionamento, fmtBRL,
  cancelarPropostaComMotivo, reativarProposta as storeReativarProposta,
  formatDoc, isDocValido, formatCEP, buscarCEPViaCEP, atualizarCadastroCliente,
  expirarPropostasVencidasAuto, refreshPropostas,
} from "@/modules/propostas/store";
import {
  useContratos, type ContratoFull, propostaTemContratoVinculado,
} from "@/lib/contratos-store";
// LEGADO LS — check de existência sincrônico. Migrar com PropostasPage.
import { findClienteByDoc } from "@/lib/clientes-store";
import { supabase } from "@/integrations/supabase/client";

const UUID_RE_LOCAL = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const aprovacoesEmAndamento = new Set<string>();

export function statusVariant(s: StatusProposta): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "APROVADA":
    case "ATIVA":
    case "CONTRATADA": return "default";
    case "GERADA":
    case "ENVIADA":
    case "CONTRATO_PENDENTE": return "secondary";
    case "RECUSADA":
    case "VENCIDA":
    case "EXPIRADA":
    case "CANCELADA": return "destructive";
    case "SUBSTITUIDA": return "outline";
    default: return "outline";
  }
}

// D18.9 — Os bloqueios de aprovar/cancelar/excluir por status estão inline nas funções
// excluirProposta/cancelarProposta e na construção de actions abaixo.



function readLS<T>(key: string, fb: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) as T : fb; } catch { return fb; }
}
function writeLS(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* ignore */ } }

function usePropostasSync(): PropostaFV[] {
  return readLS<PropostaFV[]>("ms.fv.propostas.v1", []);
}

export function duplicarProposta(p: PropostaFV) {
  const lista = usePropostasSync();
  const numero = proximoNumeroProposta(lista);
  const copia: PropostaFV = {
    ...p,
    id: `PRID-${Date.now()}`,
    numero,
    status: "RASCUNHO",
    criadoEm: new Date().toISOString().slice(0, 10),
    atualizadoEm: new Date().toISOString().slice(0, 10),
    contratoGeradoId: undefined,
  };
  upsertProposta(copia);
  toast.success(`Proposta duplicada como ${numero}`);
}

export function excluirProposta(p: PropostaFV) {
  if (p.status !== "RASCUNHO") {
    if (p.status === "APROVADA" || p.status === "ATIVA") {
      toast.error(
        "Proposta aprovada não pode ser excluída — cancele a minuta/contrato vinculado em Comercial → Contratos.",
        { duration: 6000 },
      );
      return;
    }
    if (p.status === "CONTRATO_PENDENTE" || p.status === "CONTRATADA") {
      toast.error(
        "Proposta vinculada a contrato não pode ser excluída — cancele a minuta/contrato antes.",
        { duration: 6000 },
      );
      return;
    }
    toast.error("Propostas geradas não podem ser excluídas — use Cancelar.");
    return;
  }
  // Cadeia de dependência (Entrega 3): bloqueia exclusão se houver contrato vinculado.
  try {
    // import dinâmico para não quebrar SSR/circular
    const { propostaTemContratoVinculado } = require("@/lib/contratos-store");
    const c = propostaTemContratoVinculado(p.id);
    if (c) {
      toast.error(
        `Proposta possui contrato vinculado (${c.id}). Cancele o contrato em Comercial → Contratos antes de excluir.`,
        { duration: 6000 },
      );
      return;
    }
  } catch {}
  if (!confirm(`Excluir proposta ${p.numero}? Esta ação não pode ser desfeita.`)) return;
  removeProposta(p.id);
  toast.success("Proposta excluída.");
}

/** Cancela uma proposta — move para status CANCELADA com motivo. */
export function cancelarProposta(p: PropostaFV) {
  if (p.status === "CANCELADA") { toast.info("Proposta já está cancelada."); return; }
  if (p.status === "APROVADA" || p.status === "ATIVA") {
    toast.error("Proposta aprovada não pode ser cancelada — cancele a minuta no contrato pendente antes."); return;
  }
  if (p.status === "CONTRATO_PENDENTE") {
    toast.error("Esta proposta gerou um contrato pendente. Cancele a minuta em Comercial → Contratos → Pendentes."); return;
  }
  if (p.status === "CONTRATADA") {
    toast.error("Proposta contratada não pode ser cancelada por aqui — opere pelo contrato ativo."); return;
  }
  const motivo = prompt(`Cancelar proposta ${p.numero}?\n\nMotivo (obrigatório):`);
  if (!motivo || !motivo.trim()) { toast.error("Informe o motivo do cancelamento."); return; }
  cancelarPropostaComMotivo(p.id, p.criadoPor || "Operador", motivo.trim());
  toast.success(`Proposta ${p.numero} cancelada.`);
}

/** Reativa proposta cancelada → volta para GERADA, sai do card "Cancelados". */
export function reativarProposta(p: PropostaFV) {
  if (p.status !== "CANCELADA") { toast.info("Apenas propostas canceladas podem ser reativadas."); return; }
  storeReativarProposta(p.id, p.criadoPor || "Operador");
  toast.success(`Proposta ${p.numero} reativada.`);
}

/** Retorna a proposta aprovável mais recente do lead (RASCUNHO/GERADA/ENVIADA). */
export function propostaAprovavelDoLead(l: { propostas: PropostaFV[] }): PropostaFV | undefined {
  return [...l.propostas]
    .reverse()
    .find((p) => ["RASCUNHO", "GERADA", "ENVIADA"].includes(p.status));
}

/** Navega para a tela oficial de Contratos (D18.11). */
export function irParaContratos() {
  if (typeof window === "undefined") return;
  window.location.assign("/comercial/contratos");
}

function patchVinculoLeadSupabaseLocal(
  p: PropostaFV,
  leadUuid: string | null,
  clienteIdSb: string | null,
  contratoGeradoId?: string,
) {
  void refreshPropostas();
}


/** Aprova efetivamente uma proposta após validação de cadastro:
 *  muda status para APROVADA, marca outras versões do mesmo lead como obsoletas
 *  e cria um Contrato em status "Pendente" no Comercial → Cadastrar Contrato. */
export async function aprovarProposta(p: PropostaFV) {
  const lockKey = p.id;
  if (aprovacoesEmAndamento.has(lockKey)) {
    toast.info("A aprovação desta proposta já está em andamento.");
    return;
  }
  aprovacoesEmAndamento.add(lockKey);
  let deveNavegar = true;
  try {
  const valorCalc = calcPrecificacao(p).valorFinal || 0;
  const valor = (p.valorFinalManual ?? 0) > 0
    ? (p.valorFinalManual as number)
    : (valorCalc > 0 ? valorCalc : (p.valorKit ?? 0));
  // D27.COM — Cria o contrato MINUTA oficial no Supabase para aparecer em
  // /comercial/contratos → "Pendentes de Redação". Se o lead/cliente ainda
  // não existir no Supabase (lead nascido no LS de Propostas), criamos aqui
  // com os dados disponíveis. CPF/CNPJ é opcional nesta etapa.
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Sessão expirada — faça login novamente.");
    const ownerUuid = u.user.id;

    const docDig = (p.clienteDoc ?? "").replace(/\D/g, "");
    const dadosCliente = {
      nome: (p.clienteNome || "Cliente").trim(),
      doc: docDig || undefined,
      telefone: p.clienteTelefone ?? undefined,
      email: p.clienteEmail ?? undefined,
      cep: p.clienteCep ?? undefined,
      rua: p.clienteRua ?? undefined,
      numero: p.clienteNumero ?? undefined,
      bairro: p.clienteBairro ?? undefined,
      complemento: p.clienteComplemento ?? undefined,
      cidade: (p.clienteCidade ?? p.cidade) || undefined,
      uf: (p.clienteUf ?? p.estado) || undefined,
      tipo_pessoa: p.tipoPessoa ?? (docDig.length === 14 ? "PJ" : "PF"),
    };

    // 1) Lead UUID no Supabase — busca o existente ou cria um novo.
    let leadUuid: string | null = null;
    let clienteIdSb: string | null = null;
    let propostaIdPreexistente: string | null = null;
    let contratoIdPreexistente: string | null = null;
    if (UUID_RE_LOCAL.test(p.id)) {
      const { data: propDireta, error: ePropDireta } = await supabase
        .from("propostas")
        .select("id,lead_id,cliente_id,contrato_id,status")
        .eq("id", p.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (ePropDireta) throw ePropDireta;
      if (propDireta) {
        propostaIdPreexistente = propDireta.id as string;
        leadUuid = (propDireta.lead_id as string | null) ?? null;
        clienteIdSb = (propDireta.cliente_id as string | null) ?? null;
        contratoIdPreexistente = (propDireta.contrato_id as string | null) ?? null;
      }
    }
    if (p.leadId && UUID_RE_LOCAL.test(p.leadId)) {
      const { data: leadRow, error: eLead } = await supabase
        .from("leads").select("id,cliente_id").eq("id", p.leadId).maybeSingle();
      if (eLead) throw eLead;
      if (leadRow) {
        leadUuid = leadRow.id as string;
        clienteIdSb = (leadRow.cliente_id as string | null) ?? null;
      }
    }

    if (!leadUuid) {
      const { data: propLs, error: ePropLs } = await supabase
        .from("propostas")
        .select("id,lead_id,cliente_id,contrato_id,status")
        .eq("dados->origem_ls->>propostaIdLs", p.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (ePropLs) throw ePropLs;
      if (propLs) {
        propostaIdPreexistente = propLs.id as string;
        leadUuid = (propLs.lead_id as string | null) ?? null;
        clienteIdSb = (propLs.cliente_id as string | null) ?? null;
        contratoIdPreexistente = (propLs.contrato_id as string | null) ?? null;
      }
    }

    if (!leadUuid) {
      const { data: leadLs, error: eLeadLs } = await supabase
        .from("leads")
        .select("id,cliente_id")
        .eq("dados->>propostaLsId", p.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (eLeadLs) throw eLeadLs;
      if (leadLs) {
        leadUuid = leadLs.id as string;
        clienteIdSb = (leadLs.cliente_id as string | null) ?? clienteIdSb;
      }
    }

    if (!propostaIdPreexistente && clienteIdSb) {
      const { data: propCliente, error: ePropCliente } = await supabase
        .from("propostas")
        .select("id,lead_id,cliente_id,contrato_id,status,numero")
        .eq("cliente_id", clienteIdSb)
        .is("deleted_at", null)
        .not("status", "in", "(CANCELADA,ASSINADA)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (ePropCliente) throw ePropCliente;
      const reaproveitavel = propCliente?.find((x) => x.numero === p.numero)
        ?? propCliente?.find((x) => !x.lead_id)
        ?? propCliente?.[0];
      if (reaproveitavel) {
        propostaIdPreexistente = reaproveitavel.id as string;
        contratoIdPreexistente = (reaproveitavel.contrato_id as string | null) ?? null;
        if (!leadUuid && reaproveitavel.lead_id) leadUuid = reaproveitavel.lead_id as string;
      }
    }

    // 2) Garante cliente Supabase (cria sem CPF se necessário).
    const { criarClienteSupabase, atualizarClienteSupabase } = await import(
      "@/lib/repositories/clientes-supabase-repo"
    );
    if (clienteIdSb) {
      try { await atualizarClienteSupabase(clienteIdSb, dadosCliente); } catch { /* não bloqueia */ }
    } else {
      const novo = await criarClienteSupabase(dadosCliente);
      clienteIdSb = novo.id;
    }

    // 3) Cria lead no Supabase se ainda não existir; ou apenas garante o vínculo.
    if (!leadUuid) {
      const { data: novoLead, error: eIns } = await supabase
        .from("leads")
        .insert({
          nome: dadosCliente.nome,
          telefone: dadosCliente.telefone ?? null,
          doc: docDig || null,
          consumo_kwh: Math.max(0, Math.round(p.consumoMedio || 0)),
          consultor_id: ownerUuid,
          origem: (p.origemCaptacao || "OUTROS").toUpperCase().slice(0, 30),
          observacao: `Lead criado na aprovação da proposta ${p.numero}.`,
          status: "LEAD_CADASTRADO",
          cliente_id: clienteIdSb,
          dados: { criadoPor: p.criadoPor, propostaLsId: p.id, propostaLsNumero: p.numero } as never,
        } as never)
        .select("id")
        .single();
      if (eIns) throw eIns;
      leadUuid = (novoLead as { id: string }).id;
    } else {
      await supabase.from("leads").update({ cliente_id: clienteIdSb }).eq("id", leadUuid);
    }

    // 4) Idempotência — cada proposta LS mapeia 1:1 para sua própria linha
    //    no Supabase (chave: id local = id Supabase via upsert). NÃO mescla
    //    com outras propostas do mesmo lead — um lead pode ter N propostas
    //    e cada uma é aprovada/enviada para contratos de forma independente.
    let propostaId: string | null = propostaIdPreexistente;
    let contratoJaExiste = !!contratoIdPreexistente;
    let contratoIdFinal: string | null = contratoIdPreexistente;

    if (!propostaId) {
      if (UUID_RE_LOCAL.test(p.id)) {
        const { error: eInsProp } = await supabase
          .from("propostas")
          .upsert({
            id: p.id,
            numero: p.numero,
            status: "RASCUNHO",
            consultor_id: ownerUuid,
            cliente_id: clienteIdSb,
            lead_id: leadUuid,
            cliente_nome: p.clienteNome,
            cliente_doc: docDig || null,
            valor_final: valor,
            potencia_kwp: p.modulosQtd * (p.moduloPotenciaWp / 1000),
            modulos_qtd: p.modulosQtd,
            validade: p.validade || null,
            versao: p.versao || "P01",
            dados: { ...p, origem_ls: { propostaIdLs: p.id, numeroLs: p.numero } } as never,
          } as never, { onConflict: "id" });
        if (eInsProp) throw eInsProp;
        propostaId = p.id;
      } else {
        const { data: propId, error: e1 } = await supabase.rpc(
          "rpc_proposta_criar_do_lead" as never,
          { _lead_id: leadUuid, _observacao: `Aprovada a partir de ${p.numero}` } as never,
        );
        if (e1) throw e1;
        propostaId = propId as unknown as string;
      }
    } else {
      // Já existe linha Supabase para esta proposta LS — confere se já tem
      // contrato vinculado para evitar duplicação no envio para contratos.
      const { data: jaCom } = await supabase
        .from("propostas")
        .select("contrato_id")
        .eq("id", propostaId)
        .maybeSingle();
      if (jaCom?.contrato_id) {
        contratoJaExiste = true;
        contratoIdFinal = jaCom.contrato_id as string;
      }
    }

    if (!contratoJaExiste) {
      const { error: eUpd } = await supabase
        .from("propostas")
        .update({
          cliente_id: clienteIdSb,
          lead_id: leadUuid,
          valor_final: valor,
          potencia_kwp: p.modulosQtd * (p.moduloPotenciaWp / 1000),
          modulos_qtd: p.modulosQtd,
          dados: {
            inversores: p.inversores,
            inversorMarca: p.inversorMarca,
            consultor: p.consultor ?? p.criadoPor ?? "",
            cidade: p.cidade,
            estado: p.estado,
            origem_ls: { propostaIdLs: p.id, numeroLs: p.numero },
          } as never,
        })
        .eq("id", propostaId);
      if (eUpd) throw eUpd;
      const { error: e3 } = await supabase.rpc(
        "rpc_proposta_enviar_para_contratos" as never,
        { p_proposta_id: propostaId } as never,
      );
      if (e3) throw e3;
      const { data: propContrato } = await supabase
        .from("propostas")
        .select("contrato_id")
        .eq("id", propostaId)
        .maybeSingle();
      contratoIdFinal = (propContrato?.contrato_id as string | null) ?? contratoIdFinal;
    }
    patchVinculoLeadSupabaseLocal(p, leadUuid, clienteIdSb, contratoIdFinal ?? undefined);

    toast.success(
      `Proposta ${p.numero} aprovada — contrato pendente criado em Comercial → Contratos → Pendentes de Redação.`,
    );
  // Leva o operador direto para Contratos → Pendentes de Redação
  if (deveNavegar) setTimeout(() => irParaContratos(), 400);
  } catch (err) {
    deveNavegar = false;
    toast.error(`Não foi possível aprovar/enviar a proposta: ${(err as Error)?.message ?? String(err)}`);
  } finally {
    aprovacoesEmAndamento.delete(lockKey);
  }
}

/* ============= Diálogo de Aprovação (CPF e endereço opcionais) ============= */
/** Form de aprovação enxuto: confirma PF/PJ e nome (obrigatórios).
 *  CPF/CNPJ e endereço são OPCIONAIS aqui — o cadastro definitivo (CPF/CNPJ e endereço)
 *  acontece no Comercial → Contratos Gerados, antes de redigir o contrato. */
export function AprovarPropostaDialog({
  proposta, open, onOpenChange, onAprovado,
}: {
  proposta: PropostaFV | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAprovado?: () => void;
}) {
  const p = proposta;
  const [tipoPessoa, setTipoPessoa] = useState<"PF" | "PJ">(p?.tipoPessoa ?? "PF");
  const [nome, setNome] = useState(p?.clienteNome ?? "");
  const [doc, setDoc] = useState(formatDoc(p?.clienteDoc ?? "", p?.tipoPessoa ?? "PF"));
  const [telefone, setTelefone] = useState(p?.clienteTelefone ?? "");
  const [email, setEmail] = useState(p?.clienteEmail ?? "");

  // Endereço opcional
  const [preencherEndereco, setPreencherEndereco] = useState(false);
  const [cep, setCep] = useState(p?.clienteCep ?? "");
  const [rua, setRua] = useState(p?.clienteRua ?? "");
  const [numero, setNumero] = useState(p?.clienteNumero ?? "");
  const [complemento, setComplemento] = useState(p?.clienteComplemento ?? "");
  const [bairro, setBairro] = useState(p?.clienteBairro ?? "");
  const [cidade, setCidade] = useState(p?.clienteCidade ?? "");
  const [uf, setUf] = useState(p?.clienteUf ?? "");
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!p) return;
    setTipoPessoa(p.tipoPessoa ?? "PF");
    setNome(p.clienteNome ?? "");
    setDoc(formatDoc(p.clienteDoc ?? "", p.tipoPessoa ?? "PF"));
    setTelefone(p.clienteTelefone ?? "");
    setEmail(p.clienteEmail ?? "");
    setPreencherEndereco(!!(p.clienteCep || p.clienteRua));
    setCep(formatCEP(p.clienteCep ?? ""));
    setRua(p.clienteRua ?? "");
    setNumero(p.clienteNumero ?? "");
    setComplemento(p.clienteComplemento ?? "");
    setBairro(p.clienteBairro ?? "");
    setCidade(p.clienteCidade ?? "");
    setUf(p.clienteUf ?? "");
  }, [p?.id]);

  if (!p) return null;
  const upper = (v: string) => v.toUpperCase();

  async function buscarCep() {
    setBuscandoCep(true);
    try {
      const r = await buscarCEPViaCEP(cep);
      if (!r) { toast.error("CEP não encontrado. Preencha manualmente."); return; }
      setRua(r.rua); setBairro(r.bairro); setCidade(r.cidade); setUf(r.uf);
      if (r.complemento && !complemento) setComplemento(r.complemento);
      toast.success("Endereço preenchido — confira e ajuste se necessário.");
    } finally { setBuscandoCep(false); }
  }

  async function aprovar() {
    if (!nome.trim()) { toast.error("Informe o nome do cliente."); return; }
    // CPF/CNPJ opcional — só valida se foi preenchido.
    if (doc.trim() && !isDocValido(doc, tipoPessoa)) {
      toast.error(tipoPessoa === "PF" ? "CPF inválido (11 dígitos)." : "CNPJ inválido (14 dígitos)."); return;
    }
    // Endereço opcional — se marcado para preencher, valida obrigatórios.
    let endereco: { cep: string; rua: string; numero: string; complemento?: string; bairro: string; cidade: string; uf: string } | undefined;
    if (preencherEndereco) {
      const cepDig = cep.replace(/\D/g, "");
      if (cepDig.length !== 8) { toast.error("CEP inválido (8 dígitos)."); return; }
      if (!rua.trim() || !numero.trim() || !bairro.trim() || !cidade.trim() || !uf.trim()) {
        toast.error("Endereço incompleto (Rua, Nº, Bairro, Cidade, UF)."); return;
      }
      endereco = { cep: cepDig, rua: upper(rua), numero: upper(numero), complemento: upper(complemento), bairro: upper(bairro), cidade: upper(cidade), uf: upper(uf) };
    }
    setSalvando(true);
    try {
      atualizarCadastroCliente({
        leadId: p!.leadId,
        propostaId: p!.id,
        tipoPessoa,
        clienteNome: nome,
        clienteDoc: doc,
        clienteTelefone: telefone,
        clienteEmail: email,
        endereco,
        origem: `Aprovação da proposta ${p!.numero}`,
        usuario: p!.criadoPor || "Operador",
      });
      const atualizada: PropostaFV = {
        ...p!, tipoPessoa, clienteNome: upper(nome), clienteDoc: doc,
        clienteTelefone: telefone, clienteEmail: email,
        ...(endereco ? {
          clienteCep: endereco.cep, clienteRua: endereco.rua, clienteNumero: endereco.numero,
          clienteComplemento: endereco.complemento, clienteBairro: endereco.bairro,
          clienteCidade: endereco.cidade, clienteUf: endereco.uf,
        } : {}),
      };
      await aprovarProposta(atualizada);
      onOpenChange(false);
      onAprovado?.();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="border-b bg-gradient-to-r from-primary/5 via-background to-background px-6 py-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Aprovar proposta {p.numero}</DialogTitle>
            <p className="text-xs text-muted-foreground">
              Apenas o nome é obrigatório. CPF/CNPJ e endereço são opcionais — o cadastro definitivo é feito no Comercial → Contratos Gerados.
            </p>
          </DialogHeader>
        </div>

        <div className="px-6 py-5 space-y-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant={tipoPessoa === "PF" ? "default" : "outline"}
              onClick={() => { setTipoPessoa("PF"); setDoc(formatDoc(doc, "PF")); }}>Pessoa Física</Button>
            <Button type="button" size="sm" variant={tipoPessoa === "PJ" ? "default" : "outline"}
              onClick={() => { setTipoPessoa("PJ"); setDoc(formatDoc(doc, "PJ")); }}>Pessoa Jurídica</Button>
          </div>
          <div>
            <Label className="text-xs">{tipoPessoa === "PF" ? "Nome completo" : "Razão social"} *</Label>
            <Input className="mt-1.5" value={nome} onChange={(e) => setNome(upper(e.target.value))} />
          </div>
          <div>
            <Label className="text-xs">{tipoPessoa === "PF" ? "CPF" : "CNPJ"} <span className="text-muted-foreground">(opcional)</span></Label>
            <Input className="mt-1.5" value={doc} onChange={(e) => setDoc(formatDoc(e.target.value, tipoPessoa))}
              placeholder={tipoPessoa === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} inputMode="numeric" />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input className="mt-1.5" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">E-mail</Label>
              <Input className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 flex items-center justify-between gap-2">
            <div className="text-xs">
              <div className="font-semibold">Endereço (opcional)</div>
              <div className="text-muted-foreground">Pode ser cadastrado/editado depois no Comercial.</div>
            </div>
            <Switch checked={preencherEndereco} onCheckedChange={setPreencherEndereco} />
          </div>

          {preencherEndereco && (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-[160px_1fr] gap-3 items-end">
                <div>
                  <Label className="text-xs">CEP</Label>
                  <div className="mt-1.5 flex gap-1">
                    <Input value={cep} onChange={(e) => setCep(formatCEP(e.target.value))} placeholder="00000-000" inputMode="numeric" maxLength={9} />
                    <Button type="button" size="sm" variant="outline" onClick={buscarCep} disabled={buscandoCep}>
                      {buscandoCep ? "..." : "Buscar"}
                    </Button>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">Se o CEP estiver errado, edite os campos manualmente.</div>
              </div>
              <div className="grid sm:grid-cols-[1fr_120px] gap-3">
                <div><Label className="text-xs">Rua / Logradouro</Label><Input className="mt-1.5" value={rua} onChange={(e) => setRua(upper(e.target.value))} /></div>
                <div><Label className="text-xs">Número</Label><Input className="mt-1.5" value={numero} onChange={(e) => setNumero(upper(e.target.value))} /></div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div><Label className="text-xs">Complemento</Label><Input className="mt-1.5" value={complemento} onChange={(e) => setComplemento(upper(e.target.value))} /></div>
                <div><Label className="text-xs">Bairro</Label><Input className="mt-1.5" value={bairro} onChange={(e) => setBairro(upper(e.target.value))} /></div>
              </div>
              <div className="grid sm:grid-cols-[1fr_100px] gap-3">
                <div><Label className="text-xs">Cidade</Label><Input className="mt-1.5" value={cidade} onChange={(e) => setCidade(upper(e.target.value))} /></div>
                <div><Label className="text-xs">UF</Label><Input className="mt-1.5" value={uf} maxLength={2} onChange={(e) => setUf(upper(e.target.value).slice(0,2))} /></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t bg-muted/30 px-6 py-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>Cancelar</Button>
          <Button onClick={aprovar} disabled={salvando} className="gap-1">
            <Check className="h-4 w-4" />
            {salvando ? "Aprovando..." : "Aprovar e enviar para Comercial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function diasDesde(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
}
function dotColorFor(dias: number): string {
  if (dias <= 3) return "bg-success";
  if (dias <= 7) return "bg-info";
  if (dias <= 15) return "bg-warning";
  return "bg-destructive";
}
/** Cor de pílula para "Dias da criação" / "Dias no status":
 *  verde 0-7, amarelo 8-15, laranja 16-30, vermelho >30. */
function diasBadgeClass(dias: number): string {
  if (dias <= 7) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300";
  if (dias <= 15) return "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300";
  if (dias <= 30) return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
  return "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300";
}
/** Formata YYYY-MM-DD → DD-MM-YYYY. Aceita ISO completos também. */
function fmtData(iso?: string): string {
  if (!iso) return "—";
  const s = iso.length >= 10 ? iso.slice(0, 10) : iso;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return iso;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/* ===================== LEADS ===================== */

/** Fase do funil "pós-aprovação" — define a coluna-âncora travada do lead. */
type FaseContrato = "GERANDO" | "GERADO" | "ASSINADO" | null;

type Lead = {
  key: string;
  clienteNome: string;
  clienteDoc?: string;
  clienteTelefone?: string;
  clienteEmail?: string;
  clienteEndereco?: string;
  consultor?: string;
  cidade?: string;
  estado?: string;
  propostas: PropostaFV[];
  ultima: PropostaFV;
  primeira: PropostaFV;
  dataPrimeira: string;
  /** Data em que a última proposta foi aprovada (atualizadoEm da proposta APROVADA). */
  aprovadoEm?: string;
  valor: number;
  /** Dias desde a última atividade (status atual). */
  dias: number;
  /** Dias desde a criação do lead (1ª proposta). */
  diasCriacao: number;
  bloqueado: boolean;
  status: StatusProposta;
  emAberto: number;
  aprovadas: number;
  assinados: number;
  modulos: number;
  potenciaW: number;
  /** Potência do sistema em kWp (módulos × Wp / 1000). */
  potenciaKwp: number;
  inversores: string;
  /** Consumo médio (kWh/mês) da última proposta. */
  consumoKwh: number;
  /** Valor por kWp (R$/kWp) da última proposta. */
  valorKwp: number;
  /** Bairro do cliente (última proposta). */
  bairro?: string;
  /** PF / PJ da última proposta. */
  tipoPessoa?: "PF" | "PJ";
  /** Fase pós-aprovação. null = ainda em negociação. */
  fase: FaseContrato;
};

function leadKey(p: PropostaFV): string {
  // Identidade estável do lead: prefere leadId (não muda se o nome for editado),
  // depois CPF/CNPJ, depois nome (para registros legados sem leadId).
  return (p.leadId?.trim() || p.clienteDoc?.trim() || (p.clienteNome || "").trim().toLowerCase() || p.id);
}

const STATUS_FINAIS: StatusProposta[] = ["APROVADA", "RECUSADA", "VENCIDA", "CANCELADA"];

function buildLeads(props: PropostaFV[], contratos: ContratoFull[]): Lead[] {
  const map = new Map<string, PropostaFV[]>();
  for (const p of props) {
    const k = leadKey(p);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  const leads: Lead[] = [];
  for (const [key, arr] of map) {
    const sorted = [...arr].sort((a, b) =>
      (b.atualizadoEm || b.criadoEm || "").localeCompare(a.atualizadoEm || a.criadoEm || "")
    );
    const ultima = sorted[0];
    const primeira = sorted[sorted.length - 1];
    const propIds = new Set(arr.map((p) => p.id));
    const contratosLead = contratos.filter(
      (c) => (c.propostaId && propIds.has(c.propostaId)) ||
             (c.cliente && c.cliente.toUpperCase() === (ultima.clienteNome || "").toUpperCase())
    );
    // Contrato "Assinado" no Comercial (aba "Em contrato") → proposta vai para CONTRATO ASSINADO.
    const assinados = contratosLead.filter((c) => c.status === "Assinado" && !c.cancelado).length;
    const aprovadas = arr.filter((p) => p.status === "APROVADA").length;
    // "Em aberto" = tudo que ainda não virou contrato assinado (independente do status da proposta).
    const emAberto = Math.max(0, arr.length - assinados);
    const hasAssinado = assinados > 0;
    // Qualquer contrato gerado e ainda não assinado (independente do sub-status) → CONTRATO GERADO.
    const hasGerado = !hasAssinado && contratosLead.some(
      (c) => !c.cancelado && c.status !== "Assinado",
    );
    const hasPendente = !hasAssinado && !hasGerado && aprovadas > 0;
    const fase: FaseContrato = hasAssinado ? "ASSINADO" : hasGerado ? "GERADO" : hasPendente ? "GERANDO" : null;
    const invList = (ultima.inversores ?? []).map((e: any) => e.inversorId).filter(Boolean);
    // Agrupa duplicados como "2x 15"
    const invCount = new Map<string, number>();
    invList.forEach((id: string) => invCount.set(id, (invCount.get(id) ?? 0) + 1));
    const inversoresStr = invCount.size > 0
      ? [...invCount.entries()].map(([id, n]) => (n > 1 ? `${n}x ${fmtInversorNumero(id)}` : fmtInversorNumero(id))).join(" + ")
      : (ultima.inversorMarca ? fmtInversorNumero(ultima.inversorMarca) : "—");
    // Data de aprovação: pega a APROVADA mais recente (atualizadoEm como melhor proxy).
    const aprovadasOrdenadas = arr
      .filter((p) => p.status === "APROVADA")
      .sort((a, b) => (b.atualizadoEm || b.criadoEm || "").localeCompare(a.atualizadoEm || a.criadoEm || ""));
    const aprovadoEm = aprovadasOrdenadas[0]?.atualizadoEm || aprovadasOrdenadas[0]?.criadoEm || undefined;
    leads.push({
      key,
      clienteNome: ultima.clienteNome || "—",
      clienteDoc: ultima.clienteDoc,
      clienteTelefone: ultima.clienteTelefone,
      clienteEmail: ultima.clienteEmail,
      clienteEndereco: ultima.clienteEndereco,
      consultor: ultima.consultor,
      cidade: ultima.cidade,
      estado: ultima.estado,
      propostas: sorted,
      ultima,
      primeira,
      dataPrimeira: primeira.criadoEm || primeira.atualizadoEm || "",
      aprovadoEm,
      valor: calcPrecificacao(ultima).valorFinal || 0,
      dias: diasDesde(ultima.atualizadoEm || ultima.criadoEm),
      diasCriacao: diasDesde(primeira.criadoEm || primeira.atualizadoEm),
      bloqueado: fase !== null,
      status: ultima.status,
      emAberto,
      aprovadas,
      assinados,
      modulos: Number(ultima.modulosQtd) || 0,
      potenciaW: Number(ultima.moduloPotenciaWp) || 0,
      potenciaKwp: (() => {
        try { return Number(calcDimensionamento(ultima).potenciaFinalKwp) || 0; }
        catch { return (Number(ultima.modulosQtd) || 0) * (Number(ultima.moduloPotenciaWp) || 0) / 1000; }
      })(),
      inversores: inversoresStr,
      consumoKwh: Number((ultima as any).consumoMedio) || 0,
      valorKwp: (() => {
        const v = calcPrecificacao(ultima).valorFinal || 0;
        const kwp = (Number(ultima.modulosQtd) || 0) * (Number(ultima.moduloPotenciaWp) || 0) / 1000;
        return kwp > 0 ? v / kwp : 0;
      })(),
      bairro: (ultima as any).clienteBairro || undefined,
      tipoPessoa: (ultima as any).tipoPessoa,
      fase,
    });
  }
  return leads;
}

function presetFromLead(l: Lead): Partial<PropostaFV> {
  const u = l.ultima;
  return {
    // leadId garante que a nova proposta caia no MESMO card do lead, mesmo
    // que o nome do cliente seja editado no LeadModal antes de gerar.
    leadId: u.leadId || l.key,
    clienteId: u.clienteId,
    clienteNome: u.clienteNome,
    clienteDoc: u.clienteDoc,
    clienteTelefone: u.clienteTelefone,
    clienteEmail: u.clienteEmail,
    clienteEndereco: u.clienteEndereco,
    clienteCep: u.clienteCep,
    clienteRua: u.clienteRua,
    clienteNumero: u.clienteNumero,
    clienteComplemento: u.clienteComplemento,
    clienteBairro: u.clienteBairro,
    clienteCidade: u.clienteCidade,
    clienteUf: u.clienteUf,
    consultor: u.consultor,
    origemCaptacao: u.origemCaptacao,
    possuiFinanciamento: u.possuiFinanciamento,
    financiamentoBanco: u.financiamentoBanco,
  };
}

/* ===================== KANBAN: colunas ===================== */

type KCol = { id: string; titulo: string; ativo?: boolean; locked?: boolean };
// v5 — colunas fixas pré-definidas (todas travadas).
const COLS_KEY = "ms.fv.kanban.cols.v5";
const ASSIGN_KEY = "ms.fv.kanban.assign-leads.v1";
// Timestamp ISO de quando o lead entrou na coluna atual — base do "Dias no status".
const ASSIGN_AT_KEY = "ms.fv.kanban.assign-leads-at.v1";

// Colunas-âncora travadas (progressão: GERANDO → GERADO → ASSINADO; não voltam).
const COL_GERANDO_ID = "col-gerando-contrato";
const COL_GERADO_ID = "col-contrato-gerado";
const COL_ASSINADO_ID = "col-contrato-assinado";
const ANCHOR_IDS = [COL_GERANDO_ID, COL_GERADO_ID, COL_ASSINADO_ID] as const;
const ANCHOR_INDEX: Record<string, number> = {
  [COL_GERANDO_ID]: 0, [COL_GERADO_ID]: 1, [COL_ASSINADO_ID]: 2,
};
const COL_GERANDO: KCol = { id: COL_GERANDO_ID, titulo: "GERANDO CONTRATO", ativo: true, locked: true };
const COL_GERADO: KCol = { id: COL_GERADO_ID, titulo: "CONTRATO GERADO", ativo: true, locked: true };
const COL_ASSINADO: KCol = { id: COL_ASSINADO_ID, titulo: "CONTRATO ASSINADO", ativo: true, locked: true };

// Coluna padrão de nascimento de toda proposta.
const COL_PROPOSTA_GERADA_ID = "col-proposta-gerada";

// Colunas pré-âncora — todas travadas por enquanto.
const DEFAULT_PRE: KCol[] = [
  { id: COL_PROPOSTA_GERADA_ID, titulo: "PROPOSTA GERADA", ativo: true, locked: true },
  { id: "col-agendar-visita", titulo: "AGENDAR VISITA", ativo: true, locked: true },
  { id: "col-negociacao-fria", titulo: "NEGOCIAÇÃO FRIA", ativo: true, locked: true },
  { id: "col-negociacao-morna", titulo: "NEGOCIAÇÃO MORNA", ativo: true, locked: true },
  { id: "col-negociacao-quente", titulo: "NEGOCIAÇÃO QUENTE", ativo: true, locked: true },
  { id: "col-sem-contrato-financiamento", titulo: "SEM CONTRATO EM FINANCIAMENTO", ativo: true, locked: true },
];



const DEFAULT_COLS: KCol[] = [...DEFAULT_PRE, COL_GERANDO, COL_GERADO, COL_ASSINADO];

// Mantém apenas as colunas fixas, na ordem oficial. Remove qualquer coluna
// custom/legada (incluindo "Cancelados" e a antiga "ASSINADOS"). Garante locked.
function normalizeCols(_cols: KCol[]): KCol[] {
  return DEFAULT_COLS.map((c) => ({ ...c }));
}

function colPadraoPorStatus(s: StatusProposta): string {
  // Toda proposta nasce em "PROPOSTA GERADA". Aprovadas/canceladas são
  // tratadas por fase ou pelo filtro de aba — aqui só importa o fallback.
  void s;
  return COL_PROPOSTA_GERADA_ID;
}

/** Coluna-âncora correspondente à fase do lead. */
function colPorFase(fase: FaseContrato): string | null {
  if (fase === "ASSINADO") return COL_ASSINADO_ID;
  if (fase === "GERADO") return COL_GERADO_ID;
  if (fase === "GERANDO") return COL_GERANDO_ID;
  return null;
}

function useKanbanState(leads: Lead[]) {
  const [cols, setColsRaw] = useState<KCol[]>(() => {
    const saved = readLS<KCol[]>(COLS_KEY, []);
    const base = saved.length ? saved.map((c) => ({ ...c, ativo: c.ativo !== false })) : DEFAULT_COLS;
    return normalizeCols(base);
  });
  const setCols: typeof setColsRaw = (updater) => {
    setColsRaw((prev) => {
      const next = typeof updater === "function" ? (updater as (c: KCol[]) => KCol[])(prev) : updater;
      return normalizeCols(next);
    });
  };
  const [assign, setAssignRaw] = useState<Record<string, string>>(() => readLS(ASSIGN_KEY, {} as Record<string, string>));
  const [assignAt, setAssignAt] = useState<Record<string, string>>(() => readLS(ASSIGN_AT_KEY, {} as Record<string, string>));

  useEffect(() => writeLS(COLS_KEY, cols), [cols]);
  useEffect(() => writeLS(ASSIGN_KEY, assign), [assign]);
  useEffect(() => writeLS(ASSIGN_AT_KEY, assignAt), [assignAt]);

  // Wrapper: toda vez que `assign` muda, registra timestamp para as chaves
  // cujo valor foi alterado. Assim "Dias no status" reflete o tempo na coluna.
  const setAssign: typeof setAssignRaw = (updater) => {
    setAssignRaw((prev) => {
      const next = typeof updater === "function" ? (updater as (a: Record<string, string>) => Record<string, string>)(prev) : updater;
      const now = new Date().toISOString();
      const stamps: Record<string, string> = {};
      for (const k of Object.keys(next)) {
        if (prev[k] !== next[k]) stamps[k] = now;
      }
      if (Object.keys(stamps).length) {
        setAssignAt((at) => ({ ...at, ...stamps }));
      }
      return next;
    });
  };

  // Atribui coluna padrão para leads novos OU para leads cuja coluna foi removida/desativada.
  // Leads com fase pós-aprovação são FORÇADOS para a respectiva coluna-âncora (não voltam).
  useEffect(() => {
    setAssign((prev) => {
      const next = { ...prev };
      const ativosIds = new Set(cols.filter((c) => c.ativo !== false).map((c) => c.id));
      let mudou = false;
      for (const l of leads) {
        const ancora = colPorFase(l.fase);
        if (ancora) {
          // Só avança (nunca volta): se o assign atual já é uma âncora posterior, mantém.
          const atual = next[l.key];
          const idxAtual = atual && atual in ANCHOR_INDEX ? ANCHOR_INDEX[atual] : -1;
          const idxNovo = ANCHOR_INDEX[ancora];
          if (idxAtual < idxNovo) {
            next[l.key] = ancora; mudou = true;
          }
          continue;
        }
        // Lead sem fase: nunca pode estar numa âncora.
        const ehAncora = next[l.key] && next[l.key] in ANCHOR_INDEX;
        if (!next[l.key] || !ativosIds.has(next[l.key]) || ehAncora) {
          const padrao = colPadraoPorStatus(l.status);
          next[l.key] = ativosIds.has(padrao) ? padrao : (cols.find((c) => c.ativo !== false && !(c.id in ANCHOR_INDEX))?.id ?? COL_PROPOSTA_GERADA_ID);
          mudou = true;
        }
      }
      return mudou ? next : prev;
    });
  }, [leads, cols]);

  return { cols, setCols, assign, setAssign, assignAt };
}

/* ===================== Gerenciador de Colunas ===================== */

function ColunasManager({
  open, onOpenChange, cols, setCols,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cols: KCol[];
  setCols: (fn: (c: KCol[]) => KCol[]) => void;
}) {
  const [novoTitulo, setNovoTitulo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [tituloEdit, setTituloEdit] = useState("");

  const adicionar = () => {
    const t = novoTitulo.trim();
    if (!t) return;
    setCols((c) => [...c, { id: `col-${Date.now()}`, titulo: t, ativo: true }]);
    setNovoTitulo("");
  };
  const renomear = (id: string) => {
    const t = tituloEdit.trim();
    if (!t) return;
    setCols((c) => c.map((x) => (x.id === id ? { ...x, titulo: t } : x)));
    setEditId(null);
  };
  const toggleAtivo = (id: string) => setCols((c) => c.map((x) => (x.id === id ? { ...x, ativo: x.ativo === false } : x)));
  const excluir = (id: string) => {
    if (cols.find((x) => x.id === id)?.locked) return toast.error("Esta coluna é fixa do sistema.");
    if (cols.length <= 1) return toast.error("Mantenha pelo menos uma coluna.");
    if (!confirm("Excluir esta coluna?")) return;
    setCols((c) => c.filter((x) => x.id !== id));
  };
  const mover = (id: string, dir: -1 | 1) => {
    setCols((c) => {
      const i = c.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= c.length) return c;
      // não pode mover a coluna fixa, nem trocar de posição com ela
      if (c[i].locked || c[j].locked) return c;
      const cp = [...c]; [cp[i], cp[j]] = [cp[j], cp[i]]; return cp;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="h-5 w-5" /> Gerenciar colunas do Kanban
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-end gap-2 rounded-md border bg-muted/30 p-2">
            <div className="flex-1">
              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Nova coluna</label>
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionar()}
                placeholder="Ex.: Visita técnica"
                className="h-8"
              />
            </div>
            <Button size="sm" onClick={adicionar} className="gap-1">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Colunas cadastradas</div>
            {cols.map((c, idx) => (
              <div key={c.id} className={`flex items-center gap-2 rounded-md border p-2 ${c.ativo === false ? "bg-muted/40 opacity-60" : "bg-card"} ${c.locked ? "border-success/50" : ""}`}>
                <GripVertical className={`h-4 w-4 ${c.locked ? "text-success/60" : "text-muted-foreground"}`} />
                {editId === c.id && !c.locked ? (
                  <>
                    <Input
                      autoFocus
                      value={tituloEdit}
                      onChange={(e) => setTituloEdit(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && renomear(c.id)}
                      className="h-7 flex-1"
                    />
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => renomear(c.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => { if (c.locked) return; setEditId(c.id); setTituloEdit(c.titulo); }}
                    className={`flex-1 truncate text-left text-sm font-medium ${c.locked ? "cursor-default" : ""}`}
                    title={c.locked ? "Coluna fixa do sistema" : "Clique para renomear"}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.locked && <Lock className="h-3 w-3 text-success" />}
                      {c.titulo}
                    </span>
                  </button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(c.id, -1)} disabled={idx === 0 || c.locked || cols[idx - 1]?.locked} title="Subir">
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => mover(c.id, 1)} disabled={idx === cols.length - 1 || c.locked || cols[idx + 1]?.locked} title="Descer">
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1 px-1">
                  <span className="text-[10px] uppercase text-muted-foreground">Ativa</span>
                  <Switch checked={c.ativo !== false} onCheckedChange={() => toggleAtivo(c.id)} disabled={c.locked} />
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => excluir(c.id)} title="Excluir" disabled={c.locked}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Concluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===================== Lead Detail Dialog ===================== */

function LeadDetail({
  lead, onClose, onVisualizar, onNova, onEditar,
}: {
  lead: Lead | null;
  onClose: () => void;
  onVisualizar: (id: string) => void;
  onNova: (preset?: Partial<PropostaFV>) => void;
  onEditar: (p: PropostaFV) => void;
}) {
  const [aprovando, setAprovando] = useState<PropostaFV | null>(null);
  const [verCadastro, setVerCadastro] = useState(false);
  if (!lead) return null;
  const enderecoLinha = [
    lead.clienteEndereco,
    lead.cidade ? `${lead.cidade}${lead.estado ? "/" + lead.estado : ""}` : "",
  ].filter(Boolean).join(" — ");

  const u = lead.ultima;
  const dimU = calcDimensionamento(u);
  const valores = lead.propostas.map((p) => calcPrecificacao(p).valorFinal || 0);
  const valorTotal = valores.reduce((a, b) => a + b, 0);
  const ticket = valores.length ? valorTotal / valores.length : 0;
  const maiorValor = valores.length ? Math.max(...valores) : 0;
  const iniciais = (lead.clienteNome || "?")
    .split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
  const telDigits = (lead.clienteTelefone || "").replace(/\D/g, "");

  return (
    <Dialog open={!!lead} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        {/* Faixa de identificação */}
        <DialogHeader className="space-y-0 border-b bg-meta-bar px-5 py-3 text-meta-bar-foreground">
          <DialogTitle className="flex min-w-0 items-center gap-3 text-left">
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="h-8 shrink-0 gap-1 rounded-md border border-white/25 bg-transparent px-2.5 text-xs font-medium text-current hover:bg-white/15"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
            <span className="h-6 w-px shrink-0 bg-white/20" />
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-xs font-semibold ring-1 ring-white/20">
              {iniciais || "?"}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[15px] font-semibold leading-tight">{lead.clienteNome}</span>
              <span className="truncate text-[11px] font-normal opacity-70">
                {lead.consultor || "Sem consultor"} · {formatDoc(lead.clienteDoc || "") || "Sem documento"} · há {lead.diasCriacao} dia(s)
              </span>
            </span>
            <span className="ml-3 flex shrink-0 items-center gap-1.5">
              <span className="rounded border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                {lead.status}
              </span>
              {lead.bloqueado && (
                <span className="inline-flex items-center gap-1 rounded border border-emerald-300/30 bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  <Lock className="h-3 w-3" /> Assinado
                </span>
              )}
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {telDigits.length >= 10 && (
                <Button asChild size="sm" variant="ghost" className="h-8 rounded-md border border-white/25 px-2.5 text-xs font-medium text-current hover:bg-white/15">
                  <a href={`https://wa.me/55${telDigits}`} target="_blank" rel="noreferrer">WhatsApp</a>
                </Button>
              )}
              {!lead.bloqueado && (
                <Button size="sm" onClick={() => onNova(presetFromLead(lead))} className="h-8 gap-1 bg-white px-2.5 text-xs font-semibold text-[color:var(--meta-bar)] hover:bg-white/90">
                  <FilePlus2 className="h-4 w-4" /> Nova proposta
                </Button>
              )}
            </span>
          </DialogTitle>
        </DialogHeader>


        <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 pb-4">
          {/* KPIs coloridos */}
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {[
              { t: "Propostas", v: String(lead.propostas.length), c: "border-l-primary" },
              { t: "Em aberto", v: String(lead.emAberto), c: "border-l-amber-500" },
              { t: "Valor da última", v: fmtBRL(lead.valor), c: "border-l-emerald-500" },
              { t: "Maior proposta", v: fmtBRL(maiorValor), c: "border-l-sky-500" },
            ].map((k) => (
              <div key={k.t} className={`rounded-md border border-l-4 bg-card px-3 py-2 ${k.c}`}>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.t}</div>
                <div className="text-base font-semibold tabular-nums">{k.v}</div>
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-12">
            {/* Propostas */}
            <div className="flex min-h-0 flex-col gap-3 lg:col-span-8">

              <div className="overflow-hidden rounded-md border">
                <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                  <div className="text-xs font-semibold uppercase tracking-wide">
                    Propostas <span className="text-muted-foreground">({lead.propostas.length})</span>
                  </div>
                  {lead.bloqueado ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                      <Lock className="h-3.5 w-3.5" /> Aprovada — card bloqueado
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">Aprove uma proposta para enviá-la ao Comercial</span>
                  )}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criada</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="w-[180px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lead.propostas.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-xs text-muted-foreground">
                          Nenhuma proposta neste lead.
                        </TableCell>
                      </TableRow>
                    )}
                    {lead.propostas.map((p) => {

                      const v = calcPrecificacao(p).valorFinal || 0;
                      const ehRascunho = p.status === "RASCUNHO";
                      const podeExcluir = ehRascunho && !lead.bloqueado;
                      const statusFechado: StatusProposta[] = ["APROVADA","ATIVA","CONTRATO_PENDENTE","CONTRATADA","CANCELADA"];
                      const podeCancelar = !lead.bloqueado && !statusFechado.includes(p.status);
                      const podeReativar = p.status === "CANCELADA";
                      const podeAprovar = !lead.bloqueado && ["RASCUNHO", "GERADA", "ENVIADA"].includes(p.status);
                      const actions: RowAction[] = [{ kind: "visualizar", label: "Visualizar" }];
                      if (podeReativar) actions.push({ kind: "aprovar", label: "Reativar", icon: RotateCcw, overflow: true });
                      if (podeCancelar) actions.push({ kind: "cancelar", label: "Cancelar", overflow: true });
                      if (podeExcluir) actions.push({ kind: "excluir", label: "Excluir rascunho", overflow: true });
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.numero}</TableCell>
                          <TableCell><Badge variant={statusVariant(p.status)}>{p.status}</Badge></TableCell>
                          <TableCell className="text-muted-foreground">{fmtData(p.criadoEm || p.atualizadoEm)}</TableCell>
                          <TableCell className="text-right font-medium tabular-nums">{fmtBRL(v)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {podeAprovar && (
                                <Button
                                  size="sm"
                                  onClick={() => setAprovando(p)}
                                  className="h-7 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700"
                                >
                                  <Check className="h-3.5 w-3.5" /> Aprovar
                                </Button>
                              )}
                              <RowActions
                                rowId={p.id}
                                actions={actions}
                                onAction={(kind) => {
                                  if (kind === "visualizar") onVisualizar(p.id);
                                  else if (kind === "aprovar") reativarProposta(p);
                                  else if (kind === "cancelar") cancelarProposta(p);
                                  else if (kind === "excluir") excluirProposta(p);
                                }}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Linha do tempo */}
              <div className="rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                  Linha do tempo
                </div>
                <ol className="space-y-3 p-3">
                  {[...lead.propostas]
                    .sort((a, b) => String(b.criadoEm || b.atualizadoEm || "").localeCompare(String(a.criadoEm || a.atualizadoEm || "")))
                    .map((p) => (
                      <li key={p.id} className="flex items-start gap-3">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold">{p.numero}</span>
                            <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                            <span className="text-[11px] text-muted-foreground">{fmtData(p.criadoEm || p.atualizadoEm)}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {fmtBRL(calcPrecificacao(p).valorFinal || 0)} · {p.consultor || "sem consultor"}
                          </div>
                        </div>
                      </li>
                    ))}
                  {lead.propostas.length === 0 && (
                    <li className="text-xs text-muted-foreground">Sem eventos registrados.</li>
                  )}
                </ol>
              </div>
            </div>


            {/* Lateral: contato + técnico */}
            <div className="space-y-4 lg:col-span-4">
              <div className="rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide">Contato</div>
                <div className="grid grid-cols-2 gap-3 p-3">
                  <Field label="Telefone" value={lead.clienteTelefone} />
                  <Field label="E-mail" value={lead.clienteEmail} />
                  <Field label="Endereço" value={enderecoLinha} className="col-span-2" />
                </div>
              </div>

              <div className="rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                  Técnico — {u.numero}
                </div>
                <div className="grid grid-cols-2 gap-3 p-3">
                  <Field label="Potência" value={`${dimU.potenciaFinalKwp.toFixed(2)} kWp`} />
                  <Field label="Módulos" value={`${dimU.qtdFinal} × ${u.moduloPotenciaWp || 0} W`} />
                  <Field label="Geração média" value={`${dimU.geracaoMensalKwh.toFixed(0)} kWh/mês`} />
                  <Field label="Tarifa" value={u.tarifa ? fmtBRL(u.tarifa) : ""} />
                </div>
              </div>

              <div className="rounded-md border">
                <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                  Resumo financeiro
                </div>
                <div className="grid grid-cols-2 gap-3 p-3">
                  <Field label="Valor total" value={fmtBRL(valorTotal)} />
                  <Field label="Ticket médio" value={fmtBRL(ticket)} />
                  <Field label="Em aberto" value={String(lead.emAberto)} />
                  <Field label="Maior proposta" value={fmtBRL(maiorValor)} />
                </div>
              </div>
            </div>

          </div>

          {/* Dados cadastrais — recolhido por padrão */}
          <div className="rounded-md border">
            <button
              type="button"
              onClick={() => setVerCadastro((s) => !s)}
              className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide hover:bg-muted/40"
            >
              Dados cadastrais
              <span className="text-[11px] font-normal normal-case text-muted-foreground">
                {verCadastro ? "Ocultar" : "Editar"}
              </span>
            </button>
            {verCadastro && (
              <div className="border-t p-4">
                <DadosEditaveis lead={lead} />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t px-5 py-3">
          <Button
            onClick={onClose}
            className="gap-1 bg-red-500 font-semibold text-white hover:bg-red-600"
          >
            <X className="h-4 w-4" /> Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
      <AprovarPropostaDialog
        proposta={aprovando}
        open={!!aprovando}
        onOpenChange={(o) => { if (!o) setAprovando(null); }}
        onAprovado={() => { setAprovando(null); onClose(); }}
      />
    </Dialog>
  );
}

function Field({ label, value, className }: { label: string; value?: string; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}

/** Aba "Dados" do lead — campos travados com X para liberar edição.
 *  Ao salvar, propaga as alterações para TODAS as propostas do lead e
 *  garante que cada uma fique com um leadId estável (lead.key), evitando
 *  que mudanças de nome/doc desvinculem o card. */
function DadosEditaveis({ lead }: { lead: Lead }) {
  const upper = (v: string) => v.toUpperCase();
  const [nome, setNome] = useState(lead.clienteNome || "");
  const [doc, setDoc] = useState(lead.clienteDoc || "");
  const [tel, setTel] = useState(lead.clienteTelefone || "");
  const [email, setEmail] = useState(lead.clienteEmail || "");
  const [endereco, setEndereco] = useState(lead.clienteEndereco || "");
  const [consultor, setConsultor] = useState(lead.consultor || "");
  const [unlocked, setUnlocked] = useState<Record<string, boolean>>({});

  // Reseta estado local sempre que abrir outro lead
  useEffect(() => {
    setNome(lead.clienteNome || "");
    setDoc(lead.clienteDoc || "");
    setTel(lead.clienteTelefone || "");
    setEmail(lead.clienteEmail || "");
    setEndereco(lead.clienteEndereco || "");
    setConsultor(lead.consultor || "");
    setUnlocked({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.key]);

  // Cliente vinculado ao banco de dados pelo CPF/CNPJ: trava os dados
  // cadastrais (nome, doc, telefone, e-mail, consultor). Endereço sempre livre.
  const clienteFromDB = !!findClienteByDoc(doc);
  const ALWAYS_LOCKED_FIELDS = new Set(["nome", "doc", "tel", "email", "consultor"]);
  const isLocked = (f: string, v: string) => {
    if (f === "endereco") return false;
    if (clienteFromDB && ALWAYS_LOCKED_FIELDS.has(f)) return true;
    return !unlocked[f] && !!v;
  };
  const canUnlock = (f: string) => !(clienteFromDB && ALWAYS_LOCKED_FIELDS.has(f));
  const unlock = (f: string) => setUnlocked((u) => ({ ...u, [f]: true }));
  const dirty =
    nome !== (lead.clienteNome || "") ||
    doc !== (lead.clienteDoc || "") ||
    tel !== (lead.clienteTelefone || "") ||
    email !== (lead.clienteEmail || "") ||
    endereco !== (lead.clienteEndereco || "") ||
    consultor !== (lead.consultor || "");

  const salvar = () => {
    if (!nome.trim()) { toast.error("Nome obrigatório."); return; }
    const hoje = new Date().toISOString().slice(0, 10);
    for (const p of lead.propostas) {
      upsertProposta({
        ...p,
        // garante leadId estável em todas as propostas do lead
        leadId: p.leadId || lead.key,
        clienteNome: upper(nome.trim()),
        clienteDoc: doc.trim(),
        clienteTelefone: tel.trim(),
        clienteEmail: email.trim().toLowerCase(),
        clienteEndereco: upper(endereco.trim()),
        consultor: upper(consultor.trim()),
        atualizadoEm: hoje,
      });
    }
    setUnlocked({});
    toast.success("Dados do lead atualizados.");
  };

  const LockX = ({ field }: { field: string }) => (
    <button
      type="button"
      onClick={() => unlock(field)}
      title="Liberar edição"
      className="absolute right-2 top-7 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="h-3.5 w-3.5" />
    </button>
  );

  const EditableField = ({
    label, field, value, onChange, className, transform,
  }: {
    label: string;
    field: string;
    value: string;
    onChange: (v: string) => void;
    className?: string;
    transform?: (v: string) => string;
  }) => {
    const locked = isLocked(field, value);
    const unlockable = canUnlock(field);
    return (
      <div className={`relative ${className || ""}`}>
        <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
          {locked && !unlockable && (
            <span className="ml-1 text-[10px] text-muted-foreground/80">(do cadastro)</span>
          )}
        </Label>
        <Input
          value={value}
          onChange={(e) => onChange(transform ? transform(e.target.value) : e.target.value)}
          disabled={locked}
          className={`mt-1 ${locked ? "pr-8 bg-muted/50" : ""}`}
        />
        {locked && unlockable && <LockX field={field} />}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <EditableField label="Nome" field="nome" value={nome} onChange={setNome} transform={upper} />
        <EditableField label="CPF / CNPJ" field="doc" value={doc} onChange={setDoc} />
        <EditableField label="Telefone" field="tel" value={tel} onChange={setTel} />
        <EditableField label="E-mail" field="email" value={email} onChange={setEmail} />
        <EditableField label="Endereço" field="endereco" value={endereco} onChange={setEndereco} transform={upper} className="sm:col-span-2" />
        <EditableField label="Consultor" field="consultor" value={consultor} onChange={setConsultor} transform={upper} />
        <div>
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Valor (última proposta)</div>
          <div className="mt-1 text-sm font-medium">{fmtBRL(lead.valor)}</div>
        </div>
      </div>
      {dirty && (
        <div className="flex justify-end">
          <Button size="sm" onClick={salvar} className="gap-1">
            <Check className="h-4 w-4" /> Salvar alterações
          </Button>
        </div>
      )}
    </div>
  );
}



/* ===================== KANBAN VIEW ===================== */

function KanbanView({
  leads, onAbrirLead, onNovaPreset, cols, setCols, assign, setAssign, onAprovar,
}: {
  leads: Lead[];
  onAbrirLead: (l: Lead) => void;
  onNovaPreset: (preset?: Partial<PropostaFV>) => void;
  cols: KCol[];
  setCols: (fn: (c: KCol[]) => KCol[]) => void;
  assign: Record<string, string>;
  setAssign: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAprovar?: (p: PropostaFV) => void;
}) {
  const [dragLead, setDragLead] = useState<string | null>(null);
  const [dragCol, setDragCol] = useState<string | null>(null);

  const colsAtivas = cols.filter((c) => c.ativo !== false);

  const porColuna = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    colsAtivas.forEach((c) => (map[c.id] = []));
    leads.forEach((l) => {
      const c = assign[l.key] ?? colPadraoPorStatus(l.status);
      if (!map[c]) map[c] = [];
      map[c].push(l);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colsAtivas.map((c) => c.id).join("|"), leads, assign]);

  const dropEmColuna = (colId: string) => {
    if (dragLead) {
      const lead = leads.find((x) => x.key === dragLead);
      if (lead) {
        const origemId = assign[lead.key] ?? colPadraoPorStatus(lead.status);
        const origemAncora = origemId in ANCHOR_INDEX;
        const destinoAncora = colId in ANCHOR_INDEX;
        // 1) Não sair de uma coluna-âncora (não pode voltar).
        if (origemAncora) {
          toast.error("Cards em colunas de contrato não podem ser movidos.");
          setDragLead(null); return;
        }
        // 2) Só lead aprovado/com fase pode entrar em coluna-âncora,
        //    e somente na coluna correspondente à sua fase atual.
        if (destinoAncora) {
          const ancoraValida = colPorFase(lead.fase);
          if (!ancoraValida) {
            toast.error("Somente propostas aprovadas podem ir para colunas de contrato.");
            setDragLead(null); return;
          }
          if (ancoraValida !== colId) {
            toast.error("Este lead está na fase " + (cols.find((c) => c.id === ancoraValida)?.titulo || ancoraValida) + ".");
            setDragLead(null); return;
          }
        }
      }
      setAssign((a) => ({ ...a, [dragLead]: colId }));
      setDragLead(null);
    } else if (dragCol && dragCol !== colId) {
      setCols((c) => {
        const from = c.findIndex((x) => x.id === dragCol);
        const to = c.findIndex((x) => x.id === colId);
        if (from < 0 || to < 0) return c;
        const cp = [...c]; const [m] = cp.splice(from, 1); cp.splice(to, 0, m); return cp;
      });
      setDragCol(null);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {colsAtivas.map((c) => {
        const items = porColuna[c.id] || [];
        const total = items.reduce((s, l) => s + l.valor, 0);
        return (
          <div
            key={c.id}
            className="flex w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => dropEmColuna(c.id)}
          >
            <div
              className="cursor-grab border-b bg-card px-3 py-2 active:cursor-grabbing"
              draggable
              onDragStart={() => { setDragCol(c.id); setDragLead(null); }}
              title="Arraste para reordenar a coluna"
            >
              <div className="text-sm font-bold uppercase tracking-wide">{c.titulo}</div>
              <div className="mt-1 flex items-end justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Valor total</div>
                  <div className="truncate text-base font-bold text-primary">{fmtBRL(total)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Contratos</div>
                  <div className="text-base font-bold tabular-nums">{items.length}</div>
                </div>
              </div>
            </div>
            <div className="flex min-h-[120px] flex-col gap-2 p-2">
              {items.map((l) => (
                <Card
                  key={l.key}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDragLead(l.key);
                    setDragCol(null);
                  }}
                  onClick={() => onAbrirLead(l)}
                  className={`cursor-pointer p-2 transition-colors hover:bg-accent/40 active:cursor-grabbing ${l.bloqueado ? "border-success/40 bg-success/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{l.clienteNome}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {l.consultor || "sem consultor"} · {l.propostas.length} proposta(s)
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      {l.bloqueado && <Lock className="h-3.5 w-3.5 text-success" />}
                      {(() => {
                        const alvo = !l.bloqueado && onAprovar ? propostaAprovavelDoLead(l) : null;
                        const actions: RowAction[] = [{ kind: "visualizar", label: "Abrir lead" }];
                        if (alvo && onAprovar) actions.push({ kind: "aprovar", label: "Aprovar e gerar contrato", overflow: true });
                        if (l.bloqueado) actions.push({ kind: "visualizar", label: "Ver contrato no Comercial", icon: FileText, overflow: true });
                        if (!l.bloqueado && l.status === "CANCELADA") actions.push({ kind: "aprovar", label: "Reativar última proposta", icon: RotateCcw, overflow: true });
                        if (!l.bloqueado) actions.push({ kind: "cancelar", label: "Cancelar última proposta", overflow: true });
                        return (
                          <RowActions
                            rowId={l.key}
                            actions={actions}
                            onAction={(_kind, _id) => {
                              // Não dá pra distinguir overflow homônimos por kind apenas; usar label
                              // mas RowActions só passa kind. Fallback: tratar pela ordem das ações.
                              const last = actions[actions.length - 1];
                              const a = actions.find((x) => x.kind === _kind) ?? last;
                              const lbl = a.label;
                              if (lbl === "Abrir lead") onAbrirLead(l);
                              else if (lbl === "Aprovar e gerar contrato" && alvo && onAprovar) onAprovar(alvo);
                              else if (lbl === "Ver contrato no Comercial") irParaContratos();
                              else if (lbl === "Reativar última proposta") reativarProposta(l.ultima);
                              else if (lbl === "Cancelar última proposta") {
                                const p = [...l.propostas].reverse().find((x) => x.status !== "CANCELADA" && x.status !== "APROVADA");
                                if (!p) { toast.info("Não há proposta cancelável."); return; }
                                cancelarProposta(p);
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <div className="text-sm font-semibold">{fmtBRL(l.valor)}</div>
                    <div className="flex items-center gap-1" title={`${l.dias} dia(s) no status`}>
                      <span className={`inline-block h-2 w-2 rounded-full ${dotColorFor(l.dias)}`} />
                      <span className="text-[11px] text-muted-foreground">{l.dias}d</span>
                    </div>
                  </div>
                </Card>
              ))}
              {!items.length && (
                <div className="rounded border border-dashed p-3 text-center text-[11px] text-muted-foreground">
                  Solte aqui
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ===================== TABELA VIEW ===================== */
// Cabeçalho arrastável (reordenar) + alça de redimensionar à direita.
// Persistência de ordem e larguras em localStorage.

// D26.1.4 — coluna "Ações/Opções" removida. Toda ação opera pela
// Barra Operacional Enterprise (acima do grid); clicar na linha abre o lead.
type TabelaColKey =
  | "cliente" | "tipoPessoa" | "consultor" | "cidade" | "bairro"
  | "criado" | "aprovadoEm" | "diasCriacao" | "diasStatus"
  | "aberto" | "assinados"
  | "consumoKwh" | "modulos" | "potencia" | "potenciaKwp" | "inversores"
  | "valor" | "valorKwp"
  | "status" | "dias";
type TabelaColDef = { key: TabelaColKey; label: string; align?: "right" | "center"; defaultWidth: number };

const TABELA_COLS: TabelaColDef[] = [
  { key: "criado",       label: "Criado em",         defaultWidth: 110 },
  { key: "diasCriacao",  label: "Dias da criação",   align: "right", defaultWidth: 120 },
  { key: "diasStatus",   label: "Dias no status",    align: "right", defaultWidth: 120 },
  { key: "cliente",      label: "Cliente",           defaultWidth: 220 },
  { key: "tipoPessoa",   label: "Tipo",              defaultWidth: 70 },
  { key: "consultor",    label: "Consultor",         defaultWidth: 150 },
  { key: "cidade",       label: "Cidade",            defaultWidth: 150 },
  { key: "bairro",       label: "Bairro",            defaultWidth: 140 },
  { key: "consumoKwh",   label: "Consumo (kWh)",     align: "right", defaultWidth: 120 },
  { key: "modulos",      label: "Módulos",           align: "right", defaultWidth: 90 },
  { key: "potencia",     label: "Pot. módulo (Wp)",  align: "right", defaultWidth: 130 },
  { key: "potenciaKwp",  label: "Potência (kWp)",    align: "right", defaultWidth: 120 },
  { key: "inversores",   label: "Inversores",        defaultWidth: 190 },
  { key: "valor",        label: "Valor proposta",    align: "right", defaultWidth: 140 },
  { key: "valorKwp",     label: "R$/kWp",            align: "right", defaultWidth: 110 },
  { key: "status",       label: "Status",            defaultWidth: 130 },
  { key: "aprovadoEm",   label: "Aprovado em",       defaultWidth: 120 },
  { key: "aberto",       label: "Em aberto",         align: "right", defaultWidth: 100 },
  { key: "assinados",    label: "Assinados",         align: "right", defaultWidth: 100 },
  { key: "dias",         label: "Dias (legado)",     defaultWidth: 90 },
];
// v3 — reorganização das colunas e novos defaults visíveis (escopo Comercial → Propostas).
const TABELA_ORDER_KEY = "ms.fv.propostas.tabela.order.v3";
const TABELA_WIDTH_KEY = "ms.fv.propostas.tabela.widths.v3";
const TABELA_HIDDEN_KEY = "ms.fv.propostas.tabela.hidden.v3";
const TABELA_DEFAULT_ORDER: TabelaColKey[] = TABELA_COLS.map((c) => c.key);
/** Defaults visíveis = spec da operação. Demais colunas ficam disponíveis no gerenciador. */
const TABELA_DEFAULT_HIDDEN: TabelaColKey[] = [
  "tipoPessoa", "bairro", "potencia", "valorKwp",
  "aprovadoEm", "aberto", "assinados", "dias",
];

function TabelaView({
  leads, onAbrirLead, onNovaPreset, mgrOpen, setMgrOpen, cols, assign, assignAt, onAprovar, onSelecionarUltima,
}: {
  leads: Lead[];
  onAbrirLead: (l: Lead) => void;
  onNovaPreset: (preset?: Partial<PropostaFV>) => void;
  mgrOpen: boolean;
  setMgrOpen: (v: boolean) => void;
  cols: KCol[];
  assign: Record<string, string>;
  assignAt: Record<string, string>;
  onAprovar?: (p: PropostaFV) => void;
  onSelecionarUltima?: (propostaId: string | null) => void;
}) {
  const colsByKey = useMemo(
    () => Object.fromEntries(TABELA_COLS.map((c) => [c.key, c])) as Record<TabelaColKey, TabelaColDef>,
    [],
  );

  const [order, setOrder] = useState<TabelaColKey[]>(TABELA_DEFAULT_ORDER);
  const [widths, setWidths] = useState<Record<TabelaColKey, number>>(
    () => Object.fromEntries(TABELA_COLS.map((c) => [c.key, c.defaultWidth])) as Record<TabelaColKey, number>,
  );
  const [hidden, setHidden] = useState<Set<TabelaColKey>>(() => new Set(TABELA_DEFAULT_HIDDEN));

  

  useEffect(() => {
    try {
      const rawO = localStorage.getItem(TABELA_ORDER_KEY);
      if (rawO) {
        const arr = JSON.parse(rawO) as TabelaColKey[];
        const valid = arr.filter((k) => TABELA_DEFAULT_ORDER.includes(k));
        const missing = TABELA_DEFAULT_ORDER.filter((k) => !valid.includes(k));
        setOrder([...valid, ...missing]);
      }
      const rawW = localStorage.getItem(TABELA_WIDTH_KEY);
      if (rawW) {
        const w = JSON.parse(rawW) as Partial<Record<TabelaColKey, number>>;
        setWidths((prev) => ({ ...prev, ...w }));
      }
      const rawH = localStorage.getItem(TABELA_HIDDEN_KEY);
      if (rawH) {
        const arr = JSON.parse(rawH) as TabelaColKey[];
        setHidden(new Set(arr.filter((k) => TABELA_DEFAULT_ORDER.includes(k))));
      }
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem(TABELA_ORDER_KEY, JSON.stringify(order)); } catch {} }, [order]);
  useEffect(() => { try { localStorage.setItem(TABELA_WIDTH_KEY, JSON.stringify(widths)); } catch {} }, [widths]);
  useEffect(() => { try { localStorage.setItem(TABELA_HIDDEN_KEY, JSON.stringify([...hidden])); } catch {} }, [hidden]);

  const visibleOrder = useMemo(() => order.filter((k) => !hidden.has(k)), [order, hidden]);
  const toggleHidden = (k: TabelaColKey) => setHidden((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const moveBy = (k: TabelaColKey, delta: -1 | 1) => setOrder((prev) => {
    const i = prev.indexOf(k); const j = i + delta;
    if (i < 0 || j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  const [dragKey, setDragKey] = useState<TabelaColKey | null>(null);
  const move = (from: TabelaColKey, to: TabelaColKey) => {
    if (from === to) return;
    setOrder((prev) => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      if (fi < 0 || ti < 0) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      return next;
    });
  };

  const startResize = (key: TabelaColKey, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[key] ?? colsByKey[key].defaultWidth;
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(60, startW + (ev.clientX - startX));
      setWidths((prev) => ({ ...prev, [key]: w }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const alignClass = (a?: "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "";

  const renderCell = (l: Lead, key: TabelaColKey) => {
    switch (key) {
      case "cliente":
        return (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium truncate">{l.clienteNome}</span>
            {l.bloqueado && <Lock className="h-3.5 w-3.5 shrink-0 text-success" />}
          </div>
        );
      case "consultor": return <span className="block truncate">{l.consultor || "—"}</span>;
      case "cidade": {
        // D18.6 — Nunca renderizar "Cidade/" ou "/UF"; só junta com barra quando houver UF.
        if (!l.cidade) return <span>—</span>;
        return <span className="block truncate">{l.estado ? `${l.cidade}/${l.estado}` : l.cidade}</span>;
      }
      case "bairro":    return <span className="block truncate">{l.bairro || "—"}</span>;
      case "tipoPessoa": return <span className="text-[11px] text-muted-foreground">{l.tipoPessoa || "—"}</span>;
      case "criado":    return <span className="tabular-nums">{fmtData(l.dataPrimeira)}</span>;
      case "aprovadoEm": return <span className="tabular-nums">{l.aprovadoEm ? fmtData(l.aprovadoEm) : "—"}</span>;
      case "diasCriacao": return (
        <span className={`inline-flex items-center justify-end rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${diasBadgeClass(l.diasCriacao)}`}>
          {l.diasCriacao} {l.diasCriacao === 1 ? "dia" : "dias"}
        </span>
      );
      case "diasStatus": {
        // Conta dias desde a última mudança de coluna (status visual do kanban).
        // Fallback: atualizadoEm da última proposta (l.dias) quando o lead
        // ainda não foi movido manualmente.
        const d = assignAt[l.key] ? diasDesde(assignAt[l.key]) : l.dias;
        return (
          <span className={`inline-flex items-center justify-end rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums ${diasBadgeClass(d)}`}>
            {d} {d === 1 ? "dia" : "dias"}
          </span>
        );
      }
      case "aberto":     return <span className={`tabular-nums ${l.emAberto > 0 ? "font-semibold text-warning" : ""}`}>{l.emAberto}</span>;
      case "assinados":  return <span className={`tabular-nums ${l.assinados > 0 ? "font-semibold text-primary" : ""}`}>{l.assinados}</span>;
      case "consumoKwh": return <span className="tabular-nums">{l.consumoKwh ? `${l.consumoKwh.toLocaleString("pt-BR")} kWh` : "—"}</span>;
      case "modulos":    return <span className="tabular-nums">{l.modulos || "—"}</span>;
      case "potencia":   return <span className="tabular-nums">{l.potenciaW ? `${l.potenciaW} Wp` : "—"}</span>;
      case "potenciaKwp": return <span className="tabular-nums">{l.potenciaKwp ? `${l.potenciaKwp.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} kWp` : "—"}</span>;
      case "inversores": return <span className="block truncate text-xs">{l.inversores}</span>;
      case "valor": {
        // D18.6 — valor 0 em proposta ativa = dado inconsistente, não R$ 0,00 silencioso.
        const ativa = ["GERADA","ENVIADA","APROVADA","CONTRATADA","ATIVA"].includes(l.status as string);
        if (!l.valor && ativa) {
          return <Badge variant="destructive" className="text-[10px]">Dados inconsistentes</Badge>;
        }
        return <span className="tabular-nums">{fmtBRL(l.valor)}</span>;
      }
      case "valorKwp":  return <span className="tabular-nums">{l.valorKwp ? `${fmtBRL(l.valorKwp)}/kWp` : "—"}</span>;
      case "status": {
        // Espelha o status mostrado no Kanban: se o lead tem fase pós-aprovação,
        // usa a coluna-âncora correspondente; senão, fallback para o assign.
        const colId = colPorFase(l.fase) ?? assign[l.key] ?? colPadraoPorStatus(l.status);
        const col = cols.find((c) => c.id === colId);
        const titulo = (col?.titulo || l.status).toUpperCase();
        const variant: "default" | "secondary" | "destructive" | "outline" =
          colId in ANCHOR_INDEX ? "default"
          : colId === "col-aprovada" ? "default"
          : colId === "col-perdida" ? "destructive"
          : colId === "col-cancelados" ? "destructive"
          : colId === "col-rascunho" ? "outline"
          : "secondary";
        return <Badge variant={variant}>{titulo}</Badge>;
      }
      case "dias":
        return (
          <div className="flex items-center gap-1" title={`${l.dias} dia(s)`}>
            <span className={`inline-block h-2 w-2 rounded-full ${dotColorFor(l.dias)}`} />
            <span className="text-[11px] text-muted-foreground">{l.dias}d</span>
          </div>
        );
    }
  };

  // D26.1.5 — seleção em lote (checkbox por linha + header)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allKeys = useMemo(() => leads.map((l) => l.key), [leads]);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = !allSelected && allKeys.some((k) => selected.has(k));
  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) return new Set();
      const next = new Set(prev);
      allKeys.forEach((k) => next.add(k));
      return next;
    });
  };
  const toggleOne = (k: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };
  // Limpa seleção quando a lista filtrada muda de tamanho
  useEffect(() => {
    setSelected((prev) => new Set(Array.from(prev).filter((k) => allKeys.includes(k))));
  }, [allKeys]);

  // Emite o id da ÚLTIMA proposta do lead selecionado (quando exatamente 1 está marcado),
  // para que a ribbon RM no topo opere sobre essa proposta.
  useEffect(() => {
    if (!onSelecionarUltima) return;
    if (selected.size === 1) {
      const k = Array.from(selected)[0];
      const lead = leads.find((l) => l.key === k);
      onSelecionarUltima(lead?.ultima.id ?? null);
    } else {
      onSelecionarUltima(null);
    }
  }, [selected, leads, onSelecionarUltima]);

  return (
    <>
      <Card>
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-2 border-b bg-primary/5 px-3 py-1.5 text-xs">
            <span className="font-medium">{selected.size} lead(s) selecionado(s)</span>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                className="h-7 gap-1 px-2 text-xs"
                disabled={selected.size !== 1}
                title={selected.size === 1 ? "Gerar nova proposta para o lead selecionado" : "Selecione apenas 1 lead para gerar uma nova proposta"}
                onClick={() => {
                  if (selected.size !== 1) return;
                  const k = Array.from(selected)[0];
                  const lead = leads.find((l) => l.key === k);
                  if (!lead) return;
                  if (lead.bloqueado) return;
                  onNovaPreset(presetFromLead(lead));
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" /> Gerar nova proposta
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setSelected(new Set())}>
                Limpar seleção
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 36, minWidth: 36 }} className="px-2">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </TableHead>
                {visibleOrder.map((key) => {
                  const col = colsByKey[key]; if (!col) return null;
                  const w = widths[key] ?? col.defaultWidth;
                  return (
                    <TableHead
                      key={key}
                      style={{ width: w, minWidth: 60 }}
                      draggable
                      onDragStart={() => setDragKey(key)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => { if (dragKey) move(dragKey, key); setDragKey(null); }}
                      onDragEnd={() => setDragKey(null)}
                      className={`relative cursor-move select-none whitespace-nowrap ${alignClass(col.align)} ${dragKey === key ? "opacity-40" : ""}`}
                      title="Arraste para reordenar"
                    >
                      <span className="inline-flex items-center gap-1">
                        <GripVertical className="h-3 w-3 text-muted-foreground/60" />
                        {col.label}
                      </span>
                      <span
                        onMouseDown={(e) => startResize(key, e)}
                        onClick={(e) => e.stopPropagation()}
                        onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize bg-transparent hover:bg-primary/40 transition-colors"
                        title="Arraste para redimensionar"
                      />
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow
                  key={l.key}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => onAbrirLead(l)}
                  data-state={selected.has(l.key) ? "selected" : undefined}
                >
                  <TableCell
                    style={{ width: 36, maxWidth: 36 }}
                    className="px-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={selected.has(l.key)}
                      onCheckedChange={() => toggleOne(l.key)}
                      aria-label={`Selecionar ${l.clienteNome}`}
                    />
                  </TableCell>
                  {visibleOrder.map((key) => {
                    const col = colsByKey[key]; if (!col) return null;
                    const w = widths[key] ?? col.defaultWidth;
                    return (
                      <TableCell
                        key={key}
                        style={{ width: w, maxWidth: w }}
                        className={`whitespace-nowrap overflow-hidden text-ellipsis ${alignClass(col.align)}`}
                      >
                        {renderCell(l, key)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={mgrOpen} onOpenChange={setMgrOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Colunas da Tabela</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground mb-2">
              Mostre/oculte colunas e organize a sequência. Você também pode arrastar o cabeçalho da tabela e redimensionar pela borda.
            </div>
            {order.map((k, i) => {
              const col = colsByKey[k];
              const visible = !hidden.has(k);
              return (
                <div key={k} className="flex items-center gap-2 rounded-md border p-2">
                  <span className="flex-1 text-sm">{col.label}</span>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => moveBy(k, -1)} title="Subir">
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === order.length - 1} onClick={() => moveBy(k, 1)} title="Descer">
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Switch checked={visible} onCheckedChange={() => toggleHidden(k)} />
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOrder(TABELA_DEFAULT_ORDER); setHidden(new Set(TABELA_DEFAULT_HIDDEN)); setWidths(Object.fromEntries(TABELA_COLS.map((c) => [c.key, c.defaultWidth])) as Record<TabelaColKey, number>); }}>
              Restaurar padrão
            </Button>
            <Button onClick={() => setMgrOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ===================== ROOT ===================== */

const VIEW_KEY = "ms.fv.propostas.view";
type ViewMode = "tabela" | "kanban";

export function PropostaList({
  propostas, onEditar, onVisualizar, onNova, onSelecionarUltima,
}: {
  propostas: PropostaFV[];
  onEditar: (p: PropostaFV) => void;
  onVisualizar: (id: string) => void;
  onNova: (preset?: Partial<PropostaFV>) => void;
  onSelecionarUltima?: (propostaId: string | null) => void;
}) {
  // Onda P2 — Auto-expira propostas em aberto (RASCUNHO/GERADA/ENVIADA) passadas da validade.
  // Idempotente — registra auditoria pelo próprio store e move para EXPIRADA.
  useEffect(() => {
    try { expirarPropostasVencidasAuto("sistema"); } catch { /* noop */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propostas.length]);

  const [view, setView] = useState<ViewMode>(() => (readLS<ViewMode>(VIEW_KEY, "tabela")));
  useEffect(() => writeLS(VIEW_KEY, view), [view]);

  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<StatusProposta | "TODOS">("TODOS");
  const [estadoLead, setEstadoLead] = useState<"ABERTO" | "FECHADO" | "REPROVADO" | "CANCELADO">("ABERTO");
  const [colsOpen, setColsOpen] = useState(false);
  const [colsTabelaOpen, setColsTabelaOpen] = useState(false);
  const [leadAberto, setLeadAberto] = useState<Lead | null>(null);
  const [aprovandoLista, setAprovandoLista] = useState<PropostaFV | null>(null);
  const [filtrosDialogOpen, setFiltrosDialogOpen] = useState(false);

  // ===== Filtros avançados (Comercial > Propostas) =====
  const [filtroPeriodo, setFiltroPeriodo] = useState<
    "TODOS" | "HOJE" | "ONTEM" | "7D" | "15D" | "30D" | "MES_ATUAL" | "MES_PASSADO" | "ANO"
  >("TODOS");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("TODOS");
  const [filtroCidade, setFiltroCidade] = useState<string>("TODOS");
  const [filtroValorMin, setFiltroValorMin] = useState<string>("");
  const [filtroValorMax, setFiltroValorMax] = useState<string>("");
  const [filtroKwpMin, setFiltroKwpMin] = useState<string>("");
  const [filtroKwpMax, setFiltroKwpMax] = useState<string>("");
  const [filtroSemMovimento, setFiltroSemMovimento] = useState<"0" | "7" | "15" | "30" | "60" | "90">("0");

  // Permite que a pílula "Filtros: Todos" da EnterpriseRecordToolbar (em PropostasPage)
  // abra este diálogo, já que o estado de filtro vive aqui.
  useEffect(() => {
    (window as any).__propostasOpenFilters = () => setFiltrosDialogOpen(true);
    (window as any).__propostasOpenColunas = () => {
      // Abre o gerenciador de colunas correspondente à visualização ativa.
      if (view === "tabela") setColsTabelaOpen(true);
      else setColsOpen(true);
    };
    return () => {
      try { delete (window as any).__propostasOpenFilters; } catch { /* noop */ }
      try { delete (window as any).__propostasOpenColunas; } catch { /* noop */ }
    };
  }, [view]);


  // Estado de colunas precisa estar acessível tanto pro Kanban quanto pro botão "Colunas"
  const contratosAll = useContratos();
  const leadsAll = useMemo(() => buildLeads(propostas, contratosAll), [propostas, contratosAll]);
  const { cols, setCols, assign, setAssign, assignAt } = useKanbanState(leadsAll);

  // Opções derivadas (consultores/cidades únicos para os selects).
  const consultoresOpts = useMemo(() => {
    const s = new Set<string>();
    propostas.forEach((p) => { if (p.consultor) s.add(p.consultor); });
    return Array.from(s).sort();
  }, [propostas]);
  const cidadesOpts = useMemo(() => {
    const s = new Set<string>();
    propostas.forEach((p) => { if (p.cidade) s.add(p.cidade); });
    return Array.from(s).sort();
  }, [propostas]);

  function periodoMatches(dateIso: string | undefined): boolean {
    if (filtroPeriodo === "TODOS") return true;
    if (!dateIso) return false;
    const d = new Date(dateIso);
    if (isNaN(d.getTime())) return false;
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const diff = (hoje.getTime() - new Date(d.getFullYear(),d.getMonth(),d.getDate()).getTime()) / 86400000;
    switch (filtroPeriodo) {
      case "HOJE": return diff === 0;
      case "ONTEM": return diff === 1;
      case "7D": return diff >= 0 && diff <= 7;
      case "15D": return diff >= 0 && diff <= 15;
      case "30D": return diff >= 0 && diff <= 30;
      case "MES_ATUAL": return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
      case "MES_PASSADO": {
        const pm = (hoje.getMonth() + 11) % 12;
        const py = pm === 11 ? hoje.getFullYear() - 1 : hoje.getFullYear();
        return d.getMonth() === pm && d.getFullYear() === py;
      }
      case "ANO": return d.getFullYear() === hoje.getFullYear();
      default: return true;
    }
  }

  const leadsFiltrados = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    const vMin = filtroValorMin ? Number(filtroValorMin.replace(/[^\d.,-]/g, "").replace(",", ".")) : null;
    const vMax = filtroValorMax ? Number(filtroValorMax.replace(/[^\d.,-]/g, "").replace(",", ".")) : null;
    const kMin = filtroKwpMin ? Number(filtroKwpMin.replace(",", ".")) : null;
    const kMax = filtroKwpMax ? Number(filtroKwpMax.replace(",", ".")) : null;
    const semMovDias = Number(filtroSemMovimento);

    return leadsAll.filter((l) => {
      const isAssinado = l.fase === "ASSINADO";
      const isAprovado = l.status === "APROVADA";
      const isFechado = isAssinado || isAprovado;
      const isCancelado = l.status === "CANCELADA" && !isAssinado;
      const isReprovado = (l.status === "RECUSADA" || l.status === "VENCIDA") && !isAssinado && !isAprovado;
      if (estadoLead === "ABERTO" && (isFechado || isCancelado || isReprovado)) return false;
      if (estadoLead === "FECHADO" && !isFechado) return false;
      if (estadoLead === "REPROVADO" && !isReprovado) return false;
      if (estadoLead === "CANCELADO" && !isCancelado) return false;
      if (filtroStatus !== "TODOS" && !l.propostas.some((p) => p.status === filtroStatus)) return false;

      if (filtroConsultor !== "TODOS" && !l.propostas.some((p) => (p.consultor || "") === filtroConsultor)) return false;
      if (filtroCidade !== "TODOS" && !l.propostas.some((p) => (p.cidade || "") === filtroCidade)) return false;

      if (filtroPeriodo !== "TODOS") {
        const ok = l.propostas.some((p) => periodoMatches(p.criadoEm));
        if (!ok) return false;
      }

      if (vMin != null || vMax != null) {
        const ok = l.propostas.some((p) => {
          const v = calcPrecificacao(p).valorFinal || 0;
          if (vMin != null && v < vMin) return false;
          if (vMax != null && v > vMax) return false;
          return true;
        });
        if (!ok) return false;
      }

      if (kMin != null || kMax != null) {
        const ok = l.propostas.some((p) => {
          const k = (p as any).potenciaKwp ?? (p as any).potencia ?? 0;
          if (kMin != null && k < kMin) return false;
          if (kMax != null && k > kMax) return false;
          return true;
        });
        if (!ok) return false;
      }

      if (semMovDias > 0) {
        const ultima = l.propostas
          .map((p) => p.atualizadoEm || p.criadoEm)
          .filter(Boolean)
          .sort()
          .pop();
        if (!ultima) return false;
        const dias = (Date.now() - new Date(ultima).getTime()) / 86400000;
        if (dias < semMovDias) return false;
      }

      if (!q) return true;
      return (
        l.clienteNome.toLowerCase().includes(q) ||
        (l.consultor || "").toLowerCase().includes(q) ||
        l.propostas.some((p) => (p.numero || "").toLowerCase().includes(q))
      );
    });
  }, [leadsAll, filtro, filtroStatus, estadoLead, filtroPeriodo, filtroConsultor, filtroCidade, filtroValorMin, filtroValorMax, filtroKwpMin, filtroKwpMax, filtroSemMovimento]);

  // Expõe propostas filtradas para a barra Enterprise (Exportar CSV usa isso).
  useEffect(() => {
    const visiveis: PropostaFV[] = [];
    leadsFiltrados.forEach((l) => l.propostas.forEach((p) => visiveis.push(p)));
    (window as any).__propostasVisiveis = visiveis;
    return () => { try { delete (window as any).__propostasVisiveis; } catch { /* noop */ } };
  }, [leadsFiltrados]);


  const totais = useMemo(() => {
    const total = propostas.length;
    const aprovadas = propostas.filter((p) => p.status === "APROVADA").length;
    const enviadas = propostas.filter((p) => p.status === "ENVIADA").length;
    const valorTotalAprovado = propostas
      .filter((p) => p.status === "APROVADA")
      .reduce((s, p) => s + (calcPrecificacao(p).valorFinal || 0), 0);
    return { total, aprovadas, enviadas, valorTotalAprovado, leads: leadsAll.length };
  }, [propostas, leadsAll]);

  // Reabrir lead atualizado quando propostas mudam (após gerar nova etc.)
  // IMPORTANTE: precisa ficar ANTES de qualquer early return para não violar a
  // ordem dos hooks (React quebra com "Rendered fewer hooks than expected").
  useEffect(() => {
    if (!leadAberto) return;
    const atual = leadsAll.find((l) => l.key === leadAberto.key);
    if (atual && atual !== leadAberto) setLeadAberto(atual);
    if (!atual) setLeadAberto(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leadsAll]);

  if (!propostas.length) {
    return (
      <Card className="p-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary" />
        <h3 className="text-lg font-semibold">Nenhuma proposta criada ainda</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Crie sua primeira proposta fotovoltaica em poucos minutos.
        </p>
        <Button onClick={() => onNova()} className="mt-4 gap-2">
          <Plus className="h-4 w-4" /> Criar primeira proposta
        </Button>
      </Card>
    );
  }



  return (
    <div className="space-y-4">

      <Card className="flex flex-wrap items-center gap-2 p-2">
        <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-0.5">
          <Button
            size="sm"
            variant={estadoLead === "ABERTO" ? "default" : "ghost"}
            className="h-7 px-3 text-xs"
            onClick={() => setEstadoLead("ABERTO")}
            title="Leads em negociação (sem aprovação, sem contrato assinado e não cancelados)"
          >
            Aberto
            <span className="ml-1.5 rounded bg-background/70 px-1 text-[10px] tabular-nums">
              {leadsAll.filter((l) => l.fase !== "ASSINADO" && l.status !== "APROVADA" && l.status !== "CANCELADA").length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={estadoLead === "FECHADO" ? "default" : "ghost"}
            className="h-7 px-3 text-xs"
            onClick={() => setEstadoLead("FECHADO")}
            title="Leads fechados (proposta aprovada ou contrato assinado)"
          >
            Fechado
            <span className="ml-1.5 rounded bg-background/70 px-1 text-[10px] tabular-nums">
              {leadsAll.filter((l) => l.fase === "ASSINADO" || l.status === "APROVADA").length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={estadoLead === "REPROVADO" ? "default" : "ghost"}
            className="h-7 px-3 text-xs"
            onClick={() => setEstadoLead("REPROVADO")}
            title="Leads com a última proposta reprovada (recusada/vencida)"
          >
            Reprovado
            <span className="ml-1.5 rounded bg-background/70 px-1 text-[10px] tabular-nums">
              {leadsAll.filter((l) => (l.status === "RECUSADA" || l.status === "VENCIDA") && l.fase !== "ASSINADO").length}
            </span>
          </Button>
          <Button
            size="sm"
            variant={estadoLead === "CANCELADO" ? "default" : "ghost"}
            className="h-7 px-3 text-xs"
            onClick={() => setEstadoLead("CANCELADO")}
            title="Leads com a última proposta cancelada"
          >
            Cancelado
            <span className="ml-1.5 rounded bg-background/70 px-1 text-[10px] tabular-nums">
              {leadsAll.filter((l) => l.status === "CANCELADA" && l.fase !== "ASSINADO").length}
            </span>
          </Button>
        </div>
        <div className="relative min-w-[220px] max-w-md flex-1">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            data-propostas-search
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="FILTRAR POR CLIENTE, CONSULTOR OU Nº…"
            className="h-8 pl-7"
          />
        </div>
        {(filtro) && (
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => { setFiltro(""); setFiltroStatus("TODOS"); }}>
            <FilterX className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={view === "tabela" ? "default" : "outline"}
              onClick={() => setView("tabela")}
              className="gap-1"
            >
              <TableIcon className="h-4 w-4" /> Tabela
            </Button>
            <Button
              size="sm"
              variant={view === "kanban" ? "default" : "outline"}
              onClick={() => setView("kanban")}
              className="gap-1"
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </Button>
          </div>
        </div>
      </Card>


      {view === "tabela"
        ? <TabelaView leads={leadsFiltrados} onAbrirLead={setLeadAberto} onNovaPreset={onNova} mgrOpen={colsTabelaOpen} setMgrOpen={setColsTabelaOpen} cols={cols} assign={assign} assignAt={assignAt} onAprovar={setAprovandoLista} onSelecionarUltima={onSelecionarUltima} />
        : <KanbanView leads={leadsFiltrados} onAbrirLead={setLeadAberto} onNovaPreset={onNova} cols={cols} setCols={setCols} assign={assign} setAssign={setAssign} onAprovar={setAprovandoLista} />}

      <ColunasManager open={colsOpen} onOpenChange={setColsOpen} cols={cols} setCols={setCols} />

      <LeadDetail
        lead={leadAberto}
        onClose={() => setLeadAberto(null)}
        onVisualizar={(id) => { onVisualizar(id); setLeadAberto(null); }}
        onNova={(preset) => { onNova(preset); setLeadAberto(null); }}
        onEditar={(p) => onEditar(p)}
      />

      <AprovarPropostaDialog
        proposta={aprovandoLista}
        open={!!aprovandoLista}
        onOpenChange={(o) => { if (!o) setAprovandoLista(null); }}
        onAprovado={() => setAprovandoLista(null)}
      />

      <Dialog open={filtrosDialogOpen} onOpenChange={setFiltrosDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros de propostas</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Filtros rápidos */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Filtros rápidos</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["TODOS","Todos"],
                  ["RASCUNHO","Em aberto"],
                  ["ENVIADA","Enviadas"],
                  ["APROVADA","Aprovadas"],
                  ["RECUSADA","Reprovadas"],
                  ["CANCELADA","Canceladas"],
                  ["EXPIRADA","Expiradas"],
                  ["SUBSTITUIDA","Substituídas"],
                  ["VENCIDA","Vencidas (legado)"],
                ] as const).map(([k,lab]) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={filtroStatus === k ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setFiltroStatus(k as any)}
                  >
                    {lab}
                  </Button>
                ))}
              </div>
            </div>

            {/* 2. Período */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Período (data de criação)</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["TODOS","Todos"],["HOJE","Hoje"],["ONTEM","Ontem"],
                  ["7D","7 dias"],["15D","15 dias"],["30D","30 dias"],
                  ["MES_ATUAL","Este mês"],["MES_PASSADO","Mês passado"],["ANO","Este ano"],
                ] as const).map(([k,lab]) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={filtroPeriodo === k ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setFiltroPeriodo(k as any)}
                  >
                    {lab}
                  </Button>
                ))}
              </div>
            </div>

            {/* 3. Situação do lead + Busca */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Situação do lead</Label>
                <div className="flex gap-1">
                  {(["ABERTO","FECHADO","CANCELADO"] as const).map((e) => (
                    <Button
                      key={e}
                      type="button"
                      size="sm"
                      variant={estadoLead === e ? "default" : "outline"}
                      className="h-8 flex-1 text-xs"
                      onClick={() => setEstadoLead(e)}
                    >
                      {e === "ABERTO" ? "Aberto" : e === "FECHADO" ? "Fechado" : "Cancelado"}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Buscar (cliente / consultor / nº)</Label>
                <Input
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  placeholder="Ex.: Renan, Patrícia, P-2026…"
                  className="h-8"
                />
              </div>
            </div>

            {/* 4. Consultor + Cidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Consultor / Vendedor</Label>
                <select
                  value={filtroConsultor}
                  onChange={(e) => setFiltroConsultor(e.target.value)}
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                >
                  <option value="TODOS">Todos os consultores</option>
                  {consultoresOpts.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cidade</Label>
                <select
                  value={filtroCidade}
                  onChange={(e) => setFiltroCidade(e.target.value)}
                  className="h-8 w-full rounded-md border bg-background px-2 text-xs"
                >
                  <option value="TODOS">Todas as cidades</option>
                  {cidadesOpts.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* 5. Faixa de valor */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faixa de valor (R$)</Label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {([
                  ["","",""],
                  ["0","10000","Até 10k"],
                  ["10000","20000","10–20k"],
                  ["20000","50000","20–50k"],
                  ["50000","100000","50–100k"],
                  ["100000","200000","100–200k"],
                  ["200000","500000","200–500k"],
                  ["500000","","Acima 500k"],
                ] as const).map(([mn,mx,lab],i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => { setFiltroValorMin(mn); setFiltroValorMax(mx); }}
                  >
                    {lab || "Limpar"}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={filtroValorMin}
                  onChange={(e) => setFiltroValorMin(e.target.value)}
                  placeholder="Mín."
                  className="h-8"
                />
                <Input
                  value={filtroValorMax}
                  onChange={(e) => setFiltroValorMax(e.target.value)}
                  placeholder="Máx."
                  className="h-8"
                />
              </div>
            </div>

            {/* 6. Faixa de potência */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Faixa de potência (kWp)</Label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {([
                  ["","",""],
                  ["0","3","Até 3"],
                  ["3","5","3–5"],
                  ["5","10","5–10"],
                  ["10","20","10–20"],
                  ["20","50","20–50"],
                  ["50","100","50–100"],
                  ["100","","Acima 100"],
                ] as const).map(([mn,mx,lab],i) => (
                  <Button
                    key={i}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => { setFiltroKwpMin(mn); setFiltroKwpMax(mx); }}
                  >
                    {lab || "Limpar"}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={filtroKwpMin}
                  onChange={(e) => setFiltroKwpMin(e.target.value)}
                  placeholder="Mín."
                  className="h-8"
                />
                <Input
                  value={filtroKwpMax}
                  onChange={(e) => setFiltroKwpMax(e.target.value)}
                  placeholder="Máx."
                  className="h-8"
                />
              </div>
            </div>

            {/* 7. Sem movimento */}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Propostas sem movimento há</Label>
              <div className="flex flex-wrap gap-1.5">
                {([
                  ["0","Indiferente"],["7","7 dias"],["15","15 dias"],
                  ["30","30 dias"],["60","60 dias"],["90","90 dias"],
                ] as const).map(([k,lab]) => (
                  <Button
                    key={k}
                    type="button"
                    size="sm"
                    variant={filtroSemMovimento === k ? "default" : "outline"}
                    className="h-7 text-xs"
                    onClick={() => setFiltroSemMovimento(k as any)}
                  >
                    {lab}
                  </Button>
                ))}
              </div>
            </div>

            <div className="rounded-md border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
              {leadsFiltrados.length} de {leadsAll.length} lead(s) visível(is) · cards/KPIs e tabela reagem ao filtro.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button" variant="ghost" size="sm"
              onClick={() => {
                setFiltro(""); setFiltroStatus("TODOS"); setEstadoLead("ABERTO");
                setFiltroPeriodo("TODOS"); setFiltroConsultor("TODOS"); setFiltroCidade("TODOS");
                setFiltroValorMin(""); setFiltroValorMax("");
                setFiltroKwpMin(""); setFiltroKwpMax("");
                setFiltroSemMovimento("0");
              }}
            >
              Limpar filtros
            </Button>
            <Button type="button" size="sm" onClick={() => setFiltrosDialogOpen(false)}>
              Aplicar
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

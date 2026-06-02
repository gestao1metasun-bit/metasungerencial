/**
 * E.OS.4 — Modelos de Formulário (lista + construtor visual).
 *
 * Fluxo oficial:
 *   • salvar  → rpc_os_formulario_template_salvar (cria/edita só RASCUNHO)
 *   • clonar  → rpc_os_modelo_clonar (nova versão RASCUNHO a partir de qualquer)
 *   • publicar→ rpc_os_modelo_publicar (RASCUNHO → PUBLICADO)
 *   • aprovar → rpc_os_modelo_aprovar  (PUBLICADO → APROVADO, se requer_aprovacao)
 *
 * UPDATE direto em modelos PUBLICADO/APROVADO é bloqueado pelo trigger
 * `tg_os_fdef_bloqueia_edicao` (E.OS.4 DB). Edição só em rascunho.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Plus, Copy, Upload, ShieldCheck, FilePlus2, Pencil, Trash2, Eye,
} from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EnterpriseRecordToolbar } from "@/components/app/enterprise";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  useOsFormulariosTemplates, useSalvarFormularioTemplate,
  useClonarFormularioTemplate, usePublicarFormularioTemplate,
  useAprovarFormularioTemplate,
  type OsFormularioTemplateRow,
} from "@/lib/repositories/os-repo";

export const Route = createFileRoute("/engenharia/gestao-servicos/modelos")({
  component: ModelosPage,
});

const TIPOS = [
  { v: "VISTORIA",        l: "Vistoria" },
  { v: "INSTALACAO",      l: "Instalação" },
  { v: "MANUTENCAO",      l: "Manutenção" },
  { v: "POS_VENDA",       l: "Pós-venda" },
  { v: "CHECKLIST_ADMIN", l: "Checklist administrativo" },
  { v: "CHECKLIST_FIN",   l: "Checklist financeiro" },
  { v: "LIVRE",           l: "Livre" },
];

const TIPOS_CAMPO = [
  { v: "texto",         l: "Texto curto" },
  { v: "textarea",      l: "Texto longo" },
  { v: "numero",        l: "Número" },
  { v: "moeda",         l: "Moeda" },
  { v: "data",          l: "Data" },
  { v: "hora",          l: "Hora" },
  { v: "selecao",       l: "Seleção (única)" },
  { v: "multipla",      l: "Múltipla seleção" },
  { v: "checklist",     l: "Checklist" },
  { v: "foto",          l: "Foto" },
  { v: "anexo",         l: "Anexo" },
  { v: "assinatura",    l: "Assinatura" },
  { v: "geolocalizacao",l: "Geolocalização" },
];

export interface CampoModelo {
  id: string;
  tipo: string;
  titulo: string;
  descricao?: string;
  obrigatorio?: boolean;
  ajuda?: string;
  ordem?: number;
  opcoes?: string[];
  validacao?: string;
}

function statusBadge(s?: string) {
  const map: Record<string, { label: string; cls: string }> = {
    RASCUNHO:  { label: "Rascunho",  cls: "bg-muted text-foreground" },
    PUBLICADO: { label: "Publicado", cls: "bg-emerald-100 text-emerald-700" },
    APROVADO:  { label: "Aprovado",  cls: "bg-blue-100 text-blue-700" },
    ARQUIVADO: { label: "Arquivado", cls: "bg-zinc-200 text-zinc-700" },
  };
  const k = map[s ?? "RASCUNHO"] ?? map.RASCUNHO;
  return <Badge variant="outline" className={k.cls}>{k.label}</Badge>;
}

function ModelosPage() {
  const { data: modelos = [], isLoading, refetch } = useOsFormulariosTemplates();
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("__all");
  const [statusFiltro, setStatusFiltro] = useState<string>("__all");
  const [editor, setEditor] = useState<{ open: boolean; modelo?: OsFormularioTemplateRow | null }>({ open: false });
  const [previewModelo, setPreviewModelo] = useState<OsFormularioTemplateRow | null>(null);

  const clonar   = useClonarFormularioTemplate();
  const publicar = usePublicarFormularioTemplate();
  const aprovar  = useAprovarFormularioTemplate();

  const lista = useMemo(() => {
    return modelos.filter((m) => {
      if (busca && !m.nome.toLowerCase().includes(busca.toLowerCase())) return false;
      if (tipoFiltro !== "__all" && m.tipo !== tipoFiltro) return false;
      if (statusFiltro !== "__all" && (m.status_modelo ?? "RASCUNHO") !== statusFiltro) return false;
      return true;
    });
  }, [modelos, busca, tipoFiltro, statusFiltro]);

  async function handlePublicar(m: OsFormularioTemplateRow) {
    try {
      await publicar.mutateAsync({ modelo_id: m.id, row_version: m.row_version ?? 1 });
      toast.success(`Modelo "${m.nome} v${m.versao}" publicado.`);
    } catch (e) { toast.error("Falha ao publicar: " + (e as Error).message); }
  }
  async function handleAprovar(m: OsFormularioTemplateRow) {
    try {
      await aprovar.mutateAsync({ modelo_id: m.id, row_version: m.row_version ?? 1 });
      toast.success(`Modelo "${m.nome} v${m.versao}" aprovado.`);
    } catch (e) { toast.error("Falha ao aprovar: " + (e as Error).message); }
  }
  async function handleClonar(m: OsFormularioTemplateRow) {
    try {
      await clonar.mutateAsync({ modelo_id: m.id });
      toast.success(`Nova versão criada a partir de "${m.nome} v${m.versao}".`);
    } catch (e) { toast.error("Falha ao clonar: " + (e as Error).message); }
  }

  return (
    <div className="space-y-2">
      <PageHeader
        title="Modelos de Formulário"
        subtitle="Construtor visual com versionamento, publicação e aprovação"
        breadcrumbs={[
          { label: "Engenharia", to: "/engenharia" },
          { label: "Gestão de Serviços", to: "/engenharia/gestao-servicos" },
          { label: "Modelos" },
        ]}
        leftSlot={
          <Link to="/engenharia/gestao-servicos">
            <Button variant="ghost" size="sm" className="h-8"><ArrowLeft className="h-3.5 w-3.5 mr-1" />Voltar</Button>
          </Link>
        }
      />

      <EnterpriseRecordToolbar
        entityType="engenharia"
        availableActions={["novo", "atualizar"]}
        onAction={(a) => {
          if (a === "novo") setEditor({ open: true, modelo: null });
          if (a === "atualizar") refetch();
        }}
      />

      <Card className="p-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
          <Input placeholder="Buscar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} className="h-8 text-[12.5px]" />
          <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
            <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os tipos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={statusFiltro} onValueChange={setStatusFiltro}>
            <SelectTrigger className="h-8 text-[12.5px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Todos os status</SelectItem>
              <SelectItem value="RASCUNHO">Rascunho</SelectItem>
              <SelectItem value="PUBLICADO">Publicado</SelectItem>
              <SelectItem value="APROVADO">Aprovado</SelectItem>
              <SelectItem value="ARQUIVADO">Arquivado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="h-8">
              <TableHead className="text-[11.5px]">Nome</TableHead>
              <TableHead className="text-[11.5px]">Tipo</TableHead>
              <TableHead className="text-[11.5px]">Versão</TableHead>
              <TableHead className="text-[11.5px]">Status</TableHead>
              <TableHead className="text-[11.5px]">Campos</TableHead>
              <TableHead className="text-[11.5px]">Publicado em</TableHead>
              <TableHead className="text-[11.5px]">Aprovado em</TableHead>
              <TableHead className="text-[11.5px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-[12px] text-muted-foreground py-6">Carregando…</TableCell></TableRow>
            ) : lista.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-[12px] text-muted-foreground py-6">Nenhum modelo encontrado.</TableCell></TableRow>
            ) : lista.map((m) => {
              const status = m.status_modelo ?? "RASCUNHO";
              const camposCount = Array.isArray(m.campos) ? (m.campos as unknown[]).length : 0;
              const isRascunho = status === "RASCUNHO";
              const isPublicado = status === "PUBLICADO";
              return (
                <TableRow key={m.id} className="h-8">
                  <TableCell className="text-[12.5px] font-medium">{m.nome}</TableCell>
                  <TableCell className="text-[12px]">{TIPOS.find(t => t.v === m.tipo)?.l ?? m.tipo}</TableCell>
                  <TableCell className="text-[12px] font-mono">v{m.versao}</TableCell>
                  <TableCell>{statusBadge(status)}</TableCell>
                  <TableCell className="text-[12px]">{camposCount}</TableCell>
                  <TableCell className="text-[11.5px] text-muted-foreground">{m.publicado_em ? new Date(m.publicado_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-[11.5px] text-muted-foreground">{m.aprovado_em ? new Date(m.aprovado_em).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Visualizar" onClick={() => setPreviewModelo(m)}>
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title={isRascunho ? "Editar" : "Somente rascunhos podem ser editados"} disabled={!isRascunho} onClick={() => setEditor({ open: true, modelo: m })}>
                        <Pencil className="h-3.5 w-3.5 text-amber-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Clonar (nova versão)" onClick={() => handleClonar(m)}>
                        <Copy className="h-3.5 w-3.5 text-indigo-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Publicar" disabled={!isRascunho} onClick={() => handlePublicar(m)}>
                        <Upload className="h-3.5 w-3.5 text-emerald-600" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Aprovar" disabled={!isPublicado || !m.requer_aprovacao} onClick={() => handleAprovar(m)}>
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {editor.open && (
        <ModeloEditorDialog
          modelo={editor.modelo ?? null}
          onClose={() => setEditor({ open: false })}
        />
      )}

      <Dialog open={!!previewModelo} onOpenChange={(o) => !o && setPreviewModelo(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewModelo?.nome} <span className="text-xs text-muted-foreground">v{previewModelo?.versao}</span></DialogTitle>
            <DialogDescription>Pré-visualização do modelo (somente leitura).</DialogDescription>
          </DialogHeader>
          <PreviewCampos campos={(previewModelo?.campos ?? []) as CampoModelo[]} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Construtor visual
// ─────────────────────────────────────────────────────────────────
function ModeloEditorDialog({ modelo, onClose }: { modelo: OsFormularioTemplateRow | null; onClose: () => void }) {
  const isNovo = !modelo;
  const [nome, setNome] = useState(modelo?.nome ?? "");
  const [tipo, setTipo] = useState<string>(modelo?.tipo ?? "VISTORIA");
  const [descricao, setDescricao] = useState(modelo?.descricao ?? "");
  const [obrigatorio, setObrigatorio] = useState<boolean>(!!modelo?.obrigatorio);
  const [campos, setCampos] = useState<CampoModelo[]>(() => {
    const c = (modelo?.campos ?? []) as CampoModelo[];
    return Array.isArray(c) ? c : [];
  });
  const salvar = useSalvarFormularioTemplate();

  function novoCampo() {
    setCampos((prev) => [...prev, {
      id: crypto.randomUUID(), tipo: "texto", titulo: "Novo campo",
      obrigatorio: false, ordem: prev.length,
    }]);
  }
  function atualizarCampo(idx: number, patch: Partial<CampoModelo>) {
    setCampos((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
  }
  function removerCampo(idx: number) {
    setCampos((prev) => prev.filter((_, i) => i !== idx).map((c, i) => ({ ...c, ordem: i })));
  }
  function mover(idx: number, delta: number) {
    setCampos((prev) => {
      const j = idx + delta;
      if (j < 0 || j >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[j]] = [arr[j], arr[idx]];
      return arr.map((c, i) => ({ ...c, ordem: i }));
    });
  }

  async function handleSalvar() {
    if (!nome.trim()) { toast.error("Informe o nome do modelo."); return; }
    if (campos.length === 0) { toast.error("Adicione ao menos um campo."); return; }
    try {
      await salvar.mutateAsync({
        id: modelo?.id ?? null,
        nome: nome.trim(),
        tipo,
        descricao: descricao.trim() || undefined,
        campos: campos.map((c, i) => ({ ...c, ordem: i })),
        obrigatorio,
        ativo: true,
      });
      toast.success(isNovo ? "Modelo criado em rascunho." : "Rascunho atualizado.");
      onClose();
    } catch (e) {
      toast.error("Falha ao salvar: " + (e as Error).message);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FilePlus2 className="h-4 w-4 text-blue-600" />
            {isNovo ? "Novo modelo de formulário" : `Editar rascunho — ${modelo?.nome} v${modelo?.versao}`}
          </DialogTitle>
          <DialogDescription>
            Somente rascunhos podem ser editados. Para alterar um modelo publicado/aprovado, clone uma nova versão.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">Nome*</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 text-[12.5px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">Tipo*</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label className="text-[12px]">Descrição</Label>
            <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} className="text-[12.5px] min-h-[60px]" />
          </div>
          <div className="md:col-span-2 flex items-center gap-2">
            <Switch checked={obrigatorio} onCheckedChange={setObrigatorio} />
            <Label className="text-[12px]">Resposta obrigatória ao executar a tarefa</Label>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] font-semibold">Campos ({campos.length})</h3>
            <Button size="sm" variant="outline" className="h-7" onClick={novoCampo}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Novo campo
            </Button>
          </div>

          <div className="space-y-2">
            {campos.map((c, idx) => (
              <Card key={c.id} className="p-2">
                <div className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-12 md:col-span-4">
                    <Label className="text-[11px] text-muted-foreground">Título*</Label>
                    <Input value={c.titulo} onChange={(e) => atualizarCampo(idx, { titulo: e.target.value })} className="h-7 text-[12px]" />
                  </div>
                  <div className="col-span-6 md:col-span-3">
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <Select value={c.tipo} onValueChange={(v) => atualizarCampo(idx, { tipo: v })}>
                      <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TIPOS_CAMPO.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 md:col-span-2 flex items-end gap-2 pb-1">
                    <Switch checked={!!c.obrigatorio} onCheckedChange={(v) => atualizarCampo(idx, { obrigatorio: v })} />
                    <span className="text-[11px]">Obrigatório</span>
                  </div>
                  <div className="col-span-12 md:col-span-3 flex justify-end gap-1 pt-3">
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => mover(idx, -1)} title="Subir">↑</Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => mover(idx, +1)} title="Descer">↓</Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => removerCampo(idx)} title="Excluir">
                      <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                    <Input value={c.descricao ?? ""} onChange={(e) => atualizarCampo(idx, { descricao: e.target.value })} className="h-7 text-[12px]" />
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <Label className="text-[11px] text-muted-foreground">Ajuda / placeholder</Label>
                    <Input value={c.ajuda ?? ""} onChange={(e) => atualizarCampo(idx, { ajuda: e.target.value })} className="h-7 text-[12px]" />
                  </div>

                  {(c.tipo === "selecao" || c.tipo === "multipla" || c.tipo === "checklist") && (
                    <div className="col-span-12">
                      <Label className="text-[11px] text-muted-foreground">Opções (uma por linha)</Label>
                      <Textarea
                        value={(c.opcoes ?? []).join("\n")}
                        onChange={(e) => atualizarCampo(idx, { opcoes: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                        className="text-[12px] min-h-[50px]"
                      />
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {campos.length === 0 && (
              <p className="text-[12px] text-muted-foreground text-center py-4">Nenhum campo. Clique em "Novo campo".</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="h-8">Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvar.isPending} className="h-8 bg-emerald-600 hover:bg-emerald-700">
            {salvar.isPending ? "Salvando…" : "Salvar rascunho"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewCampos({ campos }: { campos: CampoModelo[] }) {
  if (!campos.length) return <p className="text-[12px] text-muted-foreground">Modelo sem campos.</p>;
  return (
    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
      {campos.map((c, i) => (
        <div key={c.id ?? i} className="border rounded p-2">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-medium">{c.titulo}{c.obrigatorio && <span className="text-red-600">*</span>}</span>
            <Badge variant="outline" className="text-[10.5px]">{TIPOS_CAMPO.find(t => t.v === c.tipo)?.l ?? c.tipo}</Badge>
          </div>
          {c.descricao && <p className="text-[11.5px] text-muted-foreground">{c.descricao}</p>}
          {c.opcoes && c.opcoes.length > 0 && (
            <ul className="text-[11.5px] text-muted-foreground list-disc pl-4 mt-1">
              {c.opcoes.map((o, j) => <li key={j}>{o}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

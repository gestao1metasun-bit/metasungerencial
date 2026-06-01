// D19 Camada Contábil/Fiscal Preparatória — Rota /configuracoes/contabil
// 7 abas administráveis sobre as estruturas D18 já entregues.
// Reaproveita 100% schema. Sem migration, sem RLS nova, sem RPC.
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpen, Layers, Building, Activity, Package, FileDown, ScrollText,
  Plus, Pencil, Download, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { EnterpriseRecordToolbar, RowActions } from "@/components/app/enterprise";
import { useTabFromHash } from "@/lib/route-tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  usePlanoContas, useSavePlanoConta, type PlanoContaRow,
  useCentrosCusto, useSaveCentroCusto, type CentroCustoRow,
  useMapeamentos, useSaveMapeamento, EVENTOS_CANONICOS, type MapeamentoRow,
  useEventosCatalogo,
  useProdutosFiscais, useSaveProdutoFiscal, type ProdutoFiscalRow,
  useExportadores,
  useLotesIntegracao, useExportacoesGeradas,
  toCSV, downloadCSV,
} from "@/lib/repositories/contabil-fiscal-repo";
import { useNaturezasFin, useCentrosResultado } from "@/lib/repositories/cadastros-repo";

export const Route = createFileRoute("/configuracoes/contabil")({
  head: () => ({ meta: [{ title: "Configurações Contábeis/Fiscais — Meta Sun" }] }),
  component: ContabilFiscalPage,
});

const TABS = [
  { v: "plano",       label: "Plano de Contas",      icon: BookOpen },
  { v: "mapeamentos", label: "Mapeamento Naturezas", icon: Layers },
  { v: "centros",     label: "Centros de Custo",     icon: Building },
  { v: "eventos",     label: "Eventos Contábeis",    icon: Activity },
  { v: "produtos",    label: "Fiscal de Produtos",   icon: Package },
  { v: "exportacoes", label: "Exportações",          icon: FileDown },
  { v: "logs",        label: "Logs de Integração",   icon: ScrollText },
] as const;

function ContabilFiscalPage() {
  const [tab, setTab] = useTabFromHash("/configuracoes/contabil");
  return (
    <>
      <PageHeader
        title="Configurações Contábeis/Fiscais"
        subtitle="Camada preparatória para integração com sistema contábil/fiscal externo. Não substitui apuração nem emite obrigações acessórias."
      />
      <Card className="mb-4 p-3 text-[12px] flex items-start gap-2 border-amber-200 bg-amber-50/40">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
        <div>
          <b>Camada preparatória.</b> Os mapeamentos aqui não bloqueiam operação atual.
          Onde faltar vínculo contábil, a operação continua normal e o item fica marcado como
          “pendente de mapeamento” para futura integração externa (Domínio / Alterdata / Sankhya / TOTVS).
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/40">
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="text-[12px]">
              <t.icon className="mr-1.5 h-3.5 w-3.5" />{t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="plano" className="mt-3"><PlanoContasTab /></TabsContent>
        <TabsContent value="mapeamentos" className="mt-3"><MapeamentosTab /></TabsContent>
        <TabsContent value="centros" className="mt-3"><CentrosCustoTab /></TabsContent>
        <TabsContent value="eventos" className="mt-3"><EventosTab /></TabsContent>
        <TabsContent value="produtos" className="mt-3"><ProdutosFiscaisTab /></TabsContent>
        <TabsContent value="exportacoes" className="mt-3"><ExportacoesTab /></TabsContent>
        <TabsContent value="logs" className="mt-3"><LogsTab /></TabsContent>
      </Tabs>
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// PLANO DE CONTAS
// ──────────────────────────────────────────────────────────────
function PlanoContasTab() {
  const { data = [], isLoading } = usePlanoContas();
  const save = useSavePlanoConta();
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Partial<PlanoContaRow> | null>(null);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? data.filter((r) => r.codigo.toLowerCase().includes(q) || r.nome.toLowerCase().includes(q)) : data;
  }, [data, busca]);

  return (
    <Card className="p-3">
      <EnterpriseRecordToolbar
        entityType="compras"
        selectedIds={[]}
        availableActions={["novo"]}
        onAction={(a) => { if (a === "novo") setEditing({ codigo: "", nome: "", tipo: "DESPESA", ativo: true }); }}
        search={busca}
        onSearchChange={setBusca}
        searchPlaceholder="Buscar por código ou nome…"
        extraLeft={<span className="text-[12px] font-medium px-2">{`Plano de Contas (${rows.length})`}</span>}
      />
      <div className="mt-3 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="w-[80px] text-center">Nível</TableHead>
              <TableHead className="w-[120px]">Categoria</TableHead>
              <TableHead className="w-[110px]">Integração</TableHead>
              <TableHead className="w-[70px]">Ativo</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={8} className="text-center py-4 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-4 text-muted-foreground">Sem registros.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-[12px]">{r.codigo}</TableCell>
                <TableCell>{r.nome}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.tipo}</Badge></TableCell>
                <TableCell className="text-center">{r.nivel}</TableCell>
                <TableCell className="text-[12px] text-muted-foreground">{r.categoria ?? "—"}</TableCell>
                <TableCell><StatusIntegracaoBadge s={r.status_integracao} /></TableCell>
                <TableCell>{r.ativo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">SIM</Badge> : <Badge variant="secondary" className="text-[10px]">NÃO</Badge>}</TableCell>
                <TableCell><RowActions rowId={r.id} actions={[{ kind: "editar" }]} onAction={() => setEditing(r)} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar conta contábil" : "Nova conta contábil"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={editing.codigo ?? ""} onChange={(e) => setEditing({ ...editing, codigo: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={editing.tipo ?? "DESPESA"} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["ATIVO","PASSIVO","RECEITA","DESPESA","RESULTADO"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Nome</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div><Label>Nível</Label><Input type="number" min={1} max={5} value={editing.nivel ?? 1} onChange={(e) => setEditing({ ...editing, nivel: Number(e.target.value) })} /></div>
              <div><Label>Categoria</Label><Input value={editing.categoria ?? ""} onChange={(e) => setEditing({ ...editing, categoria: e.target.value })} /></div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={editing.ativo ?? true} onCheckedChange={(c) => setEditing({ ...editing, ativo: c })} /><Label>Ativo</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button
              disabled={!editing?.codigo || !editing?.nome || !editing?.tipo || save.isPending}
              onClick={() => save.mutate(editing as any, {
                onSuccess: () => { toast.success("Conta salva"); setEditing(null); },
                onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
              })}
            >Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// MAPEAMENTO DE NATUREZAS
// ──────────────────────────────────────────────────────────────
function MapeamentosTab() {
  const { data: rows = [], isLoading } = useMapeamentos();
  const { data: naturezas = [] } = useNaturezasFin();
  const { data: planos = [] } = usePlanoContas();
  const { data: crs = [] } = useCentrosResultado();
  const save = useSaveMapeamento();
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Partial<MapeamentoRow> | null>(null);

  const natMap = useMemo(() => new Map(naturezas.map((n) => [n.id, n])), [naturezas]);
  const pcMap = useMemo(() => new Map(planos.map((p) => [p.id, p])), [planos]);
  const crMap = useMemo(() => new Map(crs.map((c) => [c.id, c])), [crs]);

  const filtered = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? rows.filter((r) => r.evento_canonico.toLowerCase().includes(q) || (natMap.get(r.natureza_id ?? "")?.nome ?? "").toLowerCase().includes(q)) : rows;
  }, [rows, busca, natMap]);

  return (
    <Card className="p-3">
      <EnterpriseRecordToolbar
        entityType="parametro"
        title={`Mapeamentos Contábeis (${filtered.length})`}
        primaryAction={{ label: "Novo", icon: Plus, onClick: () => setEditing({ evento_canonico: "VENDA", ativo: true }) }}
        search={{ value: busca, onChange: setBusca, placeholder: "Buscar por evento ou natureza…" }}
      />
      <div className="mt-3 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Natureza Financeira</TableHead>
              <TableHead className="w-[160px]">Evento Canônico</TableHead>
              <TableHead>Plano de Contas</TableHead>
              <TableHead className="w-[180px]">Centro de Resultado</TableHead>
              <TableHead className="w-[80px]">Ativo</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum mapeamento cadastrado. Use “Novo” para vincular uma natureza a uma conta contábil.</TableCell></TableRow>}
            {filtered.map((r) => {
              const nat = r.natureza_id ? natMap.get(r.natureza_id) : null;
              const pc = r.plano_conta_id ? pcMap.get(r.plano_conta_id) : null;
              const cr = r.centro_resultado_default_id ? crMap.get(r.centro_resultado_default_id) : null;
              return (
                <TableRow key={r.id}>
                  <TableCell className="text-[12px]">{nat ? `${nat.codigo} — ${nat.nome}` : <span className="text-amber-600">pendente</span>}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{r.evento_canonico}</Badge></TableCell>
                  <TableCell className="text-[12px]">{pc ? `${pc.codigo} — ${pc.nome}` : <span className="text-amber-600">pendente</span>}</TableCell>
                  <TableCell className="text-[12px]">{cr ? `${cr.codigo} — ${cr.nome}` : "—"}</TableCell>
                  <TableCell>{r.ativo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">SIM</Badge> : <Badge variant="secondary" className="text-[10px]">NÃO</Badge>}</TableCell>
                  <TableCell><RowActions actions={[{ kind: "editar", onClick: () => setEditing(r) }]} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar mapeamento" : "Novo mapeamento"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Natureza Financeira</Label>
                <Select value={editing.natureza_id ?? ""} onValueChange={(v) => setEditing({ ...editing, natureza_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{naturezas.map((n) => <SelectItem key={n.id} value={n.id}>{n.codigo} — {n.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Evento</Label>
                <Select value={editing.evento_canonico ?? "VENDA"} onValueChange={(v) => setEditing({ ...editing, evento_canonico: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENTOS_CANONICOS.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={editing.ativo ?? true} onCheckedChange={(c) => setEditing({ ...editing, ativo: c })} /><Label>Ativo</Label></div>
              <div className="col-span-2">
                <Label>Plano de Contas</Label>
                <Select value={editing.plano_conta_id ?? ""} onValueChange={(v) => setEditing({ ...editing, plano_conta_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{planos.map((p) => <SelectItem key={p.id} value={p.id}>{p.codigo} — {p.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Centro de Resultado (default)</Label>
                <Select value={editing.centro_resultado_default_id ?? ""} onValueChange={(v) => setEditing({ ...editing, centro_resultado_default_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>{crs.map((c) => <SelectItem key={c.id} value={c.id}>{c.codigo} — {c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.evento_canonico || save.isPending}
              onClick={() => save.mutate(editing as any, {
                onSuccess: () => { toast.success("Mapeamento salvo"); setEditing(null); },
                onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
              })}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// CENTROS DE CUSTO
// ──────────────────────────────────────────────────────────────
function CentrosCustoTab() {
  const { data = [], isLoading } = useCentrosCusto();
  const save = useSaveCentroCusto();
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Partial<CentroCustoRow> | null>(null);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? data.filter((r) => r.codigo.toLowerCase().includes(q) || r.nome.toLowerCase().includes(q)) : data;
  }, [data, busca]);

  return (
    <Card className="p-3">
      <EnterpriseRecordToolbar
        entityType="parametro"
        title={`Centros de Custo (${rows.length})`}
        primaryAction={{ label: "Novo", icon: Plus, onClick: () => setEditing({ codigo: "", nome: "", tipo: "ADMINISTRATIVO", ativo: true }) }}
        search={{ value: busca, onChange: setBusca, placeholder: "Buscar por código ou nome…" }}
      />
      <div className="mt-3 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="w-[160px]">Tipo</TableHead>
              <TableHead className="w-[120px]">Área padrão</TableHead>
              <TableHead className="w-[80px]">Ativo</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Nenhum centro cadastrado.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-[12px]">{r.codigo}</TableCell>
                <TableCell>{r.nome}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.tipo}</Badge></TableCell>
                <TableCell className="text-[12px] text-muted-foreground">{r.area_default ?? "—"}</TableCell>
                <TableCell>{r.ativo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">SIM</Badge> : <Badge variant="secondary" className="text-[10px]">NÃO</Badge>}</TableCell>
                <TableCell><RowActions actions={[{ kind: "editar", onClick: () => setEditing(r) }]} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar centro de custo" : "Novo centro de custo"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Código</Label><Input value={editing.codigo ?? ""} onChange={(e) => setEditing({ ...editing, codigo: e.target.value })} /></div>
              <div>
                <Label>Tipo</Label>
                <Select value={editing.tipo ?? "ADMINISTRATIVO"} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["OBRA","EQUIPE","VENDEDOR","VEICULO","ALMOXARIFADO","ADMINISTRATIVO","GERAL"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2"><Label>Nome</Label><Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
              <div className="col-span-2"><Label>Área padrão</Label><Input value={editing.area_default ?? ""} onChange={(e) => setEditing({ ...editing, area_default: e.target.value })} /></div>
              <div className="col-span-2"><Label>Observações</Label><Textarea rows={2} value={editing.observacoes ?? ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} /></div>
              <div className="col-span-2 flex items-center gap-2"><Switch checked={editing.ativo ?? true} onCheckedChange={(c) => setEditing({ ...editing, ativo: c })} /><Label>Ativo</Label></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={!editing?.codigo || !editing?.nome || save.isPending}
              onClick={() => save.mutate(editing as any, {
                onSuccess: () => { toast.success("Centro salvo"); setEditing(null); },
                onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
              })}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// EVENTOS CONTÁBEIS (catálogo unificado dos 4 módulos)
// ──────────────────────────────────────────────────────────────
function EventosTab() {
  const { data = [], isLoading } = useEventosCatalogo();
  const [busca, setBusca] = useState("");
  const [modulo, setModulo] = useState<string>("TODOS");

  const modulos = useMemo(() => ["TODOS", ...Array.from(new Set(data.map((e) => e.modulo))).sort()], [data]);
  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return data.filter((e) => (modulo === "TODOS" || e.modulo === modulo)
      && (!q || e.codigo.toLowerCase().includes(q) || e.descricao.toLowerCase().includes(q) || e.evento_canonico.toLowerCase().includes(q)));
  }, [data, busca, modulo]);

  return (
    <Card className="p-3">
      <EnterpriseRecordToolbar
        entityType="parametro"
        title={`Eventos Contábeis Canônicos (${rows.length})`}
        search={{ value: busca, onChange: setBusca, placeholder: "Buscar evento…" }}
      />
      <div className="mt-2 mb-3 flex items-center gap-2 text-[12px]">
        <span className="text-muted-foreground">Módulo:</span>
        {modulos.map((m) => (
          <Button key={m} size="sm" variant={modulo === m ? "default" : "outline"}
            className="h-7 text-[11px]" onClick={() => setModulo(m)}>{m}</Button>
        ))}
      </div>
      <div className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Módulo</TableHead>
              <TableHead className="w-[200px]">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="w-[180px]">Evento Canônico</TableHead>
              <TableHead className="w-[80px]">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4 text-muted-foreground">Sem eventos.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={`${r.modulo}-${r.codigo}`}>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.modulo}</Badge></TableCell>
                <TableCell className="font-mono text-[12px]">{r.codigo}</TableCell>
                <TableCell className="text-[12px]">{r.descricao}</TableCell>
                <TableCell><Badge className="bg-indigo-100 text-indigo-800 text-[10px]">{r.evento_canonico}</Badge></TableCell>
                <TableCell>{r.ativo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">SIM</Badge> : <Badge variant="secondary" className="text-[10px]">NÃO</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        Eventos canônicos são gerenciados via seeds do D18 (33 eventos: 10 Comercial + 10 Financeiro + 6 Estoque + 7 Engenharia).
        Edição direta requer permissão admin via banco — esta tela é leitura + auditoria.
      </p>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// FISCAL DE PRODUTOS (NCM, CFOP, CST)
// ──────────────────────────────────────────────────────────────
function ProdutosFiscaisTab() {
  const { data = [], isLoading } = useProdutosFiscais();
  const save = useSaveProdutoFiscal();
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<ProdutoFiscalRow | null>(null);

  const rows = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? data.filter((p) => p.codigo.toLowerCase().includes(q) || p.nome.toLowerCase().includes(q) || (p.ncm ?? "").includes(q)) : data;
  }, [data, busca]);

  const pendentes = data.filter((p) => !p.ncm).length;

  return (
    <Card className="p-3">
      <EnterpriseRecordToolbar
        entityType="parametro"
        title={`Cadastro Fiscal de Produtos (${rows.length})${pendentes ? ` · ${pendentes} pendente(s) de NCM` : ""}`}
        search={{ value: busca, onChange: setBusca, placeholder: "Buscar por código, nome ou NCM…" }}
      />
      <div className="mt-3 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Código</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Unidade</TableHead>
              <TableHead className="w-[100px]">NCM</TableHead>
              <TableHead className="w-[80px]">CFOP</TableHead>
              <TableHead className="w-[80px]">CST</TableHead>
              <TableHead className="w-[80px]">Origem</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && <TableRow><TableCell colSpan={9} className="text-center py-4 text-muted-foreground">Carregando…</TableCell></TableRow>}
            {!isLoading && rows.length === 0 && <TableRow><TableCell colSpan={9} className="text-center py-4 text-muted-foreground">Sem produtos.</TableCell></TableRow>}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-[12px]">{r.codigo}</TableCell>
                <TableCell className="text-[12px]">{r.nome}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.tipo_item}</Badge></TableCell>
                <TableCell className="text-[12px]">{r.unidade}</TableCell>
                <TableCell className={r.ncm ? "text-[12px]" : "text-[12px] text-amber-600"}>{r.ncm ?? "pendente"}</TableCell>
                <TableCell className="text-[12px]">{r.cfop_padrao ?? "—"}</TableCell>
                <TableCell className="text-[12px]">{r.cst_padrao ?? "—"}</TableCell>
                <TableCell className="text-[12px]">{r.origem_fiscal ?? "—"}</TableCell>
                <TableCell><RowActions actions={[{ kind: "editar", onClick: () => setEditing(r) }]} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Mapear fiscal — {editing?.codigo}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div><Label>NCM</Label><Input value={editing.ncm ?? ""} onChange={(e) => setEditing({ ...editing, ncm: e.target.value })} placeholder="8541.40.32" /></div>
              <div><Label>CFOP padrão</Label><Input value={editing.cfop_padrao ?? ""} onChange={(e) => setEditing({ ...editing, cfop_padrao: e.target.value })} placeholder="5102" /></div>
              <div><Label>CST/CSOSN</Label><Input value={editing.cst_padrao ?? ""} onChange={(e) => setEditing({ ...editing, cst_padrao: e.target.value })} placeholder="000" /></div>
              <div><Label>Origem</Label><Input value={editing.origem_fiscal ?? ""} onChange={(e) => setEditing({ ...editing, origem_fiscal: e.target.value })} placeholder="0=Nacional" /></div>
              <div className="col-span-2"><Label>Código de serviço LC 116 (se serviço)</Label><Input value={editing.codigo_servico_lc116 ?? ""} onChange={(e) => setEditing({ ...editing, codigo_servico_lc116: e.target.value })} /></div>
              <div className="col-span-2">
                <Label>Categoria contábil</Label>
                <Select value={editing.categoria_contabil ?? ""} onValueChange={(v) => setEditing({ ...editing, categoria_contabil: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
                  <SelectContent>{["REVENDA","MATERIAL_INSTALACAO","CONSUMO","FERRAMENTA","IMOBILIZADO","SERVICO"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button disabled={save.isPending} onClick={() => editing && save.mutate({
              id: editing.id,
              ncm: editing.ncm || null,
              cfop_padrao: editing.cfop_padrao || null,
              cst_padrao: editing.cst_padrao || null,
              origem_fiscal: editing.origem_fiscal || null,
              codigo_servico_lc116: editing.codigo_servico_lc116 || null,
              categoria_contabil: editing.categoria_contabil || null,
            }, {
              onSuccess: () => { toast.success("Fiscal salvo"); setEditing(null); },
              onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
            })}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// EXPORTAÇÕES (estrutura preparatória + CSV simples client-side)
// ──────────────────────────────────────────────────────────────
async function exportarCSV(tipo: "movimento_financeiro"|"produtos"|"clientes"|"fornecedores"|"centros_custo") {
  try {
    let rows: any[] = [];
    const stamp = new Date().toISOString().slice(0, 10);
    let filename = `${tipo}-${stamp}.csv`;

    if (tipo === "movimento_financeiro") {
      const { data, error } = await supabase
        .from("titulos_financeiros")
        .select("codigo,tipo,status,valor_total,data_vencimento,natureza_id,centro_resultado_id,competencia")
        .order("data_vencimento", { ascending: false }).limit(5000);
      if (error) throw error; rows = data ?? [];
    } else if (tipo === "produtos") {
      const { data, error } = await supabase
        .from("produtos")
        .select("codigo,nome,categoria,tipo_item,unidade,ncm,cfop_padrao,cst_padrao,origem_fiscal,categoria_contabil,ativo")
        .is("deleted_at", null).order("codigo");
      if (error) throw error; rows = data ?? [];
    } else if (tipo === "clientes") {
      const { data, error } = await supabase
        .from("clientes")
        .select("nome,doc,telefone,cidade,uf,status")
        .order("nome");
      if (error) throw error; rows = data ?? [];
    } else if (tipo === "fornecedores") {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("codigo,nome,tipo_pessoa,documento")
        .order("nome");
      if (error) throw error; rows = data ?? [];
    } else if (tipo === "centros_custo") {
      const { data, error } = await supabase
        .from("centros_custo")
        .select("codigo,nome,tipo,area_default,ativo")
        .is("deleted_at", null).order("codigo");
      if (error) throw error; rows = data ?? [];
    }

    if (rows.length === 0) { toast.info("Sem dados para exportar."); return; }
    downloadCSV(filename, toCSV(rows));
    toast.success(`Exportado ${rows.length} registro(s) em ${filename}`);
  } catch (e: any) {
    toast.error(e?.message ?? "Falha ao exportar");
  }
}

function ExportacoesTab() {
  const { data: exportadores = [] } = useExportadores();
  return (
    <Card className="p-3 space-y-4">
      <div>
        <h3 className="text-sm font-semibold mb-2">Exportação rápida (CSV)</h3>
        <p className="text-[12px] text-muted-foreground mb-3">
          Gera CSV simples no navegador (até 5.000 registros). XLSX / JSON / TXT layout customizado
          ficam para próximos turns via conectores oficiais.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {([
            ["movimento_financeiro", "Movimento Financeiro"],
            ["produtos", "Produtos"],
            ["clientes", "Clientes"],
            ["fornecedores", "Fornecedores"],
            ["centros_custo", "Centros de Custo"],
          ] as const).map(([t, l]) => (
            <Button key={t} variant="outline" className="justify-start h-9 text-[12px]"
              onClick={() => exportarCSV(t)}>
              <Download className="mr-2 h-3.5 w-3.5" />{l}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Conectores externos registrados (D18.8)</h3>
        <p className="text-[12px] text-muted-foreground mb-2">
          Conectores estão <b>inativos por padrão</b> e travados em ambiente HOMOLOGACAO.
          Ativação real exige homologação contábil externa.
        </p>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-[120px]">Código</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="w-[140px]">Sistema destino</TableHead>
            <TableHead className="w-[120px]">Ambiente</TableHead>
            <TableHead className="w-[80px]">Ativo</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {exportadores.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-mono text-[12px]">{e.codigo}</TableCell>
                <TableCell className="text-[12px]">{e.nome}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{e.sistema_destino}</Badge></TableCell>
                <TableCell><Badge variant="secondary" className="text-[10px]">{e.ambiente}</Badge></TableCell>
                <TableCell>{e.ativo ? <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">SIM</Badge> : <Badge variant="secondary" className="text-[10px]">NÃO</Badge>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// ──────────────────────────────────────────────────────────────
// LOGS DE INTEGRAÇÃO
// ──────────────────────────────────────────────────────────────
function LogsTab() {
  const { data: lotes = [], isLoading: l1 } = useLotesIntegracao();
  const { data: expor = [], isLoading: l2 } = useExportacoesGeradas();
  return (
    <Card className="p-3 space-y-5">
      <div>
        <h3 className="text-sm font-semibold mb-2">Lotes de Integração ({lotes.length})</h3>
        <div className="overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-[140px]">Código</TableHead>
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead className="w-[110px]">Competência</TableHead>
              <TableHead className="w-[140px]">Sistema destino</TableHead>
              <TableHead className="w-[100px] text-right">Registros</TableHead>
              <TableHead className="w-[100px] text-right">Partidas</TableHead>
              <TableHead className="w-[150px]">Gerado em</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {l1 && <TableRow><TableCell colSpan={8} className="text-center py-3 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!l1 && lotes.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-3 text-muted-foreground">Nenhum lote registrado ainda.</TableCell></TableRow>}
              {lotes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-[12px]">{l.codigo}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{l.tipo_lote}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{l.status}</Badge></TableCell>
                  <TableCell className="text-[12px]">{l.competencia ?? "—"}</TableCell>
                  <TableCell className="text-[12px]">{l.sistema_destino ?? "—"}</TableCell>
                  <TableCell className="text-right text-[12px]">{l.total_registros}</TableCell>
                  <TableCell className="text-right text-[12px]">{l.total_partidas}</TableCell>
                  <TableCell className="text-[12px]">{new Date(l.data_geracao).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-2">Exportações Geradas ({expor.length})</h3>
        <div className="overflow-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead className="w-[110px]">Categoria</TableHead>
              <TableHead className="w-[110px]">Ambiente</TableHead>
              <TableHead className="w-[110px]">Competência</TableHead>
              <TableHead className="w-[100px] text-right">Registros</TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              <TableHead>Mensagem</TableHead>
              <TableHead className="w-[150px]">Gerada em</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {l2 && <TableRow><TableCell colSpan={7} className="text-center py-3 text-muted-foreground">Carregando…</TableCell></TableRow>}
              {!l2 && expor.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-3 text-muted-foreground">Nenhuma exportação registrada ainda.</TableCell></TableRow>}
              {expor.map((e) => (
                <TableRow key={e.id}>
                  <TableCell><Badge variant="outline" className="text-[10px]">{e.categoria}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{e.ambiente}</Badge></TableCell>
                  <TableCell className="text-[12px]">{e.competencia ?? "—"}</TableCell>
                  <TableCell className="text-right text-[12px]">{e.total_registros}</TableCell>
                  <TableCell><Badge variant="secondary" className="text-[10px]">{e.status}</Badge></TableCell>
                  <TableCell className="text-[12px] text-muted-foreground">{e.mensagem ?? "—"}</TableCell>
                  <TableCell className="text-[12px]">{new Date(e.created_at).toLocaleString("pt-BR")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}

function StatusIntegracaoBadge({ s }: { s: string }) {
  const map: Record<string, string> = {
    PENDENTE: "bg-amber-100 text-amber-800",
    ENVIADO: "bg-blue-100 text-blue-800",
    CONFIRMADO: "bg-emerald-100 text-emerald-800",
    ERRO: "bg-red-100 text-red-800",
    IGNORADO: "bg-gray-100 text-gray-700",
  };
  return <Badge className={`${map[s] ?? ""} text-[10px]`}>{s}</Badge>;
}

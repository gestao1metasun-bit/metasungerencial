// Aba unificada de Cadastros financeiros (Fase 1 da reestruturação).
// 6 sub-abas: Grupos & Subgrupos · Naturezas · Centros · Meios · Aplicações · Contas
import { useState } from "react";
import { Plus, Trash2, SquarePen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  useGrupos, useSubgrupos, upsertGrupo, removeGrupo, upsertSubgrupo, removeSubgrupo,
  newGrupoId, newSubgrupoId, type GrupoFinanceiro, type SubgrupoFinanceiro,
} from "@/lib/fin-grupos-store";
import {
  useNaturezasFin, upsertNatureza, removeNatureza, newNaturezaId, type NaturezaFin,
} from "@/lib/fin-naturezas-store";
import {
  useCentrosCustoFin, upsertCentroCusto, removeCentroCusto, newCentroCustoId, type CentroCustoFin,
} from "@/lib/fin-centros-custo-store";
import {
  useMeiosPagamento, upsertMeio, removeMeio, newMeioId, type MeioPagamento,
} from "@/lib/fin-meios-pagamento-store";
import {
  useTiposAplicacao, upsertTipoAplicacao, removeTipoAplicacao, newTipoAplicacaoId, type TipoAplicacao,
} from "@/lib/fin-tipos-aplicacao-store";
import {
  useContasFinanceiras, upsertConta, removeConta, newContaId, type ContaFinanceira,
} from "@/lib/fin-contas-store";
import { confirmDialog } from "@/components/app/confirm-dialog";
import { RmTabHeader } from "@/components/app/financeiro/RmTabHeader";
import { useQueryClient } from "@tanstack/react-query";

export function CadastrosTab() {
  const [sub, setSub] = useState("naturezas");
  const qc = useQueryClient();
  return (
    <div className="space-y-3">
      <RmTabHeader
        onAtualizar={() => {
          qc.invalidateQueries({ queryKey: ["grupos-fin"] });
          qc.invalidateQueries({ queryKey: ["subgrupos-fin"] });
          qc.invalidateQueries({ queryKey: ["naturezas-fin"] });
          qc.invalidateQueries({ queryKey: ["centros-custo-fin"] });
          qc.invalidateQueries({ queryKey: ["meios-pagamento"] });
          qc.invalidateQueries({ queryKey: ["tipos-aplicacao"] });
          qc.invalidateQueries({ queryKey: ["contas-financeiras"] });
        }}
        searchPlaceholder="Buscar cadastro…"
      />
      <Tabs value={sub} onValueChange={setSub} className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="grupos">Grupos & Subgrupos</TabsTrigger>
          <TabsTrigger value="naturezas">Naturezas</TabsTrigger>
          <TabsTrigger value="centros">Centros de Custo</TabsTrigger>
          <TabsTrigger value="meios">Meios de Pagamento</TabsTrigger>
          <TabsTrigger value="aplicacoes">Tipos de Aplicação</TabsTrigger>
          <TabsTrigger value="contas">Contas Financeiras</TabsTrigger>
        </TabsList>
      <TabsContent value="grupos"><GruposPanel /></TabsContent>
      <TabsContent value="naturezas"><NaturezasPanel /></TabsContent>
      <TabsContent value="centros"><CentrosPanel /></TabsContent>
      <TabsContent value="meios"><MeiosPanel /></TabsContent>
      <TabsContent value="aplicacoes"><AplicacoesPanel /></TabsContent>
      <TabsContent value="contas"><ContasPanel /></TabsContent>
    </Tabs>
  );
}

/* ============== GRUPOS ============== */
function GruposPanel() {
  const grupos = useGrupos();
  const subs = useSubgrupos();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Grupos financeiros</div>
            <p className="text-xs text-muted-foreground">Estrutura macro do plano (Receita, Custo Direto, etc.).</p>
          </div>
          <GrupoDialog onSave={(g) => { upsertGrupo(g); toast.success("Grupo salvo."); }} />
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-16">Cód</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {grupos.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-mono text-xs">{g.codigo}</TableCell>
                <TableCell className="font-medium">{g.nome}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{g.tipo}</Badge></TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <GrupoDialog grupo={g} onSave={(x) => { upsertGrupo(x); toast.success("Grupo atualizado."); }} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      confirmDialog({ title: "Excluir grupo?", description: `Excluir grupo "${g.nome}" e seus subgrupos?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeGrupo(g.id); toast.success("Grupo removido."); } });
                    }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">Subgrupos</div>
            <p className="text-xs text-muted-foreground">Detalhamento de cada grupo.</p>
          </div>
          <SubgrupoDialog grupos={grupos} onSave={(s) => { upsertSubgrupo(s); toast.success("Subgrupo salvo."); }} />
        </div>
        <Table>
          <TableHeader><TableRow>
            <TableHead className="w-20">Cód</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead className="w-24 text-right">Ações</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {subs.map((s) => {
              const g = grupos.find((x) => x.id === s.grupoId);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">{s.codigo}</TableCell>
                  <TableCell className="font-medium">{s.nome}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{g?.nome ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <SubgrupoDialog grupos={grupos} sub={s} onSave={(x) => { upsertSubgrupo(x); toast.success("Subgrupo atualizado."); }} />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                        confirmDialog({ title: "Excluir subgrupo?", description: `Excluir subgrupo "${s.nome}"?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeSubgrupo(s.id); toast.success("Subgrupo removido."); } });
                      }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function GrupoDialog({ grupo, onSave }: { grupo?: GrupoFinanceiro; onSave: (g: GrupoFinanceiro) => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<GrupoFinanceiro>(grupo ?? { id: newGrupoId(), codigo: "", nome: "", tipo: "Despesa Administrativa", ativo: true });
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(grupo ?? { id: newGrupoId(), codigo: "", nome: "", tipo: "Despesa Administrativa", ativo: true }); }}>
      <DialogTrigger asChild>
        {grupo
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo grupo</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{grupo ? "Editar grupo" : "Novo grupo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div><Label>Código</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></div>
            <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as GrupoFinanceiro["tipo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Receita","Custo Direto","Custo Indireto","Despesa Administrativa","Despesa Comercial","Imobilizado","Financeiro/Patrimonial"].map(t =>
                  <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome || !f.codigo) return toast.error("Código e nome obrigatórios."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SubgrupoDialog({ sub, grupos, onSave }: { sub?: SubgrupoFinanceiro; grupos: GrupoFinanceiro[]; onSave: (s: SubgrupoFinanceiro) => void }) {
  const [open, setOpen] = useState(false);
  const init = (): SubgrupoFinanceiro => sub ?? { id: newSubgrupoId(), codigo: "", nome: "", grupoId: grupos[0]?.id ?? "", ativo: true };
  const [f, setF] = useState<SubgrupoFinanceiro>(init);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild>
        {sub
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" variant="outline" className="gap-2"><Plus className="h-4 w-4" />Novo subgrupo</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{sub ? "Editar subgrupo" : "Novo subgrupo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Grupo</Label>
            <Select value={f.grupoId} onValueChange={(v) => setF({ ...f, grupoId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.codigo} — {g.nome}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div><Label>Código</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></div>
            <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          </div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome || !f.codigo || !f.grupoId) return toast.error("Preencha código, nome e grupo."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== NATUREZAS ============== */
function NaturezasPanel() {
  const naturezas = useNaturezasFin();
  const grupos = useGrupos();
  const subs = useSubgrupos();
  const centros = useCentrosCustoFin();
  const aplics = useTiposAplicacao();
  const [filtroGrupo, setFiltroGrupo] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const list = naturezas.filter(n => (filtroGrupo === "todos" || n.grupoId === filtroGrupo) &&
    (!busca || `${n.codigo} ${n.nome}`.toLowerCase().includes(busca.toLowerCase())));
  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Naturezas financeiras</div>
          <p className="text-xs text-muted-foreground">Plano de contas gerencial — preparado para integração contábil futura.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Buscar…" className="h-9 w-48" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select value={filtroGrupo} onValueChange={setFiltroGrupo}>
            <SelectTrigger className="h-9 w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os grupos</SelectItem>
              {grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.codigo} — {g.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <NaturezaDialog grupos={grupos} subs={subs} centros={centros} aplics={aplics} onSave={(n) => { upsertNatureza(n); toast.success("Natureza salva."); }} />
        </div>
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-24">Código</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Grupo / Subgrupo</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Vínculos</TableHead>
          <TableHead>Cta. contábil</TableHead>
          <TableHead className="w-24 text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {list.map(n => {
            const g = grupos.find(x => x.id === n.grupoId);
            const s = subs.find(x => x.id === n.subgrupoId);
            return (
              <TableRow key={n.id}>
                <TableCell className="font-mono text-xs">{n.codigo}</TableCell>
                <TableCell className="font-medium">{n.nome}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{g?.nome ?? "—"}{s ? ` › ${s.nome}` : ""}</TableCell>
                <TableCell>
                  <Badge variant={n.tipo === "Receber" ? "default" : "secondary"} className="text-[10px]">{n.tipo}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {n.permiteVinculoObra && <Badge variant="outline" className="text-[10px]">Obra</Badge>}
                    {n.permiteVinculoEstoque && <Badge variant="outline" className="text-[10px]">Estoque</Badge>}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{n.contaContabilFutura ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <NaturezaDialog natureza={n} grupos={grupos} subs={subs} centros={centros} aplics={aplics} onSave={(x) => { upsertNatureza(x); toast.success("Natureza atualizada."); }} />
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                      confirmDialog({ title: "Excluir natureza?", description: `Excluir natureza "${n.nome}"?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeNatureza(n.id); toast.success("Natureza removida."); } });
                    }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

function NaturezaDialog({ natureza, grupos, subs, centros, aplics, onSave }: {
  natureza?: NaturezaFin;
  grupos: GrupoFinanceiro[];
  subs: SubgrupoFinanceiro[];
  centros: CentroCustoFin[];
  aplics: TipoAplicacao[];
  onSave: (n: NaturezaFin) => void;
}) {
  const [open, setOpen] = useState(false);
  const init = (): NaturezaFin => natureza ?? {
    id: newNaturezaId(), codigo: "", nome: "", grupoId: grupos[0]?.id ?? "",
    tipo: "Pagar", permiteVinculoObra: false, permiteVinculoEstoque: false, ativo: true,
  };
  const [f, setF] = useState<NaturezaFin>(init);
  const subsFiltrados = subs.filter(s => s.grupoId === f.grupoId);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild>
        {natureza
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Nova natureza</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{natureza ? "Editar natureza" : "Nova natureza"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label>Código</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} placeholder="2.1.01" /></div>
            <div className="col-span-2"><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Grupo</Label>
              <Select value={f.grupoId} onValueChange={(v) => setF({ ...f, grupoId: v, subgrupoId: undefined })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.codigo} — {g.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Subgrupo</Label>
              <Select value={f.subgrupoId ?? ""} onValueChange={(v) => setF({ ...f, subgrupoId: v || undefined })} disabled={subsFiltrados.length === 0}>
                <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>{subsFiltrados.map(s => <SelectItem key={s.id} value={s.id}>{s.codigo} — {s.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as "Pagar" | "Receber" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Pagar">Pagar</SelectItem><SelectItem value="Receber">Receber</SelectItem></SelectContent>
              </Select>
            </div>
            <div>
              <Label>Centro padrão</Label>
              <Select value={f.centroCustoPadraoId ?? ""} onValueChange={(v) => setF({ ...f, centroCustoPadraoId: v || undefined })}>
                <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>{centros.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Aplicação padrão</Label>
              <Select value={f.tipoAplicacaoPadraoId ?? ""} onValueChange={(v) => setF({ ...f, tipoAplicacaoPadraoId: v || undefined })}>
                <SelectTrigger><SelectValue placeholder="(opcional)" /></SelectTrigger>
                <SelectContent>{aplics.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Conta contábil futura</Label>
            <Input value={f.contaContabilFutura ?? ""} onChange={(e) => setF({ ...f, contaContabilFutura: e.target.value })}
              placeholder="Ex.: 3.1.01.001 (Alterdata / Domínio)" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2"><Switch checked={f.permiteVinculoObra} onCheckedChange={(v) => setF({ ...f, permiteVinculoObra: v })} /><Label>Vincula obra</Label></div>
            <div className="flex items-center gap-2"><Switch checked={f.permiteVinculoEstoque} onCheckedChange={(v) => setF({ ...f, permiteVinculoEstoque: v })} /><Label>Vincula estoque</Label></div>
            <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativo</Label></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome || !f.codigo || !f.grupoId) return toast.error("Código, nome e grupo são obrigatórios."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== CENTROS ============== */
function CentrosPanel() {
  const centros = useCentrosCustoFin();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Centros de Custo</div>
          <p className="text-xs text-muted-foreground">Departamentos / áreas para classificação gerencial.</p>
        </div>
        <CentroDialog onSave={(c) => { upsertCentroCusto(c); toast.success("Centro salvo."); }} />
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead className="w-16">Cód</TableHead>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24 text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {centros.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
              <TableCell className="font-medium">{c.nome}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{c.tipo}</Badge></TableCell>
              <TableCell><Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">{c.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <CentroDialog centro={c} onSave={(x) => { upsertCentroCusto(x); toast.success("Centro atualizado."); }} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    confirmDialog({ title: "Excluir centro de custo?", description: `Excluir centro "${c.nome}"?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeCentroCusto(c.id); toast.success("Centro removido."); } });
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function CentroDialog({ centro, onSave }: { centro?: CentroCustoFin; onSave: (c: CentroCustoFin) => void }) {
  const [open, setOpen] = useState(false);
  const init = (): CentroCustoFin => centro ?? { id: newCentroCustoId(), codigo: "", nome: "", tipo: "Administrativo", ativo: true };
  const [f, setF] = useState<CentroCustoFin>(init);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild>
        {centro
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo centro</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{centro ? "Editar centro" : "Novo centro"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <div><Label>Código</Label><Input value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} /></div>
            <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as CentroCustoFin["tipo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Administrativo","Operacional","Comercial","Obra"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome || !f.codigo) return toast.error("Código e nome obrigatórios."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== MEIOS ============== */
function MeiosPanel() {
  const meios = useMeiosPagamento();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Meios de Pagamento</div>
          <p className="text-xs text-muted-foreground">Como entram e saem os recursos.</p>
        </div>
        <MeioDialog onSave={(m) => { upsertMeio(m); toast.success("Meio salvo."); }} />
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24 text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {meios.map(m => (
            <TableRow key={m.id}>
              <TableCell className="font-medium">{m.nome}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{m.tipo}</Badge></TableCell>
              <TableCell><Badge variant={m.ativo ? "default" : "secondary"} className="text-[10px]">{m.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <MeioDialog meio={m} onSave={(x) => { upsertMeio(x); toast.success("Meio atualizado."); }} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    confirmDialog({ title: "Excluir meio de pagamento?", description: `Excluir meio "${m.nome}"?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeMeio(m.id); toast.success("Meio removido."); } });
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function MeioDialog({ meio, onSave }: { meio?: MeioPagamento; onSave: (m: MeioPagamento) => void }) {
  const [open, setOpen] = useState(false);
  const init = (): MeioPagamento => meio ?? { id: newMeioId(), nome: "", tipo: "PIX", ativo: true };
  const [f, setF] = useState<MeioPagamento>(init);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild>
        {meio
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo meio</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{meio ? "Editar meio" : "Novo meio"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div>
            <Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as MeioPagamento["tipo"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["PIX","Boleto","Cartão crédito","Cartão débito","Transferência","Dinheiro","Reembolso"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome) return toast.error("Informe o nome."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== APLICAÇÕES ============== */
function AplicacoesPanel() {
  const aplics = useTiposAplicacao();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Tipos de Aplicação</div>
          <p className="text-xs text-muted-foreground">Diferencia Instalação × Manutenção × Garantia dentro da mesma obra.</p>
        </div>
        <AplicacaoDialog onSave={(a) => { upsertTipoAplicacao(a); toast.success("Tipo salvo."); }} />
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Pós-venda?</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24 text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {aplics.map(a => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">{a.nome}</TableCell>
              <TableCell>{a.posVenda ? <Badge className="text-[10px]">Sim</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
              <TableCell><Badge variant={a.ativo ? "default" : "secondary"} className="text-[10px]">{a.ativo ? "Ativo" : "Inativo"}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <AplicacaoDialog aplic={a} onSave={(x) => { upsertTipoAplicacao(x); toast.success("Tipo atualizado."); }} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    confirmDialog({ title: "Excluir tipo de aplicação?", description: `Excluir "${a.nome}"?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeTipoAplicacao(a.id); toast.success("Tipo removido."); } });
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function AplicacaoDialog({ aplic, onSave }: { aplic?: TipoAplicacao; onSave: (a: TipoAplicacao) => void }) {
  const [open, setOpen] = useState(false);
  const init = (): TipoAplicacao => aplic ?? { id: newTipoAplicacaoId(), nome: "", posVenda: false, ativo: true };
  const [f, setF] = useState<TipoAplicacao>(init);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild>
        {aplic
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Novo tipo</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{aplic ? "Editar tipo" : "Novo tipo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.posVenda} onCheckedChange={(v) => setF({ ...f, posVenda: v })} /><Label>É pós-venda</Label></div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativo</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome) return toast.error("Informe o nome."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============== CONTAS FINANCEIRAS ============== */
function ContasPanel() {
  const contas = useContasFinanceiras();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">Contas Financeiras</div>
          <p className="text-xs text-muted-foreground">Bancos, caixas e cartões usados nas movimentações.</p>
        </div>
        <ContaDialog onSave={(c) => { upsertConta(c); toast.success("Conta salva."); }} />
      </div>
      <Table>
        <TableHeader><TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Banco</TableHead>
          <TableHead>Ag / Conta</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-24 text-right">Ações</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {contas.map(c => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.nome}</TableCell>
              <TableCell><Badge variant="outline" className="text-[10px]">{c.tipo}</Badge></TableCell>
              <TableCell className="text-xs text-muted-foreground">{c.banco ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{[c.agencia, c.conta].filter(Boolean).join(" / ") || "—"}</TableCell>
              <TableCell><Badge variant={c.ativo ? "default" : "secondary"} className="text-[10px]">{c.ativo ? "Ativa" : "Inativa"}</Badge></TableCell>
              <TableCell className="text-right">
                <div className="inline-flex gap-1">
                  <ContaDialog conta={c} onSave={(x) => { upsertConta(x); toast.success("Conta atualizada."); }} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                    confirmDialog({ title: "Excluir conta financeira?", description: `Excluir conta "${c.nome}"?`, destructive: true, confirmText: "Excluir" }).then((ok) => { if (ok) { removeConta(c.id); toast.success("Conta removida."); } });
                  }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ContaDialog({ conta, onSave }: { conta?: ContaFinanceira; onSave: (c: ContaFinanceira) => void }) {
  const [open, setOpen] = useState(false);
  const init = (): ContaFinanceira => conta ?? { id: newContaId(), nome: "", tipo: "Banco", saldoInicial: 0, ativo: true };
  const [f, setF] = useState<ContaFinanceira>(init);
  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setF(init()); }}>
      <DialogTrigger asChild>
        {conta
          ? <Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>
          : <Button size="sm" className="gap-2"><Plus className="h-4 w-4" />Nova conta</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>{conta ? "Editar conta" : "Nova conta"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v as ContaFinanceira["tipo"] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Banco","Caixa","PIX","Cartão"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Banco</Label><Input value={f.banco ?? ""} onChange={(e) => setF({ ...f, banco: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Agência</Label><Input value={f.agencia ?? ""} onChange={(e) => setF({ ...f, agencia: e.target.value })} /></div>
            <div><Label>Conta</Label><Input value={f.conta ?? ""} onChange={(e) => setF({ ...f, conta: e.target.value })} /></div>
          </div>
          <div><Label>Saldo inicial</Label><Input type="number" value={f.saldoInicial} onChange={(e) => setF({ ...f, saldoInicial: Number(e.target.value) || 0 })} /></div>
          <div className="flex items-center gap-2"><Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} /><Label>Ativa</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.nome) return toast.error("Informe o nome."); onSave(f); setOpen(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

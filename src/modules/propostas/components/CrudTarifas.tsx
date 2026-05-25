// CRUD de Tarifas de Energia (módulo Orçamentos/Propostas → Cadastros).
// Admin Master/Geral: criar, editar, desativar. Demais: somente leitura.
import { useMemo, useState } from "react";
import { Plus, Pencil, Save, X, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  type TarifaEnergia,
  useTarifasEnergia, upsertTarifaEnergia, removeTarifaEnergia,
} from "@/modules/propostas/store";
import { useUsuarioAtual } from "@/lib/perfis-store";

const GRUPOS = ["B1", "B2", "B3", "A4", "A3", "A2"];
const MODALIDADES = ["Convencional", "Branca", "Verde", "Azul"];
const SUBGRUPOS = ["Residencial", "Rural", "Comercial", "Industrial", "Poder Público"];

const ANY = "__ANY__";

function novaTarifa(): TarifaEnergia {
  return {
    id: `TAR-${Date.now()}`,
    concessionaria: "",
    uf: "",
    cidade: "",
    grupoTarifario: "B1",
    modalidadeTarifaria: "Convencional",
    subgrupo: "Residencial",
    tarifaKwh: 0,
    dataUltimaAtualizacao: new Date().toISOString().slice(0, 10),
    ativo: true,
  };
}

export function CrudTarifas() {
  const list = useTarifasEnergia();
  const { perfil } = useUsuarioAtual();
  const ehAdmin = !!perfil?.isAdminMaster;

  const [fCidade, setFCidade] = useState("");
  const [fUf, setFUf] = useState("");
  const [fConc, setFConc] = useState("");
  const [fGrupo, setFGrupo] = useState<string>(ANY);
  const [fMod, setFMod] = useState<string>(ANY);
  const [verInativos, setVerInativos] = useState(false);

  const [edit, setEdit] = useState<TarifaEnergia | null>(null);

  const filtradas = useMemo(() => {
    return list.filter((t) => {
      if (!verInativos && !t.ativo) return false;
      if (fCidade && !(t.cidade ?? "").toLowerCase().includes(fCidade.toLowerCase())) return false;
      if (fUf && !(t.uf ?? "").toLowerCase().includes(fUf.toLowerCase())) return false;
      if (fConc && !t.concessionaria.toLowerCase().includes(fConc.toLowerCase())) return false;
      if (fGrupo !== ANY && t.grupoTarifario !== fGrupo) return false;
      if (fMod !== ANY && t.modalidadeTarifaria !== fMod) return false;
      return true;
    });
  }, [list, fCidade, fUf, fConc, fGrupo, fMod, verInativos]);

  function salvar() {
    if (!edit) return;
    if (!edit.concessionaria.trim() || !edit.uf.trim()) {
      toast.error("Concessionária e UF são obrigatórias.");
      return;
    }
    if (!(edit.tarifaKwh > 0)) {
      toast.error("Tarifa kWh deve ser maior que zero.");
      return;
    }
    const t: TarifaEnergia = {
      ...edit,
      concessionaria: edit.concessionaria.toUpperCase().trim(),
      uf: edit.uf.toUpperCase().trim(),
      cidade: (edit.cidade ?? "").toUpperCase().trim() || undefined,
      dataUltimaAtualizacao: new Date().toISOString().slice(0, 10),
    };
    upsertTarifaEnergia(t);
    toast.success("Tarifa salva.");
    setEdit(null);
  }

  function desativar(t: TarifaEnergia) {
    upsertTarifaEnergia({ ...t, ativo: false, dataUltimaAtualizacao: new Date().toISOString().slice(0, 10) });
    toast.success("Tarifa desativada.");
  }

  function reativar(t: TarifaEnergia) {
    upsertTarifaEnergia({ ...t, ativo: true, dataUltimaAtualizacao: new Date().toISOString().slice(0, 10) });
    toast.success("Tarifa reativada.");
  }

  function limparFiltros() {
    setFCidade(""); setFUf(""); setFConc(""); setFGrupo(ANY); setFMod(ANY);
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 py-3">
        <div>
          <CardTitle className="text-sm">Tarifas de energia</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {ehAdmin
              ? "Cadastro mantido pelo Admin. Usuários comuns têm acesso somente leitura."
              : "Visualização. Apenas Admin Master/Geral pode cadastrar, editar ou desativar."}
          </p>
        </div>
        {ehAdmin && (
          <Button size="sm" onClick={() => setEdit(novaTarifa())}>
            <Plus className="mr-1 h-3 w-3" /> Nova tarifa
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Concessionária</Label>
            <Input value={fConc} onChange={(e) => setFConc(e.target.value)} placeholder="Buscar..." className="h-8" />
          </div>
          <div>
            <Label className="text-xs">UF</Label>
            <Input value={fUf} onChange={(e) => setFUf(e.target.value.toUpperCase())} maxLength={2} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Cidade</Label>
            <Input value={fCidade} onChange={(e) => setFCidade(e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Grupo</Label>
            <Select value={fGrupo} onValueChange={setFGrupo}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Todos</SelectItem>
                {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Modalidade</Label>
            <Select value={fMod} onValueChange={setFMod}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Todas</SelectItem>
                {MODALIDADES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={verInativos} onCheckedChange={setVerInativos} id="ver-inativos-tar" />
            <Label htmlFor="ver-inativos-tar" className="text-xs">Mostrar inativas</Label>
          </div>
          <Button variant="ghost" size="sm" onClick={limparFiltros} className="h-8">
            <Search className="mr-1 h-3 w-3" /> Limpar filtros
          </Button>
        </div>

        {/* Tabela */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concessionária</TableHead>
                <TableHead>UF</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Grupo</TableHead>
                <TableHead>Modalidade</TableHead>
                <TableHead>Subgrupo</TableHead>
                <TableHead className="text-right">Tarifa kWh</TableHead>
                <TableHead>Atualizada</TableHead>
                <TableHead>Status</TableHead>
                {ehAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 && (
                <TableRow>
                  <TableCell colSpan={ehAdmin ? 10 : 9} className="text-center text-sm text-muted-foreground py-6">
                    Nenhuma tarifa encontrada.
                  </TableCell>
                </TableRow>
              )}
              {filtradas.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.concessionaria}</TableCell>
                  <TableCell>{t.uf}</TableCell>
                  <TableCell>{t.cidade ?? "—"}</TableCell>
                  <TableCell>{t.grupoTarifario ?? "—"}</TableCell>
                  <TableCell>{t.modalidadeTarifaria ?? "—"}</TableCell>
                  <TableCell>{t.subgrupo ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.tarifaKwh.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 4 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{t.dataUltimaAtualizacao ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={t.ativo ? "default" : "secondary"}>{t.ativo ? "ATIVA" : "INATIVA"}</Badge>
                  </TableCell>
                  {ehAdmin && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" title="Editar" onClick={() => setEdit({ ...t })}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      {t.ativo ? (
                        <Button variant="ghost" size="icon" title="Desativar" className="text-destructive" onClick={() => desativar(t)}>
                          <X className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reativar(t)} className="h-7 text-xs">
                          Reativar
                        </Button>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Modal de edição (admin) */}
      {ehAdmin && (
        <Dialog open={!!edit} onOpenChange={(o) => { if (!o) setEdit(null); }}>
          <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{edit && list.some((x) => x.id === edit.id) ? "Editar tarifa" : "Nova tarifa"}</DialogTitle>
            </DialogHeader>
            {edit && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <Label className="text-xs">Concessionária *</Label>
                  <Input value={edit.concessionaria}
                    onChange={(e) => setEdit({ ...edit, concessionaria: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label className="text-xs">UF *</Label>
                  <Input value={edit.uf} maxLength={2}
                    onChange={(e) => setEdit({ ...edit, uf: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label className="text-xs">Cidade</Label>
                  <Input value={edit.cidade ?? ""}
                    onChange={(e) => setEdit({ ...edit, cidade: e.target.value.toUpperCase() })} />
                </div>
                <div>
                  <Label className="text-xs">Grupo tarifário</Label>
                  <Select value={edit.grupoTarifario ?? "B1"} onValueChange={(v) => setEdit({ ...edit, grupoTarifario: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GRUPOS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Modalidade tarifária</Label>
                  <Select value={edit.modalidadeTarifaria ?? "Convencional"} onValueChange={(v) => setEdit({ ...edit, modalidadeTarifaria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MODALIDADES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Subgrupo</Label>
                  <Select value={edit.subgrupo ?? "Residencial"} onValueChange={(v) => setEdit({ ...edit, subgrupo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBGRUPOS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Tarifa kWh (R$) *</Label>
                  <Input type="number" step="0.0001" min={0} value={edit.tarifaKwh}
                    onChange={(e) => setEdit({ ...edit, tarifaKwh: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} id="ativo-tar" />
                  <Label htmlFor="ativo-tar" className="text-xs">Ativa</Label>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
              <Button onClick={salvar}><Save className="mr-1 h-3 w-3" /> Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}

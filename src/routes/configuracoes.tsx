import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, ShieldCheck, Plug, ScrollText, Settings as SettingsIcon, Users, Plus, Trash2, SquarePen } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabFromHash } from "@/lib/route-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
// (Checkbox removido — perfis usam selects)
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MODULES, type ModuleKey, type ActionKey, type Perfil, type Usuario,
  type PermissaoModulo, type PermLevel, PERM_LEVELS,
  usePerfis, useUsuarios, useUsuarioAtual, upsertPerfil, removePerfil, novoPerfilId,
  upsertUsuario, removeUsuario, novoUsuarioId, setUsuarioAtual,
} from "@/lib/perfis-store";
import { usePropostaConfig, setPropostaConfig } from "@/modules/propostas/proposta-config-store";
import { CadastrosFV } from "@/modules/propostas/PropostasPage";
import { useConsultores, upsertConsultor, removeConsultor, novoConsultorVazio, formatTelefoneBR, type Consultor } from "@/lib/consultores-store";
import { FileText } from "lucide-react";
import { PermissoesTab } from "@/components/app/PermissoesTab";
import { LixeiraTab } from "@/components/app/LixeiraTab";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Meta Sun Gerencial" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  const [tab, setTab] = useTabFromHash("/configuracoes");
  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros do sistema, perfis, usuários e integrações." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="hidden">
          <TabsTrigger value="empresa"><Building2 className="mr-2 h-4 w-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="parametros"><SettingsIcon className="mr-2 h-4 w-4" /> Parâmetros</TabsTrigger>
          <TabsTrigger value="proposta"><FileText className="mr-2 h-4 w-4" /> Proposta</TabsTrigger>
          <TabsTrigger value="perfis"><ShieldCheck className="mr-2 h-4 w-4" /> Perfis de Acesso</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="mr-2 h-4 w-4" /> Usuários</TabsTrigger>
          <TabsTrigger value="integracoes"><Plug className="mr-2 h-4 w-4" /> Integrações</TabsTrigger>
          <TabsTrigger value="logs"><ScrollText className="mr-2 h-4 w-4" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="empresa" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Dados da empresa</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Razão social" defaultValue="Meta Sun Energia Solar LTDA" />
              <Field label="Nome fantasia" defaultValue="Meta Sun" />
              <Field label="CNPJ" defaultValue="12.345.678/0001-90" />
              <Field label="Telefone" defaultValue="(92) 3000-0000" />
              <Field label="E-mail corporativo" defaultValue="contato@metasun.com" />
              <Field label="Cidade / UF" defaultValue="Manaus / AM" />
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => toast.success("Dados salvos")} className="bg-[image:var(--gradient-primary)] text-primary-foreground">Salvar alterações</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="parametros" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Parâmetros operacionais</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Prazo padrão de financiamento (dias)" defaultValue="30" />
              <Field label="Geração média kWh/kWp" defaultValue="135" />
              <Field label="Comissão padrão (%)" defaultValue="3,5" />
              <Field label="Margem padrão (%)" defaultValue="22" />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="proposta" className="mt-5"><PropostaConfigTab /></TabsContent>
        <TabsContent value="orcamentos-cad" className="mt-5"><CadastrosFV /></TabsContent>
        <TabsContent value="cfg-dashboard" className="mt-5"><PlaceholderModuleConfig nome="Dashboard" /></TabsContent>
        <TabsContent value="cfg-comercial" className="mt-5"><PlaceholderModuleConfig nome="Comercial" /></TabsContent>
        <TabsContent value="cfg-engenharia" className="mt-5"><PlaceholderModuleConfig nome="Engenharia" /></TabsContent>
        <TabsContent value="cfg-financeiro" className="mt-5"><PlaceholderModuleConfig nome="Financeiro" /></TabsContent>

        <TabsContent value="perfis" className="mt-5"><PerfisTab /></TabsContent>
        <TabsContent value="permissoes" className="mt-5"><PermissoesTab /></TabsContent>
        <TabsContent value="usuarios" className="mt-5"><UsuariosTab /></TabsContent>
        <TabsContent value="consultores" className="mt-5"><ConsultoresTab /></TabsContent>

        <TabsContent value="integracoes" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Integrações futuras</h2>
            <div className="mt-4 space-y-3">
              {[
                { n: "Google Sheets", d: "Importar/exportar planilhas" },
                { n: "CSV / Excel", d: "Importação de movimentações" },
                { n: "API Bancária", d: "Conciliação automática" },
                { n: "ERP externo", d: "Sincronização de cadastros" },
              ].map((i) => (
                <div key={i.n} className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
                  <div>
                    <div className="font-medium">{i.n}</div>
                    <div className="text-xs text-muted-foreground">{i.d}</div>
                  </div>
                  <Switch />
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="lixeira" className="mt-5"><LixeiraTab /></TabsContent>

        <TabsContent value="logs" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Logs do sistema</h2>
            <div className="mt-4 space-y-2 font-mono text-xs">
              {[
                "[2025-05-12 09:14:02] admin@metasun.com — Atualizou contrato CT-2025-0142",
                "[2025-05-12 08:50:11] rafael@metasun.com — Cadastrou cliente CLI-007",
              ].map((l, i) => (
                <div key={i} className="rounded border border-border bg-background/60 px-3 py-2 text-muted-foreground">{l}</div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}

/* ---------------- PERFIS ---------------- */

function PerfisTab() {
  const perfis = usePerfis();
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Perfis de Acesso</h2>
          <p className="text-xs text-muted-foreground">Defina o que cada perfil pode visualizar, cadastrar, aprovar ou excluir em cada módulo.</p>
        </div>
        <PerfilEditor trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> Novo perfil</Button>} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Perfil</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Módulos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {perfis.map((p) => {
              const totalMods = Object.keys(p.permissoes).filter((k) => (p.permissoes as any)[k]?.length > 0).length;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.nome}
                    {p.isAdminMaster && <Badge variant="secondary" className="ml-2 text-[10px]">ADMIN</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{p.descricao}</TableCell>
                  <TableCell><span className="font-mono text-xs">{p.isAdminMaster ? "todos" : `${totalMods}/${MODULES.length}`}</span></TableCell>
                  <TableCell>{p.ativo ? <Badge className="bg-success text-success-foreground">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <PerfilEditor perfil={p} trigger={<Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>} />
                    {!p.isAdminMaster && (
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                        onClick={() => { if (window.confirm(`Remover perfil ${p.nome}?`)) { removePerfil(p.id); toast.success("Perfil removido"); } }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function PerfilEditor({ perfil, trigger }: { perfil?: Perfil; trigger: React.ReactNode }) {
  const editing = !!perfil;
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(perfil?.nome ?? "");
  const [descricao, setDescricao] = useState(perfil?.descricao ?? "");
  const [ativo, setAtivo] = useState(perfil?.ativo ?? true);

  // Estado V2 (ver/alterar por módulo). Migra do modelo antigo se necessário.
  const initialV2 = (): Partial<Record<ModuleKey, PermissaoModulo>> => {
    if (perfil?.permissoesV2) return structuredClone(perfil.permissoesV2);
    const out: Partial<Record<ModuleKey, PermissaoModulo>> = {};
    for (const m of MODULES) {
      const acts = perfil?.permissoes?.[m.key] ?? [];
      const ver: PermLevel = acts.includes("visualizar") ? "todos" : "nenhum";
      const alteraSet: ActionKey[] = ["cadastrar","editar","aprovar","cancelar","excluir","alterar_status"];
      const alterar: PermLevel = acts.some((a) => alteraSet.includes(a)) ? "todos" : "nenhum";
      out[m.key] = { ver, alterar };
    }
    return out;
  };
  const [permsV2, setPermsV2] = useState<Partial<Record<ModuleKey, PermissaoModulo>>>(initialV2);
  const isAdmin = !!perfil?.isAdminMaster;

  const setLevel = (m: ModuleKey, campo: "ver" | "alterar", v: PermLevel) => {
    setPermsV2((cur) => {
      const atual = cur[m] ?? { ver: "nenhum", alterar: "nenhum" };
      const next: PermissaoModulo = { ...atual, [campo]: v };
      // Se não pode ver, também não pode alterar.
      if (campo === "ver" && v === "nenhum") next.alterar = "nenhum";
      // Se passou a poder alterar, garantir que ver tenha ao menos o mesmo escopo.
      if (campo === "alterar" && v !== "nenhum" && next.ver === "nenhum") next.ver = v;
      return { ...cur, [m]: next };
    });
  };

  const salvar = () => {
    if (!nome.trim()) { toast.error("Informe o nome do perfil"); return; }
    // Manter compat: deriva permissoes legacy a partir de V2.
    const legacy: Partial<Record<ModuleKey, ActionKey[]>> = {};
    for (const m of MODULES) {
      const p = permsV2[m.key] ?? { ver: "nenhum", alterar: "nenhum" };
      const acts: ActionKey[] = [];
      if (p.ver !== "nenhum") acts.push("visualizar");
      if (p.alterar !== "nenhum") acts.push("cadastrar","editar","alterar_status");
      if (acts.length) legacy[m.key] = acts;
    }
    const novo: Perfil = {
      id: perfil?.id ?? novoPerfilId(),
      nome: nome.trim(), descricao: descricao.trim(), ativo,
      isAdminMaster: perfil?.isAdminMaster,
      permissoes: perfil?.isAdminMaster ? (perfil?.permissoes ?? legacy) : legacy,
      permissoesV2: perfil?.isAdminMaster ? undefined : permsV2,
    };
    upsertPerfil(novo);
    toast.success(editing ? "Perfil atualizado" : "Perfil criado");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar perfil · ${perfil?.nome}` : "Novo perfil de acesso"}</DialogTitle>
          <DialogDescription>
            Para cada módulo, defina o que o perfil pode <b>Ver</b> e <b>Alterar</b>. O escopo
            "Apenas próprios" restringe aos registros do consultor vinculado ao usuário.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-2"><Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} disabled={isAdmin} />
          </div>
          <div className="space-y-1.5"><Label>Status</Label>
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Switch checked={ativo} onCheckedChange={setAtivo} disabled={isAdmin} />
              <span className="text-sm">{ativo ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-3"><Label>Descrição</Label>
            <Textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          </div>
        </div>

        {isAdmin ? (
          <div className="mt-4 rounded-md border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
            Admin Master tem acesso total a todos os módulos e ações por padrão. Permissões não podem ser editadas.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Módulo</TableHead>
                  <TableHead className="w-[220px]">Ver</TableHead>
                  <TableHead className="w-[220px]">Alterar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((m) => {
                  const p = permsV2[m.key] ?? { ver: "nenhum", alterar: "nenhum" };
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="font-medium text-sm">{m.label}</TableCell>
                      <TableCell>
                        <Select value={p.ver} onValueChange={(v) => setLevel(m.key, "ver", v as PermLevel)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PERM_LEVELS.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={p.alterar}
                          onValueChange={(v) => setLevel(m.key, "alterar", v as PermLevel)}
                          disabled={p.ver === "nenhum"}
                        >
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {PERM_LEVELS.map((l) => (
                              <SelectItem
                                key={l.key}
                                value={l.key}
                                // Não permitir "todos" alterar se "ver" for "proprios"
                                disabled={l.key === "todos" && p.ver === "proprios"}
                              >
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar}>Salvar perfil</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- USUÁRIOS ---------------- */

function UsuariosTab() {
  const usuarios = useUsuarios();
  const perfis = usePerfis();
  const consultores = useConsultores();
  const { user: atual } = useUsuarioAtual();
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Usuários</h2>
          <p className="text-xs text-muted-foreground">Cadastre usuários e atribua perfis de acesso.</p>
        </div>
        <UsuarioEditor trigger={<Button className="gap-2"><Plus className="h-4 w-4" /> Novo usuário</Button>} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail / login</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sessão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => {
              const p = perfis.find((x) => x.id === u.perfilId);
              const c = u.consultorId ? consultores.find((x) => x.id === u.consultorId) : null;
              const isAtual = atual?.id === u.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>{p?.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{c?.nome ?? "—"}</TableCell>
                  <TableCell className="text-xs">{u.setor}</TableCell>
                  <TableCell>{u.ativo ? <Badge className="bg-success text-success-foreground">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                  <TableCell>
                    {isAtual
                      ? <Badge>Atual</Badge>
                      : <Button size="sm" variant="outline" onClick={() => { setUsuarioAtual(u.id); toast.success(`Sessão alterada para ${u.nome}`); }}>Entrar como</Button>}
                  </TableCell>
                  <TableCell className="text-right">
                    <UsuarioEditor usuario={u} trigger={<Button size="icon" variant="ghost" className="h-7 w-7"><SquarePen className="h-3.5 w-3.5" /></Button>} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                      onClick={() => { if (window.confirm(`Remover usuário ${u.nome}?`)) { removeUsuario(u.id); toast.success("Usuário removido"); } }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="mt-3 text-[11px] text-muted-foreground">Use <b>Entrar como</b> para simular um usuário e ver o menu lateral filtrado pelo perfil.</div>
    </Card>
  );
}

function UsuarioEditor({ usuario, trigger }: { usuario?: Usuario; trigger: React.ReactNode }) {
  const editing = !!usuario;
  const perfis = usePerfis();
  const consultores = useConsultores();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Usuario>(usuario ?? {
    id: "", nome: "", email: "", senha: "", perfilId: perfis[0]?.id ?? "", setor: "", ativo: true, consultorId: undefined,
  });

  const salvar = () => {
    if (!f.nome.trim() || !f.email.trim()) { toast.error("Nome e e-mail são obrigatórios"); return; }
    if (!editing && !f.senha.trim()) { toast.error("Defina uma senha inicial"); return; }
    if (!f.perfilId) { toast.error("Selecione um perfil"); return; }
    const novo: Usuario = { ...f, id: f.id || novoUsuarioId() };
    upsertUsuario(novo);
    toast.success(editing ? "Usuário atualizado" : "Usuário cadastrado");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar usuário · ${usuario?.nome}` : "Novo usuário"}</DialogTitle>
          <DialogDescription>Defina perfil de acesso e dados de login.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2"><Label>Nome</Label>
            <Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>E-mail / login</Label>
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Senha {editing && <span className="text-[10px] text-muted-foreground">(deixe para alterar)</span>}</Label>
            <Input type="text" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} />
          </div>
          <div className="space-y-1.5"><Label>Perfil de acesso</Label>
            <Select value={f.perfilId} onValueChange={(v) => setF({ ...f, perfilId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {perfis.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Setor</Label>
            <Input value={f.setor} onChange={(e) => setF({ ...f, setor: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Consultor vinculado <span className="text-[10px] text-muted-foreground">(opcional)</span></Label>
            <Select
              value={f.consultorId ?? "__none__"}
              onValueChange={(v) => setF({ ...f, consultorId: v === "__none__" ? undefined : v })}
            >
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">— Nenhum —</SelectItem>
                {consultores.filter((c) => c.ativo).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Quando o perfil tiver permissão "Apenas próprios", o usuário verá/alterará somente
              registros do consultor aqui vinculado.
            </p>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
              <Switch checked={f.ativo} onCheckedChange={(v) => setF({ ...f, ativo: v })} />
              <span className="text-sm">{f.ativo ? "Ativo" : "Inativo"}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={salvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- PROPOSTA (campos travados / fórmulas) ---------------- */

function PropostaConfigTab() {
  const cfg = usePropostaConfig();
  const { perfil } = useUsuarioAtual();
  const ehAdmin = !!perfil?.isAdminMaster;

  const [tarifa, setTarifa] = useState(String(cfg.tarifaPadraoKwh));
  const [mb, setMb] = useState(String(cfg.inversorMultBaixa));
  const [ma, setMa] = useState(String(cfg.inversorMultAlta));

  const salvar = () => {
    const t = Number(String(tarifa).replace(",", "."));
    const b = Number(String(mb).replace(",", "."));
    const a = Number(String(ma).replace(",", "."));
    if (!t || t <= 0) { toast.error("Informe uma tarifa válida (R$/kWh)."); return; }
    if (!b || b <= 0 || !a || a <= 0) { toast.error("Informe multiplicadores válidos."); return; }
    setPropostaConfig({ tarifaPadraoKwh: t, inversorMultBaixa: b, inversorMultAlta: a });
    toast.success("Configurações da proposta atualizadas.");
  };

  return (
    <Card className="bg-[image:var(--gradient-card)] p-6">
      <h2 className="text-base font-semibold">Proposta — campos travados e fórmulas</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Estes valores aparecem travados na geração da proposta. Apenas Admin pode alterar.
      </p>

      <div className="mt-5 space-y-6">
        <section>
          <h3 className="text-sm font-medium">3. Dados da Fatura</h3>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Tarifa de energia (R$/kWh)</Label>
              <Input
                type="number"
                step="0.000001"
                value={tarifa}
                onChange={(e) => setTarifa(e.target.value)}
                disabled={!ehAdmin}
              />
              <p className="text-[11px] text-muted-foreground">Travada na proposta. Ex.: 1,151730</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium">6.1 Inversores — fórmula de capacidade</h3>
          <div className="mt-2 grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Multiplicador (≤ 37,5 kW)</Label>
              <Input type="number" step="0.01" value={mb} onChange={(e) => setMb(e.target.value)} disabled={!ehAdmin} />
              <p className="text-[11px] text-muted-foreground">Capacidade kWp = potência kW × multiplicador. Padrão: 1,60</p>
            </div>
            <div className="space-y-1.5">
              <Label>Multiplicador (≥ 40 kW)</Label>
              <Input type="number" step="0.01" value={ma} onChange={(e) => setMa(e.target.value)} disabled={!ehAdmin} />
              <p className="text-[11px] text-muted-foreground">Padrão: 1,80</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-sm font-medium">2. Localização — Parâmetro de irradiação</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            O valor é puxado por cidade (BASE REAL). Para alterar a base, vá em <strong>Propostas → Cadastros → Cidades</strong>.
          </p>
        </section>
      </div>

      {ehAdmin ? (
        <div className="mt-6 flex justify-end">
          <Button onClick={salvar} className="bg-[image:var(--gradient-primary)] text-primary-foreground">
            Salvar configurações da proposta
          </Button>
        </div>
      ) : (
        <div className="mt-6 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs">
          Apenas Admin Master pode alterar estes valores.
        </div>
      )}
    </Card>
  );
}

/* ---------------- PLACEHOLDER POR MÓDULO ---------------- */

function PlaceholderModuleConfig({ nome }: { nome: string }) {
  return (
    <Card className="bg-[image:var(--gradient-card)] p-6">
      <h2 className="text-base font-semibold">Configurações do {nome}</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Em breve: parâmetros, regras e personalizações específicas do módulo {nome}.
      </p>
      <div className="mt-4 rounded-md border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
        Nenhuma configuração disponível ainda para este módulo.
      </div>
    </Card>
  );
}

/* ---------------- CONSULTORES ---------------- */

function ConsultoresTab() {
  const lista = useConsultores();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Consultor | null>(null);

  function abrirNovo() { setEdit(novoConsultorVazio()); setOpen(true); }
  function abrirEditar(c: Consultor) { setEdit({ ...c }); setOpen(true); }

  function salvar() {
    if (!edit) return;
    if (!edit.nome.trim()) { toast.error("Informe o nome do consultor."); return; }
    upsertConsultor({ ...edit, nome: edit.nome.toUpperCase().trim() });
    toast.success("Consultor salvo.");
    setOpen(false); setEdit(null);
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Consultores</h2>
          <p className="text-xs text-muted-foreground">Base de consultores usados em propostas e contratos.</p>
        </div>
        <Button className="gap-2" onClick={abrirNovo}><Plus className="h-4 w-4" /> Novo consultor</Button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lista.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">Nenhum consultor cadastrado.</TableCell></TableRow>
            )}
            {lista.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.nome}</TableCell>
                <TableCell className="text-xs">{c.telefone ? formatTelefoneBR(c.telefone) : "—"}</TableCell>
                <TableCell className="text-xs">{c.email || "—"}</TableCell>
                <TableCell>{c.ativo ? <Badge className="bg-success text-success-foreground">Ativo</Badge> : <Badge variant="outline">Inativo</Badge>}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => abrirEditar(c)}><SquarePen className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive"
                    onClick={() => { if (window.confirm(`Remover consultor ${c.nome}?`)) { removeConsultor(c.id); toast.success("Consultor removido."); } }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEdit(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{edit && lista.some((x) => x.id === edit.id) ? "Editar consultor" : "Novo consultor"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="grid gap-3 py-2">
              <div><Label className="text-xs">Nome *</Label>
                <Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value.toUpperCase() })} />
              </div>
              <div><Label className="text-xs">Telefone</Label>
                <Input value={edit.telefone ?? ""} onChange={(e) => setEdit({ ...edit, telefone: formatTelefoneBR(e.target.value) })} placeholder="(00) 9 0000-0000" />
              </div>
              <div><Label className="text-xs">E-mail</Label>
                <Input type="email" value={edit.email ?? ""} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
                <Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} />
                <span className="text-sm">{edit.ativo ? "Ativo" : "Inativo"}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

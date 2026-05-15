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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  MODULES, ACTIONS, type ModuleKey, type ActionKey, type Perfil, type Usuario,
  usePerfis, useUsuarios, useUsuarioAtual, upsertPerfil, removePerfil, novoPerfilId,
  upsertUsuario, removeUsuario, novoUsuarioId, setUsuarioAtual,
} from "@/lib/perfis-store";
import { usePropostaConfig, setPropostaConfig } from "@/modules/propostas/proposta-config-store";
import { FileText } from "lucide-react";

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

        <TabsContent value="perfis" className="mt-5"><PerfisTab /></TabsContent>
        <TabsContent value="usuarios" className="mt-5"><UsuariosTab /></TabsContent>

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
  const [perms, setPerms] = useState<Partial<Record<ModuleKey, ActionKey[]>>>(
    () => perfil ? structuredClone(perfil.permissoes) : {}
  );
  const isAdmin = !!perfil?.isAdminMaster;

  const toggle = (m: ModuleKey, a: ActionKey) => {
    setPerms((cur) => {
      const arr = new Set(cur[m] ?? []);
      if (arr.has(a)) arr.delete(a); else arr.add(a);
      return { ...cur, [m]: Array.from(arr) };
    });
  };
  const toggleAllModule = (m: ModuleKey, on: boolean) => {
    setPerms((cur) => ({ ...cur, [m]: on ? ACTIONS.map((a) => a.key) : [] }));
  };

  const salvar = () => {
    if (!nome.trim()) { toast.error("Informe o nome do perfil"); return; }
    const novo: Perfil = {
      id: perfil?.id ?? novoPerfilId(),
      nome: nome.trim(), descricao: descricao.trim(), ativo,
      isAdminMaster: perfil?.isAdminMaster,
      permissoes: perms,
    };
    upsertPerfil(novo);
    toast.success(editing ? "Perfil atualizado" : "Perfil criado");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar perfil · ${perfil?.nome}` : "Novo perfil de acesso"}</DialogTitle>
          <DialogDescription>Marque as ações permitidas em cada módulo.</DialogDescription>
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
                  <TableHead className="min-w-[140px]">Módulo</TableHead>
                  {ACTIONS.map((a) => <TableHead key={a.key} className="text-center text-[10px]">{a.label}</TableHead>)}
                  <TableHead className="text-center text-[10px]">Tudo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MODULES.map((m) => {
                  const arr = perms[m.key] ?? [];
                  const allOn = arr.length === ACTIONS.length;
                  return (
                    <TableRow key={m.key}>
                      <TableCell className="font-medium text-sm">{m.label}</TableCell>
                      {ACTIONS.map((a) => (
                        <TableCell key={a.key} className="text-center">
                          <Checkbox checked={arr.includes(a.key)} onCheckedChange={() => toggle(m.key, a.key)} />
                        </TableCell>
                      ))}
                      <TableCell className="text-center">
                        <Checkbox checked={allOn} onCheckedChange={(v) => toggleAllModule(m.key, !!v)} />
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
              <TableHead>Setor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sessão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u) => {
              const p = perfis.find((x) => x.id === u.perfilId);
              const isAtual = atual?.id === u.id;
              return (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-xs">{u.email}</TableCell>
                  <TableCell>{p?.nome ?? "—"}</TableCell>
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
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Usuario>(usuario ?? {
    id: "", nome: "", email: "", senha: "", perfilId: perfis[0]?.id ?? "", setor: "", ativo: true,
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

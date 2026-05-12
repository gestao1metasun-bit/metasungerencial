import { createFileRoute } from "@tanstack/react-router";
import { Building2, ShieldCheck, Plug, ScrollText, Settings as SettingsIcon } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Meta Sun Gerencial" }] }),
  component: ConfigPage,
});

function ConfigPage() {
  return (
    <>
      <PageHeader title="Configurações" subtitle="Parâmetros do sistema, perfis e integrações." />
      <Tabs defaultValue="empresa">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="empresa"><Building2 className="mr-2 h-4 w-4" /> Empresa</TabsTrigger>
          <TabsTrigger value="parametros"><SettingsIcon className="mr-2 h-4 w-4" /> Parâmetros</TabsTrigger>
          <TabsTrigger value="perfis"><ShieldCheck className="mr-2 h-4 w-4" /> Perfis & Permissões</TabsTrigger>
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

        <TabsContent value="perfis" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Perfis e permissões</h2>
            <p className="mt-1 text-sm text-muted-foreground">Estrutura preparada para múltiplos perfis.</p>
            <div className="mt-4 space-y-3">
              {["Administrador", "Comercial", "Engenharia", "Financeiro", "Visualizador"].map((p) => (
                <div key={p} className="flex items-center justify-between rounded-lg border border-border bg-card/40 p-4">
                  <div>
                    <div className="font-medium">{p}</div>
                    <div className="text-xs text-muted-foreground">Permissões e restrições deste perfil.</div>
                  </div>
                  <Button variant="outline" size="sm">Editar permissões</Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integracoes" className="mt-5">
          <Card className="bg-[image:var(--gradient-card)] p-6">
            <h2 className="text-base font-semibold">Integrações futuras</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pronto para conectar com Sheets, CSV, Excel e APIs.</p>
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
                "[2025-05-11 17:30:44] marcos@metasun.com — Finalizou obra OB-0227",
                "[2025-05-11 14:02:09] sandra@metasun.com — Importou 12 lançamentos financeiros",
                "[2025-05-10 10:18:55] admin@metasun.com — Criou usuário U-04",
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

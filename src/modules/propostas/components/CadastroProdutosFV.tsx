// Cadastro de produtos (módulos fotovoltaicos e inversores) disponível para
// qualquer perfil de usuário, direto de dentro do editor de propostas.
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  useModulosFV, useInversoresFV,
  upsertModuloFV, removeModuloFV,
  upsertInversorFV, removeInversorFV,
} from "@/modules/propostas/store";

const uid = () => Math.random().toString(36).slice(2, 10);

export function CrudModulos() {
  const modulos = useModulosFV();
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [potencia, setPotencia] = useState<number>(620);
  const [largura, setLargura] = useState<number>(1.13);
  const [altura, setAltura] = useState<number>(2.38);

  function adicionar() {
    if (!marca.trim() || !potencia) { toast.error("Informe ao menos marca e potência."); return; }
    upsertModuloFV({
      id: uid(),
      marca: marca.trim().toUpperCase(),
      modelo: modelo.trim(),
      potenciaWp: potencia,
      larguraM: largura || 1.13,
      alturaM: altura || 2.38,
      ativo: true,
    });
    setMarca(""); setModelo("");
    toast.success("Módulo cadastrado.");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-6">
        <div><Label className="text-xs">Marca</Label><Input className="h-8" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
        <div><Label className="text-xs">Modelo</Label><Input className="h-8" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
        <div><Label className="text-xs">Potência (Wp)</Label><Input className="h-8" type="number" value={potencia} onChange={(e) => setPotencia(+e.target.value)} /></div>
        <div><Label className="text-xs">Largura (m)</Label><Input className="h-8" type="number" step="0.01" value={largura} onChange={(e) => setLargura(+e.target.value)} /></div>
        <div><Label className="text-xs">Altura (m)</Label><Input className="h-8" type="number" step="0.01" value={altura} onChange={(e) => setAltura(+e.target.value)} /></div>
        <div className="flex items-end"><Button size="sm" className="w-full gap-1" onClick={adicionar}><Plus className="h-3 w-3" /> Adicionar</Button></div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead><TableHead>Modelo</TableHead>
              <TableHead className="text-right">Wp</TableHead>
              <TableHead className="text-right">Dimensões</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {modulos.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground">Nenhum módulo cadastrado.</TableCell></TableRow>
            )}
            {modulos.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-xs">{m.marca}</TableCell>
                <TableCell className="text-xs">{m.modelo || "—"}</TableCell>
                <TableCell className="text-right text-xs">{m.potenciaWp}</TableCell>
                <TableCell className="text-right text-xs">{m.larguraM} × {m.alturaM} m</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeModuloFV(m.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function CrudInversores() {
  const inversores = useInversoresFV();
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [potencia, setPotencia] = useState<number>(5);
  const [tipo, setTipo] = useState("String");

  function adicionar() {
    if (!marca.trim() || !potencia) { toast.error("Informe ao menos marca e potência."); return; }
    upsertInversorFV({
      id: uid(),
      marca: marca.trim().toUpperCase(),
      modelo: modelo.trim(),
      potenciaKw: potencia,
      tipo,
      ativo: true,
    });
    setMarca(""); setModelo("");
    toast.success("Inversor cadastrado.");
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 md:grid-cols-5">
        <div><Label className="text-xs">Marca</Label><Input className="h-8" value={marca} onChange={(e) => setMarca(e.target.value)} /></div>
        <div><Label className="text-xs">Modelo</Label><Input className="h-8" value={modelo} onChange={(e) => setModelo(e.target.value)} /></div>
        <div><Label className="text-xs">Potência (kW)</Label><Input className="h-8" type="number" step="0.1" value={potencia} onChange={(e) => setPotencia(+e.target.value)} /></div>
        <div><Label className="text-xs">Tipo</Label><Input className="h-8" value={tipo} onChange={(e) => setTipo(e.target.value)} /></div>
        <div className="flex items-end"><Button size="sm" className="w-full gap-1" onClick={adicionar}><Plus className="h-3 w-3" /> Adicionar</Button></div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Marca</TableHead><TableHead>Modelo</TableHead>
              <TableHead className="text-right">kW</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {inversores.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-xs text-muted-foreground">Nenhum inversor cadastrado.</TableCell></TableRow>
            )}
            {inversores.map((i) => (
              <TableRow key={i.id}>
                <TableCell className="text-xs">{i.marca}</TableCell>
                <TableCell className="text-xs">{i.modelo || "—"}</TableCell>
                <TableCell className="text-right text-xs">{i.potenciaKw}</TableCell>
                <TableCell className="text-xs">{i.tipo || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeInversorFV(i.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

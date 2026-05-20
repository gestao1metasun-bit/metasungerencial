// Store de Perfis de Acesso e Usuários (localStorage + reativo).
import { useSyncExternalStore } from "react";

export type ModuleKey =
  | "dashboard" | "comercial" | "propostas" | "financiamentos" | "engenharia"
  | "estoque" | "cadastros" | "relatorios" | "configuracoes";

export const MODULES: { key: ModuleKey; label: string; path: string }[] = [
  { key: "dashboard", label: "Dashboard Geral", path: "/dashboard" },
  { key: "comercial", label: "Comercial", path: "/comercial" },
  { key: "propostas", label: "Orçamentos", path: "/propostas" },
  { key: "financiamentos", label: "Financiamentos", path: "/financiamentos" },
  { key: "engenharia", label: "Engenharia", path: "/engenharia" },
  { key: "estoque", label: "Estoque", path: "/estoque" },
  { key: "cadastros", label: "Cadastros", path: "/cadastros" },
  { key: "relatorios", label: "Relatórios", path: "/relatorios" },
  { key: "configuracoes", label: "Configurações", path: "/configuracoes" },
];

export type ActionKey =
  | "visualizar" | "cadastrar" | "editar" | "aprovar" | "cancelar"
  | "excluir" | "alterar_status" | "exportar" | "importar"
  | "relatorios" | "configuracoes";

export const ACTIONS: { key: ActionKey; label: string }[] = [
  { key: "visualizar", label: "Visualizar" },
  { key: "cadastrar", label: "Cadastrar" },
  { key: "editar", label: "Editar" },
  { key: "aprovar", label: "Aprovar" },
  { key: "cancelar", label: "Cancelar" },
  { key: "excluir", label: "Excluir" },
  { key: "alterar_status", label: "Alterar status" },
  { key: "exportar", label: "Exportar" },
  { key: "importar", label: "Importar" },
  { key: "relatorios", label: "Acessar relatórios" },
  { key: "configuracoes", label: "Acessar configurações" },
];

export type PermLevel = "nenhum" | "proprios" | "todos";
export const PERM_LEVELS: { key: PermLevel; label: string }[] = [
  { key: "nenhum", label: "Não pode" },
  { key: "proprios", label: "Apenas próprios" },
  { key: "todos", label: "Todos" },
];
export type PermissaoModulo = { ver: PermLevel; alterar: PermLevel };

export type Perfil = {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  isAdminMaster?: boolean;
  permissoes: Partial<Record<ModuleKey, ActionKey[]>>;
  /** Novo modelo: por módulo, escopo de Ver e Alterar (todos / próprios / nenhum). */
  permissoesV2?: Partial<Record<ModuleKey, PermissaoModulo>>;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  senha: string;
  perfilId: string;
  setor: string;
  ativo: boolean;
  /** Vínculo opcional com um consultor de vendas. */
  consultorId?: string;
};

const ALL_ACTIONS: ActionKey[] = ACTIONS.map((a) => a.key);
const ALL_MODULES: ModuleKey[] = MODULES.map((m) => m.key);
const allPerms = (): Partial<Record<ModuleKey, ActionKey[]>> =>
  Object.fromEntries(ALL_MODULES.map((m) => [m, [...ALL_ACTIONS]]));
const onlyView = (mods: ModuleKey[]): Partial<Record<ModuleKey, ActionKey[]>> =>
  Object.fromEntries(mods.map((m) => [m, ["visualizar"]]));

const seedPerfis: Perfil[] = [
  { id: "P-ADMIN", nome: "Admin Master", descricao: "Acesso total ao sistema", ativo: true, isAdminMaster: true, permissoes: allPerms() },
  { id: "P-DIR", nome: "Diretoria", descricao: "Visão executiva e aprovações", ativo: true,
    permissoes: {
      dashboard: ALL_ACTIONS, comercial: ["visualizar","aprovar","cancelar","exportar","relatorios"],
      financiamentos: ["visualizar","aprovar","relatorios"], engenharia: ["visualizar","relatorios"],
      estoque: ["visualizar","relatorios"], cadastros: ["visualizar"], relatorios: ALL_ACTIONS,
    } },
  { id: "P-COM", nome: "Comercial", descricao: "Vendas, propostas e contratos", ativo: true,
    permissoes: {
      dashboard: ["visualizar"], comercial: ["visualizar","cadastrar","editar","alterar_status","exportar"],
      cadastros: ["visualizar","cadastrar","editar"], relatorios: ["visualizar","exportar"],
    } },
  { id: "P-GCOM", nome: "Gerente Comercial", descricao: "Aprovação e gestão de equipe comercial", ativo: true,
    permissoes: {
      dashboard: ALL_ACTIONS, comercial: ALL_ACTIONS, cadastros: ["visualizar","cadastrar","editar"],
      relatorios: ALL_ACTIONS,
    } },
  { id: "P-FIN", nome: "Financiamentos", descricao: "Operações bancárias e liberações", ativo: true,
    permissoes: {
      dashboard: ["visualizar"], financiamentos: ALL_ACTIONS, cadastros: ["visualizar"],
      relatorios: ["visualizar","exportar"],
    } },
  { id: "P-ENG", nome: "Engenharia", descricao: "Execução de obras e projetos", ativo: true,
    permissoes: {
      dashboard: ["visualizar"], engenharia: ALL_ACTIONS, estoque: ["visualizar"],
      cadastros: ["visualizar"], relatorios: ["visualizar","exportar"],
    } },
  { id: "P-EST", nome: "Estoque", descricao: "Controle de materiais", ativo: true,
    permissoes: { dashboard: ["visualizar"], estoque: ALL_ACTIONS, cadastros: ["visualizar"] } },
  { id: "P-INST", nome: "Instalador", descricao: "Equipe de campo", ativo: true,
    permissoes: onlyView(["engenharia","estoque"]) },
  { id: "P-EXT", nome: "Consultor Externo", descricao: "Visualização restrita", ativo: true,
    permissoes: { comercial: ["visualizar"] } },
];

const seedUsuarios: Usuario[] = [
  { id: "U-001", nome: "Admin Master", email: "admin@metasun.com", senha: "admin", perfilId: "P-ADMIN", setor: "Administração", ativo: true },
  { id: "U-002", nome: "Renan Costa",  email: "renan@metasun.com", senha: "123456", perfilId: "P-ADMIN", setor: "Diretoria", ativo: true },
  { id: "U-003", nome: "João Silva",   email: "joao@metasun.com",  senha: "123456", perfilId: "P-COM",   setor: "Comercial", ativo: true },
  { id: "U-004", nome: "Rafael Lima",  email: "rafael@metasun.com",senha: "123456", perfilId: "P-ENG",   setor: "Engenharia", ativo: true },
];

const KEY_P = "ms.perfis.v1";
const KEY_U = "ms.usuarios.v1";
const KEY_CUR = "ms.usuarioAtual.v1";

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }
function subscribe(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }

let cachePerfis: Perfil[] | null = null;
let cacheUsuarios: Usuario[] | null = null;
let cacheCurrent: string | null = null;

function readPerfis(): Perfil[] {
  if (cachePerfis) return cachePerfis;
  if (typeof window === "undefined") { cachePerfis = seedPerfis; return cachePerfis; }
  try { const raw = localStorage.getItem(KEY_P); if (raw) { cachePerfis = JSON.parse(raw); return cachePerfis!; } } catch {}
  cachePerfis = seedPerfis;
  try { localStorage.setItem(KEY_P, JSON.stringify(cachePerfis)); } catch {}
  return cachePerfis;
}
function writePerfis(next: Perfil[]) {
  cachePerfis = next;
  try { localStorage.setItem(KEY_P, JSON.stringify(next)); } catch {}
  notify();
}

function readUsuarios(): Usuario[] {
  if (cacheUsuarios) return cacheUsuarios;
  if (typeof window === "undefined") { cacheUsuarios = seedUsuarios; return cacheUsuarios; }
  try { const raw = localStorage.getItem(KEY_U); if (raw) { cacheUsuarios = JSON.parse(raw); return cacheUsuarios!; } } catch {}
  cacheUsuarios = seedUsuarios;
  try { localStorage.setItem(KEY_U, JSON.stringify(cacheUsuarios)); } catch {}
  return cacheUsuarios;
}
function writeUsuarios(next: Usuario[]) {
  cacheUsuarios = next;
  try { localStorage.setItem(KEY_U, JSON.stringify(next)); } catch {}
  notify();
}

function readCurrent(): string {
  if (cacheCurrent) return cacheCurrent;
  if (typeof window === "undefined") { cacheCurrent = "U-001"; return cacheCurrent; }
  try { const raw = localStorage.getItem(KEY_CUR); if (raw) { cacheCurrent = raw; return raw; } } catch {}
  cacheCurrent = "U-001";
  try { localStorage.setItem(KEY_CUR, cacheCurrent); } catch {}
  return cacheCurrent;
}
export function setUsuarioAtual(id: string) {
  cacheCurrent = id;
  try { localStorage.setItem(KEY_CUR, id); } catch {}
  notify();
}

function snap() {
  return { perfis: readPerfis(), usuarios: readUsuarios(), atualId: readCurrent() };
}
let snapCache: ReturnType<typeof snap> | null = null;
function getSnapshot() {
  const s = snap();
  if (
    snapCache &&
    snapCache.perfis === s.perfis &&
    snapCache.usuarios === s.usuarios &&
    snapCache.atualId === s.atualId
  ) return snapCache;
  snapCache = s;
  return s;
}

export function usePerfisStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function usePerfis(): Perfil[] { return usePerfisStore().perfis; }
export function useUsuarios(): Usuario[] { return usePerfisStore().usuarios; }
export function useUsuarioAtual(): { user: Usuario | null; perfil: Perfil | null } {
  const { perfis, usuarios, atualId } = usePerfisStore();
  const user = usuarios.find((u) => u.id === atualId) ?? usuarios[0] ?? null;
  const perfil = user ? perfis.find((p) => p.id === user.perfilId) ?? null : null;
  return { user, perfil };
}

/* CRUD perfis */
export function upsertPerfil(p: Perfil) {
  const cur = readPerfis();
  const i = cur.findIndex((x) => x.id === p.id);
  writePerfis(i >= 0 ? cur.map((x, idx) => idx === i ? p : x) : [...cur, p]);
}
export function removePerfil(id: string) {
  const cur = readPerfis();
  const p = cur.find((x) => x.id === id);
  if (p?.isAdminMaster) return;
  writePerfis(cur.filter((x) => x.id !== id));
}
export function novoPerfilId(): string { return `P-${Date.now().toString(36).toUpperCase()}`; }

/* CRUD usuários */
export function upsertUsuario(u: Usuario) {
  const cur = readUsuarios();
  const i = cur.findIndex((x) => x.id === u.id);
  writeUsuarios(i >= 0 ? cur.map((x, idx) => idx === i ? u : x) : [...cur, u]);
}
export function removeUsuario(id: string) {
  writeUsuarios(readUsuarios().filter((x) => x.id !== id));
}
export function novoUsuarioId(): string {
  const cur = readUsuarios();
  const n = cur.length + 1;
  return `U-${String(n).padStart(3, "0")}`;
}

/* Helpers de permissão */
export function podeAcessarModulo(perfil: Perfil | null, modulo: ModuleKey): boolean {
  if (!perfil || !perfil.ativo) return false;
  if (perfil.isAdminMaster) return true;
  const acts = perfil.permissoes[modulo];
  return !!acts && acts.length > 0;
}
export function podeExecutar(perfil: Perfil | null, modulo: ModuleKey, acao: ActionKey): boolean {
  if (!perfil || !perfil.ativo) return false;
  if (perfil.isAdminMaster) return true;
  return !!perfil.permissoes[modulo]?.includes(acao);
}

/** Deriva a permissão V2 (ver/alterar) a partir do modelo antigo, se V2 não estiver definido. */
function derivarPermV2(perfil: Perfil, modulo: ModuleKey): PermissaoModulo {
  if (perfil.isAdminMaster) return { ver: "todos", alterar: "todos" };
  const v2 = perfil.permissoesV2?.[modulo];
  if (v2) return v2;
  const acts = perfil.permissoes[modulo] ?? [];
  const ver: PermLevel = acts.includes("visualizar") ? "todos" : "nenhum";
  const alteraSet: ActionKey[] = ["cadastrar","editar","aprovar","cancelar","excluir","alterar_status"];
  const alterar: PermLevel = acts.some((a) => alteraSet.includes(a)) ? "todos" : "nenhum";
  return { ver, alterar };
}

export function getPermissaoModulo(perfil: Perfil | null, modulo: ModuleKey): PermissaoModulo {
  if (!perfil || !perfil.ativo) return { ver: "nenhum", alterar: "nenhum" };
  return derivarPermV2(perfil, modulo);
}
export function podeVer(perfil: Perfil | null, modulo: ModuleKey): PermLevel {
  return getPermissaoModulo(perfil, modulo).ver;
}
export function podeAlterar(perfil: Perfil | null, modulo: ModuleKey): PermLevel {
  return getPermissaoModulo(perfil, modulo).alterar;
}


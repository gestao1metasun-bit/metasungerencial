import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join } from 'path';

const files = [];
function walk(d){ for(const e of readdirSync(d)){ const p=join(d,e); const s=statSync(p); if(s.isDirectory()) walk(p); else if(/\.(ts|tsx)$/.test(e)) files.push(p); } }
walk('src');

const CLASS = [
  [/^(ff:|d15_|D15_|feature-|flag-)/i, 'FEATURE_FLAG_OK'],
  [/^(theme|sidebar|grid-density|columns?[-:]|col-width|col-order|tab[-:]|ui[-:]|view[-:]|filter-ui|enterprise-shell|d6[-:]|favoritos|recentes|kanban[-:]|preview-device|toolbar[-:]|panel[-:]|drawer[-:]|active-tab|ms\.ui|ms\.pref|density)/i, 'UI_PREF_OK'],
  [/^(cache[-:]|draft[-:]|wip[-:]|tmp[-:]|ms\.cache|ms\.draft)/i, 'CACHE_OK'],
  [/^(ms\.audit|audit[-:])/i, 'AUDIT_LEGADO_MIGRAR'],
  [/^(identidade|ms\.identidade|ms\.user|ms\.sessao)/i, 'IDENTIDADE_REVISAR'],
  [/(fin|titul|parcel|baix|movim|lanc|cobranc|renegoc|estorn|adiant|concil|fechament|rescis|pendenc|fornec|banco|conta-financ|meios-pag|natureza|centro-cust|grupos|tipos-aplic|parametros-financ|compras-transit)/i, 'OP_FINANCEIRO'],
  [/(contrato|aditiv|projetos-contrato)/i, 'OP_CONTRATO'],
  [/(proposta)/i, 'OP_PROPOSTA'],
  [/(lead|cliente|consultor|gerente|equipe|carteira)/i, 'OP_COMERCIAL'],
  [/(estoque|compras|os[-:]|pedido)/i, 'OP_ESTOQUE_COMPRAS'],
  [/(engenharia|obra)/i, 'OP_ENGENHARIA'],
  [/(posvenda|pos-venda)/i, 'OP_POSVENDA'],
  [/(anexo|attachment)/i, 'OP_ANEXO'],
  [/(usuario|perfil|permissao|workflow|aprovacao)/i, 'OP_GOVERNANCA'],
  [/(seed|dev-)/i, 'DEV_SEED_REMOVER'],
];
const classify = (k) => { for(const [r,c] of CLASS) if(r.test(k)) return c; return 'INDETERMINADO'; };

// extract: const NAME = 'string'  OR  const NAME = `string`
const reConst = /(?:const|let|var)\s+([A-Z_][A-Z0-9_]*)\s*=\s*[`'"]([^`'"]+)[`'"]/g;
// localStorage.xxx(IDENT or "literal" or `literal`)
const reLS = /localStorage\.(getItem|setItem|removeItem)\s*\(\s*([^,)]+?)\s*[,)]/g;

const reads = {}, writes = {}, fileMap = {};
const filesWithLS = new Set();

for(const f of files){
  let src;
  try { src = readFileSync(f,'utf8'); } catch { continue; }
  if(!/localStorage\./.test(src)) continue;
  filesWithLS.add(f);

  const consts = {};
  reConst.lastIndex = 0;
  let cm;
  while((cm = reConst.exec(src))) consts[cm[1]] = cm[2];

  reLS.lastIndex = 0;
  let m;
  while((m = reLS.exec(src))){
    const op = m[1];
    let arg = m[2].trim();
    let key = null;
    const lit = arg.match(/^[`'"]([^`'"]+)[`'"]$/);
    if(lit) key = lit[1];
    else if(consts[arg]) key = consts[arg];
    else if(/^[`].*\${.*}/.test(arg)) {
      // template literal with interpolation -> capture prefix
      const pref = arg.match(/^`([^$`]+)\$/);
      key = pref ? pref[1] + '<DYN>' : '<DYN>';
    } else {
      key = `<EXPR:${arg.slice(0,40)}>`;
    }
    const bag = op === 'getItem' ? reads : writes;
    bag[key] = (bag[key]||0)+1;
    (fileMap[key] ||= new Set()).add(f);
  }
}

const allKeys = new Set([...Object.keys(reads), ...Object.keys(writes)]);
const rows = [...allKeys].sort().map(k => ({
  key: k, reads: reads[k]||0, writes: writes[k]||0,
  classification: classify(k), files: [...fileMap[k]].sort(),
}));
const byClass = {};
for(const r of rows){ (byClass[r.classification] ||= []).push(r); }
const totals = Object.fromEntries(Object.entries(byClass).map(([c,arr])=>[c, arr.length]));

console.log('FILES_WITH_LS', filesWithLS.size);
console.log('DISTINCT_KEYS', rows.length);
console.log('BY_CLASS', JSON.stringify(totals, null, 2));

let md = `# D15.2 — Auditoria LocalStorage (oficial)\n\nGerada por \`scripts/ls-audit.mjs\` em ${new Date().toISOString()}\n\n`;
md += `- Arquivos com uso de localStorage: **${filesWithLS.size}**\n`;
md += `- Chaves distintas detectadas: **${rows.length}**\n\n`;
md += `## Resumo\n\n| Classificação | Chaves | Política |\n|---|---|---|\n`;
const POL = {
  FEATURE_FLAG_OK:'MANTER',UI_PREF_OK:'MANTER',CACHE_OK:'MANTER',
  AUDIT_LEGADO_MIGRAR:'MIGRAR Supabase (Onda 5 já feita; remover gravação LS)',
  IDENTIDADE_REVISAR:'REVISAR (sessão Supabase é fonte oficial)',
  OP_FINANCEIRO:'PROIBIDO — refator para repository Supabase',
  OP_CONTRATO:'PROIBIDO — refator',OP_PROPOSTA:'PROIBIDO — refator',
  OP_COMERCIAL:'PROIBIDO — refator',OP_ESTOQUE_COMPRAS:'PROIBIDO — refator',
  OP_ENGENHARIA:'PROIBIDO — refator',OP_POSVENDA:'PROIBIDO — refator',
  OP_ANEXO:'PROIBIDO — refator',OP_GOVERNANCA:'PROIBIDO — refator',
  DEV_SEED_REMOVER:'REMOVER (seed dev não vai a produção)',
  INDETERMINADO:'CLASSIFICAR manualmente',
};
for(const [c,n] of Object.entries(totals).sort((a,b)=>b[1]-a[1])) md += `| ${c} | ${n} | ${POL[c]||'?'} |\n`;
md += `\n## Detalhe\n\n`;
for(const c of Object.keys(byClass).sort()){
  md += `### ${c} — ${byClass[c].length} chave(s) — ${POL[c]}\n\n| Chave | reads | writes | arquivos |\n|---|---|---|---|\n`;
  for(const r of byClass[c]) md += `| \`${r.key}\` | ${r.reads} | ${r.writes} | ${r.files.join('<br>')} |\n`;
  md += `\n`;
}
writeFileSync('docs/d15-2-localstorage-audit.md', md);
writeFileSync('docs/d15-2-localstorage-audit.json', JSON.stringify({ totals, rows, filesCount: filesWithLS.size }, null, 2));
console.log('WROTE docs/d15-2-localstorage-audit.{md,json}');

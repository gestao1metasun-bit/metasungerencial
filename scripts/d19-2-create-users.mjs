// D19.2 — Cria 20 usuários sintéticos para teste de carga.
// Usa API oficial supabase.auth.admin.createUser (NÃO toca schema auth direto).
// Role 'usuario' (apenas *.visualizar/atender/etc — sem destrutivos).
import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const N = 20;
const creds = [];
const errors = [];

for (let i = 1; i <= N; i++) {
  const n = String(i).padStart(2, '0');
  const email = `teste.carga+${n}@metasun.local`;
  const password = `LoadTest!${randomBytes(8).toString('base64url')}`;
  const nome = `Teste Carga ${n}`;

  try {
    // 1. Cria/recupera usuário auth (email_confirm bypassa verificação)
    let userId;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome, loadtest: true, ambiente: 'HOMOLOGACAO' },
    });
    if (cErr) {
      if (/already|registered|exists/i.test(cErr.message)) {
        // já existe → busca id e reseta a senha
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const ex = list?.users?.find((u) => u.email === email);
        if (!ex) throw cErr;
        userId = ex.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else {
        throw cErr;
      }
    } else {
      userId = created.user.id;
    }

    // 2. Profile (upsert por user_id)
    const { error: pErr } = await admin
      .from('profiles')
      .upsert({ user_id: userId, nome, email, cargo: 'TESTE_CARGA', ativo: true }, { onConflict: 'user_id' });
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    // 3. Role 'usuario' (idempotente)
    const { error: rErr } = await admin
      .from('user_roles')
      .upsert({ user_id: userId, role: 'usuario' }, { onConflict: 'user_id,role' });
    if (rErr) throw new Error(`role: ${rErr.message}`);

    creds.push({ email, password, user_id: userId });
    process.stdout.write(`✓ ${email}\n`);
  } catch (e) {
    errors.push({ email, error: String(e.message || e) });
    process.stdout.write(`✗ ${email}: ${e.message}\n`);
  }
}

const out = {
  meta: {
    created_at: new Date().toISOString(),
    total: N,
    ok: creds.length,
    failed: errors.length,
    ambiente: 'HOMOLOGACAO',
    role: 'usuario',
    nota: 'Usuários exclusivos para D19.2 Camada B. NÃO usar em operação real.',
  },
  credentials: creds,
  errors,
};
fs.mkdirSync('/mnt/documents', { recursive: true });
fs.writeFileSync('/mnt/documents/d19-2-loadtest-credentials.json', JSON.stringify(out, null, 2));
console.log(`\n💾 /mnt/documents/d19-2-loadtest-credentials.json — ${creds.length}/${N} ok, ${errors.length} erros`);

import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const START = 21, END = 50;
const newCreds = [];
const errors = [];

for (let i = START; i <= END; i++) {
  const n = String(i).padStart(2, '0');
  const email = `teste.carga+${n}@metasun.local`;
  const password = `LoadTest!${randomBytes(8).toString('base64url')}`;
  const nome = `Teste Carga ${n}`;
  try {
    let userId;
    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { full_name: nome, loadtest: true, ambiente: 'HOMOLOGACAO' },
    });
    if (cErr) {
      if (/already|registered|exists/i.test(cErr.message)) {
        const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const ex = list?.users?.find((u) => u.email === email);
        if (!ex) throw cErr;
        userId = ex.id;
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
      } else { throw cErr; }
    } else { userId = created.user.id; }

    const { error: pErr } = await admin.from('profiles')
      .upsert({ user_id: userId, nome, email, cargo: 'TESTE_CARGA', ativo: true }, { onConflict: 'user_id' });
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    const { error: rErr } = await admin.from('user_roles')
      .upsert({ user_id: userId, role: 'usuario' }, { onConflict: 'user_id,role' });
    if (rErr) throw new Error(`role: ${rErr.message}`);

    newCreds.push({ email, password, user_id: userId });
    process.stdout.write(`✓ ${email}\n`);
  } catch (e) {
    errors.push({ email, error: String(e.message || e) });
    process.stdout.write(`✗ ${email}: ${e.message}\n`);
  }
}

// Merge com os 20 existentes
const existing = JSON.parse(fs.readFileSync('/tmp/creds.json', 'utf8'));
const merged = {
  meta: { ...existing.meta, total: 50, ok: existing.credentials.length + newCreds.length, failed: errors.length, atualizado_em: new Date().toISOString() },
  credentials: [...existing.credentials, ...newCreds],
  errors,
};
fs.writeFileSync('/mnt/documents/d19-2-loadtest-credentials.json', JSON.stringify(merged, null, 2));
fs.writeFileSync('/tmp/creds50.json', JSON.stringify(merged, null, 2));
console.log(`\n💾 Total ${merged.credentials.length} credenciais (${newCreds.length} novas, ${errors.length} erros)`);

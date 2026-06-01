import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
const c = JSON.parse(process.env.CREDS_JSON)[0];

// 1) Sanity check direto via Supabase
const sb = createClient(process.env.VITE_SUPABASE_URL || 'https://wdjewfyjgeishqvohoau.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkamV3ZnlqZ2Vpc2hxdm9ob2F1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTE4OTgsImV4cCI6MjA5NDM2Nzg5OH0.bj0z3PInWmTgf6aidZ7_-SAygjRX9UDR69a0A-2Do-g');
const { data, error } = await sb.auth.signInWithPassword({ email: c.email, password: c.password });
console.log('Supabase auth:', error ? 'FAIL '+error.message : 'OK uid='+data.user.id);

// 2) Tenta UI fill com aguardando React hidratar
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_BIN });
const page = await browser.newPage();
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0,200)));
await page.goto('https://metasungerencial.lovable.app/login', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1500);
await page.fill('input[type="email"]', c.email);
await page.fill('input[type="password"]', c.password);
const btn = await page.$('button[type="submit"]');
console.log('button found:', !!btn);
await Promise.all([
  page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 25000 }).catch(e=>console.log('waitURL fail:',e.message.slice(0,150))),
  page.click('button[type="submit"]'),
]);
console.log('Final URL:', page.url());
await browser.close();

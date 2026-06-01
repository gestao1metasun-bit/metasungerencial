import { chromium } from 'playwright';
import fs from 'node:fs';
const creds = JSON.parse(fs.readFileSync('/mnt/documents/d19-2-loadtest-credentials.json','utf8'));
const cred = creds[0];
const browser = await chromium.launch({ headless: true, executablePath: '/bin/chromium' });
const ctx = await browser.newContext();
const page = await ctx.newPage();
page.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text().slice(0,200)); });
const t0 = Date.now();
try {
  await page.goto('https://metasungerencial.lovable.app/login', { waitUntil: 'networkidle', timeout: 45_000 });
  await page.waitForSelector('input[type="email"]', { timeout: 15_000 });
  await page.waitForTimeout(1200);
  await page.fill('input[type="email"]', cred.email);
  await page.fill('input[type="password"]', cred.password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log('LOGIN OK:', Date.now()-t0, 'ms — URL:', page.url());
} catch(e) {
  console.log('LOGIN FAIL:', Date.now()-t0, 'ms —', String(e).slice(0,400));
  console.log('Current URL:', page.url());
}
await browser.close();

import { chromium } from 'playwright';
const creds = JSON.parse(process.env.CREDS_JSON);
const c = creds[0];
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_BIN });
const page = await browser.newPage();
page.on('console', m => console.log('[console]', m.type(), m.text().slice(0,200)));
page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0,200)));
try {
  await page.goto('https://metasungerencial.lovable.app/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('URL após goto:', page.url());
  console.log('Title:', await page.title());
  const emailInputs = await page.$$('input[type="email"]');
  const pwInputs = await page.$$('input[type="password"]');
  console.log('email inputs:', emailInputs.length, 'pw inputs:', pwInputs.length);
  if (emailInputs.length) {
    await page.fill('input[type="email"]', c.email);
    await page.fill('input[type="password"]', c.password);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(u => !u.pathname.startsWith('/login'), { timeout: 20000 });
      console.log('Login OK, agora em:', page.url());
    } catch (e) {
      console.log('Login NÃO redirecionou. URL atual:', page.url());
      console.log('HTML snippet:', (await page.content()).slice(0, 500));
    }
  } else {
    console.log('HTML snippet:', (await page.content()).slice(0, 800));
  }
} catch (e) {
  console.log('Erro:', String(e).slice(0,400));
}
await browser.close();

// 產生「實物操作卡」PDF（第 23 版）：改了 public/hands-on.html 之後執行 node scripts/hands-on-pdf.mjs
// 需要 Playwright；可用 PLAYWRIGHT_MODULE 指定 playwright 的 index.mjs 路徑。
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const src = new URL('../public/hands-on.html', import.meta.url), out = fileURLToPath(new URL('../public/hands-on.pdf', import.meta.url));
const browser = await chromium.launch(), page = await browser.newPage();
await page.goto(src.href); await page.emulateMedia({ media: 'print' });
await page.pdf({ path: out, format: 'A4', preferCSSPageSize: true, printBackground: true });
await browser.close(); console.log('wrote', out);

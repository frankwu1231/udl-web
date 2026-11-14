// 表面積前測 HTML → PDF（學生卷隱藏教師區；答案卷隱藏題目），做法同面積前測的 make-pdfs.ps1。
// 用法：node docs/pretest-surface/make-pdfs.mjs [輸出資料夾] [zhuyin]（加 zhuyin 轉注音版 pretest-zhuyin/）
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const pw = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const chromium = pw.chromium || pw.default.chromium;
const here = dirname(fileURLToPath(import.meta.url));
const zy = process.argv[3] === 'zhuyin';
const out = process.argv[2] || join(here, zy ? 'pdf-zhuyin' : 'pdf');
const [srcDir, srcName, label] = zy ? ['pretest-zhuyin', 'pretest-zhuyin-', '注音版'] : ['pretest-versions', 'pretest-', '一般版'];
const STUDENT = '<style>.teacher{display:none!important}</style>';
const ANSWER = '<style>.sheet-head,.item{display:none!important}.teacher{break-before:auto!important}</style>';
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
const browser = await chromium.launch({ proxy });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
const tmp = join(here, '.tmp'); mkdirSync(tmp, { recursive: true });
for (const [dir, style, suffix] of [['學生卷', STUDENT, ''], ['答案卷', ANSWER, '_答案']]) mkdirSync(join(out, dir), { recursive: true });
for (let i = 1; i <= 20; i++) {
  const n = String(i).padStart(2, '0');
  const src = readFileSync(join(here, srcDir, `${srcName}${n}.html`), 'utf8');
  for (const [dir, style, suffix] of [['學生卷', STUDENT, ''], ['答案卷', ANSWER, '_答案']]) {
    const f = join(tmp, `${n}${suffix}.html`);
    writeFileSync(f, src.replace('</head>', style + '</head>'));
    await page.goto(pathToFileURL(f).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: join(out, dir, `表面積前測_${label}_卷號${n}${suffix}.pdf`), format: 'A4', margin: { top: '15mm', bottom: '15mm', left: '15mm', right: '15mm' }, printBackground: true });
  }
}
rmSync(tmp, { recursive: true, force: true });
await browser.close();
console.log('wrote 40 PDFs to', out);

import { chromium } from 'playwright';
const out = process.argv[2];
const b = await chromium.launch({ channel: 'msedge' });
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem('vendwiz-dark-mode', 'true'));
const p = await ctx.newPage();
await p.goto('http://localhost:5173/store/littleclayhouse', { waitUntil: 'networkidle' });
await p.mouse.move(700, 600);
await p.waitForTimeout(600);
console.log(await p.evaluate(() => {
  const h = document.querySelector('.sf-header');
  const cs = getComputedStyle(h);
  return { cls: h.className, bg: cs.backgroundColor, dark: document.documentElement.hasAttribute('data-dark'), focus: document.activeElement?.className, hover: h.matches(':hover'), fw: h.matches(':focus-within') };
}));
await p.screenshot({ path: `${out}/v7-dark.png`, clip: { x: 0, y: 0, width: 1440, height: 300 } });
await b.close();

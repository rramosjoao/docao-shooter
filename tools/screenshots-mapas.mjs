// Screenshots 18-mapa-<id>-{visao-geral,predio,telhado}.png com câmera livre (window.__cam)
// uso: SITE=http://localhost:8124/ node tools/screenshots-mapas.mjs [ids...]
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/';
const V = { // [câmera x,y,z, alvo x,y,z]
  arena: { 'visao-geral': [0, 46, 44, 0, 0, 2], predio: [-5.5, 5.1, -1, 12, 4, 0], telhado: [-29.5, 8.7, -6, 0, 3, 2] },
  'duas-pocilgas': { 'visao-geral': [0, 62, 56, 0, 0, -4], predio: [19, 5.1, 10.5, 0, 4, 10.5], telhado: [20.5, 8.7, 20.5, 0, 2, -12] },
  'celeiro-industrial': { 'visao-geral': [0, 64, 58, 0, 0, 0], predio: [-17, 5.3, -13, 4, 0.5, 4], telhado: [-19, 9, 14, 12, 6, -12] },
  mercadao: { 'visao-geral': [0, 58, 50, 0, 0, 0], predio: [26.5, 5.1, 1.5, -12, 2.5, -1], telhado: [29, 4.9, -22, 4, 1.5, -6] },
  'torres-do-barril': { 'visao-geral': [34, 46, 0, 0, 0, 0], predio: [-27.5, 5.1, 37, -4, 2, 14], telhado: [0, 10.2, 62.5, 0, 3, 20] },
  'vizinhanca-cheers': { 'visao-geral': [0, 50, 42, 0, 0, -1], predio: [-15, 5.1, -17.5, -4, 4.3, -9], telhado: [-14, 8.7, -17.5, 6, 4, 10] },
  'bar-cheers': { 'visao-geral': [0, 42, 32, 0, 0, -2], predio: [-12, 4.9, -16.5, 2, 1, 6], telhado: [17, 8.3, -18.5, -4, 1, 8] },
  'posto-nevasca': {
    'visao-geral': [0, 118, 16, 0, 0, 0],
    passarela: [-14, 7, -4, -23, 1.4, 28],
    'sala-fria': [6, 2.4, 9, 9, 3.2, 22],
    teleferico: [-12, 6, 36, -24, 3.2, 44],
    'patio-sul': [10, 7, -6, 0, 1.2, -22],
    'spawn-norte': [2, 9, 34, 0, 2, 52],
  },
};
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(V);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } }); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
await page.goto(SITE, { waitUntil: 'load', timeout: 90000 }); await page.waitForTimeout(1500);
for (const id of ids) {
  await page.evaluate((id) => { const D = window.__docao; window.__cam = null; D.startGame(id); D.player.invulnUntil = 1e9; D.player.pos.set(0, -50, 0); D.entities.forEach((e) => { if (!e.isPlayer) e.frozen = true; }); document.getElementById('hud').style.visibility = 'hidden'; }, id);
  for (const [nome, a] of Object.entries(V[id])) {
    await page.evaluate((a) => { window.__cam = { p: a.slice(0, 3), t: a.slice(3, 6), fov: 70 }; }, a); await page.waitForTimeout(1300);
    await page.screenshot({ path: `screenshots/18-mapa-${id}-${nome}.png` }); console.log(`screenshots/18-mapa-${id}-${nome}.png`);
  }
}
await page.evaluate(() => { window.__cam = null; document.getElementById('hud').style.visibility = ''; });
console.log(errs.length ? 'ERROS: ' + errs.join(' | ') : 'sem erros'); await browser.close();

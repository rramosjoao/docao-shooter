// Screenshots das caixas de munição da Invasão nos dois mapas. Uso: node tools/shot-municao.mjs [urlDoSite] [pastaDeSaida]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const SITE = process.argv[2] || 'http://127.0.0.1:8170/', OUT = process.argv[3] || 'screenshots/invasao-municao'; mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); }); page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => { localStorage.setItem('docao.name', 'Matheus'); });
await page.goto(SITE, { waitUntil: 'load' }); await page.waitForTimeout(3000);
const G = (fn, a) => page.evaluate(fn, a), wait = (ms) => page.waitForTimeout(ms);
for (const [id, label] of [['rodizio', 'rodizio'], ['fazenda-assombrada', 'fazenda']]) {
  await G(() => { const g = window.__docao; if (g.state !== 'menu') { g.pause(); document.getElementById('quitBtn').click(); } }); await wait(800);
  await page.selectOption('#modeSel', 'inv'); await wait(400);
  await G((i) => { document.getElementById('mapBtn').click(); document.querySelector(`#mapGrid .mapcard[data-map="${i}"]`).click(); const c = document.getElementById('mapClose'); if (c) c.click(); }, id); await wait(500);
  await page.click('#playBtn'); await wait(2500);
  const info = await G(() => { const g = window.__docao; g.inv.phaseEnd = g.time + 1e6; g.player.invulnUntil = 1e9;
    const pk = g.pickups.filter((p) => p.type === 'ammo' && p.pos.y < 0.5); // caixas de chão
    // ponto com mais caixas por perto (raio 22) e olhar pra elas
    let best = null; for (const c of pk) { const near = pk.filter((q) => Math.hypot(q.pos.x - c.pos.x, q.pos.z - c.pos.z) < 22); if (!best || near.length > best.near.length) best = { c, near }; }
    const cx = best.near.reduce((a, q) => a + q.pos.x, 0) / best.near.length, cz = best.near.reduce((a, q) => a + q.pos.z, 0) / best.near.length;
    return { total: g.pickups.filter((p) => p.type === 'ammo').length, ground: pk.length, best: best.near.length, cx, cz, bx: best.c.pos.x, bz: best.c.pos.z }; });
  console.log(id, JSON.stringify(info));
  await G(() => { document.getElementById('hud').classList.add('hidden'); document.getElementById('invBanner')?.classList.add('hidden'); });
  // 1) câmera livre alta sobre o aglomerado de caixas (olhando de cima pro chão)
  await G(([i, label]) => { window.__cam = { p: [i.cx - 8, label === 'rodizio' ? 48 : 24, i.cz + (label === 'rodizio' ? 40 : 20)], t: [i.cx, 0, i.cz], fov: label === 'rodizio' ? 66 : 62 }; }, [info, label]); await wait(1500);
  await page.screenshot({ path: `${OUT}/municao-${label}-visao-alta.png` });
  // 2) perto do chão, olhando uma caixa
  await G((i) => { window.__cam = { p: [i.bx + 2.2, 1.6, i.bz + 4.2], t: [i.bx, 0.7, i.bz], fov: 70 }; }, info); await wait(1500);
  await page.screenshot({ path: `${OUT}/municao-${label}-perto.png` });
  await G(() => { window.__cam = null; document.getElementById('hud').classList.remove('hidden'); });
  const pos = await G(() => { const g = window.__docao; return { y: g.camera.position.y, n: g.pickups.filter((p) => p.type === 'ammo' && p.active).length }; });
  console.log(label, 'caixas ativas', pos.n);
}
console.log(errors.length ? 'ERROS: ' + errors.slice(0, 3).join(' | ') : 'sem erro no console');
await browser.close();

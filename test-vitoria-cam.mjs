// Câmera da dança da vitória: o Docão inteiro (chapéu alto, Dourado flutuando) cabe com folga, e o zoom da mira não vaza pra dança.
// Uso: SITE=http://localhost:8124/ node test-vitoria-cam.mjs
import { chromium } from 'playwright';
const SITE = process.env.SITE || 'http://localhost:8124/';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'] });
for (const [vn, w, h, code, zoom] of [['desktop', 1280, 720, 'x1.0.0.h3', true], ['celular deitado', 844, 390, 'x1.0.0.c8', false], ['celular em pé', 390, 844, 'x1.0.0.h12', true]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } }); page.setDefaultTimeout(120000);
  await page.goto(SITE); await page.waitForFunction(() => !!window.__docao && window.__thumbsReady);
  await page.evaluate(({ code, zoom }) => {
    window.__endDt = 1 / 30; window.__danceT = 1.3;
    const g = window.__docao; g.startGame('arena');
    for (const e of g.entities) { e.frozen = true; e.invulnUntil = Infinity; }
    const p = g.player; p.skinId = code; p.vel.set(0, 0, 0);
    for (const e of g.entities) { e.kills = 0; e.deaths = 0; } p.kills = 20;
    if (zoom) { g.camera.fov = 22; g.camera.updateProjectionMatrix(); } // terminou mirando com a luneta
    g.endGame();
  }, { code, zoom });
  await page.waitForFunction(() => document.getElementById('gameover').classList.contains('dancing'));
  await page.waitForTimeout(500);
  const f = await page.evaluate(() => window.__docao.victoryFit());
  ok(f.fov === 75, `${vn}: dança na FOV normal (${f.fov}${zoom ? ', tinha terminado com zoom 22' : ''})`);
  ok(f.dist >= 4.5, `${vn}: câmera a ${f.dist.toFixed(2)} m do Docão`);
  ok(f.maxY <= 0.85 && f.minY >= -0.85 && f.minX >= -0.95 && f.maxX <= 0.95, `${vn}: Docão inteiro na tela com folga (x ${f.minX.toFixed(2)}..${f.maxX.toFixed(2)}, y ${f.minY.toFixed(2)}..${f.maxY.toFixed(2)}, altura ${f.h.toFixed(2)} m)`);
  await page.close();
}
await browser.close(); console.log(fails.length ? `${fails.length} FALHA(S)` : 'TUDO OK'); process.exit(fails.length ? 1 : 0);

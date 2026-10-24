// Modo Bomba online (protótipo). Precisa de: cd server && npx wrangler dev --var ALLOW_TEST:1  +  python3 -m http.server 8124
// Uso: node test-online-bomb.mjs [urlDoSite] [urlDoServidor]
import { chromium } from 'playwright';
const SITE = process.argv[2] || 'http://localhost:8124/', SERVER = process.argv[3] || 'ws://127.0.0.1:8787', SHOTS = process.env.SHOTS || 'screenshots';
const errors = [], fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } }); const A = await ctx.newPage();
A.on('console', (m) => { if (m.type() === 'error') errors.push(`[${m.type()}] ${m.text()}`); });
A.on('pageerror', (e) => errors.push(`[pageerror] ${e.message} ${e.stack}`));
await A.addInitScript(() => { localStorage.setItem('docao.name', 'Ana'); localStorage.setItem('docao.primary', '0'); });
await A.goto(`${SITE}?server=${encodeURIComponent(SERVER)}`, { waitUntil: 'load', timeout: 90000 }); await A.waitForTimeout(1500);
const G = (fn, a) => A.evaluate(fn, a); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, ms = 8000, a) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await A.evaluate(fn, a)) return true; await wait(200); } return false; }
await A.click('#onlineBtn'); await A.selectOption('#roomMax', '4'); await A.selectOption('#roomBots', '1'); await A.selectOption('#roomMode', 'bomb');
ok(await G(() => document.getElementById('roomMap').value === 'rodizio'), 'criar sala: escolher Bomba troca o mapa pro Rodízio do Docão');
if (process.env.MAP) await A.selectOption('#roomMap', process.env.MAP);
await A.click('#createBtn'); ok(await until(() => window.__docao.online && window.__docao.online.myId > 0), 'criou sala no Modo Bomba');
ok(await until(() => /BOMBA/.test(document.getElementById('lobbyInfo').textContent)), 'lobby mostra BOMBA');
await A.click('#lobbyTeamBtns .teambtn.t0'); await wait(500);
await A.click('#startOnline');
ok(await until(() => window.__docao.state === 'playing' && window.__docao.mode === 'bomb' && window.__docao.bomb.S && window.__docao.bomb.L, 15000), 'partida online no Modo Bomba (sites vieram do servidor)');
const s0 = await G(() => { const g = window.__docao, S = g.bomb.S; return { round: S.round, phase: S.phase, carrier: S.carrier, me: g.player.id, team: g.player.team, sites: g.bomb.L.sites.map((s) => [s.name, s.x, s.z]) }; });
console.log(JSON.stringify(s0));
ok(s0.round === 1 && s0.phase === 'prep' && s0.team === 0, 'rodada 1, preparação, Ana no Vermelho (Ataque)');
const sp = await G(() => { const g = window.__docao, L = g.bomb.L, p = g.player.pos, d = (l) => Math.min(...l.map((i) => Math.hypot(L.pts[i].x - p.x, L.pts[i].z - p.z))); return { map: g.map.id, pts: !!L.pts, atk: d(L.atk), def: d(L.def) }; });
ok(sp.pts && sp.atk < 1 && sp.def > 20, `servidor manda os spawns do modo Bomba e a Ana nasce no lado do Ataque (${JSON.stringify(sp)})`);
ok(await until(() => !document.getElementById('bLoad').classList.contains('hidden')), 'online: painel de troca de arma na preparação');
const w0 = await G(() => window.__docao.player.primary); await A.keyboard.press('Digit5'); await wait(400);
await A.screenshot({ path: `${SHOTS}/36-bomba-online-troca-chat.png` });
// chat fixo no canto (v1.8.2) não pode cobrir o placar/tempo da bomba nem o painel de troca
const ov = await G(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(), hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom; const c = r('socialHud'); return { hud: hit(c, r('bombhud')), top: hit(c, r('topbar')), load: hit(c, r('bLoad')) }; });
ok(!ov.hud && !ov.top && !ov.load, `chat do canto não cobre o HUD da bomba nem o painel (${JSON.stringify(ov)})`);
const w1 = await G(() => ({ p: window.__docao.player.primary, w: window.__docao.player.weapon }));
ok(w1.p !== w0 && w1.w === w1.p, `online: tecla 5 na preparação troca a primária (${w0} → ${w1.p})`);
ok(await until(() => window.__docao.bomb.S.phase === 'live', 15000), 'servidor libera a rodada depois de 10 s');
ok(await until(() => document.getElementById('bLoad').classList.contains('hidden'), 3000), 'online: VALENDO fecha o painel');
ok(await G((p) => window.__docao.player.primary === p && window.__docao.player.slots[0] === p, w1.p), 'online: a arma trocada continua depois do VALENDO');
const S1 = await G(() => window.__docao.bomb.S.carrier === window.__docao.player.id);
if (S1) { // Ana carrega: teleporta pro A (só com ALLOW_TEST) e segura E
  await G(() => { const g = window.__docao, p = g.player, s = g.bomb.L.sites[0]; p.pos.set(s.x, s.y, s.z); p.vel.set(0, 0, 0); p.invulnUntil = 1e9; g.online.net.send({ t: 'testGod', s: 30 }); g.online.net.send({ t: 'u', sq: p.sq, tp: 1, p: [s.x, s.y, s.z], v: [0, 0, 0], y: 0, pi: 0, g: 1, w: p.weapon }); });
  await wait(300); await A.keyboard.down('KeyE');
  ok(await until(() => window.__docao.bomb.S.phase === 'planted', 12000), 'Ana segurou E no A e o servidor plantou');
  await A.keyboard.up('KeyE');
} else {
  console.log('(o carregador é um bot: esperando os bots plantarem, até 110 s)');
  ok(await until(() => ['planted', 'end'].includes(window.__docao.bomb.S.phase), 115000), 'bots levaram o botijão e plantaram (ou a rodada acabou)');
}
const pl = await G(() => ({ phase: window.__docao.bomb.S.phase, feed: (window.__feedLog || []).slice(-4) })); console.log(JSON.stringify(pl));
await A.screenshot({ path: `${SHOTS}/31-bomba-online.png` });
if (pl.phase === 'planted') {
  ok(pl.feed.some((l) => /plantou o botijão/.test(l)), 'kill feed: "plantou o botijão"');
  ok(await until(() => window.__docao.bomb.S.phase === 'end', 60000), 'rodada acaba (explodiu ou desarmaram)');
  const r = await G(() => ({ reason: window.__docao.bomb.S.reason, score: window.__docao.bomb.S.score, booms: window.__bombBooms || 0 })); console.log(JSON.stringify(r));
  ok((r.reason === 'boom' && r.booms >= 1 && r.score[0] === 1) || (r.reason === 'defuse' && r.score[1] === 1), `fim de rodada online coerente (${r.reason})`);
}
ok(await until(() => window.__docao.bomb.S.round === 2, 20000), 'rodada 2 começa');
ok(!errors.length, 'sem erros no console' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
await browser.close(); console.log(fails.length ? `\n${fails.length} falha(s)` : '\nTudo OK'); process.exit(fails.length ? 1 : 0);

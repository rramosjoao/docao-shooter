// Desafio "5 abates com tiro na cabeça" (D03) de ponta a ponta.
// Parte 1 (sem servidor): tiro de verdade ('f') na cabeça de bot numa sala online conta 'hs' e 'k', vai pro io.stats
//   no fim da partida E na saída no meio (leave), junto com as Docoins; Treino não conta; sem conta não conta.
// Parte 2 (Worker + Room + D1 locais, ALLOW_TEST só no wrangler dev): conta com D03 no dia, 5 abates de cabeça online,
//   o /api/me mostra 5/5 feito e as moedas pagas (partida + prêmio do desafio), e sair no meio também grava.
// Uso: node test-desafios-hs.mjs [http://127.0.0.1:8787]     (sem servidor no ar, roda só a parte 1)
import { Game } from './server/src/game.js';
import { WEAPONS, PISTOL } from './shared/rules.js';
import { CHAL_BY_ID } from './shared/challenges.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK    ' : 'FALHA ') + m); if (!c) fails.push(m); };

function room(mode = 'dm', acct = { id: 77, nick: 'Teste' }) {
  const stats = [];
  const io = { send() {}, broadcast() {}, startLoop() {}, stopLoop() {}, stats: (rows) => stats.push(...rows) };
  const g = new Game({ code: 'TEST', map: 'arena', max: 8, fillBots: true, mode }, io);
  let fake = 1000; g.now = () => fake;
  const a = g.join({ name: 'A', acct: acct || undefined }).ent;
  g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const step = (n = 1, d = 0.05) => { for (let i = 0; i < n; i++) { fake += d; g.tick(); } };
  step(5); return { g, a, step, stats };
}
function headshot(R) { // põe o jogador 3 m na frente de um bot vivo e atira na cabeça dele com a pistola até cair
  const { g, a, step } = R;
  const bot = [...g.ents.values()].find((x) => x.bot && x.alive && !x.zt); if (!bot) return false;
  a.alive = true; a.hp = 100; a.invulnUntil = 1e9; a.weapon = PISTOL; a.slots = [0, PISTOL, 7]; a.mag[PISTOL] = WEAPONS[PISTOL].mag; a.reload = null; a.reloadEnd = 0;
  const k0 = a.kills;
  for (let i = 0; i < 8 && bot.alive; i++) {
    bot.vel = { x: 0, y: 0, z: 0 }; bot.crouch = 0; bot.invulnUntil = 0;
    a.pos = { x: bot.pos.x, y: bot.pos.y, z: bot.pos.z - 3 };
    const eye = [a.pos.x, bot.pos.y + 1.5, a.pos.z];
    g.onEvent(a, ['f', eye, [[0, 0, 1]], PISTOL, +g.T.toFixed(3), g.T]);
    if (bot.alive) step(12, 0.05);
  }
  return a.kills > k0;
}
const D03 = CHAL_BY_ID.D03;
ok(D03 && D03.ev === 'hs' && D03.goal === 5 && !D03.mo, `D03 = ${D03 && D03.goal} abates de cabeça em qualquer modo online (evento ${D03 && D03.ev})`);
{ // fim de partida
  const R = room('dm'); let n = 0;
  for (let i = 0; i < 12 && n < 5; i++) if (headshot(R)) n++;
  ok(n === 5, `5 abates com tiro de verdade na cabeça (${n})`);
  const hsN = (R.a.cq || {}).hs | 0;
  ok(hsN >= 4 && hsN <= 5 && (R.a.cq || {}).k >= 5, `a sala contou hs=${(R.a.cq || {}).hs} k=${(R.a.cq || {}).k}`);
  R.g.endMatch();
  const row = R.stats.find((r) => r.acct === 77 && r.m === 1);
  ok(!!row && row.q && row.q.hs === hsN, `fim da partida: io.stats leva q.hs = ${row && row.q && row.q.hs}`);
  ok(!!row && row.k >= 5 && row.c > 0, `e as Docoins da partida (c = ${row && row.c}, k = ${row && row.k})`);
}
{ // saiu no meio
  const R = room('dm'); let n = 0;
  for (let i = 0; i < 8 && n < 3; i++) if (headshot(R)) n++;
  const hs0 = (R.a.cq || {}).hs | 0; R.g.leave(R.a.id);
  const row = R.stats.find((r) => r.acct === 77);
  ok(hs0 > 0 && !!row && row.q && row.q.hs === hs0 && row.m === 0, `saiu no meio: grava o que contou (hs = ${row && row.q && row.q.hs}, partida não conta como jogada)`);
}
{ // Treino: não conta
  const R = room('treino'); for (let i = 0; i < 3; i++) headshot(R); R.g.endMatch && R.g.endMatch(); R.g.leave(R.a.id);
  ok(!R.stats.length, `Treino não manda nada pro io.stats (${R.stats.length})`);
}
{ // sem conta: não conta
  const R = room('dm', null); for (let i = 0; i < 3; i++) headshot(R); R.g.endMatch();
  ok(!R.stats.length, `convidado não grava (${R.stats.length})`);
}

// ---------- parte 2: servidor local ----------
const H = process.argv[2] || 'http://127.0.0.1:8787', WS = H.replace(/^http/, 'ws');
const up = await fetch(H + '/health').then((r) => r.ok).catch(() => false);
if (!up) console.log('(servidor local fora do ar: parte 2 pulada)');
else {
  const { SKINS } = await import('./skins.js');
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tag = Math.random().toString(36).slice(2, 5);
  const call = async (method, path, body, token) => { const r = await fetch(H + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
  const me = (t) => call('GET', '/api/me', null, t).then((r) => r.data);
  const join = (code, token) => new Promise((res) => {
    const q = new URLSearchParams({ name: 'x', skin: SKINS[0].id, primary: '0', secondary: '', melee: '', token: '' });
    const ws = new WebSocket(`${WS}/ws/${code}?${q}`, ['docao', 'tk.' + token]); const c = { ws };
    ws.onopen = () => setTimeout(() => res(c), 700); ws.onerror = () => res(c); c.send = (o) => ws.send(JSON.stringify(o));
  });
  const play = async (token, heads, end) => {
    const code = (await call('POST', '/api/rooms', { map: 'arena', max: 4, fillBots: true, mode: 'dm' })).data.code;
    const P = await join(code, token); P.send({ t: 'start' }); await wait(6000);
    for (let i = 0; i < heads; i++) { P.send({ t: 'testKill', head: 1 }); await wait(150); }
    if (end) { P.send({ t: 'testEnd' }); await wait(2500); }
    P.ws.close(); await wait(2000);
  };
  let tok = '', m = null, n = 0;
  for (; n < 120; n++) {
    const r = await call('POST', '/api/auth/register', { nick: 'Cabeca' + tag + n, password: 'senha-forte-123' }); if (r.status !== 201) { console.log('cadastro', r.status, r.data); break; }
    m = await me(r.data.token); if (m.chal && m.chal.list.some((x) => x.id === 'D03')) { tok = r.data.token; break; }
  }
  ok(!!tok, `achou conta com o D03 hoje (${n + 1} cadastros)`);
  if (tok) {
    const c0 = m.account.coins | 0, d = () => m.chal.list.find((x) => x.id === 'D03');
    ok(d().prog === 0 && !d().done, 'começa 0/5');
    await play(tok, 3, false); m = await me(tok);
    ok(d().prog === 3 && !d().done, `saiu no meio com 3 de cabeça: /api/me mostra ${d().prog}/5`);
    await play(tok, 2, true); m = await me(tok);
    ok(d().prog >= 5 && d().done, `mais 2 e fim de partida: ${d().prog}/5 feito`);
    const other = m.chal.list.filter((x) => x.id !== 'D03' && x.done).reduce((s, x) => s + x.reward, 0);
    ok((m.account.coins | 0) >= c0 + D03.reward, `Docoins pagas: ${c0} → ${m.account.coins} (prêmio do D03 ${D03.reward} + partida${other ? ' + outros feitos ' + other : ''})`);
    const c1 = m.account.coins | 0; await play(tok, 5, true); m = await me(tok);
    ok(d().done && (m.account.coins | 0) - c1 < D03.reward + 200, `de novo no mesmo dia: o D03 não paga duas vezes (${c1} → ${m.account.coins})`);
  }
}
console.log(fails.length ? `${fails.length} FALHA(S)` : 'TUDO OK'); process.exit(fails.length ? 1 : 0);

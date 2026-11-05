// Regras de ganho de Docoins no servidor (sem navegador, sem D1): abates, fim de partida, vitória, teto por partida, saída, Treino.
// Uso: node test-loja-regras.mjs
import { Game } from './server/src/game.js';
import { EARN } from './shared/closet.js';
const fails = []; const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
function mk(mode = 'dm', map = 'arena') {
  const stats = []; let fake = 1000;
  const g = new Game({ code: 'TEST', map, max: 8, fillBots: true, mode }, { send() {}, broadcast() {}, startLoop() {}, stopLoop() {}, stats: (items) => stats.push(...items) });
  g.now = () => fake; const a = g.join({ name: 'A', acct: { id: 7, nick: 'A', skin: '' } }).ent; g.welcome(a); g.onMessage(a.id, { t: 'start' }); a.connected = true;
  const step = (n = 1) => { for (let i = 0; i < n; i++) { fake += 0.05; g.tick(); } }; step(5);
  a.alive = true; a.hp = 100; a.invulnUntil = 1e9;
  const killBots = (n) => { for (let i = 0; i < n; i++) { const v = [...g.ents.values()].find((x) => x !== a && x.bot && !x.zt); v.alive = true; v.hp = 100; g.kill(v, a, 0, false); } };
  return { g, a, stats, step, killBots };
}
{ const { g, a, stats, killBots } = mk(); killBots(4);
  ok(a.ck === 4 * EARN.killBot, `4 abates em bots = ${4 * EARN.killBot} Docoins acumulados (${a.ck})`);
  g.T = 5; g.endMatch(); const s = stats.find((x) => x.acct === 7);
  ok(s && s.c === 4 * EARN.killBot, `fim de partida curta (<${EARN.minSecs}s): só os abates (c=${s && s.c})`); }
{ const { g, a, stats, killBots } = mk(); killBots(1); a.jt = 0; g.T = EARN.minSecs + 10; g.endMatch(); const s = stats.find((x) => x.acct === 7);
  const won = g.matchWon(a, [a]);
  ok(s && s.c === EARN.killBot + EARN.finish + (s.w ? EARN.win : 0), `partida de ${EARN.minSecs}s+: abate + bônus de fim${s && s.w ? ' + vitória' : ''} (c=${s && s.c}, w=${s && s.w})`); }
{ const { g, a, stats, killBots } = mk(); a.ck = 500; g.T = 200; g.endMatch(); const s = stats.find((x) => x.acct === 7);
  ok(s && s.c === EARN.matchCap, `teto por partida: ${EARN.matchCap} mesmo com 500 acumulados (c=${s && s.c})`); }
{ const { g, a, stats, killBots } = mk(); killBots(3); g.leave(a.id); const s = stats.find((x) => x.acct === 7);
  ok(s && s.c === 3 * EARN.killBot && !s.m, `sair no meio: leva os abates, sem bônus de fim e sem contar partida (c=${s && s.c}, m=${s && s.m})`);
  }
{ const { g, a, stats, killBots } = mk(); killBots(2); g.T = 70; g.flushStats(a, false); const n1 = stats.reduce((t, x) => t + (x.c | 0), 0); g.flushStats(a, false); g.flushStats(a, false);
  ok(stats.reduce((t, x) => t + (x.c | 0), 0) === n1, 'gravar o mesmo ganho várias vezes nunca soma de novo (delta por jogador)'); }
{ const { g, a, stats } = mk('treino', 'estande'); g.flushStats(a, true, true); ok(stats.length === 0, 'Treino: nada é gravado (sem Docoins, sem ranking)'); }
{ const { g, a, stats, killBots } = mk(); const t = [...g.ents.values()].find((x) => x.bot); a.ck = 0; g.kill(a, a, 0, false); ok(a.ck === 0, 'suicídio não rende'); }
console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK'); process.exit(fails.length ? 1 : 0);

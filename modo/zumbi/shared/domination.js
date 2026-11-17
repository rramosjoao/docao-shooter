// ============================================================
//  Modo Dominação (zonas de captura) — regras compartilhadas (offline + servidor). Sem DOM, sem Three.js.
//  Regras:
//   • 2 times (0 = Vermelho, 1 = Azul). Uma zona ativa por vez, sorteada num nó andável do grafo de navegação
//     (com chão suficiente em volta e longe da zona anterior).
//   • Só um time dentro: a zona enche em captureTime(n) = CAP_BASE − n segundos (n = jogadores do time dentro, máx. MAX_COUNT contam):
//     1 → 25 s, 2 → 24 s, 3 → 23 s … 10 → 16 s.
//     Se a zona tinha progresso do outro time, primeiro ele é neutralizado (desce na mesma velocidade) e depois vira.
//   • Os dois times dentro: CONTESTADA — o progresso congela.
//   • Ninguém dentro: o progresso decai DECAY por segundo até zerar (aí a zona volta a ser neutra).
//   • Progresso 100% = 1 ponto pro time; a zona some e outra aparece em outro lugar. Primeiro a WIN_CAPS vence.
//   • Fim do tempo (TIME_LIMIT_DOM): vence quem tiver mais zonas; empate = empate.
//   • Escolha de time: Vermelho / Azul / Automático. Escolha explícita é bloqueada se deixaria o time com
//     2+ humanos a mais que o outro (vai pro Automático). Bots completam os dois times até igualar.
// ============================================================
export const TEAM_NAMES = ['Vermelho', 'Azul'];
export const TEAM_COLORS = ['#ff4d4d', '#4da6ff'];
export const TEAM_HEX = [0xff4d4d, 0x4da6ff], TEAM_DARK = [0x8a0f0f, 0x0f3f8a];
export const DOM = { WIN_CAPS: 5, RADIUS: 4, HEIGHT: 2.6, CAP_BASE: 26, MAX_COUNT: 10, DECAY: 0.1, MIN_DIST: 18, TIME_LIMIT_DOM: 420 };
export const MODES = { dm: 'Mata-mata', dom: 'Dominação' };

// nó andável com chão em volta (≥ 6 nós do grafo dentro do raio, mesma altura) e longe da zona anterior
export function pickZone(nav, prev = null, rnd = Math.random) {
  const good = nav.good || []; if (!good.length) return { x: 0, y: 0, z: 0 };
  let best = null, bestScore = -Infinity;
  for (let i = 0; i < 80; i++) {
    const n = good[Math.floor(rnd() * good.length)];
    const dPrev = prev ? Math.hypot(n.x - prev.x, n.z - prev.z) : 99;
    let floor = 0; for (const m of good) if (Math.abs(m.y - n.y) < 0.4 && Math.hypot(m.x - n.x, m.z - n.z) < DOM.RADIUS * 0.8) floor++;
    if (floor < 6) continue;
    const score = Math.min(dPrev, DOM.MIN_DIST + 10) + rnd() * 6 + (dPrev < DOM.MIN_DIST ? -100 : 0);
    if (score > bestScore) { bestScore = score; best = n; }
  }
  best = best || good[Math.floor(rnd() * good.length)];
  return { x: best.x, y: best.y, z: best.z };
}
export function newZoneState(pos) { return { x: pos.x, y: pos.y, z: pos.z, progress: 0, team: -1, contested: false, counts: [0, 0] }; }
export const inZone = (zone, p) => Math.hypot(p.x - zone.x, p.z - zone.z) <= DOM.RADIUS && p.y >= zone.y - 1.2 && p.y <= zone.y + DOM.HEIGHT;
export function zoneCounts(zone, ents) {
  const c = [0, 0]; for (const e of ents) if (e.alive && (e.team === 0 || e.team === 1) && inZone(zone, e.pos)) c[e.team]++; return c;
}
// avança a zona; devolve o time que capturou (0/1) ou -1
// segundos pra encher a zona (de 0 a 100%) com n jogadores do mesmo time dentro
export const captureTime = (n) => DOM.CAP_BASE - Math.min(DOM.MAX_COUNT, Math.max(1, n));
export function stepZone(z, counts, dt) {
  z.counts = counts; const [a, b] = counts; z.contested = a > 0 && b > 0;
  if (z.contested) return -1;
  if (a || b) {
    const t = a ? 0 : 1, r = dt / captureTime(a || b);
    if (z.team === -1 || z.team === t) { z.team = t; z.progress += r; if (z.progress >= 1) { z.progress = 1; return t; } }
    else { z.progress -= r; if (z.progress <= 0) { z.team = t; z.progress = Math.min(1, -z.progress); } }
  } else if (z.progress > 0) { z.progress = Math.max(0, z.progress - DOM.DECAY * dt); if (z.progress === 0) z.team = -1; }
  return -1;
}
// times: escolha explícita respeitada se não deixar o time com 2+ humanos a mais; senão vai pro menor
export function canJoinTeam(team, counts) { return counts[team] - counts[1 - team] < 1; }
export function smallerTeam(counts, rnd = Math.random) { return counts[0] < counts[1] ? 0 : counts[1] < counts[0] ? 1 : (rnd() < 0.5 ? 0 : 1); }

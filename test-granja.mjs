// Regras da Granja: cinco por seção, alvos móveis, piso folgado, bônus e quickscope.
// Uso: node test-granja.mjs
import { GRANJA, GRANJA_TITLE, LINK_M, RAMP_M, RAMP_RISE, SECTION_M, BOLT_CHAIN, BOLT_M, RELOAD_M, QS_MAX, QS_CAP, FINISH_LINE, pitEnemies, pitCivils, pitMovers, pathParts, pathStats, perfectClock, rankFloor, starsOf, poseAt, inspectRun, rankedRun, scriptRun, onFinishLine, formatPit, samplePath } from './shared/granja.js';
import { BONUS, aimAt, traceBonus } from './shared/granja-bonus.js';
import { SPEED, WEAPONS } from './shared/rules.js';
import { getMap } from './maps.js';
import { mapSolids, createPhysics } from './shared/physics.js';
import { BOARD } from './shared/pocilga.js';

const fails = [];
const ok = (c, m) => { console.log((c ? 'OK   ' : 'FALHA') + ' ' + m); if (!c) fails.push(m); };
const gun = WEAPONS.find((w) => w.key === 'carabina');

ok(GRANJA_TITLE === 'Pistoleiro da Granja' && GRANJA.title === GRANJA_TITLE && GRANJA.map === 'granja', 'o nome do mapa é uma constante só');
ok(GRANJA.gun === gun && GRANJA.pistol === WEAPONS.findIndex((w) => w.key === 'carabina'), 'a arma é a Carabina do jogo, sem cópia dos números');
ok(gun.mag === 5 && gun.reload === 2.9 && gun.rate === 0.58 && gun.spread === 0.09 && gun.range === 180, 'a ficha da Carabina continua 5 / 2,9 s / 0,58 s / spread 0,09');
ok(GRANJA.knife == null && GRANJA.infiniteReserve === true, 'sem faca; a reserva infinita é só do modo');
ok(Math.abs(RELOAD_M - SPEED * gun.reload) < 0.02 && LINK_M >= RELOAD_M && RAMP_M >= RELOAD_M, `trecho de recarga ${LINK_M} m e rampa ${RAMP_M} m cobrem ${RELOAD_M} m (${gun.reload} s × ${SPEED} m/s)`);
ok(SECTION_M >= BOLT_M && BOLT_CHAIN > 2.4 && BOLT_CHAIN < 2.7, `seção de ${SECTION_M} m cobre a cadeia do pente (${BOLT_CHAIN} s, ${BOLT_M} m)`);

for (const b of GRANJA.bays) {
  const enemies = b.targets.filter((t) => t.kind === 'enemy');
  ok(enemies.length === 5, `${b.id} tem exatamente 5 Barriguinhas (${enemies.length})`);
}
ok(pitEnemies().length === 30 && pitCivils().length === 2, `30 placas e 2 civis (${pitEnemies().length}/${pitCivils().length})`);
ok(GRANJA.bays.find((b) => b.id === 'varal').targets.every((t) => t.move), 'a seção do varal inteira se mexe');
const kinds = new Set(pitMovers().map((t) => t.move.kind || t.move.axis));
ok(kinds.has('z') && kinds.has('x') && kinds.has('pendulum') && kinds.has('bob') && kinds.has('spin'), `trilhos, pêndulo, sobe-desce e giro (${[...kinds].join(',')})`);

const far = pitEnemies().filter((t) => t.far);
ok(far.length === 5 && far.every((t) => t.scale >= 1.8), 'o campo tem cinco placas grandes');
for (const t of far) {
  const dist = t.x - (-132);
  ok(dist >= 80 && dist <= 155, `${t.id} a ${dist.toFixed(0)} m da sacada`);
  const ang = (BOARD.h * t.scale) / dist;
  ok(ang > 0.035 && ang < 0.07, `${t.id} ocupa ${(ang * 180 / Math.PI).toFixed(2)}° na vertical`);
}
const close = pitEnemies().filter((t) => t.close);
ok(close.length === 5, 'o curral tem cinco placas de perto');
for (const t of close) {
  const ahead = t.x - (-132);
  ok(ahead > 2 && ahead < 18, `${t.id} dentro do curral`);
  const half = BOARD.w / 2;
  ok(half > 2.8 * 0.09 && half > 2.8 * 0.15 * 0.9, `${t.id} cobre o spread 0,09 e quase o hip andando 0,15 a 2,8 m (meia-face ${half.toFixed(2)} m)`);
}

const parts = pathParts();
for (const p of parts) {
  if (p.approach) continue;
  if (p.link === 'sobe' || p.link === 'desce') ok(Math.abs(p.len - RAMP_M) < 0.05 && Math.abs(p.y1 - p.y0) === RAMP_RISE, `rampa ${p.link} mede ${p.len} m`);
  else if (p.link) ok(Math.abs(p.len - LINK_M) < 0.05, `corredor ${p.link} mede ${p.len} m`);
  else if (p.section) ok(p.len + 0.05 >= SECTION_M || p.section === 'silo', `${p.section} mede ${p.len} m`);
  else if (p.finish) ok(p.len > 3 && p.len < 8, `a faixa fica ${p.len} m depois da última seção`);
}
const perfect = perfectClock();
const stats = pathStats();
ok(perfect > 28 && perfect < 36 && Math.abs(perfect - stats.total / SPEED) < 0.05, `corrida perfeita ${perfect} s em ${stats.total} m`);
ok(rankFloor() === 16 && rankFloor() < perfect * 0.6 && GRANJA.star3 === 50 && GRANJA.star2 === 64, `piso ${rankFloor()} s, estrelas ${formatPit(GRANJA.star3)} e ${formatPit(GRANJA.star2)}`);
ok(GRANJA.star3 > perfect + 12 && GRANJA.star2 > GRANJA.star3, 'as 3 estrelas ficam folgadas acima da corrida perfeita');
ok(starsOf(GRANJA.star3, 0, true) === 3 && starsOf(GRANJA.star3, 1, true) === 2 && starsOf(GRANJA.star2 + 0.01, 0, true) === 1, 'civil tira a 3ª estrela');

const moved = poseAt(pitMovers()[0], 0);
const later = poseAt(pitMovers()[0], 1.4);
ok(Math.abs(moved.x - later.x) + Math.abs(moved.z - later.z) + Math.abs(moved.y - later.y) > 0.3, 'o trilho muda com o tempo da corrida');
const spin = pitMovers().find((t) => t.move.kind === 'spin');
ok(Math.abs(poseAt(spin, 0.2).yaw - poseAt(spin, 1.4).yaw) > 0.4, 'o giro é função do tempo');
const bob = pitMovers().find((t) => t.move.kind === 'bob');
let bobSpan = 0;
for (let i = 0; i < 40; i++) bobSpan = Math.max(bobSpan, Math.abs(poseAt(bob, i / 8).y - poseAt(bob, 0).y));
ok(bobSpan > 0.8, `sobe e desce com o tempo (${bobSpan.toFixed(2)} m)`);
ok(poseAt(spin, 1.25).yaw === poseAt(spin, 1.25).yaw, 'a mesma hora cai no mesmo lugar');

const clean = rankedRun(scriptRun({ finish: 40 }));
ok(clean.ranked && clean.stars === 3 && clean.civs === 0 && clean.missed.length === 0 && clean.final === 40, `limpo em 40 s entra com 3 estrelas (${clean.reason} ${clean.final})`);
const nipped = rankedRun(scriptRun({ finish: 40, civs: ['c1'] }));
ok(nipped.ranked && nipped.stars === 2 && nipped.final === 43 && nipped.blocked3, `civil soma 3 s (${nipped.final})`);
const slow = rankedRun(scriptRun({ finish: GRANJA.star2 + 4 }));
ok(slow.ranked && slow.stars === 1, `acima de ${formatPit(GRANJA.star2)} fica com 1 estrela`);
const forgot = inspectRun(scriptRun({ finish: 40, skip: ['s4c'] }));
ok(!forgot.finished && forgot.reason === 'alvo' && forgot.missed.includes('s4c'), 'placa em pé trava a chegada');
const rifle = rankedRun(scriptRun({ finish: 40, rifle: true }));
ok(!rifle.finished && rifle.missed.length === 30, 'outra arma não derruba');
const fast = rankedRun(scriptRun({ finish: rankFloor() - 0.05 }));
ok(fast.finished && !fast.ranked && fast.reason === 'rápido', 'abaixo do piso o ranking recusa');
ok(rankedRun(scriptRun({ finish: rankFloor() })).ranked, 'no piso folgado o ranking aceita');
ok(!onFinishLine({ x: GRANJA.spawn[0], y: 0, z: GRANJA.spawn[1] }) && onFinishLine({ x: FINISH_LINE.x, y: 0, z: 40 }), 'só a faixa termina');

{
  const qs = rankedRun(scriptRun({ finish: 40, ads: 0.22 }));
  ok(qs.ranked && qs.qs === -QS_CAP && qs.final === 40 - QS_CAP, `quickscope tira no máximo ${QS_CAP} s (${qs.qs})`);
  const late = rankedRun(scriptRun({ finish: 40, ads: QS_MAX + 0.05 }));
  ok(late.ranked && late.qs === 0 && late.final === 40, 'luneta aberta demais não dá desconto');
  const snap = scriptRun({ finish: 40, ads: 0.2 });
  const one = snap.find((e) => e.k === 'hit' && e.id === 's1a');
  one.dx = 0; one.dy = 1; one.dz = 0;
  const missedRay = inspectRun(snap);
  ok(missedRay.missed.includes('s1a'), 'raio que não encontra a placa não conta');
}

{
  const eye = aimAt(-132, 1.7, 28, BONUS.x, BONUS.y, BONUS.z);
  const center = traceBonus(eye.ox, eye.oy, eye.oz, eye.dx, eye.dy, eye.dz, 180);
  ok(center && center.zone === 'center' && center.delta === -2, `miolo do bônus a ${center && center.t.toFixed(1)} m`);
  const ringEye = aimAt(-132, 1.7, 28, BONUS.x, BONUS.y + 0.9, BONUS.z);
  const ring = traceBonus(ringEye.ox, ringEye.oy, ringEye.oz, ringEye.dx, ringEye.dy, ringEye.dz, 180);
  ok(ring && ring.zone === 'ring' && ring.delta === 2, 'anel soma 2 s');
  const events = scriptRun({ finish: 42 });
  events.splice(1, 0, { k: 'bonus', t: 0.05, w: GRANJA.pistol, ...eye });
  const saved = rankedRun(events);
  ok(saved.ranked && saved.bonus === -2 && saved.final === 40, `miolo tira 2 s do relógio (${saved.final} ${saved.reason})`);
}

const map = getMap(GRANJA.map);
ok(map && map.course && map.id === 'granja', 'o mapa entra como circuito');
const solids = mapSolids(map);
const P = createPhysics(solids, map.size, null);
let stuck = null, hi = 0;
for (const q of samplePath(0.45)) {
  const g = P.groundAt(q.x, q.z, q.y + 0.6);
  hi = Math.max(hi, g);
  if (Math.abs(g - q.y) > 0.45 || P.collides(q.x, g + 0.02, q.z)) {
    stuck = { ...q, g, hit: P.collides(q.x, g + 0.02, q.z) };
    break;
  }
}
ok(!stuck, `eixo andável no curral, na rampa e na laje${stuck ? ` (travou em ${stuck.x.toFixed(1)},${stuck.z.toFixed(1)} y=${stuck.y.toFixed(2)} chão=${stuck.g.toFixed(2)} colide=${stuck.hit})` : ` (alto ${hi.toFixed(2)} m)`}`);

console.log(fails.length ? `\n${fails.length} FALHA(S)` : '\nTUDO OK');
if (perfect) console.log('perfect', perfect, 'stars', GRANJA.star3, GRANJA.star2, 'floor', rankFloor());
process.exit(fails.length ? 1 : 0);

// ============================================================
//  Tampa do Tacho — escudo primário. Um lugar só para os números.
//  Cliente offline e servidor importam daqui. Sem DOM, sem Three.js.
//
//  Como tunar: mexa só neste objeto. O teste test-escudo.mjs confere
//  que a arma em shared/rules.js espelha golpe, cadência, alcance e move.
//
//  Por que a tampa não é uma placa larga de 2,4 m: o arco frontal é 112°
//  (±56°). Na distância da tampa (0,82 m à frente do eixo) um tiro a 56°
//  passa a 0,82·tan(56°) ≈ 1,21 m do centro. Uma placa que cobrisse esse
//  arco taparia as bordas inteiras. O bloqueio é uma regra de direção:
//  atacante dentro do arco E o impacto não é pé, ombro/borda nem a fresta.
//  Fora do arco (flanco e costas) a bala passa mesmo raspando o corpo.
// ============================================================
import { stanceScale } from './stance.js';
import { bodyClosest, BODY } from './combat.js';

export const SHIELD = {
  hp: 720,                 // vida da tampa (o Docão tem 100). Volta inteira ao nascer.
  move: 0.82,              // mesma ideia da LMG (0,95) e do sabre (0,85). Não existe sprint no jogo: Shift agacha.
  arc: 56 * Math.PI / 180, // meia-abertura frontal. 112° no total.
  backArc: 39 * Math.PI / 180, // tampa pendurada nas costas (secundária ou faca na mão): arco de ~78°, protege pouco.
  feetY: 0.42,             // abaixo disto (× escala de agachar) o tiro acerta o pé. Corpo vai até ~2,0.
  edge: 0.40,              // |lateral| maior que isto é ombro. O raio do corpo é 0,58, sobra ~0,18 m de cada lado.
  slitX: 0.045,            // fresta do visor: skill shot, estreita de propósito.
  slitY0: 1.52,
  slitY1: 1.60,
  aboveDir: -0.55,         // tiro íngreme (telhado). dir.y mais negativo que isto…
  aboveClear: 2.6,         // …e a origem acima da cabeça não pega a tampa. Killstreak aéreo nem passa por aqui (chama damage() direto).
  aboveElev: 0.85,         // explosão com elevação maior que ~49° (panela/caldeirão, bazuca por cima) ignora a tampa.
  // Fração da bala que vaza para o corpo com a tampa na frente. Sem chave = a tampa come a bala.
  // Sniper e Canhão furam (penetração alta). Carabina só lasca. O resto para.
  leak: { sniper: 0.32, canhao: 0.46, carabina: 0.10 },
  // Quanto da bala a tampa absorve (× dano do tiro). Leve come pouco; pesado e explosivo amassam.
  bulletMul: {
    rifle: 0.78, lmg: 0.72, commando: 0.55, famas: 0.9, p90: 0.42, uzi: 0.48,
    pistol: 0.55, minigun: 0.5, shotgun: 1.05, semi: 0.95, prego: 0.75,
    sniper: 2.4, canhao: 3.2, carabina: 1.35, besta: 0.85, arco: 0.65,
    disco: 1.15, estilingue: 0.8,
  },
  bulletMulDefault: 0.7,
  backLeak: 0.72,          // nas costas o Docão ainda leva a maior parte. A tampa pendurada só ajuda um pouco (estilo CoD, sem virar segunda parede).
  backBulletScale: 0.4,    // e amassa pouco.
  splashLeak: 0.46,        // Copo Bomba / Bazuca / pipoca na frente: o sopro contorna pé e borda. Não é imunidade.
  splashMul: 1.55,         // a tampa leva mais que o Docão — explosivo é o contra.
  splashKnock: 0.62,       // empurrão também corta, senão a bazuca tira a tampa da briga sem quebrar.
  backSplashLeak: 0.78,
  backSplashMul: 0.35,
  backSplashKnock: 0.88,
  rocketFace: 90,          // foguete que bate na face (não no pé) soma isto na tampa, além do splash reduzido.
  melee: {
    slash: { mul: 1.35, leak: 0 },   // faca na frente: a tampa come o golpe.
    stab: { mul: 1.2, leak: 0 },
    saber: { mul: 2.5, leak: 0.08 }, // sabre amassa forte e deixa uma lasca. Pelas costas mata (não passa por aqui).
  },
  bash: { dmg: 52, reach: 2.15, cone: 0.58, rate: 0.84, push: 7.2, lift: 1.6 }, // 2 porradas = 104. Cadência lenta de propósito.
  charge: { dmg: 68, reach: 2.5, cone: 0.72, cd: 8.5, speed: 13.5, time: 0.26, push: 11, lift: 3.2 }, // botão direito. 13,5 m/s cabe no anti-cheat (~21 m/s a 20 Hz).
  holdRange: 14,           // bot com a tampa: perto segura, longe saca a pistola (tampa fica nas costas).
  botChance: 0.14,         // ≈1 em cada 7 bots nasce com a tampa e fica com ela. Não entra no sorteio normal (BOT_PRIMARIES).
  botNade: 0.72,           // contra tampa levantada o bot prefere Copo Bomba.
  medalAt: 400,            // medalha Muralha: dano segurado na partida (não zera ao morrer).
};

let WEAPONS = [];
export function noteWeapons(list) { WEAPONS = list; }

// Pelo id, não por sorteio: o mesmo bot segura a tampa a partida inteira.
// Resto 3 de propósito. O primeiro bot das suítes é o id 2 e não leva,
// senão um tiro de teste para na tampa e o abate some.
export function botWantsShield(id) {
  const step = Math.max(3, Math.round(1 / (SHIELD.botChance || 0.14)));
  return id > 0 && (id % step) === (3 % step);
}
export function isShieldW(i) { const w = WEAPONS[i]; return !!(w && w.shield); }

export function shieldRaised(e) {
  return !!(e && isShieldW(e.weapon) && !e.shieldBroken && (e.shieldHp == null || e.shieldHp > 0));
}
export function shieldOnBack(e) {
  if (!e || e.shieldBroken || shieldRaised(e)) return false;
  const slot = e.slots ? e.slots[0] : e.primary;
  if (!isShieldW(slot)) return false;
  return e.shieldHp == null || e.shieldHp > 0;
}
export function shieldPose(e) { return shieldRaised(e) ? 'raised' : shieldOnBack(e) ? 'back' : null; }

export function resetShield(e) {
  const slot = e.slots ? e.slots[0] : e.primary;
  const on = isShieldW(slot);
  e.shieldHp = on ? SHIELD.hp : 0;
  e.shieldBroken = false;
  e.shieldDashAt = -99;
}
export function shieldStage(hp, max = SHIELD.hp) {
  if (!(hp > 0)) return 3;
  const k = hp / max;
  if (k > 0.66) return 0;
  if (k > 0.33) return 1;
  return 2;
}

const cosFront = (yaw, from, to) => {
  const dx = to.x - from.x, dz = to.z - from.z, L = Math.hypot(dx, dz);
  if (L < 1e-4) return 1;
  return (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / L;
};
export function inFront(e, yaw, point, half = SHIELD.arc) {
  return cosFront(yaw, e.pos, point) >= Math.cos(half);
}
export function attackerBehind(e, yaw, point) {
  const dx = point.x - e.pos.x, dz = point.z - e.pos.z, L = Math.hypot(dx, dz);
  if (L < 0.05) return false;
  return (Math.sin(yaw) * dx + Math.cos(yaw) * dz) / L < -0.4;
}
export function raisedAt(holder, yaw, from) {
  return shieldRaised(holder) && inFront(holder, yaw, from);
}

// yaw = yaw do MODELO (frente = sin, cos). No cliente o jogador local é yaw da câmera + π.
export function classifyRay(e, yaw, origin, dir, t) {
  const pose = shieldPose(e);
  if (!pose) return { block: false, why: 'off', pose };
  const pos = e.pos;
  const face = pose === 'raised' ? yaw : yaw + Math.PI;
  const half = pose === 'raised' ? SHIELD.arc : SHIELD.backArc;
  if (cosFront(face, pos, origin) < Math.cos(half)) return { block: false, why: pose === 'raised' ? 'flank' : 'not-back', pose };
  const scale = stanceScale(e.crouch || 0);
  const hy = origin.y + dir.y * t - pos.y;
  if (hy < SHIELD.feetY * scale) return { block: false, why: 'feet', pose };
  const hx = origin.x + dir.x * t - pos.x, hz = origin.z + dir.z * t - pos.z;
  const lat = hx * Math.cos(face) + hz * -Math.sin(face);
  if (Math.abs(lat) > SHIELD.edge) return { block: false, why: 'edge', pose };
  if (pose === 'raised' && Math.abs(lat) < SHIELD.slitX && hy >= SHIELD.slitY0 * scale && hy <= SHIELD.slitY1 * scale) return { block: false, why: 'slit', pose };
  if (dir.y < SHIELD.aboveDir && origin.y > pos.y + 1.6 + SHIELD.aboveClear) return { block: false, why: 'above', pose };
  return { block: true, why: 'face', pose };
}

export function classifyBlast(e, yaw, c) {
  const pose = shieldPose(e);
  if (!pose) return { block: false, why: 'off', pose };
  const pos = e.pos, scale = stanceScale(e.crouch || 0);
  const dx = c.x - pos.x, dy = c.y - (pos.y + 1.0 * scale), dz = c.z - pos.z;
  const horiz = Math.hypot(dx, dz);
  if (Math.atan2(dy, Math.max(horiz, 0.05)) > SHIELD.aboveElev) return { block: false, why: 'above', pose };
  const face = pose === 'raised' ? yaw : yaw + Math.PI;
  const half = pose === 'raised' ? SHIELD.arc : SHIELD.backArc;
  if (horiz > 0.2 && cosFront(face, pos, c) < Math.cos(half)) return { block: false, why: 'flank', pose };
  return { block: true, why: 'face', pose };
}

export function bulletOnShield(e, yaw, origin, dir, t, key, dmg) {
  const c = classifyRay(e, yaw, origin, dir, t);
  if (!c.block || !(dmg > 0)) return { dmg, shield: 0, stop: false, blocked: 0, why: c.why, pose: c.pose };
  const back = c.pose === 'back';
  const mul = (SHIELD.bulletMul[key] ?? SHIELD.bulletMulDefault) * (back ? SHIELD.backBulletScale : 1);
  const leak = back ? SHIELD.backLeak : (SHIELD.leak[key] ?? 0);
  return { dmg: dmg * leak, shield: dmg * mul, stop: !back && leak <= 0, blocked: dmg * (1 - leak), why: c.why, pose: c.pose };
}

// bypass = acerto direto num ponto vulnerável (pé, borda, fresta, flanco): o splash não corta.
// self = o dono (rocket jump) nunca se bloqueia.
export function splashOnShield(e, yaw, blastPos, dmg, self, bypass) {
  if (!(dmg > 0) || self || bypass) return { dmg, shield: 0, knockMul: 1, blocked: 0, why: self ? 'self' : 'bypass' };
  const c = classifyBlast(e, yaw, blastPos);
  if (!c.block) return { dmg, shield: 0, knockMul: 1, blocked: 0, why: c.why };
  const back = c.pose === 'back';
  const leak = back ? SHIELD.backSplashLeak : SHIELD.splashLeak;
  const mul = back ? SHIELD.backSplashMul : SHIELD.splashMul;
  return { dmg: dmg * leak, shield: dmg * mul, knockMul: back ? SHIELD.backSplashKnock : SHIELD.splashKnock, blocked: dmg * (1 - leak), why: 'face' };
}

// Faca e sabre. backstab / atacante atrás: a tampa (na frente ou pendurada) não existe. Dano original.
export function meleeOnShield(victim, yaw, attackerPos, baseDmg, kind) {
  if (!(baseDmg > 0) || attackerBehind(victim, yaw, attackerPos) || shieldPose(victim) !== 'raised' || !inFront(victim, yaw, attackerPos)) {
    return { dmg: baseDmg, shield: 0, blocked: 0 };
  }
  const spec = SHIELD.melee[kind] || SHIELD.melee.slash;
  return { dmg: baseDmg * spec.leak, shield: baseDmg * spec.mul, blocked: baseDmg * (1 - spec.leak) };
}

export function hurtShield(e, amount) {
  if (!(amount > 0) || e.shieldBroken) return { broke: false, hp: e.shieldBroken ? 0 : (e.shieldHp ?? SHIELD.hp), dealt: 0 };
  if (e.shieldHp == null) e.shieldHp = SHIELD.hp;
  const before = e.shieldHp;
  e.shieldHp = Math.max(0, e.shieldHp - amount);
  const dealt = before - e.shieldHp;
  const broke = e.shieldHp <= 0 && before > 0;
  if (e.shieldHp <= 0) { e.shieldHp = 0; e.shieldBroken = true; }
  return { broke, hp: e.shieldHp, dealt };
}
export function noteBlocked(e, amount) {
  if (!(amount > 0)) return false;
  e.shieldBlocked = (e.shieldBlocked || 0) + amount;
  if (!e.shieldMedal && e.shieldBlocked >= SHIELD.medalAt) { e.shieldMedal = true; return true; }
  return false;
}

// Um alvo, o mais perto, dentro do cone. Sem bônus de costas: a porrada é na cara.
export function shieldBashHit(eye, dir, spec, targets, los) {
  let best = null;
  for (const row of targets) {
    const e = row.e, p = row.p, crouch = row.crouch ?? e.crouch;
    const bc = bodyClosest(eye, p, crouch); if (bc.d > spec.reach) continue;
    const ay = Math.max(p.y + BODY.y0, Math.min(p.y + BODY.y1, eye.y));
    const vx = p.x - eye.x, vy = ay - eye.y, vz = p.z - eye.z, L = Math.hypot(vx, vy, vz) || 1;
    const ang = Math.acos(Math.max(-1, Math.min(1, (vx * dir.x + vy * dir.y + vz * dir.z) / L)));
    if (ang > spec.cone + Math.atan(BODY.r / Math.max(L, BODY.r))) continue;
    if (bc.d > 0.05 && los && !los(eye, bc.point)) continue;
    if (best && bc.d >= best.dist) continue;
    const dx = p.x - eye.x, dz = p.z - eye.z, hl = Math.hypot(dx, dz) || 1;
    best = { e, dist: bc.d, point: bc.point, dir: { x: dx / hl, z: dz / hl }, dmg: spec.dmg };
  }
  return best;
}

// Mira do bot contra tampa levantada. sharp = reaction baixa (mira mais cedo, o proxy de “difícil” — não há arquivo de dificuldade).
// Devolve altura (0–2, igual center()) e deslocamento lateral em metros, ou null para mirar normal.
export function shieldAim(attackerPos, target, yaw, sharp) {
  if (!raisedAt(target, yaw, attackerPos)) return null;
  const r = Math.random();
  if (r < (sharp ? 0.62 : 0.40)) return { y: 0.22, xOff: 0 };
  if (r < (sharp ? 0.84 : 0.66)) return { y: 1.0, xOff: (Math.random() < 0.5 ? -1 : 1) * 0.55 };
  if (sharp && r < 0.94) return { y: 1.56, xOff: 0 };
  return null;
}
export function aimOffset(yaw, xOff) {
  return { x: Math.cos(yaw) * xOff, z: -Math.sin(yaw) * xOff };
}

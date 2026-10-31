// ============================================================
//  Sabres de luz — regras compartilhadas (cliente offline + servidor). Sem DOM, sem Three.js.
//  A velocidade é sempre 100% (SABER_KIT.move = 1). O campo weapon.move é ignorado de propósito:
//  a punição antiga (0,85 / 0,70) não volta nem se alguém recolocar o número na arma.
//  Simples = duelista (cone curto, parry, arremesso que volta). Duplo = área (cone largo, giro).
//  Os dois bloqueiam projétil/bala de frente, com janela curta de parry perfeito.
// ============================================================

export const SABER_KIT = {
  move: 1,
  block: {
    half: 0.95, // meia-abertura do cone frontal (rad)
    reach: 2.15,
    stamina: 100,
    drain: 32, // por segundo, só por segurar
    regen: 46,
    regenDelay: 0.45,
    breakTime: 1.15, // trava depois que a barra zera
    parry: 0.18, // janela de parry perfeito a partir do instante em que o bloqueio sobe
    parryCd: 1.25,
    blockPellet: 28, // custo por bala desviada (segurar)
    parryPellet: 16, // custo por bala no parry perfeito
    blockProj: 30,
    parryProj: 24,
    reflectMul: 0.65,
    reflectCap: 70, // teto de dano devolvido por rajada (escopeta não mata no reflexo)
  },
  single: {
    reach: 2.55,
    arc: 0.78,
    chain: 0.72,
    combo: [
      { dmg: 36, rate: 0.30 },
      { dmg: 36, rate: 0.30 },
      { dmg: 52, rate: 0.56 },
    ],
    dash: { dist: 4.8, dur: 0.16, cd: 2.8, dmg: 40, reach: 2.35, arc: 0.72 },
    throw: { speed: 16, range: 12, outDmg: 46, backDmg: 30, radius: 0.48, cd: 4.8, life: 2.4 },
  },
  dual: {
    reach: 2.45,
    arc: 1.22,
    chain: 0.68,
    combo: [
      { dmg: 28, rate: 0.26 },
      { dmg: 32, rate: 0.26 },
      { dmg: 42, rate: 0.50 },
    ],
    dash: { dist: 3.5, dur: 0.18, cd: 3.4, dmg: 32, reach: 2.5, arc: 1.15 },
    spin: { radius: 3.15, dmg: 34, ticks: [0.05, 0.28], dur: 0.48, cd: 6.0 },
  },
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export function profileOf(weapon) {
  if (!weapon || !weapon.saber) return null;
  return weapon.dual ? SABER_KIT.dual : SABER_KIT.single;
}

// Multiplicador de andar. Sabre entra primeiro e devolve 1, mesmo com weapon.move antigo.
export function moveScale(weapon, weaponIndex, knifeIndex, knifeMul) {
  if (weapon && weapon.saber) return SABER_KIT.move;
  if (weapon && weapon.move) return weapon.move;
  if (weaponIndex === knifeIndex) return knifeMul;
  return 1;
}

export function freshSaber() {
  return {
    stam: SABER_KIT.block.stamina,
    lockUntil: -1e9,
    wantBlock: false,
    blocking: false,
    blockAt: -1e9,
    parryReady: -1e9,
    regenAt: -1e9,
    combo: 0,
    swungAt: -1e9,
    nextSwing: -1e9,
    dashReady: -1e9,
    dashUntil: -1e9,
    dashStrikeAt: -1e9,
    dashStruck: true,
    dashDir: { x: 0, z: 1 },
    dashDist: 0,
    dashDur: 0.16,
    specialReady: -1e9,
    spinUntil: -1e9,
    spinTick: 0,
    bladeOut: false,
  };
}

export function ensureSaber(e) {
  if (!e.saber) e.saber = freshSaber();
  return e.saber;
}

// 'aim' = yaw da câmera do jogador (frente = −Z quando yaw é 0).
// 'model' = yaw do boneco (bots e humanos no servidor; frente = (sin, cos)).
export function aimForward(yaw, space) {
  if (space === 'aim') return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  return { x: Math.sin(yaw), z: Math.cos(yaw) };
}

export function stepStamina(st, now, dt, holding) {
  const B = SABER_KIT.block;
  if (!st) return;
  if (now < st.lockUntil) { st.blocking = false; st.wantBlock = false; return; }
  if (holding && st.stam > 0) {
    if (!st.blocking) { st.blocking = true; st.blockAt = now; }
    st.stam = Math.max(0, st.stam - B.drain * dt);
    st.regenAt = now + B.regenDelay;
    if (st.stam <= 0) { st.stam = 0; st.blocking = false; st.wantBlock = false; st.lockUntil = now + B.breakTime; }
  } else {
    st.blocking = false;
    if (now >= (st.regenAt || 0)) st.stam = Math.min(B.stamina, st.stam + B.regen * dt);
  }
}

export function guardOpen(st, now) {
  if (!st || !st.blocking || now < st.lockUntil || st.stam <= 0) return null;
  const B = SABER_KIT.block;
  return { perfect: now - st.blockAt <= B.parry && now >= (st.parryReady || 0) };
}

export function inFront(yaw, space, feet, point, half, maxDist) {
  const f = aimForward(yaw, space);
  const dx = point.x - feet.x, dz = point.z - feet.z;
  const dist = Math.hypot(dx, dz);
  if (dist > maxDist || dist < 0.02) return false;
  return (dx / dist) * f.x + (dz / dist) * f.z >= Math.cos(half);
}

// Uma rajada (vários chumbos contam juntos). blocked[i] = esse impacto não passa.
// O reflexo soma no máximo reflectCap, pra escopeta não virar morte instantânea.
export function payGuard(st, now, { perfect, dmgEach }) {
  const B = SABER_KIT.block;
  const cost = perfect ? B.parryPellet : B.blockPellet;
  const blocked = [];
  let reflect = 0, budget = perfect ? B.reflectCap : 0, broke = false;
  for (let i = 0; i < dmgEach.length; i++) {
    if (broke || st.stam <= 0) { blocked.push(false); continue; }
    st.stam = Math.max(0, st.stam - cost);
    blocked.push(true);
    if (perfect && budget > 0) {
      const give = Math.min(Math.max(0, dmgEach[i]) * B.reflectMul, budget);
      reflect += give; budget -= give;
    }
    if (st.stam <= 0) broke = true;
  }
  if (broke) { st.blocking = false; st.wantBlock = false; st.lockUntil = now + B.breakTime; }
  if (perfect && (reflect > 0 || blocked.some(Boolean))) st.parryReady = now + B.parryCd;
  st.regenAt = now + B.regenDelay;
  return { blocked, reflect, broke };
}

export function payProjectile(st, now, perfect) {
  const B = SABER_KIT.block;
  st.stam = Math.max(0, st.stam - (perfect ? B.parryProj : B.blockProj));
  st.regenAt = now + B.regenDelay;
  if (perfect) st.parryReady = now + B.parryCd;
  if (st.stam <= 0) { st.stam = 0; st.blocking = false; st.wantBlock = false; st.lockUntil = now + B.breakTime; }
}

function norm2(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}

export function reflectDir(incoming, forward, perfect) {
  if (perfect) return norm2(-incoming.x, -incoming.y * 0.2, -incoming.z);
  const dot = incoming.x * forward.x + incoming.z * forward.z;
  return norm2(incoming.x - 2 * dot * forward.x, incoming.y * 0.2, incoming.z - 2 * dot * forward.z);
}

// Ponto do segmento mais perto dos pés, no plano horizontal (e a altura interpolada).
export function closestOnSegment(feet, a, b) {
  const abx = b.x - a.x, abz = b.z - a.z;
  const ab2 = abx * abx + abz * abz;
  let t = ab2 < 1e-8 ? 0 : ((feet.x - a.x) * abx + (feet.z - a.z) * abz) / ab2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t, t };
}

// null = o projétil segue. Senão { perfect, dir } já normalizado.
export function bladeTouch(feet, yaw, space, from, to, incoming, now, st, saberOn) {
  if (!saberOn) return null;
  const open = guardOpen(st, now);
  if (!open) return null;
  const point = closestOnSegment(feet, from, to);
  if (point.y < feet.y - 0.25 || point.y > feet.y + 2.2) return null;
  const B = SABER_KIT.block;
  if (!inFront(yaw, space, feet, point, B.half, B.reach)) return null;
  const f = aimForward(yaw, space);
  const toward = -(incoming.x * f.x + incoming.z * f.z);
  if (toward < 0.2) return null;
  return { perfect: open.perfect, dir: reflectDir(incoming, f, open.perfect) };
}

export function peekSwing(st, now, prof, slack = 0) {
  if (!prof || now + slack < st.nextSwing) return null;
  const chain = now - st.swungAt <= prof.chain + slack;
  const idx = chain ? Math.min(prof.combo.length - 1, st.combo) : 0;
  const step = prof.combo[idx];
  return { idx, dmg: step.dmg, rate: step.rate, reach: prof.reach, arc: prof.arc, nextCombo: idx + 1 >= prof.combo.length ? 0 : idx + 1 };
}

export function applySwing(st, now, sw) {
  st.combo = sw.nextCombo;
  st.swungAt = now;
  st.nextSwing = now + sw.rate;
  st.blocking = false;
  st.wantBlock = false;
  return sw;
}

export function commitSwing(st, now, prof) {
  const sw = peekSwing(st, now, prof, 0);
  if (!sw) return null;
  return applySwing(st, now, sw);
}

export function targetsInArc(eye, forward, reach, arc, targets) {
  const need = Math.cos(arc), hits = [];
  for (const t of targets) {
    const dx = t.x - eye.x, dz = t.z - eye.z;
    const dist = Math.hypot(dx, dz);
    if (dist > reach || dist < 0.05) continue;
    if ((dx / dist) * forward.x + (dz / dist) * forward.z < need) continue;
    hits.push({ e: t.e, dist });
  }
  return hits;
}

export function tryDash(st, now, prof, dir) {
  if (!prof || !prof.dash || now < st.dashReady) return null;
  const D = prof.dash;
  const len = Math.hypot(dir.x || 0, dir.z || 0);
  if (len < 0.2) return null;
  const dx = dir.x / len, dz = dir.z / len;
  st.dashReady = now + D.cd;
  st.dashUntil = now + D.dur;
  st.dashStrikeAt = now + D.dur * 0.7;
  st.dashStruck = false;
  st.dashDir = { x: dx, z: dz };
  st.dashDist = D.dist;
  st.dashDur = D.dur;
  st.blocking = false;
  st.wantBlock = false;
  st.nextSwing = Math.max(st.nextSwing, now + D.dur);
  return { dx, dz, speed: D.dist / D.dur, dur: D.dur, dmg: D.dmg, reach: D.reach, arc: D.arc, cd: D.cd };
}

export function trySpecial(st, now, prof) {
  if (!prof || now < st.specialReady || st.bladeOut) return null;
  if (prof.spin) {
    const S = prof.spin;
    st.specialReady = now + S.cd;
    st.spinUntil = now + S.dur;
    st.spinTick = 0;
    st.blocking = false;
    st.wantBlock = false;
    st.nextSwing = Math.max(st.nextSwing, now + S.dur);
    return { kind: 'spin', dmg: S.dmg, radius: S.radius, dur: S.dur, cd: S.cd };
  }
  if (!prof.throw) return null;
  const T = prof.throw;
  st.specialReady = now + T.cd;
  st.bladeOut = true;
  st.blocking = false;
  st.wantBlock = false;
  return { kind: 'throw', speed: T.speed, range: T.range, outDmg: T.outDmg, backDmg: T.backDmg, radius: T.radius, cd: T.cd, life: T.life };
}

export function spinDue(st, now, prof) {
  if (!prof || !prof.spin || now > st.spinUntil || st.spinTick >= prof.spin.ticks.length) return null;
  const start = st.spinUntil - prof.spin.dur;
  if (now < start + prof.spin.ticks[st.spinTick]) return null;
  const tick = st.spinTick++;
  return { tick, dmg: prof.spin.dmg, radius: prof.spin.radius };
}

export function catchBlade(st) { if (st) st.bladeOut = false; }

// 1 = bot mais difícil (reação curta e mira firme). 0 = mais fácil.
export function botSkill(reaction, accuracy) {
  const r = clamp01(((reaction ?? 0.5) - 0.35) / 0.3);
  const a = clamp01(((accuracy ?? 0.06) - 0.045) / 0.025);
  return 1 - (r * 0.65 + a * 0.35);
}

// roll em 0..1 deixa o teste determinístico. easy quase só corre e corta; hard investe, bloqueia em toque e usa o especial.
export function botPlan(skill, ctx) {
  const roll = ctx.roll ?? 0;
  const plan = { chase: ctx.dist > (ctx.dual ? 2.25 : 2.4), swing: !!ctx.inReach, dash: false, special: false, block: false, blockSeconds: 0 };
  if (skill < 0.34) {
    plan.dash = !!(ctx.dashReady && ctx.dist > 3.1 && ctx.dist < 5.6 && skill > 0.2 && roll < 0.22);
    plan.swing = !!ctx.inReach;
    return plan;
  }
  if (skill < 0.68) {
    plan.dash = !!(ctx.dashReady && ctx.dist > 2.7 && ctx.dist < 6.2 && roll < 0.55);
    plan.block = !!(ctx.canBlock && ctx.gun && ctx.dist < 9 && ctx.hp < 72 && roll < 0.5);
    plan.blockSeconds = 0.45;
    plan.special = !!(ctx.specialReady && (ctx.dual ? (ctx.foesNear >= 2 || (ctx.inReach && roll < 0.35)) : (ctx.dist > 5 && ctx.dist < 11.5 && roll < 0.6)));
    return plan;
  }
  plan.dash = !!(ctx.dashReady && ctx.dist > 2.5 && ctx.dist < 6.4);
  plan.block = !!(ctx.canBlock && ctx.gun && ctx.dist < 12 && (ctx.hp < 90 || roll < 0.55));
  plan.blockSeconds = 0.2;
  plan.special = !!(ctx.specialReady && (ctx.dual ? (ctx.foesNear >= 2 || (ctx.dist < 3.1 && roll < 0.45)) : (ctx.dist >= 4.8 && ctx.dist <= 12)));
  if (plan.special && ctx.dual) plan.swing = false;
  return plan;
}

// Revólver do Capataz em 1ª pessoa. O cano aponta pra −Z.
// Saque: o revólver gira no dedo e cai na mão. Tiro: o cão bate e o tambor anda 1/6.
// Recarga: o tambor abre pro lado, as cápsulas caem, o speedloader entra, o pulso fecha.
// Akimbo: as duas mãos respiram fora de fase; a recarga é cruzada (direita, depois esquerda).
import * as THREE from 'three';
import { outline, toon, makeFPForearm, poseFPForearm } from './docao.js';

const TAU = Math.PI * 2;
const clamp01 = (k) => { const t = Number(k); return !Number.isFinite(t) ? 0 : t < 0 ? 0 : t > 1 ? 1 : t; };
const smooth = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const easeOut = (t) => { const x = clamp01(t); return 1 - (1 - x) ** 3; };
const ramp = (a, b, x) => clamp01((x - a) / (b - a));

const WOOD = '#6b3a1e', WOOD2 = '#4a2814', STEEL = '#3c414c', STEEL2 = '#2a2e36', BRASS = '#d9a441', DARK = '#14171c', IVORY = '#f3efe4';

function mesh(parent, geo, color, x, y, z, ol = 0.004) {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  parent.add(m);
  if (ol) outline(m, ol);
  return m;
}

function buildGun(side) {
  const pivot = new THREE.Group();
  pivot.position.set(side < 0 ? -0.16 : 0.03, side < 0 ? -0.02 : 0.03, side < 0 ? 0.02 : -0.02);
  const spin = new THREE.Group();
  pivot.add(spin);

  const grip = mesh(spin, new THREE.BoxGeometry(0.055, 0.15, 0.062), WOOD, 0, -0.09, 0.045, 0.005);
  grip.rotation.x = 0.42;
  grip.userData.noCamo = true;
  const stripe = mesh(spin, new THREE.BoxGeometry(0.058, 0.018, 0.066), WOOD2, 0, -0.1, 0.05, 0);
  stripe.rotation.x = 0.42;
  stripe.userData.noCamo = true;
  const medal = mesh(spin, new THREE.CylinderGeometry(0.016, 0.016, 0.008, 10), BRASS, side * 0.03, -0.07, 0.06, 0.002);
  medal.rotation.z = Math.PI / 2;
  medal.userData.noCamo = true;

  mesh(spin, new THREE.BoxGeometry(0.07, 0.078, 0.15), STEEL, 0, 0.012, 0.01);
  mesh(spin, new THREE.BoxGeometry(0.02, 0.012, 0.07), DARK, 0, -0.03, 0.02, 0.002);
  mesh(spin, new THREE.BoxGeometry(0.016, 0.04, 0.012), DARK, 0, -0.02, 0.0, 0.002);

  const hinge = new THREE.Group();
  hinge.position.set(side * 0.02, 0.02, -0.01);
  spin.add(hinge);
  const cyl = new THREE.Group();
  hinge.add(cyl);
  const drum = mesh(cyl, new THREE.CylinderGeometry(0.04, 0.04, 0.07, 12), BRASS, 0, 0, 0, 0.003);
  drum.rotation.x = Math.PI / 2;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const hole = mesh(cyl, new THREE.CylinderGeometry(0.011, 0.011, 0.074, 6), DARK, Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0, 0);
    hole.rotation.x = Math.PI / 2;
  }
  mesh(cyl, new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6), STEEL2, 0, -0.045, 0.01, 0.002).rotation.x = Math.PI / 2;

  const barrel = mesh(spin, new THREE.CylinderGeometry(0.018, 0.02, 0.26, 10), STEEL2, 0, 0.02, -0.2, 0.003);
  barrel.rotation.x = Math.PI / 2;
  const muzzle = mesh(spin, new THREE.TorusGeometry(0.02, 0.005, 6, 12), DARK, 0, 0.02, -0.33, 0.002);
  mesh(spin, new THREE.BoxGeometry(0.01, 0.028, 0.012), DARK, 0, 0.052, -0.3, 0.002);
  mesh(spin, new THREE.BoxGeometry(0.008, 0.02, 0.01), IVORY, 0, 0.055, 0.055, 0.002);

  const hammerP = new THREE.Group();
  hammerP.position.set(0, 0.055, 0.07);
  spin.add(hammerP);
  mesh(hammerP, new THREE.BoxGeometry(0.012, 0.055, 0.02), DARK, 0, 0.02, 0.004, 0.002).rotation.x = -0.4;
  mesh(hammerP, new THREE.SphereGeometry(0.012, 8, 6), BRASS, 0, 0.05, 0.012, 0.002).userData.noCamo = true;

  const loader = new THREE.Group();
  loader.visible = false;
  spin.add(loader);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const b = mesh(loader, new THREE.CylinderGeometry(0.01, 0.01, 0.045, 6), BRASS, Math.cos(a) * 0.022, Math.sin(a) * 0.022, 0, 0);
    b.rotation.x = Math.PI / 2;
    b.userData.noCamo = true;
  }
  mesh(loader, new THREE.CylinderGeometry(0.012, 0.012, 0.012, 8), STEEL, 0, 0, 0.028, 0.002).userData.noCamo = true;

  const flashMat = new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), flashMat);
  flash.position.set(0, 0.02, -0.36);
  flash.scale.set(1, 1, 1.8);
  flash.userData.noCamo = true;
  spin.add(flash);

  const hand = makeFPForearm('classico');
  hand.userData.noCamo = true;
  shrinkFist(hand, 0.62);
  pivot.add(hand);
  // a mão de apoio só aparece na mira fechada do revólver simples
  const support = side > 0 ? makeFPForearm('classico') : null;
  if (support) {
    support.userData.noCamo = true;
    support.visible = false;
    shrinkFist(support, 0.5);
    pivot.add(support);
  }

  return { pivot, spin, hinge, cyl, hammer: hammerP, loader, flash, flashMat, hand, support, side };
}

function shrinkFist(hand, k) {
  for (const c of hand.children) {
    if (c === hand.userData.arm) continue;
    c.scale.setScalar(k);
  }
}

function freshAnim() {
  return { equip: 99, equipDur: 0.74, fumble: false, fumbleHand: -1, fumbleAt: -1, shot: [99, 99], cyl: 0, inspect: -1, smoked: false, ejectKey: null };
}

let single = null, dual = null, fx = null;

function makeFx() {
  fx = new THREE.Group();
  fx.name = 'capataz-fx';
  fx.userData.bits = [];
  return fx;
}

export function capatazFx() {
  if (!fx) makeFx();
  return fx;
}

export function makeFPCapataz(isDual) {
  const g = new THREE.Group();
  g.name = isDual ? 'fp-capataz2' : 'fp-capataz';
  const right = buildGun(1);
  g.add(right.pivot);
  const guns = [right];
  if (isDual) {
    const left = buildGun(-1);
    g.add(left.pivot);
    guns.push(left);
  }
  g.userData.guns = guns;
  g.userData.anim = freshAnim();
  if (isDual) dual = g; else single = g;
  return g;
}

export function bindCapataz(a, b) { single = a; dual = b; }

export function capatazSkin(skinId) {
  for (const g of [single, dual]) {
    if (!g) continue;
    for (const gun of g.userData.guns) {
      const prev = gun.hand;
      gun.hand = makeFPForearm(skinId || 'classico');
      gun.hand.userData.noCamo = true;
      shrinkFist(gun.hand, 0.62);
      gun.hand.position.copy(prev.position);
      gun.pivot.remove(prev);
      gun.pivot.add(gun.hand);
      if (gun.support) {
        const old = gun.support;
        gun.support = makeFPForearm(skinId || 'classico');
        gun.support.userData.noCamo = true;
        shrinkFist(gun.support, 0.5);
        gun.support.visible = old.visible;
        gun.pivot.remove(old);
        gun.pivot.add(gun.support);
      }
    }
  }
}

export function noteCapataz(kind, data = {}) {
  const g = data.dual ? dual : single;
  if (!g) return;
  const a = g.userData.anim;
  if (kind === 'equip') {
    a.equip = 0;
    a.equipDur = data.dur || (data.dual ? 0.9 : 0.74);
    a.fumble = !!data.fumble;
    a.fumbleHand = a.fumble ? (data.fumbleHand === 0 || data.fumbleHand === 1 ? data.fumbleHand : (data.dual && Math.random() < 0.5 ? 1 : 0)) : -1;
    a.fumbleAt = -1;
  } else if (kind === 'shot') {
    const h = data.hand === 1 ? 1 : 0;
    a.shot[h] = 0;
    const gun = g.userData.guns[h] || g.userData.guns[0];
    if (gun) gun.cyl.userData.to = (gun.cyl.userData.to || 0) + TAU / 6;
  } else if (kind === 'inspect') {
    a.inspect = 0;
    a.smoked = false;
  }
}

const GRIP = new THREE.Vector3(0.01, -0.15, 0.08);
// na mira a mão desce pro cabo e afasta da lente, pra o punho não estourar no centro
const GRIP_ADS = new THREE.Vector3(0.0, -0.2, -0.02);
const SHOULDER_HIP = new THREE.Vector3();
const SHOULDER_ADS = new THREE.Vector3(0.0, -1.2, -0.06);

function seatHands(gun, pose, ads, spinning) {
  const { hand, support, spin, side } = gun;
  if (!hand) return;
  const aimK = side > 0 ? clamp01((ads - 0.15) / 0.7) : 0;
  const grip = GRIP.clone().lerp(GRIP_ADS, aimK);
  // no giro do dedo a mão fica parada; no resto ela acompanha o cabo
  if (spinning) hand.position.copy(grip);
  else hand.position.copy(grip).applyEuler(spin.rotation).add(spin.position);
  hand.position.x += side * 0.012 * (1 - aimK);
  shrinkFist(hand, 0.62 + (0.36 - 0.62) * aimK);
  SHOULDER_HIP.set(side * 0.22, -1.05, 0.28);
  const shoulder = SHOULDER_HIP.lerp(SHOULDER_ADS, aimK);
  aimForearm(hand, shoulder, 0.62 + (0.36 - 0.62) * aimK);
  if (!support) return;
  const showSupport = aimK > 0.82;
  support.visible = showSupport;
  if (!showSupport) return;
  support.position.set(-0.04, -0.21, -0.06);
  shrinkFist(support, 0.32);
  aimForearm(support, new THREE.Vector3(-0.05, -1.2, -0.04), 0.32);
}

function aimForearm(hand, shoulder, girth) {
  hand.rotation.set(0, 0, 0);
  poseFPForearm(hand, shoulder);
  const arm = hand.userData.arm;
  if (arm) { arm.scale.x = girth; arm.scale.z = girth; }
}

function poseGun(gun, pose, idle, time, ads, spinning) {
  const { spin, hinge, cyl, hammer, loader, side } = gun;
  spin.rotation.set(pose.rx, pose.ry, pose.rz);
  spin.position.set(pose.x, pose.y + idle, pose.z);
  hinge.rotation.y = pose.open * side;
  const target = cyl.userData.to || 0;
  cyl.userData.shown = cyl.userData.shown || 0;
  cyl.userData.shown += (target - cyl.userData.shown) * 0.35;
  cyl.rotation.z = cyl.userData.shown;
  hammer.rotation.x = pose.hammer;
  loader.visible = pose.loader > 0.02;
  loader.position.set(side * pose.loader * 0.12, -0.02 * (1 - pose.loader), 0.08 + (1 - pose.loader) * 0.22);
  loader.rotation.z = (1 - pose.loader) * side * 1.4;
  seatHands(gun, pose, ads, spinning);
  if (pose.flash > 0) {
    gun.flashMat.opacity = pose.flash;
    gun.flash.rotation.z = time * 17;
    gun.flash.visible = true;
  } else gun.flash.visible = false;
}

function reloadPose(k, crossed) {
  // k 0..1 de um tambor. crossed: a esquerda começa mais tarde (o k já vem remapeado).
  const tilt = smooth(ramp(0.02, 0.16, k)) * (1 - smooth(ramp(0.84, 0.98, k)));
  const open = smooth(ramp(0.12, 0.3, k)) * (1 - smooth(ramp(0.78, 0.92, k)));
  const eject = ramp(0.28, 0.4, k);
  const load = smooth(ramp(0.4, 0.62, k)) * (1 - smooth(ramp(0.66, 0.8, k)));
  const flick = smooth(ramp(0.8, 0.96, k));
  return {
    rx: -tilt * 0.35 - flick * 0.15,
    ry: 0,
    rz: tilt * 0.5,
    x: 0, y: -tilt * 0.02, z: tilt * 0.04,
    open: open * 1.25,
    loader: load,
    hammer: 0,
    flash: 0,
    eject: eject > 0.2 && eject < 0.85,
  };
}

function spawnCases(gun) {
  if (!fx) makeFx();
  const origin = new THREE.Vector3();
  gun.cyl.getWorldPosition(origin);
  if (fx.parent) fx.parent.worldToLocal(origin);
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 6), toon(BRASS));
    c.userData.noCamo = true;
    outline(c, 0.002);
    c.position.copy(origin);
    c.position.x += (Math.random() - 0.5) * 0.04;
    c.userData.v = new THREE.Vector3(gun.side * (0.35 + Math.random() * 0.4), 0.55 + Math.random() * 0.45, 0.15 + Math.random() * 0.3);
    c.userData.life = 1.15 + Math.random() * 0.35;
    c.userData.age = 0;
    fx.add(c);
  }
}

function puff(gun) {
  if (!fx) makeFx();
  const origin = new THREE.Vector3(0, 0.02, -0.36);
  gun.spin.localToWorld(origin);
  if (fx.parent) fx.parent.worldToLocal(origin);
  for (let i = 0; i < 8; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.07 + Math.random() * 0.04, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe7e2d6, transparent: true, opacity: 0.72, depthWrite: false }));
    s.position.copy(origin);
    s.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.08 + Math.random() * 0.08, -0.12 - Math.random() * 0.1);
    s.userData.life = 1.15;
    s.userData.age = 0;
    s.userData.smoke = true;
    fx.add(s);
  }
}

function stepBits(dt) {
  if (!fx) return;
  for (let i = fx.children.length - 1; i >= 0; i--) {
    const c = fx.children[i];
    const u = c.userData;
    u.age += dt;
    if (u.age > u.life) { fx.remove(c); continue; }
    u.v.y -= (u.smoke ? 0.15 : 2.4) * dt;
    c.position.addScaledVector(u.v, dt);
    if (!u.smoke && c.position.y < originFloor(c)) { c.position.y = originFloor(c); u.v.y *= -0.28; u.v.x *= 0.7; u.v.z *= 0.7; }
    c.rotation.x += dt * 6;
    c.rotation.z += dt * 4;
    const fade = 1 - u.age / u.life;
    if (c.material && c.material.opacity != null && u.smoke) c.material.opacity = 0.72 * fade;
    else if (fade < 0.25 && c.material) { c.material.transparent = true; c.material.opacity = fade / 0.25; }
  }
}

function originFloor() { return -0.55; }

function shotKick(t) {
  if (t >= 0.28) return { k: 0, hammer: 0, flash: 0 };
  const cock = t < 0.06 ? t / 0.06 : 1;
  const slam = t < 0.06 ? 0 : easeOut(ramp(0.06, 0.12, t));
  const back = Math.sin(Math.min(1, t / 0.08) * Math.PI) * (1 - slam);
  const kick = t < 0.07 ? t / 0.07 : 1 - easeOut(ramp(0.07, 0.28, t));
  return { k: kick, hammer: -0.7 * cock * (1 - slam) - back * 0.15, flash: t < 0.05 ? 1 - t / 0.05 : 0 };
}

export function stepCapataz(dt, ctx) {
  stepBits(dt);
  const g = ctx && ctx.dual ? dual : ctx && ctx.on ? single : null;
  for (const other of [single, dual]) {
    if (!other || other === g) continue;
    if (!other.visible) {
      for (const gun of other.userData.guns) gun.hand.visible = false;
    }
  }
  if (!g || !ctx || !ctx.on) return;
  const a = g.userData.anim;
  const time = ctx.time || 0;
  const equipNeed = a.equipDur + (ctx.dual ? 0.14 : 0);
  if (a.equip < equipNeed) a.equip += dt;
  for (let h = 0; h < a.shot.length; h++) if (a.shot[h] < 9) a.shot[h] += dt;
  if (a.inspect >= 0 && ctx.inspect >= 0) a.inspect = ctx.inspect;
  else if (ctx.inspect < 0) a.inspect = -1;

  const reloading = ctx.reload >= 0;
  if (!reloading && a.ejected) a.ejected = null;
  g.userData.guns.forEach((gun, idx) => {
    gun.hand.visible = true;
    const idlePhase = idx === 0 ? 0 : 2.05;
    const idle = (!reloading && a.equip >= a.equipDur) ? Math.sin(time * 1.55 + idlePhase) * (ctx.dual ? 0.012 : 0.006) : 0;
    let pose = { rx: 0, ry: 0, rz: idle * 0.4, x: 0, y: 0, z: 0, open: 0, loader: 0, hammer: 0, flash: 0, eject: false };

    const delay = ctx.dual && idx === 1 ? 0.14 : 0;
    const equipT = a.equip - delay;
    if (equipT < a.equipDur) {
      const k = clamp01(equipT < 0 ? 0 : equipT / a.equipDur);
      const spinK = clamp01((k - 0.08) / 0.78);
      const leftSpin = 1 - easeOut(spinK);
      const fum = a.fumble && idx === a.fumbleHand;
      pose.rx = -leftSpin * TAU * (fum ? 1.15 : 1);
      pose.y = Math.sin(spinK * Math.PI) * 0.03;
      if (fum && k > 0.42 && k < 0.82) {
        const f = Math.sin(((k - 0.42) / 0.4) * Math.PI);
        pose.rx -= f * 1.35;
        pose.y -= f * 0.22;
        pose.z += f * 0.08;
        if (a.fumbleAt < 0) a.fumbleAt = time;
      }
    }

    const st = shotKick(a.shot[idx] ?? 99);
    pose.rx += st.k * 0.62;
    pose.z += st.k * 0.05;
    pose.y += st.k * 0.02;
    pose.hammer = st.hammer;
    pose.flash = st.flash;

    if (reloading) {
      const span = ctx.dual ? (idx === 0 ? ramp(0, 0.62, ctx.reload) : ramp(0.38, 1, ctx.reload)) : ctx.reload;
      const rp = reloadPose(span);
      if (equipT >= a.equipDur && (a.shot[idx] ?? 99) > 0.28) {
        pose = rp;
      } else {
        pose.open = rp.open; pose.loader = rp.loader;
      }
      const key = ctx.reloadKey + ':' + idx;
      if (rp.eject) { if (!a.ejected) a.ejected = {}; if (!a.ejected[key]) { a.ejected[key] = true; spawnCases(gun); } }
    }

    if (a.inspect >= 0 && !reloading && equipT >= a.equipDur) {
      const s = smooth(ramp(0.12, 0.55, a.inspect)) * (1 - smooth(ramp(0.72, 0.96, a.inspect)));
      pose.rx += -s * TAU;
      pose.ry += Math.sin(a.inspect * Math.PI) * 0.25;
      if (!a.smoked && a.inspect > 0.48 && idx === 0) { a.smoked = true; puff(g.userData.guns[0]); if (ctx.dual && g.userData.guns[1]) puff(g.userData.guns[1]); }
    }

    if (ctx.ads > 0.2 && !ctx.dual) {
      pose.rx *= 1 - ctx.ads * 0.85;
      pose.y *= 1 - ctx.ads;
      pose.rz *= 1 - ctx.ads;
    }
    const spinning = equipT < a.equipDur;
    poseGun(gun, pose, idle, time, ctx.ads || 0, spinning);
  });
}

export function capatazRead() {
  const g = (dual && dual.visible) ? dual : single;
  if (!g) return null;
  const a = g.userData.anim;
  const gun = g.userData.guns[0];
  const left = g.userData.guns[1];
  return {
    name: g.name,
    equip: +a.equip.toFixed(3),
    fumble: !!a.fumble,
    fumbleHand: a.fumbleHand,
    fumbleAt: a.fumbleAt,
    spin: +gun.spin.rotation.x.toFixed(3),
    cyl: +gun.cyl.rotation.z.toFixed(3),
    open: +gun.hinge.rotation.y.toFixed(3),
    hammer: +gun.hammer.rotation.x.toFixed(3),
    loader: gun.loader.visible,
    cases: fx ? fx.children.filter((c) => !c.userData.smoke).length : 0,
    smoke: fx ? fx.children.filter((c) => c.userData.smoke).length : 0,
    leftOpen: left ? +left.hinge.rotation.y.toFixed(3) : 0,
    hands: g.userData.guns.map((u) => u.hand.visible),
  };
}

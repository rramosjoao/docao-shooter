// Morte = BACON. Quando um Docão morre ele dá um "pop", some numa nuvem de fumaça e vira uma tira de bacon
// ondulada que pula no chão, chia (som + faíscas de gordura), fica ~3 s e encolhe.
// Barato: geometria e materiais compartilhados, objetos em pool (nada é criado/descartado durante a partida).
import * as THREE from 'three';
import { toon, outline } from './docao.js';
import { BACON_ITEM } from './shared/rules.js';

const V3 = THREE.Vector3;
const L = 1.25, W = 0.34, T = 0.05; // comprimento, largura, espessura da tira
const BACON_MAX = 14, SMOKE_MAX = 64, SPARK_MAX = 72;
export const BACON = { POP: 0.12, MORPH: 0.3, LINGER: 3.0, FADE: 0.45 }; // tempos (s) desde a morte

// ---------- geometria: fita ondulada com listras de carne e gordura (cores por vértice) ----------
let baconGeo = null, baconMat = null, BOX = null;
// quanto o ponto mais baixo da tira (8 cantos da caixa da geometria, com giro e escala atuais + contorno) fica abaixo do centro:
// o centro fica essa altura acima do chão → a tira encosta no chão sem afundar (no chão, telhado ou andar de cima)
// chão sob a tira: maior altura entre o centro e as duas pontas (degrau/meio-fio embaixo de uma ponta não engole a tira)
function floorUnder(b, s) {
  const h = 0.45 * L * s, dx = Math.cos(b.yaw) * h, dz = -Math.sin(b.yaw) * h, y = b.pos.y + 0.3;
  const c = env.groundAt(b.pos.x, b.pos.z, y), up = (g) => (g > c && g - c <= 0.2 ? g : c); // ponta num degrau baixo levanta; caixa alta ao lado não
  return Math.max(c, up(env.groundAt(b.pos.x + dx, b.pos.z + dz, y)), up(env.groundAt(b.pos.x - dx, b.pos.z - dz, y)));
}
const _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
function lift(b, s, sy) {
  if (!BOX) return 0.15 * sy; let lo = 0; _q.setFromEuler(_e.set(b.grp.rotation.x, b.yaw, b.grp.rotation.z));
  for (let i = 0; i < 8; i++) { _c.set(i & 1 ? BOX.max.x : BOX.min.x, i & 2 ? BOX.max.y : BOX.min.y, i & 4 ? BOX.max.z : BOX.min.z).multiply(_c.clone().set(s, sy, s)).applyQuaternion(_q); lo = Math.min(lo, _c.y); }
  return -lo + 0.02 * Math.max(s, 0.05);
}
function buildGeo() {
  const g = new THREE.BoxGeometry(L, T, W, 40, 1, 24);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const fat = new THREE.Color('#fff1dc'), meat = new THREE.Color('#c9303a'), pink = new THREE.Color('#ee6f78'), burnt = new THREE.Color('#8a2a1c'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), u = z / W + 0.5, s = x / L + 0.5; // u: através da largura, s: ao longo
    // ondulação: onda principal ao longo + leve torção
    pos.setY(i, pos.getY(i) + Math.sin(s * Math.PI * 3.2) * 0.085 + Math.sin(s * Math.PI * 7 + u * 2) * 0.012 + (u - 0.5) * Math.sin(s * Math.PI * 2) * 0.03);
    // bordas da largura levemente irregulares
    pos.setZ(i, z * (1 + Math.sin(s * 31) * 0.04));
    // listras: gordura nas bordas e no meio; carne vermelha/rosada no resto
    const f = u < 0.13 || u > 0.87 || Math.abs(u - 0.5) < 0.07 || Math.abs(u - 0.3) < 0.025;
    if (f) c.copy(fat); else c.copy(meat).lerp(pink, 0.35 + 0.35 * Math.sin(s * 19 + u * 7) * Math.sin(s * 5));
    const end = Math.max(0, 1 - Math.min(s, 1 - s) / 0.07); c.lerp(burnt, end * 0.6); // pontas tostadas
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  g.computeBoundingBox(); BOX = g.boundingBox.clone(); // a ondulação desce ~0,14 m abaixo do centro
  baconGeo = g; baconMat = toon(0xffffff, { vertexColors: true });
}

// ---------- pools ----------
let scene = null, env = null;
const bacons = [], smokes = [], sparks = [];
const smokeGeo = new THREE.IcosahedronGeometry(0.22, 1), sparkGeo = new THREE.OctahedronGeometry(0.045, 0);
export function initBacon(sc, e) { // e: { groundAt(x,z,y), collides(x,y,z), sizzle(vol), pop(vol) }
  scene = sc; env = e; if (!baconGeo) buildGeo();
  if (bacons.length) return;
  for (let i = 0; i < BACON_MAX; i++) {
    const m = new THREE.Mesh(baconGeo, baconMat); outline(m, 0.018); m.visible = false; m.castShadow = false; m.frustumCulled = true;
    const grp = new THREE.Group(); grp.add(m); grp.visible = false; scene.add(grp);
    bacons.push({ grp, mesh: m, on: false, t: 0, pos: new V3(), vel: new V3(), spin: new V3(), rest: false, yaw: 0, nextSpark: 0, ent: null, bounces: 0 });
  }
  for (let i = 0; i < SMOKE_MAX; i++) { const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: 0xf2ece4, transparent: true, depthWrite: false })); m.visible = false; scene.add(m); smokes.push({ m, on: false, t: 0, life: 0.6, vel: new V3(), s0: 1 }); }
  for (let i = 0; i < SPARK_MAX; i++) { const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.visible = false; scene.add(m); sparks.push({ m, on: false, t: 0, life: 0.4, vel: new V3() }); }
}
export function reattachBacon(sc) { // após trocar de mapa a cena é a mesma; garante que os objetos estão nela
  for (const b of bacons) if (b.grp.parent !== sc) sc.add(b.grp);
  for (const s of smokes) if (s.m.parent !== sc) sc.add(s.m);
  for (const s of sparks) if (s.m.parent !== sc) sc.add(s.m);
}
const take = (pool, oldest = true) => { let best = null; for (const p of pool) { if (!p.on) return p; if (oldest && (!best || p.t > best.t)) best = p; } return best; };

function smoke(p, n = 9, color = 0xf2ece4) {
  for (let i = 0; i < n; i++) {
    const s = take(smokes); s.on = true; s.t = 0; s.life = 0.45 + Math.random() * 0.35; s.s0 = 0.6 + Math.random() * 0.8;
    s.m.material.color.setHex(i % 3 === 0 ? 0xffd2dc : color);
    s.m.position.set(p.x + (Math.random() - 0.5) * 0.5, p.y + Math.random() * 0.8, p.z + (Math.random() - 0.5) * 0.5);
    const a = Math.random() * Math.PI * 2, r = 1.2 + Math.random() * 1.6; s.vel.set(Math.cos(a) * r, 0.6 + Math.random() * 1.6, Math.sin(a) * r);
    s.m.visible = true; s.m.scale.setScalar(s.s0);
  }
}
function spark(p, up = 2.2) {
  const s = take(sparks); s.on = true; s.t = 0; s.life = 0.25 + Math.random() * 0.3;
  s.m.position.copy(p); const a = Math.random() * Math.PI * 2, r = 0.4 + Math.random() * 1.2; s.vel.set(Math.cos(a) * r, up * (0.6 + Math.random() * 0.8), Math.sin(a) * r);
  s.m.material.color.setHex(Math.random() < 0.5 ? 0xffe9a0 : 0xfffbe8); s.m.visible = true;
}

export const baconStats = { spawned: 0, active: 0, byKind: { player: 0, remote: 0, bot: 0 }, last: null };
// e: entidade que morreu; kind para estatística/testes; vol: volume do som (0..1)
export function spawnBacon(e, kind, vol = 1) {
  if (!scene) return null;
  const b = take(bacons); if (b.ent && b.ent.bacon === b) b.ent.bacon = null;
  b.on = true; b.t = 0; b.rest = false; b.bounces = 0; b.ent = e; e.bacon = b; b.nextSpark = 0; b.vol = vol;
  b.pos.set(e.pos.x, e.pos.y + 0.9, e.pos.z);
  const a = Math.random() * Math.PI * 2; b.vel.set(Math.cos(a) * 0.45, 4.6 + Math.random() * 0.8, Math.sin(a) * 0.45);
  b.spin.set((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 9); b.yaw = Math.random() * Math.PI * 2;
  b.grp.position.copy(b.pos); b.grp.rotation.set(0, b.yaw, 0); b.grp.scale.setScalar(0.01); b.grp.visible = false; b.mesh.visible = true;
  baconStats.spawned++; baconStats.byKind[kind] = (baconStats.byKind[kind] || 0) + 1; baconStats.last = { kind, name: e.name, at: performance.now() };
  if (env.pop) env.pop(vol);
  return b;
}
// animação do boneco (bots/remotos e o "fantasma" do jogador local): pop/achata e encolhe girando
export function popModel(group, t, yaw) {
  if (t < BACON.POP) { const k = t / BACON.POP; group.scale.set(1 + 0.45 * k, 1 - 0.55 * k, 1 + 0.45 * k); group.visible = true; }
  else if (t < BACON.MORPH) { const k = (t - BACON.POP) / (BACON.MORPH - BACON.POP), s = (1 - k) * (1 - k); group.scale.set(1.45 * s, 0.45 * s + 0.02, 1.45 * s); group.rotation.y = yaw + k * 5; group.visible = true; }
  else { group.visible = false; group.rotation.y = yaw; }
}
const easeBack = (k) => { const c = 2.2; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const tmp = new V3();
export function updateBacon(dt) {
  let act = 0;
  for (const b of bacons) {
    if (!b.on) continue; act++; b.t += dt; const t = b.t;
    if (t < BACON.POP) continue; // ainda é o Docão achatando
    if (!b.grp.visible) { b.grp.visible = true; smoke(b.pos, 10); } // puf!
    // escala: nasce com "overshoot", fica, depois encolhe (sem afundar no chão)
    const k0 = Math.min(1, (t - BACON.POP) / (BACON.MORPH - BACON.POP + 0.08));
    let s = easeBack(k0); const end = BACON.LINGER;
    if (t > end) { const k = (t - end) / BACON.FADE; s *= Math.max(0, 1 - k); }
    const sy = s * (b.rest ? 0.9 + 0.1 * Math.sin(t * 9) : 1);
    // física: gravidade, quique, sem atravessar parede
    if (!b.rest) {
      b.vel.y -= 14 * dt;
      const nx = b.pos.x + b.vel.x * dt, nz = b.pos.z + b.vel.z * dt;
      if (env.collides && env.collides(nx, b.pos.y, nz)) { b.vel.x *= -0.3; b.vel.z *= -0.3; } else { b.pos.x = nx; b.pos.z = nz; }
      b.pos.y += b.vel.y * dt;
      const g = floorUnder(b, s) + lift(b, s, sy);
      if (b.pos.y <= g && b.vel.y <= 0) {
        b.pos.y = g;
        if (b.vel.y < -1.6 && b.bounces < 3) { b.vel.y *= -0.36; b.vel.x *= 0.55; b.vel.z *= 0.55; b.spin.multiplyScalar(0.45); b.bounces++; if (env.sizzle) env.sizzle(b.vol * (b.bounces === 1 ? 1 : 0.4), b.bounces === 1 ? 1.6 : 0.3); for (let i = 0; i < 5; i++) spark(b.pos, 2.8); }
        else { b.rest = true; b.vel.set(0, 0, 0); }
      }
      b.grp.rotation.x += b.spin.x * dt; b.grp.rotation.z += b.spin.z * dt; b.yaw += b.spin.y * dt;
    } else { // assenta deitado (a ondulação aparece), devagar
      const k = Math.min(1, dt * 14); b.grp.rotation.x += (0 - wrap(b.grp.rotation.x)) * k; b.grp.rotation.z += (0 - wrap(b.grp.rotation.z)) * k;
      b.pos.y = floorUnder(b, s) + lift(b, s, sy) + Math.abs(Math.sin(t * 22)) * 0.004; // tremidinha de fritura (só pra cima)
    }
    b.grp.rotation.y = b.yaw; b.grp.position.copy(b.pos);
    b.grp.scale.set(s, sy, s);
    // gordura chiando
    if (t < end && t >= b.nextSpark && b.bounces > 0) { b.nextSpark = t + (t < 1.4 ? 0.07 : 0.18); tmp.set(b.pos.x + (Math.random() - 0.5) * 0.9, b.pos.y + 0.06, b.pos.z + (Math.random() - 0.5) * 0.9); spark(tmp, 1.8); }
    if (t > end + BACON.FADE) { b.on = false; b.grp.visible = false; if (b.ent && b.ent.bacon === b) b.ent.bacon = null; b.ent = null; }
  }
  for (const s of smokes) {
    if (!s.on) continue; s.t += dt; const k = s.t / s.life;
    s.vel.multiplyScalar(1 - 3 * dt); s.vel.y += 0.8 * dt; s.m.position.addScaledVector(s.vel, dt); s.m.scale.setScalar(s.s0 * (1 + k * 1.6)); s.m.material.opacity = 0.85 * (1 - k);
    if (k >= 1) { s.on = false; s.m.visible = false; }
  }
  for (const s of sparks) {
    if (!s.on) continue; s.t += dt; const k = s.t / s.life;
    s.vel.y -= 9 * dt; s.m.position.addScaledVector(s.vel, dt); s.m.scale.setScalar(1 - k * 0.7); s.m.material.opacity = 1 - k;
    if (k >= 1) { s.on = false; s.m.visible = false; }
  }
  baconStats.active = act;
}
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export function clearBacon() {
  for (const b of bacons) { b.on = false; b.grp.visible = false; if (b.ent) b.ent.bacon = null; b.ent = null; }
  for (const s of smokes) { s.on = false; s.m.visible = false; } for (const s of sparks) { s.on = false; s.m.visible = false; }
  baconStats.active = 0;
}
export const activeBacons = () => bacons.filter((b) => b.on);
// bacon que dá pra comer: já virou bacon e ainda não sumiu
export const edibleBacons = () => bacons.filter((b) => b.on && b.t >= BACON_ITEM.from && b.t < BACON_ITEM.life);
// alguém comeu: some na hora com uma nuvem rosada e faíscas subindo
export function eatBacon(b) {
  if (!b || !b.on) return; const p = b.pos.clone();
  b.on = false; b.grp.visible = false; if (b.ent && b.ent.bacon === b) b.ent.bacon = null; b.ent = null;
  smoke(p, 7, 0xffc0cc); for (let i = 0; i < 8; i++) spark(p, 3.2);
  baconStats.eaten = (baconStats.eaten || 0) + 1;
}

// Docão Shooter — jogo original de tiro em primeira pessoa com o Docão (mascote Cheers).
import * as THREE from 'three';
import { makeDocao, makeFPArms, setPose, toon, outline, makeCup, makeRocket, drawLogo } from './docao.js';
import { SKINS, getSkin, DEFAULT_SKIN } from './skins.js';
import './costumes.js';
import { MAPS, getMap } from './maps.js';
import { buildWorld, disposeWorld, applyPalette, renderThumb, updateWeather } from './world.js';
import { buildNav } from './nav.js';
import { initBacon, spawnBacon, updateBacon, clearBacon, popModel, baconStats, activeBacons, BACON } from './bacon.js';
import { Net, createRoom, roomInfo } from './net.js';
import { SEND_HZ, INTERP_DELAY } from './config.js';
import { cleanName, NAME_MAX } from './shared/names.js';
import { explosionHits, rayCapsule, ROCKET_PAD, sniperSpread } from './shared/combat.js';
import { DOM, TEAM_NAMES, TEAM_COLORS, TEAM_HEX, TEAM_DARK, pickZone, newZoneState, zoneCounts, stepZone, inZone, smallerTeam } from './shared/domination.js';
import { KILL_LIMIT, TIME_LIMIT, RESPAWN_TIME, INVULN, GRAV, JUMP, SPEED, BOT_SPEED, STEP, RADIUS, HEIGHT, EYE, WEAPONS, PRIMARIES, PISTOL, W_NADE, NADE, WEAPON_SHORT, BOT_DEFS, BOT_RANGE, TAG_COLORS } from './shared/rules.js';

const V3 = THREE.Vector3;
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------- Constantes ----------------
// ---------------- Constantes (regras em shared/rules.js) ----------------
const BASE_FOV = 75, ADS_TIME = 0.15, ADS_SPEED = 0.6; // mira (Shift)
const COLORS = { skin: 0xF7A531, snout: 0xF58A6E, cheek: 0xFF7FA0, hoof: 0x7a4535, outline: 0x2a1410, red: 0xe63946, cyan: 0x7DF9FF };

// ---------------- Renderer / cenas ----------------
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8fd3ff);
scene.fog = new THREE.Fog(0x8fd3ff, 50, 120);
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.05, 300);
camera.rotation.order = 'YXZ';
scene.add(camera);

const fpScene = new THREE.Scene();
const fpCam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.01, 10);

const hemi = new THREE.HemisphereLight(0xffffff, 0x6a8f4a, 1.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(30, 50, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);
const fpHemi = new THREE.HemisphereLight(0xffffff, 0x6a8f4a, 1.8); fpScene.add(fpHemi);
const fpSun = new THREE.DirectionalLight(0xffffff, 2); fpSun.position.set(1, 2, 1); fpScene.add(fpSun);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = fpCam.aspect = innerWidth / innerHeight;
  if (state === 'menu') camera.clearViewOffset();
  camera.updateProjectionMatrix(); fpCam.updateProjectionMatrix();
});

// ---------------- Materiais toon ----------------
const basic = (color) => new THREE.MeshBasicMaterial({ color });
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function nameSprite(text, color = '#ffffff') {
  const tex = canvasTex(256, 64, (x, w, h) => {
    x.font = 'bold 34px "Trebuchet MS", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 7; x.strokeStyle = '#2a1410'; x.strokeText(text, w / 2, h / 2); x.fillStyle = color; x.fillText(text, w / 2, h / 2);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
  s.scale.set(1.8, 0.45, 1); s.position.y = 2.55; return s;
}

// ---------------- Mapa (dados em maps.js, construção em world.js) ----------------
let solids = [], worldMeshes = [], SPAWNS = [], nav = null, currentMap = null, worldGroup = null, mapBounds = [36, 36];
const GRID = 4, solidGrid = new Map(), NO_SOLIDS = [];
const gkey = (ix, iz) => ix * 100003 + iz;
function indexSolids() { // broadphase: grade 4 m (com folga) para colisão rápida
  solidGrid.clear();
  for (const s of solids) {
    for (let ix = Math.floor((s.min.x - 1) / GRID); ix <= Math.floor((s.max.x + 1) / GRID); ix++)
      for (let iz = Math.floor((s.min.z - 1) / GRID); iz <= Math.floor((s.max.z + 1) / GRID); iz++) { const k = gkey(ix, iz); if (!solidGrid.has(k)) solidGrid.set(k, []); solidGrid.get(k).push(s); }
  }
}
const solidsAt = (x, z) => solidGrid.get(gkey(Math.floor(x / GRID), Math.floor(z / GRID))) || NO_SOLIDS;
function topAt(s, x, z) {
  if (!s.ramp) return s.max.y;
  let t = s.ramp.axis === 'x' ? (x - s.min.x) / (s.max.x - s.min.x) : (z - s.min.z) / (s.max.z - s.min.z);
  t = clamp(t, 0, 1); if (s.ramp.dir < 0) t = 1 - t;
  return s.min.y + t * (s.max.y - s.min.y);
}

// ---------------- Física ----------------
// AABB completo: só bloqueia se o corpo (pés..cabeça) cruza a caixa; dá pra andar debaixo de lajes e 2º andar
function collides(x, y, z) {
  for (const s of solidsAt(x, z)) {
    if (x + RADIUS > s.min.x && x - RADIUS < s.max.x && z + RADIUS > s.min.z && z - RADIUS < s.max.z) {
      const top = topAt(s, clamp(x, s.min.x, s.max.x), clamp(z, s.min.z, s.max.z));
      if (y < top - STEP && y + HEIGHT > s.min.y) return true;
    }
  }
  return false;
}
function groundAt(x, z, y) {
  let g = 0; const m = RADIUS * 0.6;
  for (const s of solidsAt(x, z)) {
    if (x > s.min.x - m && x < s.max.x + m && z > s.min.z - m && z < s.max.z + m) {
      const top = topAt(s, clamp(x, s.min.x, s.max.x), clamp(z, s.min.z, s.max.z));
      if (top <= y + STEP && top > g) g = top;
    }
  }
  return g;
}
// teto: menor base de caixa acima da cabeça
function ceilingAt(x, z, headY) {
  let c = Infinity; const r = RADIUS * 0.9;
  for (const s of solidsAt(x, z)) if (x + r > s.min.x && x - r < s.max.x && z + r > s.min.z && z - r < s.max.z && s.min.y >= headY - 0.25 && s.min.y < c) c = s.min.y;
  return c;
}
function moveEntity(e, dt) {
  let blocked = false;
  const nx = e.pos.x + e.vel.x * dt;
  if (!collides(nx, e.pos.y, e.pos.z)) e.pos.x = nx; else { blocked = true; e.vel.x = 0; }
  const nz = e.pos.z + e.vel.z * dt;
  if (!collides(e.pos.x, e.pos.y, nz)) e.pos.z = nz; else { blocked = true; e.vel.z = 0; }
  e.vel.y += GRAV * dt;
  let ny = e.pos.y + e.vel.y * dt;
  if (e.vel.y > 0) { const c = ceilingAt(e.pos.x, e.pos.z, e.pos.y + HEIGHT); if (ny + HEIGHT > c) { ny = Math.max(e.pos.y, c - HEIGHT); e.vel.y = 0; e.bonk = true; } }
  const g = groundAt(e.pos.x, e.pos.z, e.pos.y);
  if (ny <= g) { e.pos.y = g; e.vel.y = 0; e.onGround = true; }
  else if (e.onGround && e.vel.y <= 0 && ny - g < STEP) { e.pos.y = g; e.vel.y = 0; }
  else { e.pos.y = ny; e.onGround = false; }
  // segurança: nunca sai dos limites do mapa
  const [hx, hz] = mapBounds; e.pos.x = clamp(e.pos.x, -hx + RADIUS, hx - RADIUS); e.pos.z = clamp(e.pos.z, -hz + RADIUS, hz - RADIUS);
  return blocked;
}

const raycaster = new THREE.Raycaster();
function wallDistance(o, d, far) {
  raycaster.set(o, d); raycaster.far = far;
  const h = raycaster.intersectObjects(worldMeshes, false);
  return h.length ? h[0] : null;
}
function losClear(a, b) {
  const d = b.clone().sub(a); const len = d.length(); d.divideScalar(len);
  return !wallDistance(a, d, len - 0.3);
}
function raySphere(o, d, c, r) {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z, cc = ox * ox + oy * oy + oz * oz - r * r, h = b * b - cc;
  if (h < 0) return -1; const sq = Math.sqrt(h); let t = -b - sq; if (t < 0) t = -b + sq; return t;
}
const center = (e, y = 1.0) => new V3(e.pos.x, e.pos.y + y, e.pos.z);

// ---------------- Áudio sintetizado ----------------
let actx = null, master = null, noiseBuf = null;
function initAudio() {
  if (actx) { actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = 0.4; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { actx = null; }
}
function noise(dur, freq, vol, type = 'lowpass', delay = 0) {
  if (!actx) return; const t = actx.currentTime + delay;
  const s = actx.createBufferSource(); s.buffer = noiseBuf;
  const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  if (!actx) return; const t = actx.currentTime + delay;
  const o = actx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
  const g = actx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
const sfx = {
  rifle: (v = 1) => { noise(0.11, 3000, 0.5 * v); tone('square', 220, 60, 0.07, 0.15 * v); },
  shotgun: (v = 1) => { noise(0.45, 1300, 1.0 * v); tone('sawtooth', 100, 30, 0.3, 0.35 * v); noise(0.12, 5000, 0.25 * v, 'highpass'); },
  pump: (v = 1, d = 0) => { noise(0.05, 1800, 0.35 * v, 'bandpass', d); tone('square', 240, 180, 0.04, 0.08 * v, d); noise(0.05, 2600, 0.4 * v, 'bandpass', d + 0.17); tone('square', 320, 260, 0.04, 0.1 * v, d + 0.17); },
  shell: () => { tone('square', 620, 520, 0.03, 0.08); noise(0.04, 3000, 0.15, 'bandpass', 0.02); },
  sniper: (v = 1) => { noise(0.9, 1800, 1.3 * v); tone('sine', 140, 28, 0.7, 0.6 * v); noise(0.18, 7000, 0.5 * v, 'highpass'); noise(1.4, 500, 0.35 * v, 'lowpass', 0.15); },
  bolt: (v = 1, d = 0) => { tone('square', 420, 380, 0.04, 0.1 * v, d); noise(0.06, 2400, 0.3 * v, 'bandpass', d + 0.12); noise(0.05, 3200, 0.3 * v, 'bandpass', d + 0.42); tone('square', 520, 480, 0.03, 0.1 * v, d + 0.55); },
  bazooka: (v = 1) => { noise(0.6, 900, 0.9 * v, 'bandpass'); tone('sawtooth', 180, 60, 0.4, 0.3 * v); noise(1.0, 2500, 0.2 * v, 'highpass', 0.05); },
  pistol: (v = 1) => { noise(0.08, 3600, 0.45 * v); tone('square', 330, 90, 0.06, 0.14 * v); },
  empty: () => tone('square', 1100, 1000, 0.03, 0.08),
  reload: () => { tone('square', 500, 420, 0.04, 0.1); tone('square', 700, 600, 0.04, 0.1, 0.35); noise(0.06, 2500, 0.3, 'highpass', 0.8); },
  hit: () => tone('sine', 1300, 1700, 0.06, 0.25),
  kill: () => { tone('triangle', 700, 1400, 0.18, 0.3); tone('triangle', 1050, 2100, 0.2, 0.2, 0.06); },
  oink: (v = 1, p = 1) => { tone('sawtooth', 430 * p, 250 * p, 0.12, 0.18 * v); tone('sawtooth', 400 * p, 230 * p, 0.12, 0.15 * v, 0.14); },
  die: (v = 1) => tone('sawtooth', 520, 110, 0.55, 0.22 * v),
  pickup: () => { tone('sine', 660, 660, 0.08, 0.2); tone('sine', 880, 880, 0.08, 0.2, 0.08); tone('sine', 1320, 1320, 0.12, 0.2, 0.16); },
  jump: () => tone('sine', 300, 600, 0.1, 0.06),
  boom: (v = 1) => { noise(1.1, 700, 1.4 * v); tone('sine', 110, 28, 0.8, 0.7 * v); noise(0.5, 3500, 0.25 * v, 'highpass', 0.12); noise(0.9, 6000, 0.12 * v, 'highpass', 0.3); tone('triangle', 900, 1600, 0.08, 0.12 * v, 0.05); },
  toss: (v = 1) => { noise(0.18, 1800, 0.25 * v, 'bandpass'); tone('sine', 500, 260, 0.15, 0.08 * v); },
  bounce: (v = 1) => tone('square', 260 + Math.random() * 80, 180, 0.05, 0.08 * v),
  charge: () => tone('sine', 300, 300, 0.03, 0.03),
  pop: (v = 1) => { tone('sine', 820, 180, 0.12, 0.25 * v); noise(0.18, 1400, 0.35 * v, 'bandpass'); },
  sizzle: (v = 1, dur = 1.5) => { // bacon fritando: chiado agudo + estalinhos de gordura
    if (v < 0.03) return; noise(dur, 5200, 0.16 * v, 'highpass'); noise(dur * 0.7, 2600, 0.08 * v, 'bandpass', 0.05);
    const n = Math.round(6 + dur * 10); for (let i = 0; i < n; i++) noise(0.025, 2500 + Math.random() * 3500, (0.12 + Math.random() * 0.2) * v, 'bandpass', Math.random() * dur);
  },
};
const distVol = (p) => clamp(1 - p.distanceTo(player.pos) / 60, 0.05, 1);

// ---------------- Entidades ----------------
let gameTime = 0, state = 'menu', hadLock = false, entities = [], player = null, sens = 1.4;
let mode = 'dm', teamScore = [0, 0], zone = null, zoneT = 0; // modo de jogo: 'dm' (mata-mata) | 'dom' (Dominação)
let spawnHold = 'primary'; // arma na mão ao renascer (tela de morte)
const teamMode = () => mode === 'dom';
const friends = (a, b) => teamMode() && a && b && a !== b && a.team === b.team && a.team >= 0;
let online = null; // modo online: { net, code, myId, hostId, ents: Map(id → entidade), evq, ... } (ver seção Online)
let ads = 0; // 0 = normal, 1 = mirando (zoom)
const keys = {}; let mouseDown = false, firedThisPress = false;

function makeEntity(name, isPlayer, skinId, tag = '#ffffff') {
  const skin = getSkin(skinId);
  const e = { name, isPlayer, skinId: skin.id, float: !!skin.float, floatPh: Math.random() * 6, nextWisp: 0, shirt: (skin.shirt && skin.shirt.color) || '#d8261c', tag, pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, onGround: false, hp: 100, alive: true,
    kills: 0, deaths: 0, invulnUntil: 0, weapon: 0, primary: 0, nextPrimary: 0, mag: WEAPONS.map(() => 0), reserve: WEAPONS.map(() => 0), reloadEnd: 0, nextFire: 0, switchEnd: 0, actionEnd: 0,
    respawnAt: 0, deathAt: 0, fxDeath: 0, lastAttacker: null, flashUntil: 0, nades: 0, charging: false, chargeStart: 0, nextNade: 0 };
  e.nextPrimary = isPlayer ? selectedPrimary : PRIMARIES[Math.floor(Math.random() * PRIMARIES.length)];
  if (!isPlayer) {
    e.model = makeDocao(skin); scene.add(e.model.group);
    e.tagSprite = nameSprite(name, tag); e.model.group.add(e.tagSprite);
    e.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.25, depthWrite: false }));
    e.bubble.position.y = 1.0; e.model.group.add(e.bubble);
    Object.assign(e, { think: 0, target: null, aim: 0, reaction: rand(0.35, 0.65), strafeDir: 1, strafeT: 0, wp: null, stuck: 0, lastSeen: null, lastSeenAt: -99, walk: 0, accuracy: rand(0.045, 0.07) });
  }
  return e;
}

// spawn equilibrado: longe dos vivos e, se possível, fora da linha de visão deles
function pickSpawn(e) {
  let best = SPAWNS[0], bd = -Infinity;
  for (const s of SPAWNS) {
    let md = 1e9, seen = false; const eye = new V3(s.x, s.y + 1.5, s.z);
    for (const o of entities) {
      if (o === e || !o.alive || friends(o, e)) continue; const d = o.pos.distanceTo(s); md = Math.min(md, d);
      if (!seen && d < 60 && losClear(eye, center(o, 1.5))) seen = true;
    }
    const score = Math.min(md, 40) + Math.random() * 6 - (seen ? 30 : 0); if (score > bd) { bd = score; best = s; }
  }
  return best;
}
function respawn(e) {
  e.pos.copy(pickSpawn(e)); e.vel.set(0, 0, 0); e.hp = 100; e.alive = true; e.invulnUntil = gameTime + INVULN;
  if (!e.isPlayer && Math.random() < 0.3) e.nextPrimary = PRIMARIES[Math.floor(Math.random() * PRIMARIES.length)]; // bots às vezes trocam de primária
  e.primary = e.nextPrimary; e.slots = [e.primary, PISTOL];
  e.mag = WEAPONS.map((w) => w.mag); e.reserve = WEAPONS.map((w) => w.reserve); e.reloadEnd = 0; e.switchEnd = 0; e.actionEnd = 0; e.nades = NADE.spawnWith; e.charging = false;
  setWeapon(e, e.isPlayer && spawnHold === 'secondary' ? PISTOL : e.primary);
  e.yaw = Math.atan2(-e.pos.x, -e.pos.z) + Math.PI; e.bonk = false; // olha pro centro
  if (e.model) { e.model.group.visible = true; e.model.group.scale.set(1, 1, 1); e.target = null; e.wp = null; e.path = null; e.yaw = Math.atan2(-e.pos.x, -e.pos.z); }
  else { e.pitch = 0; $('stamp').classList.remove('show'); onPlayerRespawn(); }
}

// ---------------- Pickups ----------------
// caixa de munição: enche a reserva da primária e da pistola; a bazuca é escassa (+1 foguete por caixa)
function refillAmmo(e) {
  let got = false;
  for (const i of e.slots) {
    const w = WEAPONS[i]; if (e.reserve[i] >= w.reserve) continue;
    e.reserve[i] = w.rocket ? Math.min(w.reserve, e.reserve[i] + 1) : w.reserve; got = true;
  }
  return got;
}
const pickups = [];
function makePickup(type, x, z, yHint = 0) {
  const g = new THREE.Group();
  if (type === 'health') {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), toon(0xff7fa0)); outline(b, 0.025); g.add(b);
    for (const [w, h] of [[0.5, 0.15], [0.15, 0.5]]) for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), basic(0xffffff)); c.position.z = s * 0.36; g.add(c); const c2 = c.clone(); c2.rotation.y = Math.PI / 2; c2.position.set(s * 0.36, 0, 0); g.add(c2); }
  } else if (type === 'grenade') {
    const cup = makeCup(2.0); cup.position.y = -0.3; cup.rotation.z = 0.25; g.add(cup);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.45, 32), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.55, side: THREE.DoubleSide }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = -0.62; g.add(glow);
  } else {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.55), toon(0x6b7a3a)); outline(b, 0.025); g.add(b);
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.12, 0.57), toon(0xf2c94c)); g.add(st);
  }
  const y = groundAt(x, z, yHint + 0.3); g.position.set(x, y + 0.7, z); scene.add(g);
  pickups.push({ type, mesh: g, pos: new V3(x, y, z), active: true, respawnAt: 0, baseY: y + 0.7 });
}

function updatePickups(dt) {
  for (const p of pickups) {
    if (!p.active) { if (gameTime >= p.respawnAt) { p.active = true; p.mesh.visible = true; } continue; }
    p.mesh.rotation.y += dt * 1.6; p.mesh.position.y = p.baseY + Math.sin(gameTime * 3 + p.pos.x) * 0.12;
    if (online) continue; // online: o servidor decide quem pegou
    for (const e of entities) {
      if (!e.alive) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
      if (dx * dx + dz * dz > 1.5 || Math.abs(e.pos.y - p.pos.y) > 1.5) continue;
      if (p.type === 'health') { if (e.hp >= 100) continue; e.hp = Math.min(100, e.hp + 50); }
      else if (p.type === 'grenade') { if (e.nades >= NADE.max) continue; e.nades++; }
      else if (!refillAmmo(e)) continue;
      p.active = false; p.mesh.visible = false; p.respawnAt = gameTime + (p.type === 'grenade' ? NADE.pickupRespawn : 15);
      if (e.isPlayer) { sfx.pickup(); flashMsg(p.type === 'health' ? '+50 de vida' : p.type === 'grenade' ? `+1 Copo Bomba (${e.nades}/${NADE.max})` : e.primary === 3 ? `Munição! +1 foguete (${e.reserve[3]}/${WEAPONS[3].reserve})` : 'Munição cheia!'); }
      break;
    }
  }
}

// ---------------- Efeitos ----------------
const effects = [];
const FLASH = new THREE.Color(0xcc2222);
const tracerMat = new THREE.LineBasicMaterial({ color: 0xfff27a, transparent: true });
function tracer(a, b, beam = false) {
  if (beam) { // rastro grosso do sniper
    const len = a.distanceTo(b); const geo = new THREE.CylinderGeometry(0.018, 0.03, len, 6, 1, true);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, depthWrite: false }));
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), b.clone().sub(a).normalize());
    scene.add(m); effects.push({ obj: m, t: 0, life: 0.4, kind: 'beam' }); return;
  }
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const l = new THREE.Line(geo, tracerMat.clone()); scene.add(l); effects.push({ obj: l, t: 0, life: 0.07, kind: 'line' });
}
const puffGeo = new THREE.SphereGeometry(0.12, 8, 6);
function puff(p, color = 0xffffff) {
  const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(p); scene.add(m);
  effects.push({ obj: m, t: 0, life: 0.3, kind: 'puff' });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const f = effects[i]; f.t += dt; const k = f.t / f.life;
    f.obj.material.opacity = 1 - k; if (f.kind === 'beam') f.obj.scale.set(1 + k * 2, 1, 1 + k * 2); if (f.kind === 'puff') f.obj.scale.setScalar(1 + k * 2);
    if (k >= 1) { scene.remove(f.obj); f.obj.material.dispose(); if (f.kind === 'line' || f.kind === 'beam') f.obj.geometry.dispose(); effects.splice(i, 1); }
  }
}

// ---------------- Morte = BACON (ver bacon.js) ----------------
initBacon(scene, { groundAt, collides: (x, y, z) => collides(x, y, z), pop: (v) => sfx.pop(v), sizzle: (v, d) => sfx.sizzle(v, d) });
const DEATHCAM_HOLD = 1.1; // s de câmera em 3ª pessoa no seu bacon antes dos cartões de arma
let ghost = null; // Docão do jogador local (ele não tem modelo em 1ª pessoa) só pra animação de morte
const deathCamState = { on: false, dist: 0, target: null };
function deathFx(e) { // dispara uma vez por morte (offline: kill(); online: evento 'k' ou snapshot)
  if (e.fxDeath === e.deathAt) return; e.fxDeath = e.deathAt;
  if (gameTime - e.deathAt > 1.0) return; // morte antiga (entrou no meio): sem animação
  e.baconOk = true;
  spawnBacon(e, e.isPlayer ? 'player' : e.remote && !e.bot ? 'remote' : 'bot', e.isPlayer ? 1 : distVol(e.pos));
  if (e.isPlayer) {
    if (!ghost || ghost.skin !== e.skinId) { if (ghost) scene.remove(ghost.model.group); ghost = { skin: e.skinId, model: makeDocao(getSkin(e.skinId)) }; scene.add(ghost.model.group); }
    ghost.model.group.position.copy(e.pos); ghost.model.group.rotation.set(0, e.yaw + Math.PI, 0); ghost.model.group.scale.set(1, 1, 1); ghost.model.group.visible = true;
    deathCamState.on = true; deathCamState.dist = 0; deathCamState.ang = e.yaw;
  }
}
const camTmp = new V3(), camTgt = new V3();
function deathCam(p, dt) { // 3ª pessoa: órbita lenta em volta do seu bacon (encurta se tiver parede)
  const t = gameTime - p.deathAt;
  if (ghost && ghost.model.group.visible) popModel(ghost.model.group, t, p.yaw + Math.PI);
  const b = p.bacon && p.bacon.on ? p.bacon : null;
  camTgt.set(b ? b.pos.x : p.pos.x, (b ? b.pos.y : p.pos.y) + 0.25, b ? b.pos.z : p.pos.z);
  deathCamState.ang += dt * 0.45; const a = deathCamState.ang;
  const want = Math.min(3.4, 1.2 + t * 6); let d = want;
  for (; d > 0.8; d -= 0.4) { camTmp.set(camTgt.x + Math.sin(a) * d, camTgt.y + 0.55 + d * 0.42, camTgt.z + Math.cos(a) * d); if (losClear(camTgt, camTmp)) break; }
  camTmp.set(camTgt.x + Math.sin(a) * d, camTgt.y + 0.55 + d * 0.42, camTgt.z + Math.cos(a) * d);
  if (!deathCamState.dist) camera.position.copy(camTmp); else camera.position.lerp(camTmp, Math.min(1, dt * 6));
  deathCamState.dist = d; deathCamState.target = camTgt.toArray();
  camera.lookAt(camTgt);
}

// ---------------- Copo Bomba (granada) ----------------
const grenades = [], particles = []; let shake = 0, explosions = 0, lastKnock = -99;
function nadeBlocked(x, y, z) {
  for (const sd of solidsAt(x, z)) {
    if (x > sd.min.x - NADE.r && x < sd.max.x + NADE.r && z > sd.min.z - NADE.r && z < sd.max.z + NADE.r && y > sd.min.y - NADE.r) {
      const top = topAt(sd, clamp(x, sd.min.x, sd.max.x), clamp(z, sd.min.z, sd.max.z));
      if (y < top - 0.05) return true;
    }
  }
  return false;
}
function throwGrenade(e, origin, vel) {
  if (e.nades <= 0) return null;
  e.nades--;
  if (online && e.isPlayer) { netEv(['n', v3a(origin), v3a(vel)]); sfx.toss(1); return null; } // o copo aparece quando o servidor confirmar
  const mesh = makeCup(1.15); scene.add(mesh);
  const gnd = { owner: e, pos: origin.clone(), vel: vel.clone(), explodeAt: gameTime + NADE.fuse, mesh, spin: new V3(rand(-8, 8), rand(-4, 4), rand(-8, 8)), lastBounce: 0 };
  grenades.push(gnd); sfx.toss(e.isPlayer ? 1 : distVol(e.pos)); return gnd;
}
function stepNade(pos, vel, dt, onBounce) {
  vel.y += NADE.grav * dt;
  const nx = pos.x + vel.x * dt; if (nadeBlocked(nx, pos.y, pos.z)) { vel.x *= -0.45; if (onBounce) onBounce(); } else pos.x = nx;
  const nz = pos.z + vel.z * dt; if (nadeBlocked(pos.x, pos.y, nz)) { vel.z *= -0.45; if (onBounce) onBounce(); } else pos.z = nz;
  if (vel.y > 0 && nadeBlocked(pos.x, pos.y + vel.y * dt + NADE.r, pos.z)) { vel.y = -vel.y * 0.35; if (onBounce) onBounce(); } // quica no teto
  const ny = pos.y + vel.y * dt; const g = groundAt(pos.x, pos.z, pos.y - NADE.r + 0.3) + NADE.r;
  if (ny <= g) { pos.y = g; if (Math.abs(vel.y) > 1.5 && onBounce) onBounce(); vel.y = Math.abs(vel.y) > 1.2 ? -vel.y * 0.42 : 0; vel.x *= 0.72; vel.z *= 0.72; return true; }
  pos.y = ny; return false;
}
function throwVelocity(power) { // direção da câmera + leve arco pra cima
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion); dir.y += 0.28; dir.normalize();
  return dir.multiplyScalar(7 + 15 * power).add(new V3(player.vel.x * 0.5, 0, player.vel.z * 0.5));
}
const throwOrigin = () => camera.localToWorld(new V3(-0.25, -0.15, -0.5));
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const n = grenades[i];
    stepNade(n.pos, n.vel, dt, () => { if (gameTime - n.lastBounce > 0.12) { sfx.bounce(distVol(n.pos)); n.lastBounce = gameTime; } n.spin.multiplyScalar(0.6); });
    n.mesh.position.copy(n.pos).y -= 0.1; n.mesh.rotation.x += n.spin.x * dt; n.mesh.rotation.y += n.spin.y * dt; n.mesh.rotation.z += n.spin.z * dt;
    const left = n.explodeAt - gameTime; n.mesh.scale.setScalar(1.15 * (left < 0.6 ? 1 + Math.sin(gameTime * 40) * 0.08 : 1));
    if (n.net) { if (left < -1.5) { scene.remove(n.mesh); grenades.splice(i, 1); } continue; } // online: explode quando o servidor mandar
    if (left <= 0) { explode(n); scene.remove(n.mesh); grenades.splice(i, 1); }
  }
}
function explode(n) { blast(n.pos.clone(), n.owner, { radius: NADE.radius, maxDmg: NADE.maxDmg, selfMul: NADE.selfMul, knock: NADE.knock, lift: NADE.lift, wIdx: W_NADE }); }
// explosão genérica (Copo Bomba e foguete da bazuca)
function blastFx(c, radius) {
  explosions++;
  sfx.boom(player ? clamp(1 - c.distanceTo(player.pos) / 70, 0.15, 1) : 1);
  if (player) shake = Math.max(shake, clamp(1 - c.distanceTo(player.pos) / 16, 0, 1) * 0.6);
  burst(c, radius);
}
function blast(c, owner, o, direct = null) {
  blastFx(c, o.radius); // som, tremida, confete (conta a explosão)
  const los = (a, b) => losClear(new V3(a.x, a.y, a.z), new V3(b.x, b.y, b.z));
  for (const h of explosionHits(c, o, entities, los, owner, teamMode(), direct)) { // mesma regra do servidor (shared/combat.js)
    const e = h.e; e.vel.x += h.knock.x; e.vel.z += h.knock.z; e.vel.y = Math.max(e.vel.y, h.knock.y); e.onGround = false; // empurrão (rocket jump)
    if (e.isPlayer) lastKnock = gameTime;
    damage(e, h.dmg, owner, o.wIdx, false);
  }
}
// partículas: confete vermelho/ciano + espuma + gotas âmbar + clarão + onda
const confGeo = new THREE.PlaneGeometry(0.12, 0.07), foamGeo = new THREE.SphereGeometry(0.16, 8, 6), dropGeo = new THREE.SphereGeometry(0.05, 6, 5);
function burst(c, radius = NADE.radius) {
  const add = (mesh, vel, life, kind, extra = {}) => { mesh.position.copy(c); scene.add(mesh); particles.push({ mesh, vel, life, t: 0, kind, radius, ...extra }); };
  const confCols = [0xe63946, COLORS.cyan, 0xffffff, 0xffd27a, 0xe63946, COLORS.cyan];
  for (let i = 0; i < 90; i++) {
    const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: confCols[i % confCols.length], side: THREE.DoubleSide, transparent: true }));
    const v = new V3(rand(-1, 1), rand(0.3, 1.6), rand(-1, 1)).normalize().multiplyScalar(rand(4, 13));
    add(m, v, rand(1.4, 2.4), 'conf', { spin: new V3(rand(-12, 12), rand(-12, 12), rand(-12, 12)) });
  }
  for (let i = 0; i < 28; i++) {
    const m = new THREE.Mesh(foamGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? 0xfff8e8 : 0xffe9b0, transparent: true }));
    add(m, new V3(rand(-1, 1), rand(0.6, 2.2), rand(-1, 1)).multiplyScalar(rand(1.5, 4.5)), rand(0.7, 1.2), 'foam', { s0: rand(0.8, 1.6) });
  }
  for (let i = 0; i < 40; i++) {
    const m = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xf2b233 : 0xffcf5a, transparent: true }));
    add(m, new V3(rand(-1, 1), rand(0.5, 1.8), rand(-1, 1)).normalize().multiplyScalar(rand(5, 11)), rand(0.6, 1.1), 'drop');
  }
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0.9 }));
  add(flash, new V3(), 0.22, 'flash');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 8, 40), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true }));
  ring.rotation.x = Math.PI / 2; add(ring, new V3(), 0.45, 'ring');
  const light = new THREE.PointLight(0xffd27a, 30, 14); light.position.copy(c).y += 0.6; scene.add(light); particles.push({ mesh: light, vel: new V3(), life: 0.25, t: 0, kind: 'light' });
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.t += dt; const k = p.t / p.life; const m = p.mesh;
    if (p.kind === 'conf') { p.vel.y -= 9 * dt; p.vel.multiplyScalar(1 - 1.6 * dt); m.position.addScaledVector(p.vel, dt); if (m.position.y < 0.03) { m.position.y = 0.03; p.vel.set(0, 0, 0); } m.rotation.x += p.spin.x * dt; m.rotation.y += p.spin.y * dt; m.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1; }
    else if (p.kind === 'foam') { p.vel.multiplyScalar(1 - 2.5 * dt); p.vel.y -= 1.5 * dt; m.position.addScaledVector(p.vel, dt); m.scale.setScalar(p.s0 * (0.6 + k * 1.4)); m.material.opacity = 1 - k; }
    else if (p.kind === 'drop') { p.vel.y -= 18 * dt; m.position.addScaledVector(p.vel, dt); m.material.opacity = 1 - k; }
    else if (p.kind === 'flash') { m.scale.setScalar(0.5 + k * (p.radius * 0.8 - 0.5)); m.material.opacity = 0.9 * (1 - k); }
    else if (p.kind === 'ring') { m.scale.setScalar(0.2 + k * (p.radius - 0.2)); m.material.opacity = 1 - k; } // anel termina exatamente no raio de dano
    else if (p.kind === 'light') { m.intensity = 30 * (1 - k); }
    else if (p.kind === 'wisp') { m.position.addScaledVector(p.vel, dt); m.scale.setScalar(p.s0 * (1 + k)); m.material.opacity = 0.3 * (1 - k); }
    else if (p.kind === 'smoke') { p.vel.multiplyScalar(1 - 1.5 * dt); p.vel.y += 0.6 * dt; m.position.addScaledVector(p.vel, dt); m.scale.setScalar(p.s0 * (1 + k * 2.2)); m.material.opacity = 0.7 * (1 - k); }
    if (k >= 1) { scene.remove(m); if (m.material) m.material.dispose(); if (p.kind === 'flash' || p.kind === 'ring') m.geometry.dispose(); particles.splice(i, 1); }
  }
}
// pré-visualização da trajetória
const arcGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: 60 }, () => new V3()));
const arcLine = new THREE.Line(arcGeo, new THREE.LineDashedMaterial({ color: COLORS.cyan, dashSize: 0.25, gapSize: 0.15, transparent: true, opacity: 0.9, depthTest: false }));
arcLine.renderOrder = 10; arcLine.visible = false; arcLine.frustumCulled = false; scene.add(arcLine);
const arcMark = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 28), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
arcMark.rotation.x = -Math.PI / 2; arcMark.visible = false; arcMark.renderOrder = 10; scene.add(arcMark);
function updateArc(power) {
  const pos = throwOrigin(), vel = throwVelocity(power); const pts = arcGeo.attributes.position; let landed = -1;
  for (let i = 0; i < 60; i++) {
    pts.setXYZ(i, pos.x, pos.y, pos.z);
    if (landed < 0) { for (let s = 0; s < 3; s++) if (stepNade(pos, vel, 1 / 60) && landed < 0) landed = i; }
  }
  if (landed >= 0) for (let i = landed; i < 60; i++) pts.setXYZ(i, pos.x, pos.y, pos.z);
  pts.needsUpdate = true; arcLine.computeLineDistances(); arcGeo.computeBoundingSphere();
  arcMark.position.set(pos.x, pos.y - NADE.r + 0.04, pos.z); arcMark.visible = true; arcLine.visible = true;
}
function startCharge() { const p = player; if (!p || !p.alive || p.nades <= 0 || p.charging) { if (p && p.alive && p.nades <= 0 && !p.charging) flashMsg('Sem Copo Bomba! Pegue um copo vermelho'); return; } p.charging = true; p.chargeStart = gameTime; }
function chargePower() { return clamp((gameTime - player.chargeStart) / NADE.charge, 0, 1); }
function releaseCharge() {
  const p = player; if (!p || !p.charging) return; p.charging = false; arcLine.visible = arcMark.visible = false;
  if (!p.alive) return;
  const power = 0.15 + 0.85 * chargePower(); throwGrenade(p, throwOrigin(), throwVelocity(power)); fp.cupThrowT = 0.25;
}
function botThrow(b, t) {
  const from = center(b, 1.6); const to = t.pos.clone().add(new V3(t.vel.x * 0.6 + rand(-1.2, 1.2), 0.2, t.vel.z * 0.6 + rand(-1.2, 1.2)));
  const dx = to.x - from.x, dz = to.z - from.z, dist = Math.hypot(dx, dz); const T = 0.55 + dist / 16; const g = -NADE.grav;
  const vel = new V3(dx / T, (to.y - from.y + 0.5 * g * T * T) / T, dz / T);
  throwGrenade(b, from, vel); b.nextNade = gameTime + rand(7, 13);
}

function wisp(p) { // rastro do fantasminha
  const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: 0xcffbff, transparent: true, opacity: 0.3, depthWrite: false }));
  m.position.set(p.x + rand(-0.25, 0.25), p.y + rand(0.2, 0.5), p.z + rand(-0.25, 0.25)); scene.add(m);
  particles.push({ mesh: m, vel: new V3(0, 0.25, 0), life: 0.9, t: 0, kind: 'wisp', s0: rand(1.2, 1.8) });
}
// ---------------- Bazuca do Chiqueiro (foguetes) ----------------
const rockets = []; const smokeGeo = new THREE.SphereGeometry(0.14, 8, 6);
function launchRocket(e, origin, dir) {
  const R = WEAPONS[3].rocket;
  if (online && e.isPlayer) { netEv(['r', v3a(origin), v3a(dir), +(performance.now() / 1000).toFixed(3)]); return null; } // o servidor cria o foguete
  const near = wallDistance(origin, dir, 0.7); // colado na parede/chão: explode na hora
  if (near) { blast(near.point.clone().addScaledVector(dir, -0.12), e, { ...R, wIdx: 3 }); return null; }
  const start = origin.clone().addScaledVector(dir, 0.6);
  const mesh = makeRocket(1.5); scene.add(mesh); mesh.position.copy(start); mesh.lookAt(start.clone().add(dir));
  const r = { owner: e, pos: start, dir: dir.clone(), mesh, born: gameTime, nextSmoke: 0 };
  rockets.push(r); return r;
}
function updateRockets(dt) {
  const R = WEAPONS[3].rocket;
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i]; const step = R.speed * dt; let hitT = null, hitE = null;
    if (r.net) { // online: só visual, quem explode é o servidor
      if (gameTime - r.born > 6.5) { scene.remove(r.mesh); rockets.splice(i, 1); continue; }
      r.pos.addScaledVector(r.dir, step); r.mesh.position.copy(r.pos); r.mesh.children[0].rotation.z += dt * 10; rocketSmoke(r, R); continue;
    }
    const wh = wallDistance(r.pos, r.dir, step + 0.1); if (wh) hitT = wh.distance;
    for (const e of entities) {
      if (!e.alive || (e === r.owner && gameTime - r.born < 0.3)) continue;
      if (friends(e, r.owner)) continue;
      const t = rayCapsule(r.pos, r.dir, step + 0.1, e.pos, ROCKET_PAD); if (t !== null && (hitT === null || t < hitT)) { hitT = t; hitE = e; } // casco do Docão
    }
    if (wh && hitE && wh.distance < hitT) hitE = null;
    if (hitT !== null || gameTime - r.born > 6) {
      window.__lastBlast = { c: r.pos.clone().addScaledVector(r.dir, Math.max(0, (hitT ?? 0) - 0.05)).toArray(), hit: hitE ? hitE.name : null };
      blast(r.pos.clone().addScaledVector(r.dir, Math.max(0, (hitT ?? 0) - 0.05)), r.owner, { ...R, wIdx: 3 }, hitE);
      scene.remove(r.mesh); rockets.splice(i, 1); continue;
    }
    r.pos.addScaledVector(r.dir, step); r.mesh.position.copy(r.pos); r.mesh.children[0].rotation.z += dt * 10;
    rocketSmoke(r, R);
  }
}
function rocketSmoke(r, R) {
  {
    if (gameTime - r.born < 0.06) r.nextSmoke = gameTime; // sem fumaça colada na cara de quem atirou
    if (gameTime - r.nextSmoke > 0.5) r.nextSmoke = gameTime; // relógio sincronizado com o servidor pode pular
    while (r.nextSmoke <= gameTime) { // rastro de fumaça
      const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: Math.random() < 0.5 ? 0xf2efe8 : 0xd9d4cc, transparent: true, depthWrite: false }));
      m.position.copy(r.pos).addScaledVector(r.dir, -0.35 - (gameTime - r.nextSmoke) * R.speed); scene.add(m); // espalha ao longo do caminho
      particles.push({ mesh: m, vel: new V3(rand(-0.4, 0.4), rand(0, 0.5), rand(-0.4, 0.4)), life: rand(0.7, 1.1), t: 0, kind: 'smoke', s0: rand(0.4, 0.7) });
      r.nextSmoke = (r.nextSmoke || gameTime) + 0.02;
    }
  }
}

// ---------------- Combate ----------------
function fire(shooter, origin, dir, wIdx, spread, muzzle) {
  const w = WEAPONS[wIdx]; const res = { hit: false, kill: false };
  const hitsBy = new Map(), dirs = [];
  for (let p = 0; p < w.pellets; p++) {
    const d = dir.clone(); d.x += (Math.random() - 0.5) * 2 * spread; d.y += (Math.random() - 0.5) * 2 * spread; d.z += (Math.random() - 0.5) * 2 * spread; d.normalize(); dirs.push(d);
    const wh = wallDistance(origin, d, w.range); const wallD = wh ? wh.distance : w.range;
    let best = null;
    for (const e of entities) {
      if (e === shooter || !e.alive || friends(e, shooter)) continue; // time: bala atravessa o companheiro
      for (const [y, r, head] of [[1.5, 0.5, true], [0.8, 0.58, false]]) {
        const t = raySphere(origin, d, center(e, y), r);
        if (t > 0 && t < wallD && (!best || t < best.t)) best = { e, t, head };
      }
    }
    const end = origin.clone().addScaledVector(d, best ? best.t : wallD);
    if (p < 4 || shooter.isPlayer) tracer(muzzle, end, !!w.beam);
    if (best) {
      const h = hitsBy.get(best.e) || { dmg: 0, head: false };
      let fo = 1; if (w.falloff) { const [n0, n1, mn] = w.falloff; fo = clamp(1 - (best.t - n0) / (n1 - n0) * (1 - mn), mn, 1); } // queda de dano com a distância
      h.dmg += w.dmg * (best.head ? w.headMul : 1) * fo; h.head = h.head || best.head; hitsBy.set(best.e, h);
      puff(end, 0xff9fb0);
    } else if (wh) puff(end);
  }
  if (online && shooter.isPlayer) { netEv(['f', v3a(origin), dirs.map(v3a), wIdx, +(performance.now() / 1000).toFixed(3), +renderServerT().toFixed(3)]); return res; } // dano: servidor
  for (const [e, h] of hitsBy) { res.hit = true; if (damage(e, h.dmg, shooter, wIdx, h.head)) res.kill = true; }
  return res;
}

function damage(t, amount, attacker, wIdx, head) {
  if (!t.alive || gameTime < t.invulnUntil || friends(t, attacker)) return false; // sem fogo amigo
  t.hp -= amount; t.lastAttacker = attacker; t.flashUntil = gameTime + 0.12;
  if (t.isPlayer) { hurtFlash(); sfx.oink(0.8, 1.15); }
  else { if (attacker && attacker !== t && !t.target) { t.target = attacker; t.aim = t.reaction * 0.5; } if (Math.random() < 0.3) sfx.oink(distVol(t.pos) * 0.6, 1.3); }
  if (attacker && attacker.isPlayer && attacker !== t) { hitMarker(t.hp <= 0); sfx.hit(); }
  if (t.hp <= 0) { kill(t, attacker, wIdx, head); return true; }
  return false;
}

function kill(t, a, wIdx, head) {
  t.alive = false; t.hp = 0; t.deaths++; t.deathAt = gameTime; t.respawnAt = gameTime + RESPAWN_TIME;
  if (a && a !== t) a.kills++;
  addKillFeed(a, t, wIdx, head);
  sfx.die(t.isPlayer ? 1 : distVol(t.pos));
  if (a && a.isPlayer) sfx.kill();
  if (t.isPlayer) { const s = $('stamp'); s.classList.remove('show'); void s.offsetWidth; s.classList.add('show'); onPlayerDeath(); }
  if (a && a.kills >= KILL_LIMIT && !teamMode()) endGame();
}

function startReload(e) {
  const w = WEAPONS[e.weapon];
  if (e.reloadEnd > gameTime || e.mag[e.weapon] >= w.mag || e.reserve[e.weapon] <= 0) return;
  e.reloadStartT = gameTime;
  if (online && e.isPlayer) netEv(['rl', e.weapon]);
  if (w.shellReload) e.reloadEnd = gameTime + w.reloadStart + w.reload; // Calibre 12: cartucho por cartucho
  else { e.reloadEnd = gameTime + w.reload; if (e.isPlayer) sfx.reload(); }
}
function finishReload(e) {
  if (!e.reloadEnd || gameTime < e.reloadEnd) return;
  const w = WEAPONS[e.weapon];
  if (w.shellReload) {
    if (e.reserve[e.weapon] > 0 && e.mag[e.weapon] < w.mag) { e.mag[e.weapon]++; e.reserve[e.weapon]--; if (e.isPlayer) { sfx.shell(); fp.shellT = 0.18; } }
    if (e.mag[e.weapon] < w.mag && e.reserve[e.weapon] > 0) e.reloadEnd += w.reload;
    else { e.reloadEnd = 0; if (e.isPlayer) { sfx.pump(0.8); fp.actionT = 0.45; fp.actionLen = 0.45; } }
    return;
  }
  const need = w.mag - e.mag[e.weapon]; const take = Math.min(need, e.reserve[e.weapon]);
  e.mag[e.weapon] += take; e.reserve[e.weapon] -= take; e.reloadEnd = 0;
}
function setWeapon(e, idx) { e.weapon = idx; if (e.model) e.model.guns.forEach((g, i) => (g.visible = i === idx)); }
function switchWeapon(e, idx) {
  if (idx === e.weapon || !e.alive) return;
  setWeapon(e, idx); e.reloadEnd = 0; e.switchEnd = gameTime + (idx === PISTOL ? 0.28 : 0.4);
  if (e.isPlayer) fp.actionT = 0;
}

// ---------------- HUD ----------------
let hitTimer = 0, hurtLevel = 0, msgTimer = 0;
function hitMarker(isKill) { const h = $('hitmarker'); h.classList.toggle('kill', isKill); h.style.transition = 'none'; h.style.opacity = 1; hitTimer = 0.12; }
function hurtFlash() { hurtLevel = 1; }
function flashMsg(t) { $('centermsg').textContent = t; msgTimer = 1.5; }
const KILL_PHRASES = [
  (a, t) => `${a} pururucou ${t}`, (a, t) => `${a} pururucou ${t}`, (a, t) => `${a} pururucou ${t}`,
  (a, t) => `${a} fritou ${t}`, (a, t) => `${a} transformou ${t} em torresmo`, (a, t) => `${a} mandou ${t} pra chapa`,
  (a, t) => `${a} defumou ${t}`, (a, t) => `${a} fez ${t} virar bacon`, (a, t) => `${a} serviu ${t} no café da manhã`,
  (a, t) => `${a} botou ${t} no espeto`, (a, t) => `${a} temperou ${t} com chumbo`,
];
const SELF_PHRASES = [(t) => `${t} se pururucou`, (t) => `${t} virou bacon sozinho`, (t) => `${t} se jogou na frigideira`, (t) => `${t} fritou no próprio óleo`];
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function addKillFeed(a, t, wIdx, head) {
  const div = document.createElement('div'); div.className = 'kf';
  const nm = (e) => `<b class="${e.isPlayer ? 'me' : ''}">${escapeHtml(e.name)}</b>`;
  div.innerHTML = a && a !== t ? `${pick(KILL_PHRASES)(nm(a), nm(t))} <i>[${WEAPON_SHORT(wIdx)}${head ? ' · direto no focinho!' : ''}]</i>` : pick(SELF_PHRASES)(nm(t));
  // log canônico p/ testes (o texto exibido varia)
  { const L = (window.__feedLog ||= []); L.push(a && a !== t ? `${a.name} pururucou ${t.name} [${WEAPON_SHORT(wIdx)}]` : `${t.name} se pururucou`); if (L.length > 20) L.shift(); }
  const kf = $('killfeed'); kf.prepend(div); while (kf.children.length > 6) kf.lastChild.remove();
  setTimeout(() => div.remove(), 6000);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function boardHtml() {
  const rows = [...entities].sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths);
  const pg = (e) => (online ? `<td>${e.bot ? 'bot' : (e.isPlayer ? online.net.ping : e.ping || 0) + ' ms'}</td>` : '');
  return `<table><tr><th>#</th><th style="text-align:left">Docão</th><th>Abates</th><th>Mortes</th><th>K/D</th>${online ? '<th>Ping</th>' : ''}</tr>${rows.map((e, i) =>
    `<tr class="${e.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td style="text-align:left"><span class="dot" style="background:${teamMode() && e.team >= 0 ? TEAM_COLORS[e.team] : e.shirt}"></span>${escapeHtml(e.name)}${teamMode() ? ` <small style="color:${TEAM_COLORS[e.team] || '#fff'}">${e.caps || 0} zona${(e.caps || 0) === 1 ? '' : 's'}</small>` : ''}</td><td>${e.kills}</td><td>${e.deaths}</td><td>${(e.kills / Math.max(1, e.deaths)).toFixed(2)}</td>${pg(e)}</tr>`).join('')}</table>`;
}
function updateHud(dt) {
  const p = player, w = WEAPONS[p.weapon];
  $('hpfill').style.width = Math.max(0, p.hp) + '%'; $('hptext').textContent = Math.max(0, Math.ceil(p.hp));
  $('hpfill').style.background = p.hp > 35 ? '' : 'linear-gradient(#ff7b7b,#e63946)';
  $('mag').textContent = p.mag[p.weapon]; $('reserve').textContent = ' / ' + p.reserve[p.weapon]; $('wname').textContent = w.name;
  for (let i = 0; i < NADE.max; i++) $('nade' + i).classList.toggle('on', i < p.nades);
  const pm = $('powermeter'); pm.classList.toggle('hidden', !p.charging);
  if (p.charging) { const k = chargePower(); $('powerfill').style.width = (k * 100).toFixed(0) + '%'; $('powertext').textContent = k >= 1 ? 'FORÇA MÁXIMA! solte Q' : 'Força do arremesso · solte Q'; }
  $('slot1').textContent = '1 ' + WEAPONS[p.slots[0]].chip; $('slot2').textContent = '2 ' + WEAPONS[p.slots[1]].chip;
  $('slot1').classList.toggle('active', p.weapon === p.slots[0]); $('slot2').classList.toggle('active', p.weapon === p.slots[1]);
  $('deathpick').classList.toggle('hidden', p.alive || gameTime - p.deathAt < DEATHCAM_HOLD); crossEl.style.visibility = p.alive ? '' : 'hidden';
  $('reloadmsg').textContent = p.reloadEnd > gameTime ? (w.shellReload ? 'Recarregando... (atire para interromper)' : 'Recarregando...') : (p.mag[p.weapon] === 0 ? (p.reserve[p.weapon] ? 'Aperte R' : 'Sem munição! Pegue uma caixa') : '');
  const left = Math.max(0, (teamMode() ? DOM.TIME_LIMIT_DOM : TIME_LIMIT) - gameTime); $('timer').textContent = `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}`;
  $('score').textContent = `Abates: ${p.kills} · Mortes: ${p.deaths} · K/D: ${(p.kills / Math.max(1, p.deaths)).toFixed(2)}`;
  const lead = entities.reduce((a, b) => (b.kills > a.kills ? b : a));
  $('leader').textContent = teamMode() ? `Dominação · primeiro time a ${DOM.WIN_CAPS} zonas vence` : lead.kills ? `Líder: ${lead.name} (${lead.kills}/${KILL_LIMIT})` : `Primeiro a ${KILL_LIMIT} abates vence`;
  updateLeaderboard(dt);
  if (hitTimer > 0) { hitTimer -= dt; if (hitTimer <= 0) { const h = $('hitmarker'); h.style.transition = ''; h.style.opacity = 0; } }
  hurtLevel = Math.max(0, hurtLevel - dt * 2.5);
  $('vignette').style.opacity = Math.max(hurtLevel, p.alive && p.hp < 35 ? 0.35 + Math.sin(gameTime * 6) * 0.1 : 0);
  const cm = $('centermsg');
  if (!p.alive) cm.textContent = `Você foi pururucado por ${p.lastAttacker && p.lastAttacker !== p ? p.lastAttacker.name : '???'} · renascendo em ${Math.max(0, p.respawnAt - gameTime).toFixed(1)}s`;
  else if (msgTimer > 0) msgTimer -= dt; // mensagem (ex.: "Mapa: …") tem prioridade
  else if (gameTime < p.invulnUntil) cm.textContent = 'PROTEGIDO';
  else cm.textContent = '';
  if (!$('tabboard').classList.contains('hidden')) $('tabboard').innerHTML = boardHtml();
}

// ---------------- Arma em 1ª pessoa (cascos segurando) ----------------
const fp = (() => {
  const root = new THREE.Group(); fpScene.add(root);
  const add = (geo, mat, x, y, z, parent, ol = 0.006) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); if (ol) outline(m, ol); return m; };
  const guns = [];
  // fuzil
  const r = new THREE.Group(); root.add(r);
  add(new THREE.BoxGeometry(0.11, 0.13, 0.62), toon(0x3b3f4a), 0, 0, -0.1, r);
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.32, 10), toon(0x22252c), 0, 0.01, -0.56, r).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.075, 0.22, 0.11), toon(COLORS.red), 0, -0.15, -0.12, r).rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.1, 0.15, 0.24), toon(COLORS.red), 0, -0.03, 0.3, r);
  add(new THREE.BoxGeometry(0.04, 0.04, 0.1), toon(COLORS.cyan), 0, 0.09, -0.02, r);
  // Calibre 12 (pump): cano único + tubo de cartuchos + telha (pump) de madeira que corre
  const s = new THREE.Group(); root.add(s);
  add(new THREE.BoxGeometry(0.12, 0.13, 0.3), toon(0x4a4f5a), 0, 0, 0.02, s);
  add(new THREE.BoxGeometry(0.105, 0.15, 0.32), toon(0x8b5a2b), 0, -0.035, 0.32, s).rotation.x = -0.12;
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 14), toon(0x55555f), 0, 0.035, -0.48, s).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.025, 0.025, 0.6, 12), toon(0x3f434c), 0, -0.03, -0.42, s).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(0.032, 0.008, 6, 16), toon(0xf5e6d0), 0, 0.035, -0.8, s, 0.003);
  add(new THREE.SphereGeometry(0.014, 8, 6), toon(COLORS.cyan), 0, 0.07, -0.8, s, 0.003);
  add(new THREE.BoxGeometry(0.125, 0.05, 0.12), toon(COLORS.red), 0, 0.02, 0.02, s, 0.004); // faixa "12"
  const pumpPart = new THREE.Group(); pumpPart.position.set(0, -0.035, -0.36); s.add(pumpPart);
  add(new THREE.BoxGeometry(0.1, 0.085, 0.22), toon(0x9a6532), 0, 0, 0, pumpPart);
  for (const z of [-0.07, 0, 0.07]) add(new THREE.BoxGeometry(0.104, 0.012, 0.012), toon(0x5a3a1c), 0, 0.01, z, pumpPart, 0);
  // Sniper Torresmo (ferrolho + luneta)
  const sn = new THREE.Group(); root.add(sn);
  add(new THREE.BoxGeometry(0.1, 0.12, 0.66), toon(0x5c7a3a), 0, 0, -0.08, sn);
  add(new THREE.CylinderGeometry(0.022, 0.026, 0.62, 12), toon(0x22252c), 0, 0.015, -0.7, sn).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.06, 0.05, 0.08), toon(0x22252c), 0, 0.015, -1.02, sn);
  add(new THREE.BoxGeometry(0.1, 0.17, 0.34), toon(0x4a6a2e), 0, -0.035, 0.36, sn).rotation.x = -0.1;
  add(new THREE.BoxGeometry(0.075, 0.2, 0.1), toon(COLORS.red), 0, -0.15, 0.1, sn).rotation.x = 0.25;
  add(new THREE.CylinderGeometry(0.045, 0.045, 0.34, 14), toon(0x2a2d35), 0, 0.13, -0.08, sn).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.06, 0.047, 0.07, 14), toon(0x2a2d35), 0, 0.13, -0.27, sn).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.052, 0.047, 0.06, 14), toon(0x2a2d35), 0, 0.13, 0.11, sn).rotation.x = Math.PI / 2;
  add(new THREE.CircleGeometry(0.05, 18), basic(COLORS.cyan), 0, 0.13, -0.306, sn, 0).rotation.y = Math.PI;
  for (const z of [-0.16, 0.0]) add(new THREE.BoxGeometry(0.04, 0.07, 0.04), toon(0x22252c), 0, 0.075, z, sn, 0.004);
  const boltPart = new THREE.Group(); boltPart.position.set(0.055, 0.03, 0.12); sn.add(boltPart);
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.09, 8), toon(0xc0c4cc), 0.045, 0, 0, boltPart, 0.004).rotation.z = Math.PI / 2;
  add(new THREE.SphereGeometry(0.025, 10, 8), toon(COLORS.red), 0.095, 0, 0, boltPart, 0.004);
  // Bazuca do Chiqueiro: tubo no ombro com faixas vermelhas, adesivo "C!" e foguete-focinho na boca
  const bz = new THREE.Group(); bz.position.set(0.1, -0.05, -0.3); bz.rotation.set(0.05, 0.16, 0); bz.scale.setScalar(0.85); root.add(bz);
  const tube = add(new THREE.CylinderGeometry(0.095, 0.095, 1.05, 18), toon(0x6b7a3a), 0, 0.09, -0.2, bz); tube.rotation.x = Math.PI / 2;
  for (const z of [-0.62, 0.22]) add(new THREE.CylinderGeometry(0.104, 0.104, 0.07, 18), toon(COLORS.red), 0, 0.09, z, bz).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.115, 0.098, 0.08, 18, 1, true), toon(0x4a5528, { side: THREE.DoubleSide }), 0, 0.09, 0.36, bz).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(0.095, 0.014, 8, 20), toon(0xf5e6d0), 0, 0.09, -0.725, bz, 0.004);
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.12), new THREE.MeshBasicMaterial({ transparent: true, map: (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#f5e6d0'; x.beginPath(); x.roundRect(4, 4, 120, 88, 18); x.fill(); drawLogo(x, 64, 48, 60, '#e63946'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
  sticker.position.set(-0.07, 0.165, -0.2); sticker.rotation.set(-Math.PI / 2, 0, 0); sticker.rotateY(-0.75); bz.add(sticker);
  add(new THREE.BoxGeometry(0.06, 0.15, 0.08), toon(COLORS.red), 0, -0.06, 0.12, bz).rotation.x = 0.2;
  add(new THREE.BoxGeometry(0.06, 0.13, 0.07), toon(0x3b3f4a), 0, -0.04, -0.3, bz);
  add(new THREE.BoxGeometry(0.01, 0.08, 0.06), toon(0x22252c), -0.1, 0.17, -0.45, bz, 0.003); // mira
  const rocketTip = makeRocket(1.05); rocketTip.position.set(0, 0.09, -0.72); bz.add(rocketTip);
  // Pistolinha Leitão: ferrolho rosinha, cabo escuro
  const ps = new THREE.Group(); ps.position.set(0, 0.05, -0.04); root.add(ps);
  const slide = new THREE.Group(); ps.add(slide);
  add(new THREE.BoxGeometry(0.075, 0.08, 0.3), toon(0xff9fb6), 0, 0.03, -0.1, slide);
  add(new THREE.BoxGeometry(0.03, 0.03, 0.03), toon(COLORS.cyan), 0, 0.085, -0.23, slide, 0.003);
  add(new THREE.BoxGeometry(0.05, 0.025, 0.025), toon(0x22252c), 0, 0.083, 0.03, slide, 0.003);
  add(new THREE.CircleGeometry(0.014, 10), basic(0x111111), 0, 0.03, -0.252, slide, 0).rotation.y = Math.PI;
  add(new THREE.BoxGeometry(0.07, 0.05, 0.26), toon(0x3b3f4a), 0, -0.02, -0.08, ps);
  add(new THREE.BoxGeometry(0.065, 0.17, 0.09), toon(0x3b3f4a), 0, -0.12, 0.03, ps).rotation.x = 0.22;
  guns.push(r, s, sn, bz, ps); for (const o of [s, sn, bz, ps]) o.visible = false;
  // braços (pose de fuzil e de pistola)
  let arms = makeFPArms(getSkin()), armsP = makeFPArms(getSkin(), 'pistol'); root.add(arms, armsP); armsP.visible = false; armsP.position.set(0, 0.07, -0.04);
  const setSkin = (id) => { root.remove(arms, armsP); arms = makeFPArms(getSkin(id)); armsP = makeFPArms(getSkin(id), 'pistol'); armsP.position.set(0, 0.07, -0.04); root.add(arms, armsP); fpRef.arms = arms; fpRef.armsP = armsP; };
  const fpRef = { arms, armsP };
  // clarão do disparo
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), basic(0xfff27a)); flash.position.set(0, 0.01, -0.78); flash.scale.set(1, 1, 2); flash.visible = false; root.add(flash);
  root.scale.setScalar(0.62);
  const cup = makeCup(0.55); cup.rotation.set(0.25, 0.4, 0.15); cup.visible = false; fpScene.add(cup);
  const hoofHint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), toon(0xee9c22)); hoofHint.position.set(0.0, 0.07, 0.07); outline(hoofHint, 0.006); cup.add(hoofHint);
  return { root, guns, flash, setSkin, cup, cupThrowT: 0, kick: 0, bob: 0, flashT: 0, pumpPart, boltPart, rocketTip, slide, fpRef, actionT: 0, actionLen: 1, shellT: 0 };
})();

function updateFP(dt) {
  const p = player, moving = Math.hypot(p.vel.x, p.vel.z) > 1 && p.onGround;
  if (moving) fp.bob += dt * 10;
  fp.kick = Math.max(0, fp.kick - dt * 6);
  fp.guns.forEach((g, i) => (g.visible = i === p.weapon));
  const w = WEAPONS[p.weapon];
  fp.fpRef.arms.visible = p.weapon !== PISTOL; fp.fpRef.armsP.visible = p.weapon === PISTOL;
  let dip = 0, tilt = 0;
  if (p.reloadEnd > gameTime) {
    if (w.shellReload) { dip = 0.35; tilt = 0.5; } // Calibre 12: arma inclinada enquanto põe cartuchos
    else { const k = 1 - (p.reloadEnd - gameTime) / w.reload; dip = Math.sin(k * Math.PI); }
  }
  if (p.switchEnd > gameTime) dip = Math.max(dip, (p.switchEnd - gameTime) / 0.4);
  // animações de ação: pump da Calibre 12, ferrolho do Sniper, ferrolho da pistola, foguete na boca da bazuca
  fp.actionT = Math.max(0, fp.actionT - dt); fp.shellT = Math.max(0, fp.shellT - dt);
  const ak = fp.actionT > 0 ? 1 - fp.actionT / fp.actionLen : 0; // 0..1 ao longo da ação
  const cyc = ak > 0.25 && ak < 0.85 ? Math.sin((ak - 0.25) / 0.6 * Math.PI) : 0;
  fp.pumpPart.position.z = -0.36 + cyc * 0.14 + fp.shellT * 0.0;
  fp.boltPart.rotation.z = Math.min(1, cyc * 2) * 1.2; fp.boltPart.position.z = 0.12 + Math.max(0, cyc * 2 - 1) * 0.12;
  fp.slide.position.z = p.weapon === PISTOL ? fp.kick * 0.9 : 0;
  fp.rocketTip.visible = p.mag[3] > 0 && !(p.weapon === 3 && p.reloadEnd > gameTime && (p.reloadEnd - gameTime) > w.reload * 0.2);
  if (w.pump || w.bolt) tilt += cyc * 0.12;
  const bobA = 1 - ads * 0.8; // mirando: arma no centro, levantada, quase sem balanço
  const adsX = w.rocket ? 0.12 : 0, adsY = w.rocket ? 0.0 : 0.065;
  fp.root.position.set(0.2 + (adsX - 0.2) * ads + Math.cos(fp.bob) * 0.012 * bobA, -0.2 + ads * adsY + Math.abs(Math.sin(fp.bob)) * 0.015 * bobA - dip * 0.25 - fp.shellT * 0.1, -0.62 + ads * 0.06 + fp.kick * (0.5 - ads * 0.25));
  fp.root.rotation.set(fp.kick * 1.2 - dip * 0.6, 0, dip * 0.3 + tilt);
  fp.flashT -= dt; fp.flash.visible = fp.flashT > 0; fp.flash.position.set(w.rocket ? 0.04 : 0, w.rocket ? 0.056 : 0.01, w.flashZ); fp.flash.scale.setScalar(w.rocket ? 2.2 : w.scope ? 1.6 : 1).z *= 2; fp.flash.rotation.z = Math.random() * 3;
  fp.root.visible = p.alive && !scoped(); // com a luneta a arma some
  // copo na mão enquanto carrega o arremesso
  fp.cupThrowT = Math.max(0, fp.cupThrowT - dt);
  if (p.charging && p.alive) { const k = chargePower(); fp.cup.visible = true; fp.cup.position.set(-0.36 - k * 0.05, -0.27 + k * 0.06, -0.72 + k * 0.08); fp.cup.rotation.set(0.25 - k * 0.5, 0.4, 0.15 + k * 0.3); }
  else if (fp.cupThrowT > 0) { const k = 1 - fp.cupThrowT / 0.25; fp.cup.visible = true; fp.cup.position.set(-0.3 + k * 0.2, -0.22 + k * 0.1, -0.7 - k * 0.8); }
  else fp.cup.visible = false;
}

// ---------------- Mira (Shift) ----------------
const adsVig = document.getElementById('adsvig'), crossEl = document.getElementById('crosshair');
function updateAds(dt, want) {
  ads = clamp(ads + (want ? 1 : -1) * dt / ADS_TIME, 0, 1);
  const e = ads * ads * (3 - 2 * ads); // suavizado
  const target = WEAPONS[player ? player.weapon : 0].adsFov;
  const fov = BASE_FOV + (target - BASE_FOV) * e;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const sc = scoped(); $('scope').classList.toggle('hidden', !sc); crossEl.classList.toggle('hidden', sc);
  adsVig.style.opacity = sc ? 0 : e.toFixed(3);
  crossEl.style.transform = `translate(-50%,-50%) scale(${(1 - 0.45 * e).toFixed(3)})`;
  crossEl.classList.toggle('ads', e > 0.5);
}
const scoped = () => !!player && player.alive && WEAPONS[player.weapon].scope && ads > 0.85;
function resetAds() { $('scope').classList.add('hidden'); crossEl.classList.remove('hidden'); ads = 0; camera.fov = BASE_FOV; camera.updateProjectionMatrix(); adsVig.style.opacity = 0; crossEl.style.transform = ''; crossEl.classList.remove('ads'); }

// ---------------- Jogador ----------------
const fwd = new V3(), right = new V3();
function updatePlayer(dt) {
  const p = player;
  if (!p.alive) {
    if (p.charging) { p.charging = false; arcLine.visible = arcMark.visible = false; }
    deathFx(p); deathCam(p, dt);
    if (!online && gameTime >= p.respawnAt) respawn(p);
    updateAds(dt, false);
    return;
  }
  // mira com zoom: segura Shift; cancela durante recarga/troca de arma
  updateAds(dt, (keys.ShiftLeft || keys.ShiftRight) && p.reloadEnd <= gameTime && p.switchEnd <= gameTime);
  fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)); right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const wish = new V3();
  if (keys.KeyW || keys.ArrowUp) wish.add(fwd); if (keys.KeyS || keys.ArrowDown) wish.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) wish.add(right); if (keys.KeyA || keys.ArrowLeft) wish.sub(right);
  if (wish.lengthSq()) wish.normalize().multiplyScalar(SPEED * (1 - (1 - ADS_SPEED) * ads));
  const acc = p.onGround ? 14 : 4;
  p.vel.x += (wish.x - p.vel.x) * Math.min(1, acc * dt); p.vel.z += (wish.z - p.vel.z) * Math.min(1, acc * dt);
  if (keys.Space && p.onGround) { p.vel.y = JUMP; p.onGround = false; sfx.jump(); }
  moveEntity(p, dt);
  const bob = p.onGround ? Math.abs(Math.sin(fp.bob)) * 0.05 : 0;
  camera.position.set(p.pos.x, p.pos.y + EYE + bob, p.pos.z); camera.rotation.set(p.pitch, p.yaw, 0);
  if (shake > 0) { camera.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shake * 0.25)); camera.rotation.z += rand(-1, 1) * shake * 0.05; shake = Math.max(0, shake - dt * 1.8); }
  // tiro
  finishReload(p);
  const w = WEAPONS[p.weapon];
  if (p.charging) updateArc(chargePower());
  // Calibre 12: atirar interrompe a recarga cartucho a cartucho
  const canFire = p.reloadEnd <= gameTime || (w.shellReload && p.mag[p.weapon] > 0);
  const latched = !mouseDown && clickLatch && performance.now() - clickLatch < 250;
  if ((mouseDown || latched) && !p.charging && (w.auto || !firedThisPress || latched) && gameTime >= p.nextFire && canFire && p.switchEnd <= gameTime) {
    firedThisPress = true; clickLatch = 0;
    if (p.mag[p.weapon] > 0) {
      if (p.reloadEnd > gameTime) p.reloadEnd = 0;
      p.mag[p.weapon]--; p.nextFire = gameTime + w.rate; p.invulnUntil = Math.min(p.invulnUntil, gameTime);
      const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
      const moving = Math.hypot(p.vel.x, p.vel.z) > 1 || !p.onGround;
      let spread;
      if (w.scope) spread = sniperSpread(scoped(), Math.hypot(p.vel.x, p.vel.z), !p.onGround); // luneta + parado = zero; o raio sai do centro exato da câmera (mira)
      else spread = w.spread * (moving ? 2.2 - ads * 0.8 : 1) * (1 - (1 - w.adsSpread) * ads);
      const muzzle = scoped() ? camera.localToWorld(new V3(0, -0.12, -0.6)) : camera.localToWorld(new V3(0.2 * (1 - ads), -0.18 + ads * 0.06, -0.9));
      if (w.rocket) {
        const d = dir.clone(); if (spread) { d.x += rand(-1, 1) * spread; d.y += rand(-1, 1) * spread; d.normalize(); }
        launchRocket(p, camera.localToWorld(new V3(0.08 * (1 - ads), -0.05, 0)), d);
      } else fire(p, camera.position.clone(), dir, p.weapon, spread, muzzle);
      sfx[w.key](); fp.kick = Math.min(0.14, fp.kick + w.recoil * 2.5); fp.flashT = w.rocket ? 0.08 : 0.04;
      if (w.pump) { sfx.pump(0.9, 0.3); fp.actionT = fp.actionLen = w.rate; }
      if (w.bolt) { sfx.bolt(0.9, 0.3); fp.actionT = fp.actionLen = w.rate; }
      if (w.scope) shake = Math.max(shake, 0.15);
      if (!w.scope) { p.pitch = clamp(p.pitch + w.recoil * (0.5 + Math.random() * 0.5), -1.5, 1.5); p.yaw += (Math.random() - 0.5) * w.recoil * 0.4; } // Sniper: coice só visual, a mira não sai do lugar
      window.__lastShot = { dir: dir.toArray(), origin: camera.position.toArray(), spread, w: p.weapon }; // testes
      if (p.mag[p.weapon] === 0) startReload(p);
    } else { sfx.empty(); p.nextFire = gameTime + 0.25; startReload(p); }
  }
}

// ---------------- Bots ----------------
function updateBot(b, dt) {
  const m = b.model;
  if (!b.alive) {
    deathFx(b);
    if (b.fxDeath === b.deathAt && b.baconOk) popModel(m.group, gameTime - b.deathAt, b.yaw); // pop → puf → bacon
    else { const k = Math.min(1, (gameTime - b.deathAt) / 0.15); m.group.scale.set(1 + 0.45 * k, 1 - 0.85 * k, 1 + 0.45 * k); if (gameTime - b.deathAt > 2.2) m.group.visible = false; }
    if (!b.remote && gameTime >= b.respawnAt) respawn(b);
    return;
  }
  if (b.remote) { interpRemote(b); animateBot(b, dt); return; } // online: posição vem do servidor
  if (b.frozen) { m.group.position.copy(b.pos); m.group.rotation.y = b.yaw; return; } // usado só em testes
  finishReload(b);
  b.think -= dt;
  if (b.think <= 0) {
    b.think = rand(0.18, 0.32);
    let best = null, bs = 1e9; const eye = center(b, 1.5);
    for (const o of entities) {
      if (o === b || !o.alive || friends(o, b)) continue;
      const d = o.pos.distanceTo(b.pos); if (d > 55) continue;
      const score = d * (o === b.lastAttacker ? 0.5 : 1) * (o.isPlayer ? 0.85 : 1);
      if (score < bs && losClear(eye, center(o, 1.2))) { best = o; bs = score; }
    }
    if (b.passive) best = null; // (testes) só navega
    if (best !== b.target) { b.target = best; b.aim = 0; }
    if (best) { b.lastSeen = best.pos.clone(); b.lastSeenAt = gameTime; }
  }
  if (b.target && !b.target.alive) b.target = null;
  const t = b.target; const move = new V3(); let desiredYaw = b.yaw;
  if (t) {
    const to = t.pos.clone().sub(b.pos); to.y = 0; const dist = to.length(); to.normalize();
    desiredYaw = Math.atan2(to.x, to.z);
    const want = botWeaponFor(b, dist);
    if (want !== b.weapon && b.switchEnd <= gameTime && (b.reloadEnd <= gameTime || WEAPONS[b.weapon].shellReload)) switchWeapon(b, want);
    const range = BOT_RANGE[b.weapon];
    const dy = t.pos.y - b.pos.y;
    const zg = zoneGoal(b);
    if (zg) { const st = steer(b, zg); if (st) move.add(st.multiplyScalar(1.5)); } // Dominação: vai pra zona atirando
    else if (zone) { /* dentro da zona: segura a posição, só strafe */ }
    else if (Math.abs(dy) > 1.2 && dist > 3) { const st = steer(b, t.pos); if (st) move.add(st); } // outro andar: vai pelo grafo (rampas)
    else if (dist > range + 3) move.add(to); else if (dist < range - 3) move.sub(to);
    b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeDir = [-1, 1, 1, -1, 0][Math.floor(Math.random() * 5)]; b.strafeT = rand(0.6, 1.8); if (Math.random() < 0.15 && b.onGround) b.vel.y = JUMP; }
    move.add(new V3(to.z, 0, -to.x).multiplyScalar(b.strafeDir * 0.8));
    if (b.nades > 0 && dist > 8 && dist < 24 && gameTime > b.nextNade && b.aim > b.reaction && Math.abs(t.pos.y - b.pos.y) < 3) { if (Math.random() < 0.35) botThrow(b, t); else b.nextNade = gameTime + rand(1.5, 3); }
    b.aim += dt;
    let diff = desiredYaw - b.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const needAim = b.reaction + (b.weapon === 2 ? 0.8 : 0); // sniper: os bots demoram mais pra mirar (justo)
    if (b.aim > needAim && Math.abs(diff) < 0.35) botShoot(b, t, dist);
  } else {
    let goal = null;
    const hp = b.hp < 45 ? pickups.filter((p) => p.active && p.type === 'health').sort((a, c) => a.pos.distanceTo(b.pos) - c.pos.distanceTo(b.pos))[0] : null;
    const nadeP = !hp && b.nades < 2 ? pickups.filter((p) => p.active && p.type === 'grenade' && p.pos.distanceTo(b.pos) < 22).sort((a, c) => a.pos.distanceTo(b.pos) - c.pos.distanceTo(b.pos))[0] : null;
    const zg = zoneGoal(b);
    if (hp && b.hp < 30) goal = hp.pos; else if (zg) goal = zg; else if (zone) goal = b.pos; else if (hp) goal = hp.pos; else if (nadeP) goal = nadeP.pos;
    else if (b.lastSeen && gameTime - b.lastSeenAt < 4) goal = b.lastSeen;
    else { if (!b.wp) b.wp = randomWaypoint(); goal = b.wp; }
    const to = goal.clone().sub(b.pos); to.y = 0;
    if (to.length() < 1.5 && Math.abs(goal.y - b.pos.y) < 1.5) { if (goal === b.wp) b.wp = null; else b.lastSeenAt = -99; }
    else { const st = steer(b, goal) || to.normalize(); move.copy(st); desiredYaw = Math.atan2(st.x, st.z); }
    if (b.mag[b.weapon] < WEAPONS[b.weapon].mag * 0.5) startReload(b);
  }
  if (move.lengthSq()) move.normalize().multiplyScalar(BOT_SPEED);
  const acc = b.onGround ? 10 : 3;
  b.vel.x += (move.x - b.vel.x) * Math.min(1, acc * dt); b.vel.z += (move.z - b.vel.z) * Math.min(1, acc * dt);
  const blocked = moveEntity(b, dt);
  if (blocked) { b.stuck += dt; if (b.onGround) b.vel.y = JUMP; if (b.stuck > 1.2) { b.wp = randomWaypoint(); b.path = null; b.lastSeenAt = -99; b.strafeDir *= -1; b.stuck = 0; b.stuckCount = (b.stuckCount || 0) + 1; } }
  else b.stuck = Math.max(0, b.stuck - dt);
  let d = desiredYaw - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 9);
  for (const i of b.slots) if (b.reserve[i] < WEAPONS[i].mag && !(WEAPONS[i].rocket && b.reserve[i] > 0)) b.reserve[i] = WEAPONS[i].reserve; // bots nunca ficam totalmente sem bala
  animateBot(b, dt);
}
function animateBot(b, dt) { // visual: andar, flutuar, piscar ao levar dano, bolha de proteção, pose de recarga
  const m = b.model;
  const speed = Math.hypot(b.vel.x, b.vel.z); b.walk += dt * speed * 2.2; b.travel = (b.travel || 0) + speed * dt;
  if (b.float) { // Fantasminha: flutua de leve e deixa um rastro fraquinho
    m.group.position.set(b.pos.x, b.pos.y + 0.14 + Math.sin(gameTime * 2.6 + b.floatPh) * 0.07, b.pos.z);
    if (gameTime > b.nextWisp && speed > 1) { b.nextWisp = gameTime + 0.12; wisp(b.pos); }
  } else m.group.position.set(b.pos.x, b.pos.y + (b.onGround ? Math.abs(Math.sin(b.walk)) * 0.07 : 0), b.pos.z);
  m.group.rotation.y = b.yaw;
  m.legs[0].rotation.x = Math.sin(b.walk) * 0.6 * Math.min(1, speed); m.legs[1].rotation.x = -m.legs[0].rotation.x;
  const flashing = gameTime < b.flashUntil;
  for (const mat of m.flashMats) mat.emissive.copy(flashing ? FLASH : mat.userData.baseEmissive);
  b.bubble.visible = gameTime < b.invulnUntil;
  const reloading = b.reloadEnd > gameTime;
  if (reloading !== b.wasReloading) { setPose(m, reloading ? 'reload' : 'gun'); b.wasReloading = reloading; }
}

// Dominação: ponto dentro da zona pra onde o bot vai (null = já está dentro / sem zona)
function zoneGoal(b) {
  if (!zone || online) return null;
  if (inZone(zone, b.pos) && Math.hypot(b.pos.x - zone.x, b.pos.z - zone.z) < DOM.RADIUS * 0.7) return null;
  if (!b.zoneOff || b.zoneOff.z !== zone) { const a = rand(0, Math.PI * 2), r = rand(0, DOM.RADIUS * 0.5); b.zoneOff = { z: zone, p: new V3(zone.x + Math.cos(a) * r, zone.y, zone.z + Math.sin(a) * r) }; }
  return b.zoneOff.p;
}
// navegação: segue o caminho A* do grafo do mapa até o objetivo; devolve a direção horizontal
function randomWaypoint() { const n = nav && nav.randomNode(); return n ? new V3(n.x, n.y, n.z) : new V3(rand(-10, 10), 0, rand(-10, 10)); }
function steer(b, goal) {
  if (!nav) { const v = goal.clone().sub(b.pos); v.y = 0; return v.lengthSq() > 0.01 ? v.normalize() : null; }
  if (!b.path || !b.pathGoalPos || b.pathGoalPos.distanceToSquared(goal) > 4 || gameTime > b.repathAt) {
    b.path = nav.path(b.pos, goal) || []; b.pathGoalPos = goal.clone(); b.repathAt = gameTime + rand(2.5, 3.5);
  }
  const P = b.path;
  while (P.length) { const n = P[0], dx = n.x - b.pos.x, dz = n.z - b.pos.z; if (dx * dx + dz * dz < 0.8 && Math.abs(n.y - b.pos.y) < 1.4) P.shift(); else break; }
  let tgt = P.length ? P[0] : goal;
  if (P.length > 1 && gameTime > (b.nextShortcut || 0)) { // atalho: pula nó intermediário se dá pra ir reto
    b.nextShortcut = gameTime + 0.25; const n2 = P[1];
    if (Math.abs(n2.y - b.pos.y) < 0.3 && Math.abs(P[0].y - b.pos.y) < 0.3 && Math.hypot(n2.x - b.pos.x, n2.z - b.pos.z) < 3.2 && nav.walk(b.pos, n2) >= 0) { P.shift(); tgt = n2; }
  }
  const v = new V3(tgt.x - b.pos.x, 0, tgt.z - b.pos.z); return v.lengthSq() > 0.01 ? v.normalize() : null;
}

// escolha de arma dos bots pelo alcance: Calibre 12 de perto, Sniper de longe, Bazuca a média distância, pistola no resto
function botWeapon(b, i) { return b.mag[i] > 0 || b.reserve[i] > 0; }
function botWeaponFor(b, dist) {
  const pr = b.primary; if (!botWeapon(b, pr)) return PISTOL;
  if (pr === 1) return dist < 14 ? pr : PISTOL;
  if (pr === 2) return dist >= 9 ? pr : PISTOL;
  if (pr === 3) return dist >= 6 && dist <= 28 ? pr : PISTOL;
  return pr;
}
const BOT_RATE = [() => rand(2.2, 3.4), () => 1.4, () => 1.6, () => 1, () => rand(1.8, 2.6)];
function botShoot(b, t, dist = 10) {
  const w = WEAPONS[b.weapon];
  if (gameTime < b.nextFire || b.switchEnd > gameTime) return;
  if (b.reloadEnd > gameTime) { if (w.shellReload && b.mag[b.weapon] > 0) b.reloadEnd = 0; else return; }
  if (b.mag[b.weapon] <= 0) { startReload(b); return; }
  if (w.rocket && dist < 6) return; // não se explode
  b.mag[b.weapon]--;
  b.nextFire = gameTime + w.rate * BOT_RATE[b.weapon]();
  const origin = center(b, 1.3);
  const tMoving = Math.hypot(t.vel.x, t.vel.z) > 2 ? 1.5 : 1;
  const muzzle = origin.clone().add(new V3(Math.sin(b.yaw) * 1.0, -0.25, Math.cos(b.yaw) * 1.0));
  if (w.rocket) { // mira no pé, com antecipação
    const lead = dist / w.rocket.speed; const at = t.pos.clone().add(new V3(t.vel.x * lead + rand(-0.8, 0.8), 0.25, t.vel.z * lead + rand(-0.8, 0.8)));
    const o = center(b, 1.4); launchRocket(b, o, at.sub(o).normalize());
  } else {
    const aimPt = (w.scope ? center(t, rand(0.75, 1.15)) : center(t, rand(0.7, 1.6))).add(new V3(rand(-0.3, 0.3), 0, rand(-0.3, 0.3)));
    const dir = aimPt.sub(origin).normalize();
    const spread = w.pellets > 1 ? w.spread * 1.2 : w.scope ? 0.02 * tMoving : b.accuracy * tMoving * (b.weapon === PISTOL ? 0.9 : 1);
    fire(b, origin, dir, b.weapon, spread, muzzle);
    if (w.scope) b.aim = b.reaction * 0.4; // precisa remirar depois de cada tiro de sniper
  }
  sfx[w.key](distVol(b.pos) * 0.7);
  if (w.pump) sfx.pump(distVol(b.pos) * 0.5, 0.3); if (w.bolt) sfx.bolt(distVol(b.pos) * 0.5, 0.3);
  b.invulnUntil = Math.min(b.invulnUntil, gameTime);
}

// ---------------- Fluxo do jogo ----------------
const showcase = new THREE.Group(); showcase.position.set(0, 3, 0); scene.add(showcase);
let selectedSkin = getSkin(localStorage.getItem('docao.skin') || DEFAULT_SKIN).id, preview = null;
// loadout: arma primária escolhida (salva no navegador)
let selectedPrimary = (() => { const v = parseInt(localStorage.getItem('docao.primary')); return PRIMARIES.includes(v) ? v : 0; })();
function primChip(i, keyHint, onPick) {
  const w = WEAPONS[i]; const b = document.createElement('button'); b.className = 'primchip'; b.dataset.i = i;
  b.innerHTML = `${keyHint ? `<kbd>[${keyHint}]</kbd>` : ''}${escapeHtml(w.key === 'shotgun' ? 'Calibre 12 Chiqueiro' : w.name)}<small>${escapeHtml(w.desc)}</small>`; b.onclick = () => onPick(i); return b;
}
function setPrimary(i) {
  selectedPrimary = i; try { localStorage.setItem('docao.primary', String(i)); } catch (e) { /* sem storage */ }
  if (player) player.nextPrimary = i;
  if (online) netEv(['pr', i]);
  document.querySelectorAll('.primchip').forEach((c) => c.classList.toggle('active', +c.dataset.i === i));
}
function buildPrimaryPickers() {
  const l = $('primList'), d = $('deathList'); l.innerHTML = d.innerHTML = '';
  PRIMARIES.forEach((i, k) => { l.appendChild(primChip(i, '', setPrimary)); d.appendChild(primChip(i, k + 1, setPrimary)); });
  setPrimary(selectedPrimary);
}
function setPreview(id) {
  selectedSkin = getSkin(id).id; try { localStorage.setItem('docao.skin', selectedSkin); } catch (e) { /* sem storage */ }
  if (preview) showcase.remove(preview.group);
  preview = makeDocao(selectedSkin, { withGun: false, pose: 'idle' }); showcase.add(preview.group);
  $('skinName').textContent = getSkin(selectedSkin).name;
  $('skinIdx').textContent = `${SKINS.findIndex((s) => s.id === selectedSkin) + 1}/${SKINS.length}`;
  document.querySelectorAll('.skinchip').forEach((c) => c.classList.toggle('active', c.dataset.id === selectedSkin));
}
function buildSkinPicker() {
  const list = $('skinList'); list.innerHTML = '';
  for (const sk of SKINS) {
    const b = document.createElement('button'); b.className = 'skinchip'; b.dataset.id = sk.id; b.title = sk.name;
    const base = sk.shirt && sk.shirt.color ? sk.shirt.color : '#d8261c'; const acc = (sk.parts || []).find((p) => p.color);
    b.style.background = acc ? `linear-gradient(180deg, ${acc.color} 0 45%, ${base} 45% 100%)` : base; b.onclick = () => setPreview(sk.id); list.appendChild(b);
  }
  const step = (d) => { const i = SKINS.findIndex((s) => s.id === selectedSkin); setPreview(SKINS[(i + d + SKINS.length) % SKINS.length].id); };
  $('skinPrev').onclick = () => step(-1); $('skinNext').onclick = () => step(1);
}
buildSkinPicker(); setPreview(selectedSkin); buildPrimaryPickers();

// ---------------- Mapas ----------------
let navMs = 0, showBaseY = 3;
function loadMap(id) {
  const map = getMap(id);
  if (currentMap === map && worldGroup) return map;
  if (worldGroup) { scene.remove(worldGroup); disposeWorld(worldGroup); }
  for (const p of pickups) scene.remove(p.mesh); pickups.length = 0;
  const w = buildWorld(map); worldGroup = w.group; scene.add(worldGroup);
  solids = w.solids; worldMeshes = w.meshes; indexSolids(); mapBounds = map.size;
  applyPalette(scene, hemi, sun, map); fpHemi.intensity = map.palette.stars ? 1.25 : 1.8;
  SPAWNS = map.spawns.map(([x, z, y = 0]) => new V3(x, groundAt(x, z, y + 0.3), z));
  for (const [t, x, z, y] of map.pickups) makePickup(t, x, z, y || 0);
  pickups.forEach((p) => (p.mesh.visible = state !== 'menu'));
  const t0 = performance.now();
  nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides, groundAt, solids, topAt, seeds: SPAWNS.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
  navMs = performance.now() - t0;
  showcase.position.set(...map.showcase); showBaseY = map.showcase[1];
  currentMap = map; return map;
}
// seletor: mapa salvo no navegador ('random' = aleatório a cada partida)
let selectedMap = (() => { const v = localStorage.getItem('docao.map'); return v === 'random' || MAPS.some((m) => m.id === v) ? v : MAPS[0].id; })();
const thumbs = {};
function mapCard(id) {
  const b = document.createElement('button'); b.className = 'mapcard' + (id === 'random' ? ' random' : ''); b.dataset.map = id;
  const m = id === 'random' ? null : getMap(id);
  b.innerHTML = `<span class="thumb">${m ? '' : '?'}</span><span class="mtxt"><b>${m ? escapeHtml(m.name) : 'Aleatório'}</b><small>${m ? escapeHtml(m.desc) : 'Um mapa diferente sorteado a cada partida.'}</small></span>`;
  if (m && thumbs[id]) b.querySelector('.thumb').style.backgroundImage = `url(${thumbs[id]})`;
  b.onclick = () => { selectMap(id); $('mapModal').classList.add('hidden'); };
  return b;
}
function refreshMapUI() {
  const m = selectedMap === 'random' ? null : getMap(selectedMap);
  $('mapName').textContent = m ? m.name : 'Aleatório'; $('mapDesc').textContent = m ? m.desc : 'Um mapa diferente sorteado a cada partida.';
  const th = $('mapBtn').querySelector('.thumb'); th.textContent = m ? '' : '?'; th.style.backgroundImage = m && thumbs[m.id] ? `url(${thumbs[m.id]})` : '';
  th.classList.toggle('rnd', !m);
  document.querySelectorAll('#mapGrid .mapcard').forEach((c) => c.classList.toggle('active', c.dataset.map === selectedMap));
}
function selectMap(id) {
  selectedMap = id; try { localStorage.setItem('docao.map', id); } catch (e) { /* sem storage */ }
  if (id !== 'random') loadMap(id);
  refreshMapUI();
}
function buildMapGrid() { const g = $('mapGrid'); g.innerHTML = ''; for (const m of MAPS) g.appendChild(mapCard(m.id)); g.appendChild(mapCard('random')); refreshMapUI(); }
function makeThumbs() { // miniaturas renderizadas da vista aérea, uma por quadro pra não travar o menu
  let i = 0; const next = () => {
    if (i >= MAPS.length) { buildMapGrid(); window.__thumbsReady = true; return; }
    const m = MAPS[i++]; try { thumbs[m.id] = renderThumb(m); } catch (e) { console.warn('miniatura', m.id, e); }
    refreshMapUI(); requestAnimationFrame(next);
  }; requestAnimationFrame(next);
}
function pickMapForMatch() {
  if (selectedMap !== 'random') return selectedMap;
  const pool = MAPS.filter((m) => !currentMap || m.id !== currentMap.id); return pool[Math.floor(Math.random() * pool.length)].id;
}
$('mapBtn').onclick = () => { buildMapGrid(); $('mapModal').classList.remove('hidden'); };
$('mapClose').onclick = () => $('mapModal').classList.add('hidden');
loadMap(selectedMap === 'random' ? MAPS[0].id : selectedMap); buildMapGrid(); makeThumbs();

function clearBots() {
  for (const e of entities) if (e.model) scene.remove(e.model.group); entities = [];
  for (const n of grenades) scene.remove(n.mesh); grenades.length = 0; for (const r of rockets) scene.remove(r.mesh); rockets.length = 0; for (const p of particles) scene.remove(p.mesh); particles.length = 0; shake = 0;
  clearBacon(); if (ghost) ghost.model.group.visible = false;
}
function startGame(mapId) {
  resetAds();
  initAudio();
  loadMap(typeof mapId === 'string' ? mapId : pickMapForMatch());
  const name = myName(); saveName(name);
  sens = parseFloat($('sens').value) || 1.4;
  clearBots(); gameTime = 0;
  player = makeEntity(name, true, selectedSkin, '#ffd27a'); entities.push(player); fp.setSkin(selectedSkin);
  const n = parseInt($('botCount').value) || 5;
  for (let i = 0; i < n; i++) entities.push(makeEntity(BOT_DEFS[i].name, false, SKINS[Math.floor(Math.random() * SKINS.length)].id, TAG_COLORS[i % TAG_COLORS.length]));
  mode = $('modeSel').value === 'dom' ? 'dom' : 'dm'; teamScore = [0, 0]; zone = null; window.__capLog = [];
  if (teamMode()) { // seu time (escolhido no menu ou automático); bots completam os dois lados
    applyTeam(player, menuTeam >= 0 ? menuTeam : Math.random() < 0.5 ? 0 : 1);
    for (const b of entities) if (!b.isPlayer) { const c = [0, 0]; for (const x of entities) if (x.team === 0 || x.team === 1) c[x.team]++; applyTeam(b, smallerTeam(c)); }
    zone = newZoneState(pickZone(nav));
  } else for (const e of entities) applyTeam(e, -1);
  for (const e of entities) e.caps = 0;
  for (const e of entities) { e.alive = false; }
  for (const e of entities) respawn(e);
  pickups.forEach((p) => { p.active = true; p.mesh.visible = true; });
  showcase.visible = false;
  $('killfeed').innerHTML = ''; flashMsg(teamMode() ? `Dominação · você é do time ${TEAM_NAMES[player.team]}` : `Mapa: ${currentMap.name}`); refreshModeHud();
  $('menu').classList.add('hidden'); $('gameover').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden');
  camera.clearViewOffset(); state = 'playing'; lockPointer();
}
function endGame() {
  resetAds();
  if (state === 'over') return;
  state = 'over'; mouseDown = false;
  if (document.pointerLockElement) document.exitPointerLock();
  const rows = [...entities].sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths);
  if (teamMode()) { const w = teamScore[0] > teamScore[1] ? 0 : teamScore[1] > teamScore[0] ? 1 : -1; setTeamWinner(w); }
  else $('winner').textContent = rows[0].isPlayer ? 'Você venceu! 🏆' : `${rows[0].name} venceu!`;
  $('finalboard').innerHTML = boardHtml();
  const nm = MAPS[(MAPS.indexOf(currentMap) + 1) % MAPS.length]; $('overMap').innerHTML = `Mapa: <b>${escapeHtml(currentMap.name)}</b> · próximo: <b>${escapeHtml(nm.name)}</b>`;
  ['againBtn', 'nextMapBtn'].forEach((id) => $(id).classList.remove('hidden')); $('overWait').classList.add('hidden');
  $('gameover').classList.remove('hidden'); $('tabboard').classList.add('hidden');
}
function setTeamWinner(w) {
  const el = $('winner'); el.style.color = w >= 0 ? TEAM_COLORS[w] : '';
  el.textContent = w < 0 ? `Empate! ${teamScore[0]} × ${teamScore[1]}` : `Time ${TEAM_NAMES[w]} venceu! ${teamScore[0]} × ${teamScore[1]}${player && player.team === w ? ' 🏆' : ''}`;
}
function refreshModeHud() {
  $('domhud').classList.toggle('hidden', !teamMode());
  if (teamMode() && player) { $('myTeam').textContent = `Você: Time ${TEAM_NAMES[player.team] || '?'}`; $('myTeam').style.color = TEAM_COLORS[player.team] || '#fff'; }
  $('winner').style.color = '';
}
function pause() { if (state !== 'playing') return; state = 'paused'; mouseDown = false; keys.ShiftLeft = keys.ShiftRight = false; resetAds(); if (player) { player.charging = false; arcLine.visible = arcMark.visible = false; } $('pause').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); }
function resume() { $('pause').classList.add('hidden'); state = 'playing'; lockPointer(); }
function toMenu() {
  if (online) leaveOnline();
  zone = null; mode = 'dm'; $('domhud').classList.add('hidden'); $('zoneMark').classList.add('hidden'); $('teamPick').classList.add('hidden');
  state = 'menu'; clearBots(); if (selectedMap !== 'random') loadMap(selectedMap); showcase.visible = true; pickups.forEach((p) => (p.mesh.visible = false)); camera.clearViewOffset();
  ['pause', 'gameover', 'hud'].forEach((id) => $(id).classList.add('hidden')); $('menu').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
function lockPointer() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* sem pointer lock */ } }

$('playBtn').onclick = () => startGame(); $('menuBtn').onclick = toMenu;
$('resumeBtn').onclick = resume; $('quitBtn').onclick = toMenu;
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(); e.stopPropagation(); });

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { hadLock = true; deathUnlock = false; }
  else if (state === 'playing' && hadLock && !deathUnlock) pause(); // soltar o mouse ao morrer não pausa
});
document.addEventListener('mousemove', (e) => {
  if (state !== 'playing' || document.pointerLockElement !== canvas || !player) return;
  if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; // ignora saltos espúrios do pointer lock
  const s = sens * (camera.fov / BASE_FOV); // sensibilidade proporcional ao zoom
  player.yaw -= e.movementX * 0.0015 * s; player.pitch = clamp(player.pitch - e.movementY * 0.0015 * s, -1.5, 1.5);
});
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'playing') return;
  if (!$('teamPick').classList.contains('hidden')) return; // escolhendo time
  if (e.button === 0 && (document.pointerLockElement || !deathUnlock)) { mouseDown = true; firedThisPress = false; }
  if (!document.pointerLockElement) lockPointer();
});
let clickLatch = 0; // clique mais curto que um frame ainda dispara (máquinas lentas)
document.addEventListener('mouseup', (e) => { if (e.button === 0) { if (mouseDown && !firedThisPress) clickLatch = performance.now(); mouseDown = false; } });
document.addEventListener('wheel', () => { if (state === 'playing' && player && player.alive) switchWeapon(player, player.weapon === player.slots[0] ? player.slots[1] : player.slots[0]); });
document.addEventListener('keydown', (e) => {
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (state === 'playing' && player) {
    if (e.code === 'KeyR') startReload(player);
    if (!player.alive && /^Digit[1-4]$/.test(e.code)) setPrimary(PRIMARIES[+e.code.slice(5) - 1]); // escolha na tela de morte
    else {
      if (e.code === 'Digit1') switchWeapon(player, player.slots[0]);
      if (e.code === 'Digit2') switchWeapon(player, player.slots[1]);
    }
    if ((e.code === 'KeyQ' || (e.code === 'Digit3' && player.alive)) && !e.repeat) startCharge();
    if (e.code === 'Tab') $('tabboard').classList.remove('hidden');
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
  } else if (state === 'paused' && (e.code === 'KeyP')) resume();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; if ((e.code === 'KeyQ' || e.code === 'Digit3') && state === 'playing') releaseCharge(); if (e.code === 'Tab') $('tabboard').classList.add('hidden'); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; if (player) { player.charging = false; arcLine.visible = arcMark.visible = false; } });

// ---------------- Loop ----------------
const clock = new THREE.Clock(); let menuT = 0;
function loop() {
  requestAnimationFrame(loop);
  let dt = Math.min(clock.getDelta(), 0.05);
  if (window.__stopAt != null) dt = Math.max(0, Math.min(dt, window.__stopAt - gameTime)); // testes/screenshots: congela o tempo de jogo num instante exato
  if (state === 'playing' || (online && state === 'paused' && player)) { // online o jogo não pausa
    gameTime += dt;
    if (state === 'playing') updatePlayer(dt); else if (player.alive) { player.vel.x = player.vel.z = 0; moveEntity(player, dt); }
    if (online) netTick(dt);
    for (const e of entities) if (!e.isPlayer) updateBot(e, dt);
    updatePickups(dt); updateGrenades(dt); updateRockets(dt); updateParticles(dt); updateBacon(dt); updateFP(dt); updateEffects(dt); updateHud(dt);
    updateDomOffline(dt); updateZoneGfx(dt);
    if (!online && gameTime >= (teamMode() ? DOM.TIME_LIMIT_DOM : TIME_LIMIT)) endGame();
  } else if (state === 'menu') {
    menuT += dt * 0.25;
    const sp = showcase.position; camera.position.set(sp.x, showBaseY + 1.25, sp.z + 3.5); camera.lookAt(sp.x, showBaseY + 1.0, sp.z);
    if (!camera.view || !camera.view.enabled) camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.22, 0, innerWidth, innerHeight);
    showcase.rotation.y += dt * 0.7; showcase.position.y = showBaseY + (getSkin(selectedSkin).float ? 0.1 + Math.sin(menuT * 10) * 0.06 : Math.abs(Math.sin(menuT * 6)) * 0.06);
    for (const p of pickups) p.mesh.rotation.y += dt;
  }
  if (worldGroup) updateWeather(worldGroup, dt);
  renderer.clear();
  const camO = window.__cam; // testes/screenshots: câmera livre { p: [x, y, z], t: [x, y, z], fov }
  if (camO) { camera.position.set(...camO.p); camera.lookAt(...camO.t); if (camO.fov && camera.fov !== camO.fov) { camera.fov = camO.fov; camera.updateProjectionMatrix(); } }
  renderer.render(scene, camera);
  if (state !== 'menu' && player && player.alive && !camO) { renderer.clearDepth(); renderer.render(fpScene, fpCam); }
}
loop();


// ============================================================
//  Times, Dominação (zonas), placar no canto e tela de morte clicável
//  Regras em shared/domination.js (iguais no servidor).
// ============================================================
const outlineTeamCache = new Map();
function teamOutline(base, team) {
  const key = base.uuid + team; if (outlineTeamCache.has(key)) return outlineTeamCache.get(key);
  const m = base.clone(); m.onBeforeCompile = base.onBeforeCompile; const ck = base.customProgramCacheKey(); m.customProgramCacheKey = () => ck;
  m.color.setHex(TEAM_DARK[team]); outlineTeamCache.set(key, m); return m;
}
// cor do time: contorno, anel no pé e nome
function applyTeam(e, team) {
  e.team = team; if (!e.model) return;
  const on = teamMode() && (team === 0 || team === 1);
  e.model.group.traverse((o) => { if (!o.userData.isOutline) return; if (!o.userData.baseMat) o.userData.baseMat = o.material; o.material = on ? teamOutline(o.userData.baseMat, team) : o.userData.baseMat; });
  if (e.tagSprite) e.model.group.remove(e.tagSprite);
  e.tagSprite = nameSprite(e.name, on ? TEAM_COLORS[team] : e.tag); e.model.group.add(e.tagSprite);
  if (!e.teamRing) { e.teamRing = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.8, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false })); e.teamRing.rotation.x = -Math.PI / 2; e.teamRing.position.y = 0.04; e.model.group.add(e.teamRing); }
  e.teamRing.visible = on; if (on) e.teamRing.material.color.setHex(TEAM_HEX[team]);
}
// zona no mundo: anel no chão, coluna translúcida e disco de progresso
const zoneGfx = (() => {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const ring = new THREE.Mesh(new THREE.RingGeometry(DOM.RADIUS - 0.25, DOM.RADIUS, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; g.add(ring);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(DOM.RADIUS, DOM.RADIUS, 7, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false }));
  col.position.y = 3.5; g.add(col);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(DOM.RADIUS - 0.3, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  fill.rotation.x = -Math.PI / 2; fill.position.y = 0.06; g.add(fill);
  const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshBasicMaterial({ color: 0xffffff })); beacon.position.y = 7.6; g.add(beacon);
  return { g, ring, col, fill, beacon };
})();
function zoneColor(z) { return z.contested ? 0xffd27a : z.team >= 0 ? TEAM_HEX[z.team] : 0xffffff; }
function updateZoneGfx(dt) {
  const G = zoneGfx; G.g.visible = !!zone && state !== 'menu';
  if (!zone) { $('zoneMark').classList.add('hidden'); return; }
  G.g.position.set(zone.x, zone.y, zone.z); const c = zoneColor(zone);
  for (const m of [G.ring, G.col, G.fill, G.beacon]) m.material.color.setHex(c);
  G.fill.scale.setScalar(Math.max(0.001, zone.progress)); G.beacon.rotation.y += dt * 2; G.beacon.position.y = 7.6 + Math.sin(gameTime * 3) * 0.2;
  G.col.material.opacity = zone.contested ? 0.18 + Math.sin(gameTime * 12) * 0.06 : 0.13;
  // HUD
  const pct = Math.round(zone.progress * 100), cnt = zone.counts || [0, 0];
  $('zoneFill').style.width = pct + '%'; $('zoneFill').style.background = zone.team >= 0 ? TEAM_COLORS[zone.team] : '#888';
  $('zoneBar').classList.toggle('contested', !!zone.contested);
  $('zoneText').textContent = zone.contested ? `CONTESTADA! (${cnt[0]} × ${cnt[1]})` : zone.team >= 0 ? `Zona: ${pct}% ${TEAM_NAMES[zone.team]}${cnt[zone.team] ? ` · ${cnt[zone.team]} dentro` : ''}` : 'Zona neutra — entre pra capturar';
  $('ts0').textContent = teamScore[0]; $('ts1').textContent = teamScore[1];
  // marcador na tela / indicador fora da tela
  const mk = $('zoneMark'), wp = new V3(zone.x, zone.y + 3, zone.z), d = player ? Math.hypot(zone.x - player.pos.x, zone.z - player.pos.z) : 0;
  const inside = player && inZone(zone, player.pos);
  mk.classList.toggle('hidden', !player || state === 'over' || inside);
  const v = wp.clone().project(camera), behind = v.z > 1; let x = v.x, y = v.y;
  if (behind) { x = -x; y = -y; }
  const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.85;
  if (off) { const k = 0.9 / Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.85, 1e-3); x *= k; y *= k; if (behind && Math.abs(y) < 0.85) y = -0.8; }
  let px = (x + 1) / 2 * innerWidth, py = (1 - y) / 2 * innerHeight;
  if (off) { const r = $('tl').getBoundingClientRect(); if (px < r.right + 30 && py < r.bottom + 30) { if (py < r.bottom + 30 && Math.abs(y) < 0.85) py = r.bottom + 40; else px = r.right + 40; } } // não cobre o placar
  mk.style.left = px + 'px'; mk.style.top = py + 'px';
  mk.style.color = '#' + c.toString(16).padStart(6, '0');
  mk.querySelector('.zarrow').style.transform = off ? `rotate(${Math.atan2(x, y)}rad)` : 'rotate(180deg)';
  $('zoneDist').textContent = Math.round(d) + ' m'; mk.dataset.off = off ? '1' : '0';
}
// Dominação offline: mesma regra do servidor
function updateDomOffline(dt) {
  if (!zone || online) return;
  const got = stepZone(zone, zoneCounts(zone, entities), dt);
  if (got >= 0) onZoneCaptured(got, null);
}
function onZoneCaptured(team, next, capsList) {
  if (!online) { teamScore[team]++; for (const e of entities) if (e.alive && e.team === team && inZone(zone, e.pos)) e.caps = (e.caps || 0) + 1; }
  const mine = player && player.team === team;
  flashMsg(`${mine ? 'Seu time' : 'Time ' + TEAM_NAMES[team]} capturou a zona! (${teamScore[0]} × ${teamScore[1]})`); (mine ? sfx.kill : sfx.die)(0.6);
  window.__capLog = (window.__capLog || []).concat([[team, teamScore[0], teamScore[1]]]);
  zone = newZoneState(next || pickZone(nav, zone));
  if (!online && teamScore[team] >= DOM.WIN_CAPS) endGame();
}
const scoreOf = (e) => (teamMode() ? e.kills + 2 * (e.caps || 0) : e.kills);
// placar compacto no canto superior esquerdo (offline e online)
let lbT = 0;
function updateLeaderboard(dt) {
  lbT -= dt; if (lbT > 0) return; lbT = 0.25;
  const rows = [...entities].sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths).slice(0, 8);
  const head = teamMode() ? `<div class="lbh"><span class="r">Vermelho ${teamScore[0]}</span><span>/${DOM.WIN_CAPS}</span><span class="b">${teamScore[1]} Azul</span></div>` : `<div class="lbh"><span>Placar</span><span>abates</span></div>`;
  $('lb').innerHTML = head + rows.map((e, i) => `<div class="row${e.isPlayer ? ' me' : ''}${e.alive ? '' : ' dead'}"><span>${i + 1}</span><span class="dot" style="background:${teamMode() && e.team >= 0 ? TEAM_COLORS[e.team] : e.shirt}"></span><span class="n">${escapeHtml(e.name)}</span><span class="k">${scoreOf(e)}</span></div>`).join('');
}
// botões de time (Vermelho / Azul / Automático)
function teamButtons(el, current, onPick, counts) { // atualiza no lugar: o lobby re-renderiza a cada ping e não pode engolir cliques
  const defs = [[0, 'Vermelho', 't0'], [1, 'Azul', 't1'], [-1, 'Automático', 'ta']];
  if (el.children.length !== 3) { el.innerHTML = ''; for (const [t, , cls] of defs) { const b = document.createElement('button'); b.className = `teambtn ${cls}`; b.dataset.team = t; el.appendChild(b); } }
  defs.forEach(([t, label, cls], i) => {
    const b = el.children[i], html = `${label}${counts && t >= 0 ? `<small>${counts[t]} jogador${counts[t] === 1 ? '' : 'es'}</small>` : t < 0 ? '<small>equilibra</small>' : ''}`;
    if (b.innerHTML !== html) b.innerHTML = html; b.className = `teambtn ${cls}${current === t ? ' active' : ''}`;
    b.onclick = (ev) => { ev.stopPropagation(); onPick(t); };
  });
}
let menuTeam = -1;
function refreshMenuMode() { const dom = $('modeSel').value === 'dom'; $('menuTeam').classList.toggle('hidden', !dom); teamButtons($('menuTeamBtns'), menuTeam, (t) => { menuTeam = t; refreshMenuMode(); }); }
$('modeSel').onchange = () => { try { localStorage.setItem('docao.mode', $('modeSel').value); } catch (e) { /* */ } refreshMenuMode(); };
try { const m = localStorage.getItem('docao.mode'); if (m === 'dom' || m === 'dm') $('modeSel').value = m; } catch (e) { /* */ }
refreshMenuMode();
// tela de morte: primária e secundária clicáveis; solta o mouse ao morrer e trava de novo ao voltar
let deathUnlock = false;
function buildDeathSec() {
  const d = $('deathSec'); d.innerHTML = '';
  const b = primChip(PISTOL, '', () => { spawnHold = spawnHold === 'secondary' ? 'primary' : 'secondary'; buildDeathSec(); });
  b.classList.toggle('active', spawnHold === 'secondary'); b.title = 'Renascer com a pistola na mão'; b.querySelector('small').textContent = spawnHold === 'secondary' ? 'Renasce com ela na mão ✓' : 'Clique pra renascer com ela na mão';
  d.appendChild(b);
}
buildDeathSec();
document.querySelectorAll('#deathList .primchip').forEach((c) => { const f = c.onclick; c.onclick = (ev) => { ev.stopPropagation(); f(ev); spawnHold = 'primary'; buildDeathSec(); }; });
$('deathBack').onclick = (ev) => { ev.stopPropagation(); lockPointer(); };
function onPlayerDeath() { if (document.pointerLockElement) { deathUnlock = true; document.exitPointerLock(); } mouseDown = false; }
function onPlayerRespawn() { deathCamState.on = false; if (ghost) ghost.model.group.visible = false; if (!document.pointerLockElement && deathUnlock && state === 'playing') flashMsg('Clique pra voltar a mirar'); }

// ============================================================
//  Online (Cloudflare Worker + Durable Object — ver server/ e net.js)
//  O servidor manda em acertos, dano, abates, placar, renascimento, pickups, Copo Bomba/foguetes e tempo.
//  Este cliente: move o próprio Docão (predição local), envia estado + eventos de tiro a SEND_HZ,
//  e desenha os outros com interpolação (INTERP_DELAY atrás do último pacote).
// ============================================================
const v3a = (v) => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
const a3v = (a) => new V3(a[0], a[1], a[2]);
function netEv(ev) { if (online) online.evq.push(ev); }
// tempo de servidor do que está sendo desenhado agora (interpolação) — vai junto do tiro pra compensação de lag exata
function renderServerT() {
  const M = online && online.tmap; if (!M || !M.length) return gameTime;
  const rt = performance.now() / 1000 - INTERP_DELAY;
  for (let i = M.length - 1; i > 0; i--) if (M[i - 1].t <= rt) { const a = M[i - 1], b = M[i], k = clamp((rt - a.t) / Math.max(1e-3, b.t - a.t), 0, 1.2); return a.T + (b.T - a.T) * k; }
  return M[0].T - (M[0].t - rt);
}
// ---------- nome do jogador: um só valor nos 3 campos (menu, janela online, lobby), salvo no navegador ----------
const NAME_FIELDS = ['nameInput', 'onlineName', 'lobbyName'];
function myName() { return cleanName($('nameInput').value); }
function saveName(n, from) {
  n = cleanName(n); for (const id of NAME_FIELDS) if (id !== from) $(id).value = n;
  try { localStorage.setItem('docao.name', n); } catch (e) { /* sem storage */ }
  return n;
}
function profile() { return { name: saveName(myName()), skin: selectedSkin, primary: selectedPrimary }; }
try { saveName(localStorage.getItem('docao.name') || $('nameInput').value); } catch (e) { saveName($('nameInput').value); }
for (const id of NAME_FIELDS) {
  const el = $(id); el.maxLength = NAME_MAX;
  el.addEventListener('input', () => { for (const o of NAME_FIELDS) if (o !== id) $(o).value = el.value; });
  el.addEventListener('change', () => { const n = saveName(el.value); el.value = n; if (id === 'lobbyName') sendName(); });
  el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && id === 'lobbyName') { el.blur(); } });
}
// lobby: manda o nome novo pro servidor (ele limpa e evita repetido, ex.: "Matheus (2)")
function sendName() { if (!online || !online.net) return; const n = saveName($('lobbyName').value); online.net.send({ t: 'prof', name: n, skin: selectedSkin, primary: selectedPrimary }); online.nameSent = n; }
$('lobbyNameBtn').onclick = () => sendName();
const roomLink = (code) => { const u = new URL(location.href); u.search = ''; const sv = new URLSearchParams(location.search).get('server'); if (sv) u.searchParams.set('server', sv); u.searchParams.set('sala', code); return u.toString(); };

function joinRoom(code) {
  code = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) { $('onlineErr').textContent = 'O código tem 4 letras'; return; }
  if (online) leaveOnline(true);
  initAudio();
  online = { code, myId: 0, hostId: 0, ents: new Map(), evq: [], sendAcc: 0, cfg: null, lobby: null, inMatch: false, status: 'connecting' };
  online.net = new Net(code, profile(), { onMessage: onNetMessage, onStatus: onNetStatus });
  history.replaceState(null, '', roomLink(code));
  $('lobbyCode').textContent = code; $('shareLink').value = roomLink(code);
  $('lobbyPlayers').innerHTML = ''; $('lobbyStatus').textContent = 'Conectando…'; $('lobbyInfo').textContent = '';
  $('hostCtl').classList.add('hidden'); $('lobbyWait').classList.add('hidden');
  ['menu', 'onlineModal', 'gameover', 'pause'].forEach((id) => $(id).classList.add('hidden')); $('lobby').classList.remove('hidden');
}
function leaveOnline(silent) {
  const o = online; if (!o) return; online = null; o.net.close();
  const u = new URL(location.href); u.searchParams.delete('sala'); history.replaceState(null, '', u.toString());
  $('lobby').classList.add('hidden'); $('netbar').classList.add('hidden');
  if (!silent && state !== 'menu') toMenu(); else if (!silent) $('menu').classList.remove('hidden');
}
function onNetStatus(st, detail) {
  if (!online) return; online.status = st;
  const txt = st === 'reconnecting' ? 'Reconectando…' : st === 'connecting' ? 'Conectando…' : st === 'error' ? (detail || 'Erro de conexão') : '';
  $('lobbyStatus').textContent = txt; $('netStatus').textContent = st === 'open' ? '' : ' · ' + txt;
  if (st === 'error') {
    if (state === 'playing' || state === 'paused' || state === 'over') { const msg = txt; leaveOnline(); flashMenuErr(msg); }
    else { $('lobbyStatus').textContent = txt; }
  }
}
function flashMenuErr(msg) { $('onlineErr').textContent = msg; $('onlineModal').classList.remove('hidden'); $('menu').classList.add('hidden'); }
function onNetMessage(m) {
  const o = online; if (!o) return;
  switch (m.t) {
    case 'welcome': o.myId = m.id; o.hostId = m.hostId; o.cfg = m.cfg; break;
    case 'lobby': o.lobby = m; o.hostId = m.hostId; o.cfg = m.cfg; renderLobby(); break;
    case 'start': startOnlineMatch(m); break;
    case 's': if (o.inMatch) applySnapshot(m); break;
    case 'p': if (o.inMatch) for (const ev of m.ev) personalEvent(ev); break;
    case 'end': if (o.inMatch) onlineEnd(m); break;
    case 'teamOk': {
      o.myPref = m.pref; const msg = m.blocked ? 'Esse time ficaria com 2 jogadores a mais — você foi pro Automático (equilibrado).' : '';
      $('lobbyTeamErr').textContent = msg; $('teamPickErr').textContent = msg;
      if (o.inMatch && !$('teamPick').classList.contains('hidden')) { $('teamPick').classList.add('hidden'); if (m.blocked) flashMsg(msg); }
      renderLobby(); break;
    }
    default: break;
  }
}
// ---------- lobby ----------
function fillMapSelect(sel, value) {
  if (!sel.options.length) { for (const m of MAPS) sel.add(new Option(m.name, m.id)); sel.add(new Option('Aleatório', 'random')); }
  if (value) sel.value = value;
}
function renderLobby() {
  const o = online, L = o.lobby; if (!L) return;
  const isHost = o.myId === o.hostId, cfg = L.cfg;
  const mapName = cfg.map === 'random' ? 'Aleatório' : getMap(cfg.map).name;
  $('lobbyInfo').textContent = `${mapName} · até ${cfg.max} jogadores · bots: ${cfg.fillBots ? 'sim' : 'não'}${L.state === 'playing' ? ' · partida em andamento' : ''}`;
  const rows = L.players.filter((p) => !p.bot), dom = cfg.mode === 'dom';
  const counts = [0, 0]; for (const p of rows) if (p.team === 0 || p.team === 1) counts[p.team]++;
  $('lobbyTeam').classList.toggle('hidden', !dom);
  if (dom) { const me = rows.find((p) => p.id === o.myId); teamButtons($('lobbyTeamBtns'), me ? me.pref : -1, (t) => o.net.send({ t: 'team', team: t }), counts); }
  $('lobbyInfo').textContent = (dom ? 'DOMINAÇÃO · ' : 'MATA-MATA · ') + $('lobbyInfo').textContent;
  $('lobbyPlayers').innerHTML = `<table><tr><th style="text-align:left">Jogadores (${rows.length}/${cfg.max})</th><th>Ping</th></tr>${rows.map((p) =>
    `<tr class="${p.id === o.myId ? 'me' : ''}"><td style="text-align:left"><span class="dot" style="background:${(getSkin(p.skin).shirt || {}).color || '#d8261c'}"></span>${escapeHtml(p.name)}${p.id === L.hostId ? '<span class="host">★ anfitrião</span>' : ''}${dom && p.team >= 0 ? `<span class="tm${p.team}">${TEAM_NAMES[p.team]}${p.pref < 0 ? ' (auto)' : ''}</span>` : ''}</td><td>${p.id === o.myId ? o.net.ping : p.ping} ms</td></tr>`).join('')}</table>`;
  { const me = L.players.find((p) => p.id === o.myId); const inGame = L.state === 'playing';
    $('lobbyName').disabled = $('lobbyNameBtn').disabled = inGame;
    $('lobbyNameMsg').textContent = me && me.name !== myName() ? `Na sala você aparece como “${me.name}”${inGame ? '' : ' (nome repetido ou ajustado)'}` : inGame ? 'Partida em andamento: o nome muda na próxima partida' : ''; }
  $('hostCtl').classList.toggle('hidden', !isHost); $('lobbyWait').classList.toggle('hidden', isHost || L.state !== 'lobby');
  if (isHost) { fillMapSelect($('lobbyMap'), cfg.map); $('lobbyMax').value = String(cfg.max); $('lobbyBots').value = cfg.fillBots ? '1' : '0'; $('lobbyMode').value = cfg.mode || 'dm'; }
  if (state === 'over') { const h = o.myId === o.hostId; $('againBtn').classList.toggle('hidden', !h); $('nextMapBtn').classList.toggle('hidden', !h); $('overWait').classList.toggle('hidden', h); }
}
const sendCfg = () => online && online.net.send({ t: 'cfg', map: $('lobbyMap').value, max: +$('lobbyMax').value, fillBots: $('lobbyBots').value === '1', mode: $('lobbyMode').value });
['lobbyMap', 'lobbyMax', 'lobbyBots', 'lobbyMode'].forEach((id) => ($(id).onchange = sendCfg));
$('startOnline').onclick = () => { if (online) { initAudio(); online.net.send({ t: 'start', map: $('lobbyMap').value }); } };
$('leaveLobby').onclick = () => leaveOnline();
$('copyLink').onclick = async () => { const v = $('shareLink').value; try { await navigator.clipboard.writeText(v); $('copyLink').textContent = 'Copiado!'; } catch (e) { $('shareLink').select(); } setTimeout(() => ($('copyLink').textContent = 'Copiar link'), 1500); };
// ---------- menu online ----------
function onlineTab(create) { $('tabCreate').classList.toggle('active', create); $('tabJoin').classList.toggle('active', !create); $('paneCreate').classList.toggle('hidden', !create); $('paneJoin').classList.toggle('hidden', create); }
$('onlineBtn').onclick = () => { fillMapSelect($('roomMap'), selectedMap); $('onlineErr').textContent = ''; $('menu').classList.add('hidden'); $('onlineModal').classList.remove('hidden'); };
$('onlineClose').onclick = () => { $('onlineModal').classList.add('hidden'); $('menu').classList.remove('hidden'); };
$('tabCreate').onclick = () => onlineTab(true); $('tabJoin').onclick = () => { onlineTab(false); $('joinCode').focus(); };
$('createBtn').onclick = async () => {
  const b = $('createBtn'); b.disabled = true; $('onlineErr').textContent = 'Criando sala…';
  try { const code = await createRoom({ map: $('roomMap').value, max: +$('roomMax').value, fillBots: $('roomBots').value === '1', mode: $('roomMode').value }); $('onlineErr').textContent = ''; joinRoom(code); }
  catch (e) { $('onlineErr').textContent = 'Não deu pra criar a sala: ' + (e.message || 'servidor fora do ar'); }
  b.disabled = false;
};
$('joinBtn').onclick = async () => {
  const code = $('joinCode').value.trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(code)) { $('onlineErr').textContent = 'O código tem 4 letras'; return; }
  $('onlineErr').textContent = 'Procurando sala…';
  try { const info = await roomInfo(code); if (!info.exists) { $('onlineErr').textContent = 'Sala não encontrada'; return; } if (info.players >= info.max) { $('onlineErr').textContent = 'Sala cheia'; return; } $('onlineErr').textContent = ''; joinRoom(code); }
  catch (e) { $('onlineErr').textContent = 'Servidor fora do ar'; }
};
$('joinCode').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('joinBtn').click(); });
// ---------- partida ----------
function remoteEnt(info) {
  const o = online; if (info.id === o.myId || o.ents.has(info.id)) return o.ents.get(info.id);
  const e = makeEntity(info.name, false, info.skin, info.tag || '#ffffff');
  Object.assign(e, { remote: true, netId: info.id, bot: !!info.bot, buf: [], kills: info.kills || 0, deaths: info.deaths || 0, alive: false, primary: info.primary || 0, ping: 0 });
  e.model.group.visible = false; setWeapon(e, info.w || 0); e.slots = [e.primary, PISTOL]; e.caps = info.caps || 0; applyTeam(e, info.team ?? -1);
  o.ents.set(info.id, e); entities.push(e); return e;
}
function removeEnt(id) {
  const o = online, e = o.ents.get(id); if (!e || e === player) return;
  scene.remove(e.model.group); o.ents.delete(id); entities = entities.filter((x) => x !== e);
}
function startOnlineMatch(m) {
  const o = online;
  if (o.inMatch && o.mapId === m.map && state !== 'over' && player) { // reconexão no meio da partida: só ressincroniza
    for (const info of m.ents) if (!o.ents.has(info.id) && info.id !== o.myId) remoteEnt(info);
    return;
  }
  resetAds(); loadMap(m.map); clearBots(); gameTime = m.T; o.mapId = m.map; o.inMatch = true; o.ents.clear(); o.tmap = [];
  mode = m.mode === 'dom' ? 'dom' : 'dm'; window.__capLog = [];
  zone = m.zone ? newZoneState({ x: m.zone[0], y: m.zone[1], z: m.zone[2] }) : null; teamScore = m.zone ? [m.zone[8], m.zone[9]] : [0, 0];
  const me = m.ents.find((x) => x.id === o.myId) || { name: profile().name, skin: selectedSkin };
  player = makeEntity(me.name, true, me.skin, '#ffd27a'); player.netId = o.myId; player.sq = 0; player.alive = false; player.respawnAt = Infinity;
  player.kills = me.kills || 0; player.deaths = me.deaths || 0;
  player.primary = player.nextPrimary = selectedPrimary; player.slots = [selectedPrimary, PISTOL]; setWeapon(player, selectedPrimary); // até o servidor mandar o renascimento
  entities.push(player); o.ents.set(o.myId, player); fp.setSkin(me.skin); player.caps = me.caps || 0; applyTeam(player, me.team ?? -1);
  for (const info of m.ents) remoteEnt(info);
  refreshModeHud(); $('teamPick').classList.add('hidden');
  if (teamMode() && me.pend) showTeamPick(m.ents);
  pickups.forEach((p, i) => { p.active = !!(m.pk ? m.pk[i] : 1); p.mesh.visible = p.active; });
  showcase.visible = false; $('killfeed').innerHTML = ''; flashMsg(`Mapa: ${currentMap.name}`);
  ['menu', 'gameover', 'pause', 'lobby', 'onlineModal'].forEach((id) => $(id).classList.add('hidden')); $('hud').classList.remove('hidden');
  $('netbar').classList.remove('hidden'); $('netRoom').textContent = 'Sala ' + o.code;
  camera.clearViewOffset(); state = 'playing'; if ($('teamPick').classList.contains('hidden')) lockPointer(); // escolhendo time: mouse livre pros botões
}
function netTick(dt) {
  const o = online; if (!o || !o.inMatch || !player) return;
  o.sendAcc += dt; if (o.sendAcc < 1 / SEND_HZ) return; o.sendAcc = 0;
  const p = player, msg = { t: 'u', sq: p.sq, y: +p.yaw.toFixed(3), pi: +p.pitch.toFixed(3), g: p.onGround ? 1 : 0, w: p.weapon, pg: o.net.ping };
  if (p.alive) { msg.p = v3a(p.pos); msg.v = v3a(p.vel); }
  if (o.evq.length) { msg.ev = o.evq; o.evq = []; }
  o.net.send(msg);
  $('netPing').textContent = o.net.ping + ' ms';
}
function interpRemote(e) {
  const B = e.buf; if (!B.length) return;
  const rt = performance.now() / 1000 - INTERP_DELAY;
  while (B.length > 2 && B[1].t <= rt) B.shift();
  let a = B[0], b = B[1] || B[0];
  const k = b === a ? 1 : clamp((rt - a.t) / (b.t - a.t), 0, 1.2); // extrapola no máximo 20% se o pacote atrasar
  const nx = a.x + (b.x - a.x) * k, ny = a.y + (b.y - a.y) * k, nz = a.z + (b.z - a.z) * k;
  const span = Math.max(1e-3, b.t - a.t); e.vel.set((b.x - a.x) / span, (b.y - a.y) / span, (b.z - a.z) / span);
  e.pos.set(nx, ny, nz);
  let dy = b.yaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.yaw = a.yaw + dy * Math.min(1, k);
}
function applySnapshot(s) {
  const o = online, now = performance.now() / 1000;
  if (Math.abs(gameTime - s.T) > 0.25) gameTime = s.T; else gameTime += (s.T - gameTime) * 0.1;
  o.tmap.push({ t: now, T: s.T }); if (o.tmap.length > 40) o.tmap.shift();
  if (s.d && zone) { const d = s.d; Object.assign(zone, { x: d[0], y: d[1], z: d[2], progress: d[3], team: d[4], contested: !!d[5], counts: [d[6], d[7]] }); teamScore = [d[8], d[9]]; }
  for (const ev of s.ev) netEvent(ev);
  for (const [id, x, y, z, yaw, pitch, w, fl, hp, ping] of s.e) {
    const e = o.ents.get(id); if (!e) continue;
    e.ping = ping; e.hp = hp; e.onGround = !!(fl & 4);
    if (e === player) continue;
    const alive = !!(fl & 1);
    if (alive && !e.alive) { e.alive = true; e.model.group.visible = true; e.model.group.scale.set(1, 1, 1); e.buf = []; e.pos.set(x, y, z); }
    else if (!alive && e.alive) { e.alive = false; e.deathAt = gameTime; }
    if (w !== e.weapon) setWeapon(e, w);
    e.invulnUntil = fl & 2 ? gameTime + 0.15 : 0; e.reloadEnd = fl & 8 ? gameTime + 0.15 : 0;
    e.buf.push({ t: now, x, y, z, yaw });
    if (e.buf.length > 30) e.buf.shift();
  }
}
const entOf = (id) => (online ? online.ents.get(id) : null);
function remoteMuzzle(e) { return center(e, 1.3).add(new V3(Math.sin(e.yaw) * 1.0, -0.25, Math.cos(e.yaw) * 1.0)); }
function netEvent(ev) {
  const o = online, k = ev[0];
  if (k === 'sh') {
    const [, sid, w, , ends] = ev; if (sid === o.myId) return; const e = entOf(sid); if (!e) return; const W = WEAPONS[w];
    const vol = distVol(e.pos) * 0.7; sfx[W.key](vol); if (W.pump) sfx.pump(vol * 0.7, 0.3); if (W.bolt) sfx.bolt(vol * 0.7, 0.3);
    e.invulnUntil = 0; const mz = remoteMuzzle(e);
    ends.slice(0, 4).forEach(([x, y, z, hit]) => { const end = new V3(x, y, z); tracer(mz, end, !!W.beam); puff(end, hit ? 0xff9fb0 : 0xffffff); });
  } else if (k === 'h') {
    const [, tid, aid, hp, head] = ev; const t = entOf(tid), a = entOf(aid); if (!t) return;
    t.hp = hp; t.flashUntil = gameTime + 0.12; t.lastAttacker = a || null;
    if (t === player) { hurtFlash(); sfx.oink(0.8, 1.15); } else if (Math.random() < 0.3) sfx.oink(distVol(t.pos) * 0.6, 1.3);
    if (aid === o.myId && t !== player) { hitMarker(hp <= 0); sfx.hit(); }
  } else if (k === 'k') {
    const [, aid, tid, w, head, aK, tD] = ev; const a = entOf(aid), t = entOf(tid); if (!t) return;
    if (a) a.kills = aK; t.deaths = tD; t.alive = false; t.hp = 0; t.deathAt = gameTime; t.respawnAt = gameTime + RESPAWN_TIME; t.lastAttacker = a || null;
    if (w === -2) { t.fxDeath = t.deathAt; return; } // trocou de time (sem bacon)
    addKillFeed(a, t, w, head); sfx.die(t === player ? 1 : distVol(t.pos)); if (a === player && t !== player) sfx.kill();
    if (t === player) { onPlayerDeath(); const st = $('stamp'); st.classList.remove('show'); void st.offsetWidth; st.classList.add('show'); player.charging = false; arcLine.visible = arcMark.visible = false; }
  } else if (k === 'sp') {
    const [, id, pos, yaw, prim, sq] = ev; const e = entOf(id); if (!e) return;
    e.pos.set(pos[0], pos[1], pos[2]); e.vel.set(0, 0, 0); e.hp = 100; e.alive = true; e.invulnUntil = gameTime + INVULN;
    e.primary = prim; e.slots = [prim, PISTOL]; e.mag = WEAPONS.map((x) => x.mag); e.reserve = WEAPONS.map((x) => x.reserve); e.reloadEnd = 0; e.switchEnd = 0; e.nades = NADE.spawnWith; setWeapon(e, prim);
    if (e === player) { player.sq = sq; player.yaw = yaw + Math.PI; player.pitch = 0; player.respawnAt = Infinity; player.nextPrimary = prim; player.onGround = true; $('stamp').classList.remove('show'); if (spawnHold === 'secondary') setWeapon(player, PISTOL); $('teamPick').classList.add('hidden'); onPlayerRespawn(); }
    else { e.yaw = yaw; e.model.group.visible = true; e.model.group.scale.set(1, 1, 1); e.buf = [{ t: performance.now() / 1000 - INTERP_DELAY, x: pos[0], y: pos[1], z: pos[2], yaw }]; }
  } else if (k === 'pk') { const p = pickups[ev[1]]; if (p) { p.active = !!ev[2]; p.mesh.visible = p.active; } }
  else if (k === 'nd') {
    const [, pid, oid, op, vel] = ev; const mesh = makeCup(1.15); scene.add(mesh); const owner = entOf(oid);
    grenades.push({ net: true, pid, owner, pos: a3v(op), vel: a3v(vel), explodeAt: gameTime + NADE.fuse, mesh, spin: new V3(rand(-8, 8), rand(-4, 4), rand(-8, 8)), lastBounce: 0 });
    if (oid !== o.myId && owner) sfx.toss(distVol(owner.pos));
  } else if (k === 'rk') {
    const [, pid, oid, pos, dir] = ev; const start = a3v(pos), d = a3v(dir);
    const mesh = makeRocket(1.5); scene.add(mesh); mesh.position.copy(start); mesh.lookAt(start.clone().add(d));
    rockets.push({ net: true, pid, owner: entOf(oid), pos: start, dir: d, mesh, born: gameTime, nextSmoke: 0 });
  } else if (k === 'bm') {
    const [, pid, kind, c] = ev;
    const list = kind === 'n' ? grenades : rockets; const i = list.findIndex((x) => x.pid === pid && pid); if (i >= 0) { scene.remove(list[i].mesh); list.splice(i, 1); }
    blastFx(a3v(c), kind === 'n' ? NADE.radius : WEAPONS[3].rocket.radius);
  } else if (k === 'zc') {
    const [, team, s0, s1, nz, caps] = ev; teamScore = [s0, s1];
    for (const [id, c] of caps || []) { const e = entOf(id); if (e) e.caps = c; }
    onZoneCaptured(team, { x: nz[0], y: nz[1], z: nz[2] });
  } else if (k === 'tm') { const e = entOf(ev[1]); if (e) { applyTeam(e, ev[2]); if (e === player) refreshModeHud(); } }
  else if (k === 'j') { remoteEnt(ev[1]); }
  else if (k === 'l') { removeEnt(ev[1]); }
}
function personalEvent(ev) {
  const p = player; if (!p) return;
  if (ev[0] === 'pos') { p.pos.set(ev[1][0], ev[1][1], ev[1][2]); p.vel.set(0, 0, 0); }
  else if (ev[0] === 'kn') { const [x, y, z] = ev[1]; p.vel.x += x; p.vel.z += z; p.vel.y = Math.max(p.vel.y, y); p.onGround = false; lastKnock = gameTime; }
  else if (ev[0] === 'got') {
    const [, type, hp, nades] = ev; sfx.pickup(); p.hp = hp; p.nades = nades; if (type === 'ammo') refillAmmo(p);
    flashMsg(type === 'health' ? '+50 de vida' : type === 'grenade' ? `+1 Copo Bomba (${p.nades}/${NADE.max})` : p.primary === 3 ? `Munição! +1 foguete (${p.reserve[3]}/${WEAPONS[3].reserve})` : 'Munição cheia!');
  }
}
function onlineEnd(m) {
  const o = online; resetAds(); state = 'over'; mouseDown = false; o.endMsg = m;
  if (document.pointerLockElement) document.exitPointerLock();
  for (const [id, , k, d] of m.board) { const e = entOf(id); if (e) { e.kills = k; e.deaths = d; } }
  for (const r of m.board) { const e = entOf(r[0]); if (e && r[6] != null) e.caps = r[6]; }
  const w = m.board[0];
  if (m.mode === 'dom') { teamScore = m.ts || teamScore; setTeamWinner(m.winTeam ?? -1); }
  else $('winner').textContent = w && w[0] === o.myId ? 'Você venceu! 🏆' : `${w ? w[1] : '???'} venceu!`;
  $('finalboard').innerHTML = boardHtml();
  $('overMap').innerHTML = `Mapa: <b>${escapeHtml(getMap(m.map).name)}</b> · próximo: <b>${escapeHtml(getMap(m.next).name)}</b>`;
  $('gameover').classList.remove('hidden'); $('tabboard').classList.add('hidden'); renderLobby();
  const h = o.myId === o.hostId; $('againBtn').classList.toggle('hidden', !h); $('nextMapBtn').classList.toggle('hidden', !h); $('overWait').classList.toggle('hidden', h);
}
// entrou no meio de uma partida de Dominação: escolhe o time antes de nascer
function showTeamPick(ents) {
  const c = [0, 0]; for (const e of ents) if (e.id !== online.myId && (e.team === 0 || e.team === 1)) c[e.team]++;
  $('teamPickErr').textContent = ''; $('teamPick').classList.remove('hidden');
  deathUnlock = true; if (document.pointerLockElement) document.exitPointerLock(); // mouse livre (não pausa)
  teamButtons($('teamPickBtns'), -1, (t) => { online.net.send({ t: 'team', team: t }); lockPointer(); }, c);
}
// botões do fim de jogo: offline como antes; online só o anfitrião reinicia
$('againBtn').onclick = () => (online ? online.net.send({ t: 'start', map: online.mapId }) : startGame(currentMap.id));
$('nextMapBtn').onclick = () => (online ? online.net.send({ t: 'start', map: online.endMsg ? online.endMsg.next : 'random' }) : startGame(MAPS[(MAPS.indexOf(currentMap) + 1) % MAPS.length].id));
// link ?sala=ABCD entra direto
{ const sala = new URLSearchParams(location.search).get('sala'); if (sala) joinRoom(sala); }

// ganchos para testes automatizados
window.__docao = { get state() { return state; }, get entities() { return entities; }, get player() { return player; }, startGame, endGame, pause, visible: (e) => losClear(center(player, EYE), center(e, 1.2)),
  set time(v) { gameTime = v; }, get time() { return gameTime; }, get grenades() { return grenades; }, get explosions() { return explosions; }, get pickups() { return pickups; }, get ads() { return ads; }, get fov() { return camera.fov; }, get rockets() { return rockets; }, get lastKnock() { return lastKnock; }, WEAPONS, setPrimary, get scoped() { return scoped(); },
  MAPS, loadMap, selectMap, get map() { return currentMap; }, get nav() { return nav; }, get navMs() { return navMs; }, get spawns() { return SPAWNS; }, groundAt, collides, get solids() { return solids; },
  get online() { return online; }, joinRoom, leaveOnline, netEv,
  get mode() { return mode; }, get zone() { return zone; }, set zone(v) { zone = v; }, get teamScore() { return teamScore; }, get spawnHold() { return spawnHold; }, get selectedPrimary() { return selectedPrimary; },
  DOM, applyTeam, damage, kill: (e) => kill(e, null, 0, false), V3, get bacon() { return baconStats; }, los: (a, b) => losClear(new V3(...a), new V3(...b)), activeBacons, BACON, get deathCam() { return deathCamState; },
  blastAt: (x, y, z, kind = 'r', owner) => blast(new V3(x, y, z), owner || player, kind === 'n' ? { radius: NADE.radius, maxDmg: NADE.maxDmg, selfMul: NADE.selfMul, knock: NADE.knock, lift: NADE.lift, wIdx: W_NADE } : { ...WEAPONS[3].rocket, wIdx: 3 }),
  rocketAt: (o, d, owner) => launchRocket(owner || player, new V3(...o), new V3(...d).normalize()) };

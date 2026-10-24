// Docão Shooter — jogo original de tiro em primeira pessoa com o Docão (mascote Cheers).
import * as THREE from 'three';
import { makeWardrobeCase } from './menu-wardrobe.js';
import { makeMenuBackdrop } from './menu-backdrop.js';
import { makeDocao, makeFPArms, makeFPForearm, poseFPForearm, setPose, setCrouchPose, toon, outline, makeCup, makeRocket, drawLogo, makeKnife, setExpression, updateExpression, makeNukeRider } from './docao.js';
import { DANCES, normDance, poseVictory, makeShadowDancer, hideVictoryGuns, resetVictoryPose } from './victory-dance.js';
import { DANCE_TIME, danceId } from './shared/emote.js';
import { makeFPSniper, poseSniperBolt } from './sniper-view.js';
import { makeFPSaber, makeWorldSaber, setSaberColor, poseSaber } from './saber-view.js';
import { makeFPCrossbow, makeFPBow, poseDraw, poseRelease, makeFlightShaft } from './bow-view.js';
import { makeFPSlingshot } from './slingshot-view.js';
import { renderWeaponThumb } from './weapon-thumbs.js';
import { camoLevel, camoInfo, nextCamo, applyWeaponCamo, resetWeaponCamo } from './weapon-camo.js';
import { INSPECT_DUR, INSPECT_HOLD, INSPECT_FADE, INSPECT_PROFILES, inspectKind, inspectPose } from './inspect.js';
import { createSaberSfx } from './saber-sfx.js';
import { HIT_DIR_LIFE, addHit } from './damage-dir.js';
import { resetFeedback, feedbackPoints, feedbackHit, feedbackKill, feedbackAward, feedbackMedal, tickFeedback } from './feedback.js';
import { SMOKE, makeTacticalMesh, makeSmokeCloud, inRadius, makeShockStake, makeShockArc } from './tactical-nades.js';
import { SHOCK, stepShock, shockTop, shockReach, shockDmg, shockStun } from './shared/shock.js';
import { mountUav, showUav, drawUav, tickUav, hideUav } from './uav.js';
import { mountStreakUi, setStreakCount, setStreakCycle, setStreakReady, openStrikeMap, closeStrikeMap, showNukeCount, hideNuke, showNukeReady, hideNukeReady } from './killstreak-ui.js';
import { makeTablet, poseTablet, makeLaptop, poseLaptop, makeRadio, poseRadio } from './fp-gear.js';
import { SKINS, getSkin, DEFAULT_SKIN } from './skins.js';
import './costumes.js';
import { MAPS, PLAY_MAPS, INV_MAPS, BOMB_MAPS, getMap, BOMB_MAP } from './maps.js';
import { INV, INV_AMMO, DROP_KEYS, invRefillAmmo, isInvasion, ZOMBIES, POWERS, POWER_KEYS, KEYS, SPIT_GRAV, InvasionCore, parseState, coreView, scaleHit } from './shared/invasion.js';
import { createInvMusic } from './invasion-music.js';
import { makeZombie, animateZombie, dieZombie, applyHalloweenPalette, buildHalloween, makeFogWall, makeDropMesh, tickDrop, makeSpitMesh, makePowerPumpkin, makeRing, tickRing, makeLanternCone, setGhostLook } from './invasion-gfx.js';
import { TRAIN, isTraining, dummyX } from './shared/training.js';
import { buildWorld, disposeWorld, applyPalette, renderThumb } from './world.js';
import { buildNav } from './nav.js';
import { initBacon, spawnBacon, updateBacon, clearBacon, popModel, baconStats, activeBacons, edibleBacons, eatBacon, BACON } from './bacon.js';
import { Net, createRoom, roomInfo } from './net.js';
import { initChat, chatTyping, chatShown, chatRoomOn, chatConsumeUnlock, chatNoteLocked, openChat, closeChat, chatSeed, chatPush, chatSetRoom, chatSetTeam, chatClear, chatUseAll } from './chat.js';
import { initVoice, voicePtt, voiceCycle, voiceReset, voiceRoster, voiceSignal, voiceTalking, voiceMuted, voiceToggleMute, voiceRefresh } from './voice.js';
import { SEND_HZ, INTERP_DELAY } from './config.js';
import { cleanName, NAME_MAX } from './shared/names.js';
import { createPhysics, rayHitboxes } from './shared/physics.js';
import { CROUCH, crouchAmount, stanceScale, eyeHeight, stepCrouch } from './shared/stance.js';
import { explosionHits, rayCapsule, ROCKET_PAD, sniperSpread, shotKnock } from './shared/combat.js';
import { meleeHit, MELEE_KINDS } from './shared/melee.js';
import { SABER_KIT, profileOf, moveScale, ensureSaber, stepStamina, guardOpen, inFront, payGuard, payProjectile, bladeTouch, peekSwing, commitSwing, applySwing, tryDash, trySpecial, spinDue, catchBlade, botSkill, botPlan, targetsInArc, aimForward } from './shared/saber.js';
import { DOM, TEAM_NAMES, TEAM_COLORS, TEAM_HEX, TEAM_DARK, pickZone, newZoneState, zoneCounts, stepZone, inZone, smallerTeam } from './shared/domination.js';
import { BACON_ITEM, noteHurt, resetRegen, regenStep } from './shared/rules.js';
import { BOMB, W_BOMB, SIDE_NAMES, SITE_NAMES, attackTeam, sideOf, bombLayout, newBombState, startRound, stepBomb, blastVictims, unpackBomb, spawnList, botObjective, bombFrozen, bombCanUse, plantNow, siteAt } from './shared/bomb.js';
import { makeBotijao, makeSiteMark } from './bomb-gfx.js';
import { KS_KILL_NAME, heliPos, GUNNER, heliOrbit, AC130 } from './shared/killstreaks.js';
import { DISC, stepDisc } from './shared/disc.js';
import { traceShot } from './shared/penetration.js';
import { CORN, cornDirs, cornAim, stepCorn, popChain, popOpts } from './shared/corn.js';
import { EGG, eggSpeed, eggDmg, stepEgg } from './shared/egg.js';
import { killIcon, weaponSvg } from './killfeed-icons.js';
import { KILL_LIMIT, TIME_LIMIT, normTime, RESPAWN_TIME, INVULN, GRAV, JUMP, SPEED, BOT_SPEED, STEP, RADIUS, HEIGHT, EYE, WEAPONS, PRIMARIES, BOT_PRIMARIES, SECONDARIES, MELEES, CATEGORIES, PISTOL, KNIFE, SABER, UZI, P90, NAIL, SEMI, CROSS, BOW, FAMAS, DISC_W, SABER2, CORN_W, EGG_W, isSaber, POKE, isPokeCode, MINIGUN, isMiniCode, LMG, COMMANDO, MELEE, SABER_COLORS, W_NADE, NADE, WEAPON_SHORT, BOT_DEFS, BOT_RANGE, TAG_COLORS } from './shared/rules.js';
import { getAccount, onAccount, loadMe, saveSkin as saveAcctSkin, dropSession } from './account.js';
import { initAccountUI } from './account-ui.js';
import { bindGrenadeVoice, playGrenadeVoice, grenadeVoiceEnabled, setGrenadeVoiceEnabled } from './grenade-voice.js';
import { POWER_UPS, normHand, clampLoadout, botPool, powerOn, savedToLimits, limitsToSaved } from './shared/loadout.js';

const V3 = THREE.Vector3;
const $ = (id) => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------- Constantes ----------------
// ---------------- Constantes (regras em shared/rules.js) ----------------
const BASE_FOV = 75, ADS_TIME = 0.15, ADS_SPEED = 0.6; // mira (botão direito)
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
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 300); // near 0,1 (era 0,05): 2× mais precisão de profundidade, menos piscar de piso ao longe; o corpo (raio 0,42) nunca deixa a câmera tão perto de uma parede
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
// Física/colisão: a MESMA implementação do servidor (shared/physics.js) — a predição online bate com o servidor.
let PHYS = createPhysics([], mapBounds);
function indexSolids() { PHYS = createPhysics(solids, mapBounds); } // broadphase em grade 4 m + movimento compartilhado
const solidsAt = (x, z) => PHYS.solidsAt(x, z);
const topAt = (s, x, z) => PHYS.topAt(s, x, z);
// AABB completo: só bloqueia se o corpo (pés..cabeça) cruza a caixa; dá pra andar debaixo de lajes e 2º andar
const collides = (x, y, z) => PHYS.collides(x, y, z);
const groundAt = (x, z, y) => PHYS.groundAt(x, z, y);
const ceilingAt = (x, z, headY) => PHYS.ceilingAt(x, z, headY);
const moveEntity = (e, dt) => PHYS.moveEntity(e, dt);

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
const center = (e, y = 1.0) => new V3(e.pos.x, e.pos.y + y * stanceScale(e.crouch), e.pos.z);

// ---------------- Áudio sintetizado ----------------
let actx = null, master = null, noiseBuf = null, menuMuted = false;
function initAudio() {
  if (actx) { actx.resume(); return; }
  try {
    actx = new (window.AudioContext || window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = menuMuted ? 0 : 0.4; master.connect(actx.destination);
    noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    saberSfx.bind(actx, master); bindGrenadeVoice(actx, master);
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
  commando: (v = 1) => { noise(0.06, 2600, 0.32 * v); tone('square', 170, 45, 0.05, 0.09 * v); }, // fuzil, mais seco e baixo
  lmg: (v = 1) => { noise(0.1, 2400, 0.48 * v); tone('square', 160, 45, 0.09, 0.14 * v); }, // mais grave que o fuzil, cadência contínua
  shotgun: (v = 1) => { noise(0.5, 1200, 1.0 * v); tone('sine', 85, 38, 0.28, 0.55 * v); tone('sawtooth', 100, 30, 0.3, 0.35 * v); noise(0.7, 500, 0.5 * v, 'lowpass', 0.03); noise(0.12, 5000, 0.25 * v, 'highpass'); }, // Calibre 12: estouro + tump grave + cauda
  zap: (v = 1) => { if (v < 0.02) return; noise(0.18, 3200, 0.3 * v, 'bandpass'); tone('sawtooth', 120, 95, 0.4, 0.12 * v); tone('square', 60, 58, 0.45, 0.06 * v); tone('square', 1800, 900, 0.05, 0.05 * v, 0.03); }, // bzzzt do pau de choque
  stake: (v = 1) => { if (v < 0.02) return; tone('square', 900, 300, 0.05, 0.1 * v); noise(0.06, 1500, 0.3 * v, 'bandpass'); }, // tchac da estaca fincando
  pump: (v = 1, d = 0) => { noise(0.05, 1800, 0.35 * v, 'bandpass', d); tone('square', 240, 180, 0.04, 0.08 * v, d); noise(0.05, 2600, 0.4 * v, 'bandpass', d + 0.17); tone('square', 320, 260, 0.04, 0.1 * v, d + 0.17); },
  shell: () => { tone('square', 620, 520, 0.03, 0.08); noise(0.04, 3000, 0.15, 'bandpass', 0.02); },
  sniper: (v = 1) => { noise(0.9, 1800, 1.3 * v); tone('sine', 140, 28, 0.7, 0.6 * v); noise(0.18, 7000, 0.5 * v, 'highpass'); noise(1.4, 500, 0.35 * v, 'lowpass', 0.15); },
  canhao: (v = 1) => { noise(1.15, 700, 1.5 * v); tone('sine', 70, 22, 0.85, 0.75 * v); noise(0.22, 5000, 0.35 * v, 'highpass'); noise(1.6, 280, 0.45 * v, 'lowpass', 0.12); },
  carabina: (v = 1) => { noise(0.35, 2400, 0.85 * v); tone('sine', 200, 55, 0.28, 0.4 * v); noise(0.08, 6000, 0.3 * v, 'highpass'); },
  bolt: (v = 1, d = 0) => { tone('square', 420, 380, 0.04, 0.1 * v, d); noise(0.06, 2400, 0.3 * v, 'bandpass', d + 0.12); noise(0.05, 3200, 0.3 * v, 'bandpass', d + 0.42); tone('square', 520, 480, 0.03, 0.1 * v, d + 0.55); },
  bazooka: (v = 1) => { noise(0.6, 900, 0.9 * v, 'bandpass'); tone('sawtooth', 180, 60, 0.4, 0.3 * v); noise(1.0, 2500, 0.2 * v, 'highpass', 0.05); },
  pistol: (v = 1) => { noise(0.08, 3600, 0.45 * v); tone('square', 330, 90, 0.06, 0.14 * v); },
  uzi: (v = 1) => { noise(0.045, 4200, 0.32 * v); tone('square', 280, 90, 0.04, 0.08 * v); },
  p90: (v = 1) => { noise(0.05, 3400, 0.28 * v); tone('square', 240, 80, 0.045, 0.07 * v); },
  radioCall: () => { tone('square', 1400, 1400, 0.03, 0.08); noise(0.5, 1800, 0.12, 'bandpass', 0.08); for (let i = 0; i < 5; i++) tone('sawtooth', 380 + (i % 2) * 120, 340 + (i % 3) * 60, 0.07, 0.05, 0.14 + i * 0.12); noise(0.06, 3200, 0.1, 'highpass', 0.75); }, // clique do PTT, chiado e "fala" picotada
  radioOk: () => { tone('sine', 880, 880, 0.07, 0.12); tone('sine', 1320, 1320, 0.1, 0.12, 0.08); },
  disco: (v = 1) => { tone('sine', 300, 1200, 0.16, 0.18 * v); tone('triangle', 900, 1600, 0.12, 0.08 * v, 0.05); noise(0.08, 3800, 0.12 * v, 'highpass'); }, // fiuuu de disco voador
  famas: (v = 1) => { noise(0.08, 2900, 0.42 * v); tone('square', 310, 85, 0.06, 0.12 * v); noise(0.03, 6500, 0.14 * v, 'highpass'); },
  milho: (v = 1) => { noise(0.14, 700, 0.6 * v); tone('sine', 190, 80, 0.12, 0.3 * v); noise(0.05, 3200, 0.18 * v, 'bandpass', 0.02); tone('triangle', 1200, 900, 0.03, 0.06 * v, 0.06); }, // puf de ar comprimido + tlec da manivela
  pipoca: (v = 1) => { if (v < 0.03) return; noise(0.035, 2200 + Math.random() * 1600, 0.55 * v, 'bandpass'); tone('triangle', 900 + Math.random() * 500, 300, 0.05, 0.16 * v); noise(0.12, 600, 0.25 * v, 'lowpass', 0.01); }, // poc! de pipoca estourando
  prego: (v = 1) => { noise(0.04, 2200, 0.35 * v, 'bandpass'); tone('square', 180, 70, 0.05, 0.1 * v); noise(0.03, 5000, 0.12 * v, 'highpass'); },
  semi: (v = 1) => { noise(0.28, 1600, 0.75 * v); tone('sawtooth', 140, 50, 0.16, 0.22 * v); noise(0.08, 5200, 0.18 * v, 'highpass'); },
  besta: (v = 1) => { tone('triangle', 220, 70, 0.09, 0.2 * v); noise(0.06, 1800, 0.35 * v, 'bandpass'); tone('sine', 640, 180, 0.05, 0.1 * v, 0.02); },
  arco: (v = 1) => { tone('triangle', 280, 90, 0.08, 0.16 * v); noise(0.05, 2400, 0.28 * v, 'highpass'); tone('sine', 520, 160, 0.05, 0.08 * v); },
  estilingue: (v = 0.5) => { if (v < 0.01) return; tone('triangle', 520, 160, 0.06, 0.08 * v); noise(0.04, 1800, 0.08 * v, 'bandpass'); }, // fuíp baixinho do elástico
  estica: (v = 1) => tone('sawtooth', 90, 140, 0.25, 0.03 * v), // elástico rangendo
  splat: (v = 1) => { if (v < 0.01) return; noise(0.12, 900, 0.35 * v, 'lowpass'); tone('sine', 240, 90, 0.08, 0.12 * v); noise(0.06, 3000, 0.1 * v, 'bandpass', 0.03); }, // ovo quebrando
  empty: () => tone('square', 1100, 1000, 0.03, 0.08),
  inspect: (v = 0.6) => { noise(0.07, 1800, 0.18 * v, 'bandpass'); tone('square', 380, 330, 0.04, 0.06 * v, 0.02); }, // pano e metal ao inspecionar
  reload: () => { tone('square', 500, 420, 0.04, 0.1); tone('square', 700, 600, 0.04, 0.1, 0.35); noise(0.06, 2500, 0.3, 'highpass', 0.8); },
  hit: () => tone('sine', 1300, 1700, 0.06, 0.25),
  wallPen: (v = 1) => { if (v < 0.02) return; noise(0.07, 900, 0.4 * v, 'bandpass'); tone('square', 150, 60, 0.06, 0.1 * v); noise(0.04, 4200, 0.15 * v, 'highpass', 0.03); }, // tuc! da bala varando a parede
  kill: () => { tone('triangle', 700, 1400, 0.18, 0.3); tone('triangle', 1050, 2100, 0.2, 0.2, 0.06); },
  oink: (v = 1, p = 1) => { tone('sawtooth', 430 * p, 250 * p, 0.12, 0.18 * v); tone('sawtooth', 400 * p, 230 * p, 0.12, 0.15 * v, 0.14); },
  die: (v = 1) => tone('sawtooth', 520, 110, 0.55, 0.22 * v),
  chomp: (v = 1) => { noise(0.06, 2400, 0.32 * v, 'bandpass'); noise(0.06, 1900, 0.26 * v, 'bandpass', 0.1); tone('sine', 520, 880, 0.1, 0.16 * v, 0.04); tone('triangle', 880, 1320, 0.12, 0.14 * v, 0.16); }, // nhac nhac + plim
  pickup: () => { tone('sine', 660, 660, 0.08, 0.2); tone('sine', 880, 880, 0.08, 0.2, 0.08); tone('sine', 1320, 1320, 0.12, 0.2, 0.16); },
  jump: () => tone('sine', 300, 600, 0.1, 0.06),
  boom: (v = 1) => { noise(1.1, 700, 1.4 * v); tone('sine', 110, 28, 0.8, 0.7 * v); noise(0.5, 3500, 0.25 * v, 'highpass', 0.12); noise(0.9, 6000, 0.12 * v, 'highpass', 0.3); tone('triangle', 900, 1600, 0.08, 0.12 * v, 0.05); },
  incoming: (v = 1) => { tone('sine', 980, 160, 1.05, 0.16 * v); noise(0.9, 1400, 0.1 * v, 'bandpass'); },
  toss: (v = 1) => { noise(0.18, 1800, 0.25 * v, 'bandpass'); tone('sine', 500, 260, 0.15, 0.08 * v); },
  bounce: (v = 1) => tone('square', 260 + Math.random() * 80, 180, 0.05, 0.08 * v),
  charge: () => tone('sine', 300, 300, 0.03, 0.03),
  knife: (v = 1, kind = 'slash') => { // golpe: assobio do ar cortando
    if (kind === 'stab') { noise(0.16, 1400, 0.5 * v, 'bandpass'); tone('sine', 520, 160, 0.14, 0.08 * v); }
    else { noise(0.14, 2600, 0.45 * v, 'bandpass'); noise(0.1, 4800, 0.18 * v, 'highpass', 0.03); tone('sine', 900, 320, 0.12, 0.06 * v); }
  },
  knifeHit: (v = 1) => { noise(0.09, 700, 0.9 * v); tone('square', 170, 70, 0.09, 0.22 * v); tone('triangle', 2600, 1900, 0.06, 0.07 * v, 0.01); },
  knifeDraw: (v = 1) => { tone('triangle', 1700, 2900, 0.14, 0.06 * v); noise(0.12, 6500, 0.12 * v, 'highpass'); },
  pop: (v = 1) => { tone('sine', 820, 180, 0.12, 0.25 * v); noise(0.18, 1400, 0.35 * v, 'bandpass'); },
  streak: (n = 2) => { const k = Math.min(Math.max(n, 2), 6); for (let i = 0; i < k - 1; i++) tone('square', 340 + i * 80, 520 + i * 90, 0.07, 0.11, i * 0.055); if (k >= 5) noise(0.18, 1600, 0.22, 'bandpass', 0.18); },
  minigun: (v = 1) => { noise(0.05, 2600, 0.38 * v); tone('square', 160, 70, 0.045, 0.12 * v); tone('sine', 90, 50, 0.05, 0.12 * v); }, // brrrt: um tiro (sai ~22 por segundo)
  mgStart: (v = 1) => { tone('sawtooth', 70, 320, 0.55, 0.06 * v); noise(0.4, 1200, 0.08 * v, 'bandpass'); }, // canos começando a girar
  mgStop: (v = 1) => { tone('sawtooth', 320, 60, 0.85, 0.06 * v); noise(0.5, 900, 0.06 * v, 'bandpass'); }, // canos parando
  steam: (v = 1) => { noise(1.6, 5200, 0.22 * v, 'highpass'); for (let i = 0; i < 10; i++) noise(0.03, 3000 + Math.random() * 3000, 0.12 * v, 'bandpass', Math.random() * 1.4); }, // superaqueceu: vapor chiando
  sizzle: (v = 1, dur = 1.5) => { // bacon fritando: chiado agudo + estalinhos de gordura
    if (v < 0.03) return; noise(dur, 5200, 0.16 * v, 'highpass'); noise(dur * 0.7, 2600, 0.08 * v, 'bandpass', 0.05);
    const n = Math.round(6 + dur * 10); for (let i = 0; i < n; i++) noise(0.025, 2500 + Math.random() * 3500, (0.12 + Math.random() * 0.2) * v, 'bandpass', Math.random() * dur);
  },
};
// giro da minigun: oscilador contínuo; spin 0..1 sobe/desce o tom e o volume (atualizado todo quadro no loop)
const mgWhirr = { o: null, o2: null, f: null, g: null, last: '', set(spin, firing) {
  if (!actx || (!this.g && !spin)) return; const key = spin.toFixed(2) + (firing ? 1 : 0); if (key === this.last) return; this.last = key;
  if (!this.g) { this.o = actx.createOscillator(); this.o.type = 'sawtooth'; this.o2 = actx.createOscillator(); this.o2.type = 'triangle'; this.f = actx.createBiquadFilter(); this.f.type = 'bandpass'; this.f.Q.value = 1.2; this.g = actx.createGain(); this.g.gain.value = 0; this.o.connect(this.f); this.o2.connect(this.f); this.f.connect(this.g); this.g.connect(master); this.o.start(); this.o2.start(); }
  const t = actx.currentTime, hz = 70 + 270 * spin + (firing ? 30 : 0);
  this.o.frequency.setTargetAtTime(hz, t, 0.05); this.o2.frequency.setTargetAtTime(hz * 2.01, t, 0.05); this.f.frequency.setTargetAtTime(400 + 1400 * spin, t, 0.05); this.g.gain.setTargetAtTime(0.07 * spin, t, 0.06);
} };
const distVol = (p) => clamp(1 - p.distanceTo(player.pos) / 60, 0.05, 1);
const nadeEarVol = (p, range = 50) => (player ? clamp(1 - p.distanceTo(player.pos) / range, 0, 1) : 1); // vozes do copo: caem com a distância e somem além de `range` m (banana 50, granada 60)
const saberSfx = createSaberSfx();

// ---------------- Entidades ----------------
let gameTime = 0, state = 'menu', hadLock = false, softPauseOn = false, entities = [], player = null, sens = 1.4, sensAds = 1, revengeName = null;
try {
  const savedSens = localStorage.getItem('docao.sens'); if (savedSens) $('sens').value = savedSens;
  const savedAds = localStorage.getItem('docao.sensAds'); if (savedAds) $('sensAds').value = savedAds;
  sens = parseFloat($('sens').value) || 1.4; sensAds = parseFloat($('sensAds').value) || 1;
} catch (e) { /* sem storage */ }
document.querySelectorAll('[data-nade-voice]').forEach((el) => { // vozes da granada: liga/desliga (localStorage, padrão ligado)
  el.checked = grenadeVoiceEnabled();
  el.addEventListener('change', () => setNadeVoice(el.checked));
});
function setNadeVoice(on) { setGrenadeVoiceEnabled(on); document.querySelectorAll('[data-nade-voice]').forEach((o) => { o.checked = grenadeVoiceEnabled(); }); }
let mode = 'dm', teamScore = [0, 0], zone = null, zoneT = 0; // modo de jogo: 'dm' (mata-mata) | 'dom' (Dominação) | 'explore' (mapa vazio) | 'treino' | 'bomb' (Bomba, protótipo)
let bombS = null, bombL = null; // Modo Bomba: estado da rodada (shared/bomb.js) e layout do mapa (sites A/B, lados)
const MODE_OK = (m) => (m === 'dom' || m === 'bomb' || m === 'explore' || m === TRAIN.mode || m === INV.mode ? m : 'dm');
let spawnHold = 'primary'; // arma na mão ao nascer: primary | secondary | melee (salva no navegador)
try { spawnHold = normHand(localStorage.getItem('docao.hand')); } catch (e) { /* sem storage */ }
let selectedDance = 'moonwalk';
try { selectedDance = normDance(localStorage.getItem('docao.dance')); } catch (e) { /* sem storage */ }
let matchLimits = { weapons: null, powers: null }; // cópia dos limites no instante em que a partida solo começa
let rulesLive = false;
const teamMode = () => mode === 'dom' || mode === 'bomb'; // modos com times
const training = () => isTraining(mode); // Estande do Docão: bots viram alvos
const exploreMode = () => mode === 'explore';
const invMode = () => isInvasion(mode); // Invasão 🎃: co-op contra zumbis (shared/invasion.js)
let inv = null, invNet = null; // offline: InvasionCore local · online: estado lido do snapshot (parseState)
const invGfx = { hal: null, fog: null, drops: new Map(), projs: new Map(), rings: [], cones: new Map(), inv: [], sel: 0 };
let invZid = 1000, invMusic = null; // trilha de terror procedural (invasion-music.js)
function invMusicOn(on) { if (on) { if (!actx) initAudio(); if (!actx) return; if (!invMusic) invMusic = createInvMusic(actx, master); invMusic.start(); } else if (invMusic) invMusic.stop(); }
const friends = (a, b) => (invMode() ? !!(a && b && a !== b && !a.zt === !b.zt) : teamMode() && a && b && a !== b && a.team === b.team && a.team >= 0);
let online = null; // modo online: { net, code, myId, hostId, ents: Map(id → entidade), evq, ... } (ver seção Online)
let ads = 0; // 0 = normal, 1 = mirando (zoom)
const keys = {}; let mouseDown = false, firedThisPress = false;

function makeEntity(name, isPlayer, skinId, tag = '#ffffff') {
  const skin = getSkin(skinId);
  const e = { name, isPlayer, skinId: skin.id, float: !!skin.float, floatPh: Math.random() * 6, nextWisp: 0, shirt: (skin.shirt && skin.shirt.color) || '#d8261c', tag, pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, crouch: 0, onGround: false, hp: 100, alive: true,
    kills: 0, deaths: 0, invulnUntil: 0, weapon: 0, primary: 0, nextPrimary: 0, mag: WEAPONS.map(() => 0), reserve: WEAPONS.map(() => 0), reloadEnd: 0, nextFire: 0, switchEnd: 0, actionEnd: 0,
    respawnAt: 0, deathAt: 0, fxDeath: 0, lastAttacker: null, flashUntil: 0, nades: 0, smokeNades: 0, stunNades: 0, stunUntil: 0, charging: false, chargeStart: 0, nextNade: 0, gunKills: WEAPONS.map(() => 0) };
    e.nextPrimary = isPlayer ? selectedPrimary : pickBotPrimary();
  e.nextSecondary = isPlayer ? selectedSecondary : PISTOL;
  e.nextMelee = isPlayer ? selectedMelee : KNIFE;
  if (!isPlayer) {
    e.model = makeDocao(skin); scene.add(e.model.group);
    colorSabers(e.model.guns, saberColor);
    e.tagSprite = nameSprite(name, tag); e.model.group.add(e.tagSprite);
    e.bubble = new THREE.Mesh(new THREE.SphereGeometry(1.25, 20, 14), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.25, depthWrite: false }));
    e.bubble.position.y = 1.0; e.model.group.add(e.bubble);
    Object.assign(e, { think: 0, target: null, aim: 0, reaction: rand(0.35, 0.65), strafeDir: 1, strafeT: 0, wp: null, stuck: 0, lastSeen: null, lastSeenAt: -99, walk: 0, accuracy: rand(0.045, 0.07) });
  }
  return e;
}

// spawn equilibrado: longe dos vivos e, se possível, fora da linha de visão deles
function pickSpawn(e) {
  if (invMode() && inv && e.isPlayer) { const near = e.reviveAt || null; e.reviveAt = null; const q = e.spawnedOnce ? inv.spawnPoint(e, near) : null; e.spawnedOnce = true; if (q) return new V3(q.x, q.y, q.z); } // Invasão: renasce perto de um aliado, dentro da área segura
  const list = spawnList(bombS, bombL, e.team, SPAWNS); // Bomba: spawn do lado do time
  let best = list[0], bd = -Infinity;
  for (const s of list) {
    let md = 1e9, seen = false; const eye = new V3(s.x, s.y + 1.5, s.z);
    for (const o of entities) {
      if (o === e || !o.alive) continue;
      if (friends(o, e)) { if (bombS && o.pos.distanceTo(s) < 2.5) md = Math.min(md, -40); continue; } // Bomba: não nasce em cima do colega
      const d = o.pos.distanceTo(s); md = Math.min(md, d);
      if (!seen && d < 60 && losClear(eye, center(o, 1.5))) seen = true;
    }
    const score = Math.min(md, 40) + Math.random() * 6 - (seen ? 30 : 0); if (score > bd) { bd = score; best = s; }
  }
  return best;
}
function respawn(e) {
  e.pos.copy(pickSpawn(e)); e.vel.set(0, 0, 0); e.crouch = 0; e.hp = 100; e.alive = true; e.invulnUntil = gameTime + INVULN; resetRegen(e);
  if (e.isPlayer) keys.Space = false;
  if (!e.isPlayer && (Math.random() < 0.3 || !weaponAllowed(e.nextPrimary))) e.nextPrimary = pickBotPrimary(); // bots às vezes trocam de primária, e nunca ficam com arma banida na sala
  e.primary = e.nextPrimary; e.secondary = e.nextSecondary ?? PISTOL; e.melee = e.nextMelee ?? KNIFE;
  e.slots = [e.primary, e.secondary, e.melee]; e.knifeMode = false; e.prevWeapon = e.primary;
  e.mag = WEAPONS.map((w) => w.mag); e.reserve = WEAPONS.map((w) => w.reserve); e.reloadEnd = 0; e.switchEnd = 0; e.actionEnd = 0; e.burstLeft = 0; e.nades = NADE.spawnWith; e.smokeNades = clientPower('smoke') ? 1 : 0; e.stunNades = clientPower('stun') ? SHOCK.spawnWith : 0; e.lastShockT = -99; e.stunUntil = 0; e.charging = false;
  e.mgSpin = 0; e.mgHeat = 0; e.mgHot = false; e.mgWant = false; e.mgFiring = false; // minigun: renasce fria e parada
  const hand = !e.isPlayer ? e.primary : spawnHold === 'melee' ? e.melee : spawnHold === 'secondary' ? e.secondary : e.primary;
  setWeapon(e, e.slots.includes(hand) ? hand : e.primary);
  e.yaw = Math.atan2(-e.pos.x, -e.pos.z) + Math.PI; e.bonk = false; // olha pro centro
  if (e.model) { e.model.group.visible = true; e.model.group.scale.set(1, 1, 1); e.target = null; e.wp = null; e.path = null; e.yaw = Math.atan2(-e.pos.x, -e.pos.z); }
  else { e.pitch = 0; eggSplatUntil = 0; $('stamp').classList.remove('show'); onPlayerRespawn(); }
  if (e.dummy) { e.invulnUntil = gameTime; e.slots = [0, PISTOL, KNIFE]; placeDummy(e); setWeapon(e, PISTOL); }
}
// Treino: posição do alvo (parado ou no trilho), sempre de frente pra linha de tiro
function placeDummy(b) {
  const d = b.dummy, x = dummyX(d, gameTime), px = b.pos.x;
  b.pos.set(x, groundAt(x, d.z, (d.y || 0) + 0.3), d.z); b.yaw = d.yaw || 0; b.onGround = true;
  b.vel.set(0, 0, 0); b.travelV = (x - px);
}

// ---------------- Pickups ----------------
// caixa de munição: enche a reserva da primária e da pistola; a bazuca é escassa (+1 foguete por caixa)
function refillAmmo(e) {
  if (invMode()) return invRefillAmmo(e, WEAPONS); // Invasão: mais munição por caixa (mesma regra do servidor)
  let got = false;
  for (const i of e.slots) {
    const w = WEAPONS[i]; if (e.reserve[i] >= w.reserve) continue;
    e.reserve[i] = w.rocket ? Math.min(w.reserve, e.reserve[i] + 1) : w.reserve; got = true;
  }
  return got;
}
// Exploração: a reserva, os copos e a fumaça não acabam, pra dar pra testar sem caçar caixa; o pau de choque volta em 10 s.
// O pente continua finito: a recarga acontece do mesmo jeito.
function refillExplore(e) {
  for (const i of e.slots) {
    const w = WEAPONS[i]; if (!w || w.melee || e.reserve[i] >= w.reserve) continue;
    e.reserve[i] = w.reserve;
  }
  if (e.nades < NADE.max) e.nades = NADE.max;
  if (clientPower('smoke') && (e.smokeNades || 0) < 1) e.smokeNades = 1; else if (!clientPower('smoke')) e.smokeNades = 0;
  shockRefill(e); // pau de choque: volta 1 depois de SHOCK.trainRefill s (não é infinito)
}
function shockRefill(e) { if (!clientPower('stun')) { e.stunNades = 0; return; } if (!(e.stunNades > 0) && gameTime - (e.lastShockT ?? -99) > SHOCK.trainRefill) e.stunNades = 1; }
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
    // Invasão: facho e anel amarelos pra achar a caixa de longe (só aparecem nesse modo)
    const fxMat = () => new THREE.MeshBasicMaterial({ color: 0xf2c94c, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 8, 6, 1, true), fxMat()); beam.position.y = 4; g.add(beam);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.68, 28), fxMat()); ring.material.side = THREE.DoubleSide; ring.rotation.x = -Math.PI / 2; ring.position.y = -0.62; g.add(ring);
    beam.visible = ring.visible = false; g.userData.fx = [beam, ring];
  }
  const y = groundAt(x, z, yHint + 0.3); g.position.set(x, y + 0.7, z); scene.add(g);
  pickups.push({ type, mesh: g, pos: new V3(x, y, z), active: true, respawnAt: 0, baseY: y + 0.7 });
}

function updatePickups(dt) {
  for (const p of pickups) {
    if (!p.active) { if (gameTime >= p.respawnAt) { p.active = true; p.mesh.visible = true; } continue; }
    p.mesh.rotation.y += dt * 1.6; p.mesh.position.y = p.baseY + Math.sin(gameTime * 3 + p.pos.x) * 0.12;
    if (p.mesh.userData.fx) { const on = invMode(); for (const f of p.mesh.userData.fx) if (f.visible !== on) f.visible = on; }
    if (online) continue; // online: o servidor decide quem pegou
    for (const e of entities) {
      if (!e.alive || e.zt || !clientPower(p.type)) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
      if (dx * dx + dz * dz > 1.5 || Math.abs(e.pos.y - p.pos.y) > 1.5) continue;
      if (p.type === 'health') { if (e.hp >= 100) continue; e.hp = Math.min(100, e.hp + 50); }
      else if (p.type === 'grenade') { const sk = clientPower('stun') && (e.stunNades || 0) < SHOCK.max; if (e.nades >= NADE.max && !sk) continue; if (e.nades < NADE.max) e.nades++; if (sk) e.stunNades = (e.stunNades || 0) + 1; } // Copo Bomba também dá +1 pau de choque
      else if (!refillAmmo(e)) continue;
      p.active = false; p.mesh.visible = false; p.respawnAt = gameTime + (p.type === 'grenade' ? NADE.pickupRespawn : invMode() && p.type === 'ammo' ? INV_AMMO.respawn : 15);
      if (e.isPlayer) { sfx.pickup(); flashMsg(p.type === 'health' ? '+50 de vida' : p.type === 'grenade' ? `+1 Copo Bomba (${e.nades}/${NADE.max})${clientPower('stun') ? ` · Pau de choque ${e.stunNades || 0}/${SHOCK.max}` : ''}` : e.primary === 3 ? `Munição! +${invMode() ? INV_AMMO.rockets : 1} foguete${invMode() ? 's' : ''} (${e.reserve[3]}/${invMode() ? Math.ceil(WEAPONS[3].reserve * INV_AMMO.reserveMul) : WEAPONS[3].reserve})` : 'Munição cheia!'); }
      break;
    }
  }
}

// Bacon que cura (offline; online quem decide é o servidor, evento 'bc'): +10 de vida pra quem pisar, menos o próprio morto
function baconNear(e, b) { const dx = e.pos.x - b.pos.x, dz = e.pos.z - b.pos.z; return dx * dx + dz * dz <= BACON_ITEM.radius * BACON_ITEM.radius && Math.abs(e.pos.y - b.pos.y) < BACON_ITEM.dy; }
function updateBaconPickups() {
  if (online) return;
  for (const b of edibleBacons()) for (const e of entities) {
    if (!e.alive || e.zt || e === b.ent || e.hp >= 100 || !baconNear(e, b)) continue;
    e.hp = Math.min(100, e.hp + BACON_ITEM.heal); baconEaten(b, e); break;
  }
}
function baconEaten(b, e) { // efeito + som (todo mundo vê); aviso só pra quem comeu
  if (b) { sfx.chomp(e && e.isPlayer ? 1 : distVol(b.pos)); eatBacon(b); }
  if (e && e.isPlayer) flashMsg(`+${BACON_ITEM.heal} de vida (bacon!)`);
}
function nearBacon(b, maxD) { // bot com pouca vida: bacon dos outros por perto
  let best = null, bd = maxD;
  for (const x of edibleBacons()) { if (x.ent === b || Math.abs(x.pos.y - b.pos.y) >= BACON_ITEM.dy + 0.3) continue; const d = x.pos.distanceTo(b.pos); if (d < bd) { bd = d; best = x; } }
  return best;
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
// furo de bala na parede (entrada e saída quando atravessa) + faísca na saída
const holeGeo = new THREE.CircleGeometry(0.07, 10), holes = [];
function bulletHole(h, spark = true) {
  const n = new V3(h.n.x, h.n.y, h.n.z), m = new THREE.Mesh(holeGeo, new THREE.MeshBasicMaterial({ color: 0x24160c, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(h.p.x, h.p.y, h.p.z).addScaledVector(n, 0.012); m.quaternion.setFromUnitVectors(new V3(0, 0, 1), n); scene.add(m);
  effects.push({ obj: m, t: 0, life: 8, kind: 'hole' }); holes.push(m); while (holes.length > 48) { const o = holes.shift(); const f = effects.find((x) => x.obj === o); if (f) f.t = f.life; }
  if (!h.out || !spark) return;
  puff(m.position, 0xffd27a);
  for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true })); s.scale.setScalar(0.25); s.position.copy(m.position); scene.add(s); particles.push({ mesh: s, vel: n.clone().multiplyScalar(rand(2, 4)).add(new V3(rand(-1.5, 1.5), rand(0, 2), rand(-1.5, 1.5))), life: 0.35, t: 0, kind: 'drop' }); }
}
function puff(p, color = 0xffffff) {
  const m = new THREE.Mesh(puffGeo, new THREE.MeshBasicMaterial({ color, transparent: true })); m.position.copy(p); scene.add(m);
  effects.push({ obj: m, t: 0, life: 0.3, kind: 'puff' });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const f = effects[i]; f.t += dt; const k = f.t / f.life;
    f.obj.material.opacity = f.kind === 'hole' ? Math.min(1, (1 - k) * 8) : 1 - k; if (f.kind === 'beam') f.obj.scale.set(1 + k * 2, 1, 1 + k * 2); if (f.kind === 'puff') f.obj.scale.setScalar(1 + k * 2);
    if (k >= 1) { scene.remove(f.obj); f.obj.material.dispose(); if (f.kind === 'line' || f.kind === 'beam') f.obj.geometry.dispose(); if (f.kind === 'hole') { const j = holes.indexOf(f.obj); if (j >= 0) holes.splice(j, 1); } effects.splice(i, 1); }
  }
}
// flecha e virote: o dano continua no tiro normal; isto só mostra o projétil indo até a parede
const shafts = [];
function launchShaft(from, dir, speed) {
  const d = dir.clone().normalize();
  const wh = wallDistance(from, d, 42);
  const mesh = makeFlightShaft();
  mesh.position.copy(from);
  mesh.lookAt(from.clone().add(d));
  scene.add(mesh);
  shafts.push({ mesh, pos: from.clone(), dir: d, speed, dist: 0, max: wh ? Math.max(0.4, wh.distance - 0.15) : 42 });
}
function updateShafts(dt) {
  for (let i = shafts.length - 1; i >= 0; i--) {
    const s = shafts[i];
    const step = s.speed * dt;
    s.dist += step; s.pos.addScaledVector(s.dir, step); s.mesh.position.copy(s.pos);
    if (s.dist >= s.max) { scene.remove(s.mesh); shafts.splice(i, 1); }
  }
}

// ---------------- Morte = BACON (ver bacon.js) ----------------
initBacon(scene, { groundAt, collides: (x, y, z) => collides(x, y, z), pop: (v) => sfx.pop(v), sizzle: (v, d) => sfx.sizzle(v, d) });
const DEATHCAM_HOLD = 1.1; // s de câmera em 3ª pessoa no seu bacon antes dos cartões de arma
let ghost = null; // Docão do jogador local (ele não tem modelo em 1ª pessoa) só pra animação de morte
const deathCamState = { on: false, dist: 0, target: null };
function deathFx(e) { // dispara uma vez por morte (offline: kill(); online: evento 'k' ou snapshot)
  if (e.swallowedAt != null && e.swallowedAt === e.deathAt) { if (e.model) e.model.group.visible = false; e.fxDeath = e.deathAt; return; } // engolido pela Pokébola
  if (e.fxDeath === e.deathAt) return; e.fxDeath = e.deathAt;
  if (gameTime - e.deathAt > 1.0) return; // morte antiga (entrou no meio): sem animação
  e.baconOk = true;
  spawnBacon(e, e.isPlayer ? 'player' : e.remote && !e.bot ? 'remote' : 'bot', e.isPlayer ? 1 : distVol(e.pos));
  if (e.isPlayer) {
    const g = ensureGhost(e.skinId);
    g.model.group.position.copy(e.pos); g.model.group.rotation.set(0, e.yaw + Math.PI, 0); g.model.group.scale.set(1, 1, 1); g.model.group.visible = true;
    deathCamState.on = true; deathCamState.dist = 0; deathCamState.ang = e.yaw;
    const atk = e.lastAttacker;
    if (atk && atk !== e) {
      const dx = atk.pos.x - e.pos.x, dz = atk.pos.z - e.pos.z;
      if (dx * dx + dz * dz > 0.04) deathCamState.ang = Math.atan2(-dx, -dz);
    }
  }
}
const camTmp = new V3(), camTgt = new V3();
const KILLERCAM_AFTER = 0.9; // s vendo o próprio bacon antes de passar a seguir quem matou
function killerCamTarget(p) { // quem matou, se ainda está vivo e na partida (jogador, bot ou zumbi); senão null → fica onde morreu
  if (p.killW === W_BOMB) return null; // explosão do botijão: sem câmera de assassino
  const k = p.lastAttacker; if (!k || k === p || !k.alive || k.fog || !k.pos || !entities.includes(k)) return null; return k;
}
function deathCam(p, dt) { // 3ª pessoa: primeiro olhando para quem matou; depois segue o assassino (killer cam); se ele sumir, fica na posição da morte
  const t = gameTime - p.deathAt;
  if (ghost && ghost.model.group.visible) popModel(ghost.model.group, t, p.yaw + Math.PI);
  const kc = t > KILLERCAM_AFTER ? killerCamTarget(p) : null;
  if (kc) {
    const kp = kc.pos, sz = kc.size || 1; camTgt.set(kp.x, kp.y + 1.25 * sz, kp.z);
    let hx = p.pos.x - kp.x, hz = p.pos.z - kp.z; const hl = Math.hypot(hx, hz);
    if (hl < 0.2) { hx = -Math.sin(kc.yaw || 0); hz = -Math.cos(kc.yaw || 0); } else { hx /= hl; hz /= hl; } // câmera do lado de onde você caiu, olhando a cara do assassino
    let d = 4 * sz; for (; d > 1.2; d -= 0.4) { camTmp.set(camTgt.x + hx * d, camTgt.y + 0.5 + d * 0.2, camTgt.z + hz * d); if (losClear(camTgt, camTmp)) break; }
    camTmp.set(camTgt.x + hx * d, camTgt.y + 0.5 + d * 0.2, camTgt.z + hz * d);
    if (!deathCamState.dist) camera.position.copy(camTmp); else camera.position.lerp(camTmp, Math.min(1, dt * 4));
    deathCamState.dist = d; deathCamState.target = camTgt.toArray(); deathCamState.killer = kc;
    camera.lookAt(camTgt); return;
  }
  deathCamState.killer = null;
  const b = p.bacon && p.bacon.on ? p.bacon : null;
  camTgt.set(b ? b.pos.x : p.pos.x, (b ? b.pos.y : p.pos.y) + 0.25, b ? b.pos.z : p.pos.z);
  const a = deathCamState.ang;
  const want = Math.min(3.4, 1.2 + t * 6); let d = want;
  for (; d > 0.8; d -= 0.4) { camTmp.set(camTgt.x + Math.sin(a) * d, camTgt.y + 0.55 + d * 0.42, camTgt.z + Math.cos(a) * d); if (losClear(camTgt, camTmp)) break; }
  camTmp.set(camTgt.x + Math.sin(a) * d, camTgt.y + 0.55 + d * 0.42, camTgt.z + Math.cos(a) * d);
  if (!deathCamState.dist) camera.position.copy(camTmp); else camera.position.lerp(camTmp, Math.min(1, dt * 6));
  deathCamState.dist = d; deathCamState.target = camTgt.toArray();
  camera.lookAt(camTgt);
}
function ensureGhost(skinId) {
  if (!ghost || ghost.skin !== skinId) {
    if (ghost) { resetVictoryPose(ghost.model); scene.remove(ghost.model.group); }
    ghost = { skin: skinId, model: makeDocao(getSkin(skinId)) };
    if (ghost.model.snout) ghost.model.snoutBase = ghost.model.snout.scale.clone();
    scene.add(ghost.model.group);
  }
  return ghost;
}
const victory = { on: false, model: null, clock: 0 };
function playerWonMatch(src) {
  if (src.mode === 'explore' || src.mode === 'treino') return false;
  if (src.mode === 'inv') return !!src.invWon;
  if (src.mode === 'dom') return src.teamW >= 0 && player && player.team === src.teamW;
  return !!(src.rows && src.rows[0] && src.rows[0].isPlayer);
}
function beginVictory() {
  if (!player) return;
  const model = ensureGhost(player.skinId).model;
  hideVictoryGuns(model);
  if (model.snout && !model.snoutBase) model.snoutBase = model.snout.scale.clone();
  model.danceBase = { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw + Math.PI };
  model.group.visible = true; model.group.scale.set(1, 1, 1);
  if (player.bacon && player.bacon.grp) player.bacon.grp.visible = false;
  victory.on = true; victory.model = model; victory.clock = 0;
  pickups.forEach((p) => { p.mesh.visible = false; });
  $('gameover').classList.add('dancing');
  $('hud').classList.add('hidden'); $('socialHud').classList.add('hidden');
}
function endVictory() {
  if (victory.model) resetVictoryPose(victory.model);
  if (ghost && ghost.model) ghost.model.group.visible = false;
  victory.on = false; victory.model = null;
  pickups.forEach((p) => { p.mesh.visible = !!p.active; });
  const over = $('gameover'); if (over) over.classList.remove('dancing');
  if (camera.view && camera.view.enabled) camera.clearViewOffset();
}
// Fim de partida suave: o resultado fecha na hora (sem IA, dano, captura nem renascimento); a cena desacelera por 1,5 s
// na visão do jogador, a mensagem de vitória/derrota/empate aparece logo e o placar entra aos 0,8 s. Se ganhou, a dança
// da vitória começa quando o placar entra. Movimento reduzido: placar na hora.
let matchEnding = null;
const END_SLOWMO = 1.5, END_MENU_DELAY = 0.8;
function clearMatchEnding() {
  if (matchEnding) resetAds(); // o zoom do fim só sai quando a próxima partida/menu começa
  matchEnding = null;
  document.body.classList.remove('match-ended');
  $('matchResult').classList.add('hidden');
}
function beginMatchEnding() {
  state = 'over'; mouseDown = false; rightDown = false; clickLatch = 0;
  matchEnding = { elapsed: 0, visualTime: gameTime, offset: camera.position.clone().sub(player.pos), firstPerson: !!(player.alive && !deathCamState.on),
    duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : END_SLOWMO, revealed: false, dance: false };
  for (const k of Object.keys(keys)) keys[k] = false;
  player.charging = false; player.bowDraw = 0; player.eggDraw = 0; arcLine.visible = arcMark.visible = false;
  if (online) online.evq = [];
  ['pause', 'gameover', 'tabboard', 'teamPick'].forEach((id) => $(id).classList.add('hidden'));
  document.body.classList.add('match-ended'); // o HUD some (style.css), o mundo fica na câmera atual
  if (document.pointerLockElement) document.exitPointerLock();
}
function presentMatchResult(outcome) {
  const titles = { win: 'VITÓRIA!', loss: 'DERROTA', draw: 'EMPATE!', end: 'FIM DE PARTIDA' };
  $('resultTitle').textContent = titles[outcome] || titles.end; $('matchResult').dataset.outcome = outcome;
  $('resultDetail').textContent = $('winner').textContent;
  $('matchResult').classList.remove('hidden');
  if (!matchEnding.duration) revealEndMenu();
}
function revealEndMenu() {
  if (!matchEnding || matchEnding.revealed) return;
  matchEnding.revealed = true;
  $('matchResult').classList.add('hidden');
  $('gameover').classList.remove('dancing'); $('gameover').classList.remove('hidden');
  if (!matchEnding.duration) startEndDance(); // movimento reduzido: sem câmera lenta, a dança já pode começar
}
function startEndDance() { // a dança da vitória entra só quando a câmera lenta acaba (o placar já estava na tela)
  if (!matchEnding || !matchEnding.dance || matchEnding.danced) return;
  matchEnding.danced = true; beginVictory();
}
function updateMatchEnding(realDt) {
  if (window.__endDt != null) realDt = window.__endDt; // testes: passo fixo da transição (independe do FPS da máquina)
  const end = matchEnding, remaining = Math.max(0, end.duration - end.elapsed);
  const k = end.duration ? Math.min(1, end.elapsed / end.duration) : 1;
  const dt = Math.min(realDt, remaining, 0.05) * (0.22 * (1 - k) ** 2 + 0.025); // câmera lenta que vai parando
  end.elapsed += realDt; // tempo real: o placar entra aos 0,8 s mesmo com o jogo lento
  if (dt > 0 && !victory.on) {
    // relógio visual separado: o placar e o tempo oficial ficam fechados
    const finalTime = gameTime; end.visualTime += dt; gameTime = end.visualTime;
    if (player.alive && end.firstPerson) { moveEntity(player, dt); camera.position.copy(player.pos).add(end.offset); updateFP(dt); }
    for (const e of entities) if (!e.isPlayer && !e.zt && e.model) {
      if (e.alive) { moveEntity(e, dt); animateBot(e, dt); }
      else { deathFx(e); if (e.fxDeath === e.deathAt && e.baconOk && e.swallowedAt !== e.deathAt) popModel(e.model.group, gameTime - e.deathAt, e.yaw); }
    }
    updateGrenades(dt); updateRockets(dt); updateDiscs(dt); updateCorn(dt); updateEggs(dt); updateShocks(dt); updatePokeFx(dt); updateParticles(dt); updateBacon(dt); updateEffects(dt); updateShafts(dt);
    gameTime = finalTime;
  }
  if (end.elapsed >= Math.min(END_MENU_DELAY, end.duration)) revealEndMenu();
  if (end.elapsed >= end.duration) startEndDance();
}
function frameVictoryCam() {
  const m = victory.model; if (!m) return;
  const b = m.danceBase;
  camTgt.set(m.group.position.x, b.y + 1.02, m.group.position.z);
  let bestD = 0, bx = camTgt.x, by = camTgt.y + 0.4, bz = camTgt.z + 3;
  for (let i = 0; i < 8; i++) {
    const face = b.yaw + 0.4 + i * (Math.PI / 4) + Math.sin(victory.clock * 0.35) * 0.08;
    let d = 4.2;
    for (; d > 1.35; d -= 0.4) {
      camTmp.set(camTgt.x + Math.sin(face) * d, camTgt.y + 0.22 + d * 0.08, camTgt.z + Math.cos(face) * d);
      if (losClear(camTgt, camTmp)) break;
    }
    if (d > bestD) { bestD = d; bx = camTmp.x; by = camTmp.y; bz = camTmp.z; }
    if (d >= 3.8) break;
  }
  camera.position.set(bx, by, bz);
  camera.lookAt(camTgt);
  const panel = $('gameover').querySelector('.panel');
  if (panel && innerWidth > 720) {
    const r = panel.getBoundingClientRect(), cx = r.right + (innerWidth - r.right) * 0.42, offX = innerWidth / 2 - cx;
    if (!camera.view || !camera.view.enabled || Math.abs(camera.view.offsetX - offX) > 0.5) camera.setViewOffset(innerWidth, innerHeight, offX, 0, innerWidth, innerHeight);
  }
}

// Dança no meio da partida (B, quando a tecla está livre). O Docão aparece em 3ª pessoa e a arma não dispara até o tempo acabar.
const emote = { on: false, until: 0, clock: 0, model: null };
function startEmote() {
  if (chatTyping() || state !== 'playing' || !player || !player.alive || emote.on || invMode() || invPick) return; // nada de dança na Invasão, com o painel de armas aberto ou digitando no chat
  if (gunner || predator || nukeAt || radioCall) return;
  const model = ensureGhost(player.skinId).model;
  hideVictoryGuns(model);
  if (model.snout && !model.snoutBase) model.snoutBase = model.snout.scale.clone();
  model.group.visible = true; model.group.scale.set(1, 1, 1);
  player.charging = false; player.bowDraw = 0; player.eggDraw = 0; player.burstLeft = 0;
  arcLine.visible = arcMark.visible = false; clickLatch = 0; rightLatch = 0;
  ads = 0; if (camera.fov !== BASE_FOV) { camera.fov = BASE_FOV; camera.updateProjectionMatrix(); }
  emote.on = true; emote.until = gameTime + DANCE_TIME; emote.clock = 0; emote.model = model;
}
function stopEmote() {
  if (emote.model) resetVictoryPose(emote.model);
  if (ghost && ghost.model) ghost.model.group.visible = false;
  emote.on = false; emote.model = null; emote.clock = 0;
}
function stepEmote(dt) {
  if (!emote.on) return;
  if (!player || !player.alive || state !== 'playing' || gameTime >= emote.until) { stopEmote(); return; }
  emote.clock += dt;
  const m = emote.model;
  m.danceBase = { x: player.pos.x, y: player.pos.y, z: player.pos.z, yaw: player.yaw + Math.PI };
  poseVictory(m, selectedDance, emote.clock);
  camTgt.set(m.group.position.x, player.pos.y + 1.05, m.group.position.z);
  let bestD = 0, bx = camTgt.x, by = camTgt.y, bz = camTgt.z + 3;
  for (let i = 0; i < 6; i++) {
    const face = m.danceBase.yaw + i * (Math.PI / 5);
    let d = 3.5;
    for (; d > 1.45; d -= 0.4) {
      camTmp.set(camTgt.x + Math.sin(face) * d, camTgt.y + 0.28, camTgt.z + Math.cos(face) * d);
      if (losClear(camTgt, camTmp)) break;
    }
    if (d > bestD) { bestD = d; bx = camTmp.x; by = camTmp.y; bz = camTmp.z; }
    if (d >= 3.2) break;
  }
  camera.position.set(bx, by, bz); camera.lookAt(camTgt);
}

// ---------------- Copo Bomba (granada) ----------------
const grenades = [], particles = []; let shake = 0, explosions = 0, lastKnock = -99;
const nadeBlocked = (x, y, z) => PHYS.nadeBlocked(x, y, z);
const cupWorldScale = () => 0.55 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(fpCam.fov / 2));
function poseGrenadeMesh(n, dt = 0) {
  n.mesh.rotation.x += n.spin.x * dt; n.mesh.rotation.y += n.spin.y * dt; n.mesh.rotation.z += n.spin.z * dt;
  const left = n.explodeAt - gameTime, base = n.poke ? 1.3 : 1.15;
  const scale = THREE.MathUtils.lerp(n.launchScale ?? base, base, Math.min(1, (n.physicsTime || 0) / 0.18));
  n.mesh.scale.setScalar(scale * (left < 0.6 ? 1 + Math.sin(gameTime * 40) * 0.08 : 1));
  n.mesh.position.copy(n.pos);
  if (!n.poke) n.mesh.position.add(new V3(0, -0.1 * n.mesh.scale.x, 0).applyQuaternion(n.mesh.quaternion));
}
function throwGrenade(e, origin, vel) {
  if (e.nades <= 0) return null;
  e.nades--; e.lastNadeT = gameTime;
  if (online && e.isPlayer) { netEv(['n', v3a(origin), v3a(vel)]); sfx.toss(1); playGrenadeVoice('granada', 1); return null; } // o copo aparece quando o servidor confirmar
  const mesh = makeCup(1.15); mesh.position.copy(origin).y -= 0.1; scene.add(mesh);
  const gnd = { owner: e, pos: origin.clone(), vel: vel.clone(), explodeAt: gameTime + NADE.fuse, mesh, spin: new V3(rand(-8, 8), rand(-4, 4), rand(-8, 8)), lastBounce: 0 };
  if (e.isPlayer) { gnd.launchScale = cupWorldScale(); mesh.quaternion.copy(camera.quaternion).multiply(fp.cup.quaternion); }
  poseGrenadeMesh(gnd);
  grenades.push(gnd); sfx.toss(e.isPlayer ? 1 : distVol(e.pos)); playGrenadeVoice('granada', e.isPlayer ? 1 : nadeEarVol(e.pos, 60), e.isPlayer ? 0 : 0.3); return gnd; // "granada": no instante que sai da mão
}
const stepNade = (pos, vel, dt, onBounce) => PHYS.stepNade(pos, vel, dt, onBounce);
function throwVelocity(power) { // direção da câmera + leve arco pra cima
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion); dir.y += 0.28; dir.normalize();
  return dir.multiplyScalar(7 + 15 * power).add(new V3(player.vel.x * 0.5, 0, player.vel.z * 0.5));
}
// A pose e a origem usam o mesmo copo, inclusive com FOV/zoom diferentes.
function poseChargeCup(k) {
  fp.cup.position.set(-0.36 - k * 0.05, -0.27 + k * 0.06, -0.72 + k * 0.08);
  fp.cup.rotation.set(0.25 - k * 0.5, 0.4, 0.15 + k * 0.3);
  fp.cup.updateMatrixWorld(true);
}
function throwOrigin() {
  poseChargeCup(player.charging ? chargePower() : 0);
  const local = fp.cup.localToWorld(new V3(0, 0.1, 0));
  const fovRatio = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.tan(THREE.MathUtils.degToRad(fpCam.fov / 2));
  local.x *= fovRatio; local.y *= fovRatio;
  const desired = local.applyQuaternion(camera.quaternion).add(camera.position);
  const origin = camera.position.clone();
  // Recolhe a origem se a mão visual atravessar uma parede/teto.
  const offset = desired.clone().sub(camera.position), distance = offset.length();
  for (let d = 0; d <= distance; d += 0.025) {
    const test = camera.position.clone().addScaledVector(offset, Math.min(d + 0.025, distance) / distance);
    if (nadeBlocked(test.x, test.y, test.z) || test.y < groundAt(test.x, test.z, camera.position.y) + NADE.r) break;
    origin.copy(test);
  }
  return origin;
}
function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const n = grenades[i];
    PHYS.advanceNade(n, dt, () => { if (gameTime - n.lastBounce > 0.12) { sfx.bounce(distVol(n.pos)); n.lastBounce = gameTime; } n.spin.multiplyScalar(0.6); });
    poseGrenadeMesh(n, dt);
    const left = n.explodeAt - gameTime;
    if (n.net) { if (left < -1.5) { scene.remove(n.mesh); grenades.splice(i, 1); } continue; } // online: explode quando o servidor mandar
    if (left <= 0) { if (n.poke) pokeOpen(n); else explode(n); scene.remove(n.mesh); grenades.splice(i, 1); }
  }
}

// ---------------- Pokébola (código "pokebola" no chat) ----------------
function makePokeball() {
  const g = new THREE.Group(), r = 0.16;
  const top = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), toon(0xe63946)); outline(top, 0.008); g.add(top);
  const bot = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon(0xf5f1e8)); outline(bot, 0.008); g.add(bot);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, 0.03, 18), toon(0x1a1c22)); g.add(band);
  const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 14), toon(0xf5f1e8)); btn.rotation.x = Math.PI / 2; btn.position.z = r * 0.98; outline(btn, 0.005); g.add(btn);
  g.userData.top = top; g.userData.btn = btn;
  return g;
}
function grantPokeball() { if (!player) return; player.pokeballs = Math.min(POKE.max, (player.pokeballs || 0) + 1); flashMsg(`Pokébola na mão (${player.pokeballs}) · Q joga`); sfx.pickup(); }
// ---------------- Minigun (código "minigun" no chat) ----------------
// troca a primária pela minigun até morrer (o renascimento remonta os slots com a primária escolhida)
function grantMinigun(p = player) {
  if (!p || !p.alive) return;
  if (p.slots.includes(MINIGUN)) { if (p.weapon !== MINIGUN) switchWeapon(p, MINIGUN); return; } // já tem: só saca (sem reabastecer nem esfriar)
  p.slots[0] = MINIGUN; p.mag[MINIGUN] = WEAPONS[MINIGUN].mag; p.reserve[MINIGUN] = WEAPONS[MINIGUN].reserve; p.mgSpin = 0; p.mgHeat = 0; p.mgHot = false; p.mgWant = false;
  if (p.weapon !== MINIGUN) switchWeapon(p, MINIGUN); else setWeapon(p, MINIGUN);
  if (p === player) { flashMsg('Minigun na mão · segura o botão direito pra embalar'); sfx.pickup(); }
}
function throwPokeball(e, origin, vel) {
  e.pokeballs--;
  if (online && e.isPlayer) { netEv(['n', v3a(origin), v3a(vel), 'p']); sfx.toss(1); return; } // a bola aparece quando o servidor confirmar
  const mesh = makePokeball(); scene.add(mesh);
  grenades.push({ poke: true, owner: e, pos: origin.clone(), vel: vel.clone(), explodeAt: gameTime + POKE.fuse, mesh, spin: new V3(rand(-8, 8), rand(-4, 4), rand(-8, 8)), lastBounce: 0 });
  sfx.toss(1);
}
const pokeFx = [];
// abriu: feixe vermelho até cada engolido, a "alma" vermelha voa pra dentro, a bola balança 3 vezes e faz clique
function pokeOpenFx(pos, eaten) {
  const mesh = makePokeball(); mesh.position.copy(pos); scene.add(mesh);
  const souls = eaten.map((t) => { const from = center(t, 1); tracer(pos.clone().add(new V3(0, 0.2, 0)), from, true); const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b, transparent: true, opacity: 0.7, depthWrite: false })); m.position.copy(from); scene.add(m); t.swallowedAt = t.deathAt; if (t.model) t.model.group.visible = false; return { m, from }; });
  pokeFx.push({ mesh, souls, t: 0, n: eaten.length });
  const v = distVol(pos); tone('sawtooth', 220, 900, 0.35, 0.14 * v); noise(0.3, 1400, 0.2 * v, 'bandpass');
}
function updatePokeFx(dt) {
  for (let i = pokeFx.length - 1; i >= 0; i--) {
    const f = pokeFx[i]; f.t += dt; const ud = f.mesh.userData;
    ud.top.rotation.x = f.t < 0.5 ? -0.9 * Math.sin(Math.min(1, f.t / 0.5) * Math.PI) : 0; // tampa abre e fecha
    for (const s of f.souls) { const k = Math.min(1, f.t / 0.45); s.m.position.lerpVectors(s.from, f.mesh.position, k * k); s.m.scale.setScalar(Math.max(0.01, 1 - k)); s.m.visible = k < 1; }
    if (f.t > 0.6 && f.t < 2.1) { const w = (f.t - 0.6) % 0.5; f.mesh.rotation.z = w < 0.25 ? Math.sin(w / 0.25 * Math.PI) * 0.35 : 0; if (f.n) ud.btn.material.color.set(Math.floor(f.t * 8) % 2 ? 0xff4a4a : 0xf5f1e8); } // balança 3 vezes
    if (f.t >= 2.1 && !f.clicked) { f.clicked = true; f.mesh.rotation.z = 0; ud.btn.material.color.set(0xf5f1e8); const v = distVol(f.mesh.position); tone('square', 1300, 1300, 0.04, 0.12 * v); tone('square', 1700, 1700, 0.05, 0.1 * v, 0.06); if (f.n) burst(f.mesh.position.clone(), 1.2); }
    if (f.t > 2.8) { scene.remove(f.mesh); for (const s of f.souls) scene.remove(s.m); pokeFx.splice(i, 1); }
  }
}
function pokeOpen(n) { // offline: engole quem estiver no raio com linha livre
  const c = n.pos.clone().add(new V3(0, 0.3, 0)), eaten = [];
  for (const t of entities) { if (t === n.owner || !t.alive || friends(t, n.owner) || gameTime < t.invulnUntil) continue; if (center(t, 1).distanceTo(c) > POKE.radius || !losClear(c, center(t, 1))) continue; eaten.push(t); }
  for (const t of eaten) { t.hp = 0; t.lastAttacker = n.owner; kill(t, n.owner, W_NADE, false, false, false, 'Pokébola'); }
  pokeOpenFx(n.pos.clone(), eaten);
  window.__pokeEaten = (window.__pokeEaten || 0) + eaten.length;
}
function explode(n) { playGrenadeVoice('banana', nadeEarVol(n.pos), 0.25); blast(n.pos.clone(), n.owner, { radius: NADE.radius, maxDmg: NADE.maxDmg, selfMul: NADE.selfMul, knock: NADE.knock, lift: NADE.lift, wIdx: W_NADE }); }

const tacticals = [], smokes = [];
function smoked(a, b) { for (const s of smokes) if (s.blocks(a, b)) return true; return false; }
function throwTactical() { // fumaça (tecla 4)
  if (!player || !player.alive) return;
  if (!clientPower('smoke')) { flashMsg('Fumaça desligada nesta sala'); return; }
  if (online) { flashMsg('Fumaça só na partida com bots'); return; }
  if (player.smokeNades <= 0) { flashMsg('Sem fumaça'); return; }
  player.smokeNades--;
  const origin = throwOrigin();
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  dir.y += 0.22; dir.normalize();
  const vel = dir.multiplyScalar(SMOKE.speed).add(new V3(player.vel.x * 0.4, 0, player.vel.z * 0.4));
  const mesh = makeTacticalMesh();
  scene.add(mesh);
  tacticals.push({ kind: 'smoke', pos: origin.clone(), vel, mesh, explodeAt: gameTime + SMOKE.fuse, spin: new V3(rand(-6, 6), rand(-3, 3), rand(-6, 6)), lastBounce: 0 });
  sfx.toss(1);
}
function popTactical(n) {
  scene.remove(n.mesh);
  const cloud = makeSmokeCloud(n.pos);
  scene.add(cloud.group); smokes.push(cloud); sfx.pop(distVol(n.pos));
}
function updateSmokeSight() {
  const veil = $('smokeVeil'), flash = $('stunFlash');
  const eye = player ? { x: camera.position.x, y: camera.position.y, z: camera.position.z } : null;
  let thick = false;
  if (eye) for (const s of smokes) if (inRadius(s.pos, eye, s.radius * 0.7)) thick = true;
  if (veil) veil.style.opacity = thick ? '0.8' : '0';
  if (flash && player) flash.style.opacity = player.alive && player.stunUntil > gameTime ? (0.25 + Math.random() * 0.35).toFixed(2) : '0'; // levou choque: tela azul piscando
  if (!eye) return;
  for (const e of entities) {
    if (!e.model || e.isPlayer || !e.alive) continue;
    e.model.group.visible = !smoked(eye, { x: e.pos.x, y: e.pos.y + 1.1, z: e.pos.z });
  }
}
function updateTacticals(dt) {
  for (let i = tacticals.length - 1; i >= 0; i--) {
    const n = tacticals[i];
    stepNade(n.pos, n.vel, dt, () => { if (gameTime - n.lastBounce > 0.12) { sfx.bounce(distVol(n.pos)); n.lastBounce = gameTime; } });
    n.mesh.position.copy(n.pos); n.mesh.rotation.x += n.spin.x * dt; n.mesh.rotation.z += n.spin.z * dt;
    if (gameTime >= n.explodeAt) { popTactical(n); tacticals.splice(i, 1); }
  }
  for (let i = smokes.length - 1; i >= 0; i--) {
    if (!smokes[i].update(dt)) { scene.remove(smokes[i].group); smokes.splice(i, 1); }
  }
  updateSmokeSight();
}
function clearTacticals() {
  for (const n of tacticals) scene.remove(n.mesh); tacticals.length = 0;
  for (const s of smokes) scene.remove(s.group); smokes.length = 0;
  clearShocks();
  updateSmokeSight();
}
// ---------------- Pau de choque (tecla 5; regras em shared/shock.js; online o servidor manda sk/sx/sz/se) ----------------
const shocks = [];
function throwShock() {
  if (!player || !player.alive) return;
  if (!clientPower('stun')) { flashMsg('Pau de choque desligado nesta sala'); return; }
  if (!(player.stunNades > 0)) { flashMsg('Sem pau de choque · pegue a caixa de Copo Bomba'); return; }
  if (player.stunUntil > gameTime) { flashMsg('Levou choque · espere passar'); return; } // atordoado não arremessa (o servidor também recusa)
  player.stunNades--; player.lastShockT = gameTime;
  const o = throwOrigin(), dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion); dir.y += 0.12; dir.normalize();
  const vel = dir.multiplyScalar(SHOCK.speed).add(new V3(player.vel.x * 0.4, 0, player.vel.z * 0.4));
  sfx.toss(1);
  if (online) { netEv(['sk', v3a(o), v3a(vel)]); return; } // aparece quando o servidor confirmar
  spawnShock({ owner: player, pos: o.clone(), vel });
}
function spawnShock(s) { s.t = 0; s.mesh = makeShockStake(); s.arcs = []; scene.add(s.mesh); shocks.push(s); placeShock(s); return s; }
const UP = new V3(0, 1, 0), DOWN = new V3(0, -1, 0);
function placeShock(s) { const m = s.mesh; if (s.stuck) { m.position.copy(s.pos).addScaledVector(s.n, -SHOCK.sink); m.quaternion.setFromUnitVectors(UP, s.n); } else { m.position.copy(s.pos); if (s.vel.lengthSq() > 1e-4) m.quaternion.setFromUnitVectors(DOWN, s.vel.clone().normalize()); } } // no ar: ponta pra frente
function stickShock(s, pos, n) { s.pos.set(pos.x, pos.y, pos.z); s.n = new V3(n.x, n.y, n.z).normalize(); s.stuck = true; s.until = gameTime + SHOCK.life; s.nextPulse = gameTime; placeShock(s); sfx.stake(distVol(s.pos)); puff(s.pos.clone(), 0x9fe3ff); }
function shockPulseFx(s, victims) { // arcos estaca→vítima, faíscas e zumbido; quem leva fica atordoado (visual; offline é a regra)
  for (const t of victims) { for (let k = 0; k < 2; k++) { const a = makeShockArc(); a.set(shockTop(s), center(t, 1)); scene.add(a.line); s.arcs.push({ a, t, life: 0.35 }); } puff(center(t, 1), 0x9fe3ff); t.stunUntil = Math.max(t.stunUntil || 0, gameTime + shockStun(t)); if (!t.isPlayer) { t.target = null; t.aim = 0; } } // 2 arcos por vítima: a linha do WebGL é fina
  s.lastPulse = gameTime; window.__shockPulses = (window.__shockPulses || 0) + 1;
  sfx.zap(distVol(s.pos) * (victims.length ? 1 : 0.5));
}
function removeShock(i) { const s = shocks[i]; scene.remove(s.mesh); for (const r of s.arcs) scene.remove(r.a.line); shocks.splice(i, 1); }
function updateShocks(dt) {
  for (let i = shocks.length - 1; i >= 0; i--) {
    const s = shocks[i];
    if (!s.stuck) {
      if (s.net && s.wait) { s.t += dt; if (s.t > SHOCK.flight + 1.5) removeShock(i); continue; } // bateu aqui; espera o 'sx' do servidor
      const hit = stepShock(PHYS, s, dt);
      if (hit && !s.net) stickShock(s, hit.pos, hit.n); else if (hit) { s.stuck = false; s.wait = true; } else if (s.dead && !s.net) { removeShock(i); continue; }
      placeShock(s); continue;
    }
    s.mesh.userData.light.visible = Math.floor(gameTime * 8) % 2 === 0; // luz piscando
    if (!s.net && gameTime >= s.nextPulse && gameTime < s.until) {
      s.nextPulse += SHOCK.tick; const v = shockReach(s, entities, gameTime, friends, losClear, center);
      for (const t of v) { const d = shockDmg(t.hp); if (d > 0) damage(t, d, s.owner, W_NADE, false, false, 0, shockTop(s)); } // origem = a estaca: o arco vermelho aponta pra ela, não pro dono
      shockPulseFx(s, v.filter((t) => t.alive));
    }
    for (let k = s.arcs.length - 1; k >= 0; k--) { const r = s.arcs[k]; r.life -= dt; if (r.life <= 0 || !r.t.alive) { scene.remove(r.a.line); s.arcs.splice(k, 1); } else r.a.set(shockTop(s), center(r.t, 1)); }
    if (!s.net && gameTime >= s.until) removeShock(i);
  }
}
function clearShocks() { for (let i = shocks.length - 1; i >= 0; i--) removeShock(i); }
// explosão genérica (Copo Bomba e foguete da bazuca)
function blastFx(c, radius) {
  explosions++;
  sfx.boom(player ? clamp(1 - c.distanceTo(player.pos) / 70, 0.15, 1) : 1);
  if (player) shake = Math.max(shake, clamp(1 - c.distanceTo(player.pos) / 16, 0, 1) * 0.6);
  burst(c, radius);
}
function blast(c, owner, o, direct = null) {
  if (state === 'over') { blastFx(c, o.radius); return; } // depois do resultado: só o efeito
  (o.fx === 'pop' ? popFx : blastFx)(c, o.radius); // pipoca: estouro pequeno; o resto: som, tremida, confete (conta a explosão)
  if (owner !== player) for (const sh of skyHelis()) {
    const d = c.distanceTo(sh.pos);
    const reach = o.radius + heliR(sh) * 0.4;
    if (d < reach) hurtHeli(o.maxDmg * (0.35 + 0.65 * (1 - d / reach)), sh);
  }
  const los = (a, b) => losClear(new V3(a.x, a.y, a.z), new V3(b.x, b.y, b.z));
  for (const h of explosionHits(c, o, invMode() ? entities.filter((x) => x.zt || x === owner) : entities, los, owner, teamMode(), direct)) { // Invasão: explosão só fere zumbi (o dono ainda leva o empurrão do rocket jump) // mesma regra do servidor (shared/combat.js)
    const e = h.e; e.vel.x += h.knock.x; e.vel.z += h.knock.z; e.vel.y = Math.max(e.vel.y, h.knock.y); e.onGround = false; // empurrão (rocket jump)
    if (e.isPlayer) lastKnock = gameTime;
    damage(e, h.dmg, owner, o.wIdx, false, false, 0, c);
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
    else if (p.kind === 'mag') { const g = groundAt(m.position.x, m.position.z, m.position.y) + 0.06; p.vel.y -= 14 * dt; m.position.addScaledVector(p.vel, dt); if (m.position.y <= g) { m.position.y = g; p.vel.set(0, 0, 0); p.spin.set(0, 0, 0); } m.rotation.x += p.spin.x * dt; m.rotation.z += p.spin.z * dt; m.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1; }
    else if (p.kind === 'wisp') { m.position.addScaledVector(p.vel, dt); m.scale.setScalar(p.s0 * (1 + k)); m.material.opacity = 0.3 * (1 - k); }
    else if (p.kind === 'corn') { const g = groundAt(m.position.x, m.position.z, m.position.y) + 0.04; p.vel.y -= 12 * dt; m.position.addScaledVector(p.vel, dt); if (m.position.y <= g) { m.position.y = g; p.vel.y = Math.abs(p.vel.y) > 1.5 ? -p.vel.y * 0.35 : 0; p.vel.x *= 0.6; p.vel.z *= 0.6; p.spin.multiplyScalar(0.6); } m.rotation.x += p.spin.x * dt; m.rotation.z += p.spin.z * dt; m.material.opacity = k > 0.7 ? (1 - k) / 0.3 : 1; } // pipoca quicando
    else if (p.kind === 'smoke') { p.vel.multiplyScalar(1 - 1.5 * dt); p.vel.y += 0.6 * dt; m.position.addScaledVector(p.vel, dt); m.scale.setScalar(p.s0 * (1 + k * 2.2)); m.material.opacity = 0.7 * (1 - k); }
    else if (p.kind === 'spark') { p.vel.y -= 6 * dt; m.position.addScaledVector(p.vel, dt); m.material.opacity = 0.55 * (1 - k); m.scale.setScalar(1 - k * 0.35); }
    if (k >= 1) { scene.remove(m); if (m.material) m.material.dispose(); if (p.kind === 'flash' || p.kind === 'ring') m.geometry.dispose(); particles.splice(i, 1); }
  }
}
// pré-visualização da trajetória
const arcGeo = new THREE.BufferGeometry().setFromPoints(Array.from({ length: Math.ceil(Math.max(NADE.fuse, POKE.fuse) / NADE.step) + 1 }, () => new V3()));
const arcLine = new THREE.Line(arcGeo, new THREE.LineDashedMaterial({ color: COLORS.cyan, dashSize: 0.25, gapSize: 0.15, transparent: true, opacity: 0.9, depthTest: false }));
arcLine.renderOrder = 10; arcLine.visible = false; arcLine.frustumCulled = false; scene.add(arcLine);
const arcMark = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 28), new THREE.MeshBasicMaterial({ color: COLORS.cyan, transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthTest: false }));
arcMark.rotation.x = -Math.PI / 2; arcMark.visible = false; arcMark.renderOrder = 10; scene.add(arcMark);
function updateArc() {
  const pos = throwOrigin(), vel = throwVelocity(throwPower());
  const pts = arcGeo.attributes.position, steps = Math.round((player.pokeballs > 0 ? POKE.fuse : NADE.fuse) / NADE.step);
  for (let i = 0; i <= steps; i++) {
    pts.setXYZ(i, pos.x, pos.y, pos.z);
    if (i < steps) PHYS.stepNade(pos, vel, NADE.step);
  }
  arcGeo.setDrawRange(0, steps + 1);
  pts.needsUpdate = true; arcLine.computeLineDistances(); arcGeo.computeBoundingSphere();
  arcMark.position.set(pos.x, pos.y - NADE.r + 0.04, pos.z); arcMark.visible = true; arcLine.visible = true;
}
function startCharge() { const p = player; if (p && p.alive && !emote.on && p.stunUntil > gameTime) { flashMsg('Levou choque · espere passar'); return; } // atordoado não arremessa (o servidor também recusa)
  if (emote.on || !p || !p.alive || (p.nades <= 0 && !(p.pokeballs > 0)) || p.charging) { if (!emote.on && p && p.alive && p.nades <= 0 && !p.charging) flashMsg('Sem Copo Bomba! Pegue um copo vermelho'); return; } p.charging = true; p.chargeStart = gameTime; }
function chargePower() { return clamp((gameTime - player.chargeStart) / NADE.charge, 0, 1); }
const throwPower = () => 0.15 + 0.85 * chargePower();
function releaseCharge() {
  const p = player; if (!p || !p.charging) return;
  const origin = throwOrigin(), vel = throwVelocity(throwPower());
  p.charging = false; arcLine.visible = arcMark.visible = false;
  fp.cup.visible = false;
  if (!p.alive || emote.on) return;
  if (p.stunUntil > gameTime) { flashMsg('Levou choque · espere passar'); return; } // levou choque segurando o copo: não joga nem gasta
  fp.cupReleasePos = fp.cup.position.clone(); fp.cupReleaseRot = fp.cup.quaternion.clone();
  if (p.pokeballs > 0) throwPokeball(p, origin, vel); else throwGrenade(p, origin, vel);
  fp.cupThrowT = 0.25;
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

// ---------------- Disco Voador (shared/disc.js: quica 3 vezes, o 4º contato destrói) ----------------
function makeUfo(s = 1) { // discão prateado, cúpula de vidro com um ETzinho dentro e luzinhas em volta
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const put = (geo, mat, x, y, z, ol = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); body.add(m); if (ol) outline(m, ol); return m; };
  put(new THREE.SphereGeometry(0.24, 20, 10), toon(0xc9d1d9), 0, 0, 0, 0.012).scale.set(1, 0.26, 1);
  put(new THREE.TorusGeometry(0.235, 0.022, 8, 28), toon(0x7a8794), 0, 0, 0).rotation.x = Math.PI / 2;
  put(new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshToonMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.75 }), 0, 0.035, 0, 0.006);
  put(new THREE.SphereGeometry(0.045, 10, 8), toon(0x7be08a), 0, 0.07, 0); // ETzinho
  put(new THREE.CylinderGeometry(0.09, 0.06, 0.03, 14), basic(0xfff27a), 0, -0.065, 0); // luz de baixo
  const lights = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; lights.push(put(new THREE.SphereGeometry(0.022, 8, 6), basic(i % 2 ? 0xff4a6a : 0x7df9ff), Math.cos(a) * 0.235, 0.012, Math.sin(a) * 0.235)); }
  g.userData.body = body; g.userData.lights = lights; g.scale.setScalar(s);
  return g;
}
const discs = [];
function spawnDiscFx(d) { const mesh = makeUfo(1.3); mesh.position.copy(d.pos); scene.add(mesh); d.mesh = mesh; discs.push(d); }
function launchDisc(e, origin, dir) {
  if (online && e.isPlayer) { netEv(['dk', v3a(origin), v3a(dir), +(performance.now() / 1000).toFixed(3)]); return; } // o servidor cria o disco ('dl')
  spawnDiscFx({ owner: e, pos: origin.clone().addScaledVector(dir, 0.5), dir: dir.clone(), bounces: 0, t: 0 });
}
function discBounceFx(p, last) { puff(p, last ? 0xff9fb0 : 0x7df9ff); const v = distVol(p); tone('triangle', 1500, 900, 0.07, 0.12 * v); if (last) noise(0.12, 2600, 0.25 * v, 'bandpass'); }
function removeDisc(i, at, hit) { const d = discs[i]; (window.__discLog ||= []).push(hit ? 'hit' : 'x'); scene.remove(d.mesh); discs.splice(i, 1); discBounceFx(at || d.pos, true); burst(at || d.pos, 0.8); }
function updateDiscs(dt) {
  const W = WEAPONS[DISC_W];
  for (let i = discs.length - 1; i >= 0; i--) {
    const d = discs[i];
    if (!d.net && deflectLocal(d, dt, DISC.speed)) { d.pos.addScaledVector(d.dir, DISC.speed * dt); d.mesh.position.copy(d.pos); continue; }
    const from = d.pos.clone(), hits = stepDisc(PHYS, d, dt);
    d.mesh.position.copy(d.pos); const ud = d.mesh.userData; ud.body.rotation.y += dt * 14; d.mesh.rotation.z = Math.sin(gameTime * 9 + i) * 0.12; // gira e balança
    ud.lights.forEach((l, k) => { l.visible = Math.floor(gameTime * 10 + k) % 2 === 0; });
    for (const h of hits) if (!h.dead) { discBounceFx(new V3(h.pos.x, h.pos.y, h.pos.z), false); (window.__discLog ||= []).push('b'); } // testes: quiques
    if (d.net) { if (d.dead) { scene.remove(d.mesh); discs.splice(i, 1); } continue; } // online: o fim vem do servidor ('dx')
    // offline: acerta quem estiver no caminho deste passo (pode ter dobrado num quique)
    const pts = [from, ...hits.map((h) => new V3(h.pos.x, h.pos.y, h.pos.z)), d.pos.clone()]; let hit = null;
    for (let k = 0; k < pts.length - 1 && !hit; k++) {
      const a = pts[k], seg = pts[k + 1].clone().sub(a), L = seg.length(); if (L < 1e-5) continue; seg.divideScalar(L);
      for (const t of entities) { if (t === d.owner || !t.alive || friends(t, d.owner)) continue; for (const [y, r, head] of [[1.5, 0.5, true], [0.8, 0.58, false]]) { const tt = raySphere(a, seg, center(t, y), r + DISC.r * 0.5); if (tt > 0 && tt <= L && (!hit || tt < hit.tt)) hit = { t, tt, head, at: a.clone().addScaledVector(seg, tt) }; } }
    }
    if (hit) { removeDisc(i, hit.at, true); damage(hit.t, W.dmg * (hit.head ? W.headMul : 1), d.owner, DISC_W, hit.head); continue; }
    if (d.dead) removeDisc(i, d.pos, false);
  }
}
// ---------------- Estilingue de Ovo (shared/egg.js: voa em arco e quebra no 1º contato) ----------------
const eggGeo = new THREE.SphereGeometry(0.07, 12, 10);
function makeEgg() { const m = new THREE.Mesh(eggGeo, toon(0xfff3dc)); m.scale.set(1, 1.3, 1); outline(m, 0.006); return m; }
const eggs = [], eggStains = []; let eggSplatUntil = 0, eggSplatBlobs = [], eggTex = null;
function spawnEggFx(g) { g.mesh = makeEgg(); g.mesh.position.copy(g.pos); scene.add(g.mesh); g.spin = rand(8, 14); eggs.push(g); }
function launchEgg(e, origin, dir, k) {
  if (online && e.isPlayer) { netEv(['eg', v3a(origin), v3a(dir), +k.toFixed(3), +(performance.now() / 1000).toFixed(3)]); return; } // o servidor cria o ovo ('el')
  spawnEggFx({ owner: e, pos: origin.clone(), vel: dir.clone().multiplyScalar(eggSpeed(k)), k, t: 0 });
}
function eggBreakFx(p, onBody) { puff(p, 0xffd23f); puff(p, 0xfff8e8); if (player) sfx.splat(distVol(p)); (window.__eggLog ||= []).push(onBody ? 'hit' : 'wall'); }
function eggStain(p, n) { // mancha de ovo na parede/chão: some em EGG.stain s
  eggTex ||= canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = 'rgba(255,250,235,.85)'; for (const [cx, cy, r] of [[64, 64, 40], [40, 52, 20], [88, 76, 22], [58, 92, 18], [84, 42, 16], [36, 84, 14]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
    const gr = x.createRadialGradient(60, 60, 2, 64, 64, 22); gr.addColorStop(0, '#ffd23f'); gr.addColorStop(1, '#f0a019'); x.fillStyle = gr; x.beginPath(); x.arc(64, 64, 22, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,.8)'; x.beginPath(); x.arc(56, 56, 6, 0, Math.PI * 2); x.fill();
  });
  const m = new THREE.Mesh(new THREE.CircleGeometry(0.3, 20), new THREE.MeshBasicMaterial({ map: eggTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.copy(p).addScaledVector(n, 0.02); m.lookAt(p.clone().add(n)); m.rotateZ(rand(0, 6.28)); scene.add(m); eggStains.push({ m, t: 0 });
  if (eggStains.length > 24) { const o = eggStains.shift(); scene.remove(o.m); o.m.geometry.dispose(); o.m.material.dispose(); }
}
function eggHit(t, g, head) {
  const ok = t.alive && gameTime >= t.invulnUntil && !friends(t, g.owner);
  damage(t, eggDmg(WEAPONS[EGG_W], g.k, head), g.owner, EGG_W, head);
  if (ok && t.alive) { t.eggUntil = gameTime + EGG.splat; if (t.isPlayer) eggSplat(EGG.splat); }
}
function updateEggs(dt) {
  for (let i = eggs.length - 1; i >= 0; i--) {
    const g = eggs[i];
    if (g.gone) { g.t += dt; if (g.t > EGG.life + 1) { scene.remove(g.mesh); eggs.splice(i, 1); } continue; } // online: esperando o 'ex'
    if (!g.net && deflectLocal(g, dt, g.vel ? g.vel.length() : 12)) continue;
    const st = stepEgg(PHYS, g, dt);
    g.mesh.position.copy(g.pos); g.mesh.rotation.x += g.spin * dt; g.mesh.rotation.z += g.spin * 0.4 * dt; // ovo girando no ar
    if (g.net) { if (g.dead) { g.gone = true; g.mesh.visible = false; } continue; } // online: a quebra vem do servidor ('ex')
    const a = new V3(st.from.x, st.from.y, st.from.z), seg = g.pos.clone().sub(a), L = seg.length(); let hit = null;
    if (L > 1e-5) { seg.divideScalar(L);
      for (const t of entities) { if (t === g.owner || !t.alive || friends(t, g.owner)) continue; for (const [y, r, head] of [[1.5, 0.5, true], [0.8, 0.58, false]]) { const tt = raySphere(a, seg, center(t, y), r + EGG.pad); if (tt > 0 && tt <= L && (!hit || tt < hit.tt)) hit = { t, tt, head, at: a.clone().addScaledVector(seg, tt) }; } } }
    if (hit) { scene.remove(g.mesh); eggs.splice(i, 1); eggBreakFx(hit.at, true); eggHit(hit.t, g, hit.head); continue; }
    if (g.dead) { scene.remove(g.mesh); eggs.splice(i, 1); eggBreakFx(g.pos.clone(), false); if (st.wall) eggStain(new V3(st.wall.pos.x, st.wall.pos.y, st.wall.pos.z), new V3(st.wall.n.x, st.wall.n.y, st.wall.n.z)); }
  }
  for (let i = eggStains.length - 1; i >= 0; i--) { const s = eggStains[i]; s.t += dt; s.m.material.opacity = 1 - sstep(EGG.stain - 1.5, EGG.stain, s.t); if (s.t >= EGG.stain) { scene.remove(s.m); s.m.geometry.dispose(); s.m.material.dispose(); eggStains.splice(i, 1); } }
}
// tela suja: 3 a 5 manchas (uma perto da mira) com escorridos que crescem; some no último meio segundo
function eggSplat(dur) {
  eggSplatUntil = gameTime + dur; eggSplatBlobs = [];
  const n = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const c = i === 0, x = c ? 240 + rand(-60, 60) : rand(40, 440), y = c ? 135 + rand(-35, 25) : rand(30, 220);
    eggSplatBlobs.push({ x, y, r: rand(28, 48), drips: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, () => ({ dx: rand(-0.7, 0.7), w: rand(6, 12), v: rand(0.6, 1.2) })), yolk: Math.random() < 0.8 });
  }
  sfx.splat(1);
}
function drawEggSplat() {
  const cv = $('eggcanvas'); if (!cv) return; const x = cv.getContext('2d'), dur = EGG.splat, t = clamp(dur - (eggSplatUntil - gameTime), 0, dur);
  x.clearRect(0, 0, cv.width, cv.height);
  for (const b of eggSplatBlobs) {
    x.fillStyle = 'rgba(255,250,235,.6)';
    for (const [ox, oy, k] of [[0, 0, 1], [-0.5, -0.2, 0.6], [0.55, 0.15, 0.55], [0.1, 0.5, 0.5], [-0.3, 0.45, 0.45]]) { x.beginPath(); x.arc(b.x + ox * b.r, b.y + oy * b.r, b.r * k, 0, Math.PI * 2); x.fill(); }
    b.drips.forEach((d, j) => { const len = (40 + 160 * t / dur) * d.v, dx = b.x + d.dx * b.r, w = d.w;
      x.fillStyle = 'rgba(255,250,235,.55)'; x.beginPath(); x.roundRect(dx - w / 2, b.y, w, len, w / 2); x.fill();
      if (j === 0 && b.yolk) { x.fillStyle = 'rgba(255,200,40,.7)'; x.beginPath(); x.arc(dx, b.y + len - w / 2, w * 0.6, 0, Math.PI * 2); x.fill(); } });
    if (b.yolk) { const gr = x.createRadialGradient(b.x - 4, b.y - 4, 2, b.x, b.y, b.r * 0.45); gr.addColorStop(0, '#ffd23f'); gr.addColorStop(1, '#f0a019'); x.fillStyle = gr; x.beginPath(); x.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2); x.fill();
      x.fillStyle = 'rgba(255,255,255,.85)'; x.beginPath(); x.arc(b.x - b.r * 0.15, b.y - b.r * 0.15, b.r * 0.1, 0, Math.PI * 2); x.fill(); }
  }
}
// ---------------- Lança-Milho (shared/corn.js: grão cai de leve e estoura em 3 pipocas em sequência) ----------------
const kernelGeo = new THREE.SphereGeometry(0.05, 8, 6), popGeo = new THREE.IcosahedronGeometry(0.05, 0);
const corns = [], cornPops = []; let cornId = 1;
function spawnCornFx(g) { const m = new THREE.Mesh(kernelGeo, toon(0xffd23f)); m.scale.set(1, 1.25, 0.85); outline(m, 0.006); m.position.copy(g.pos); scene.add(m); g.mesh = m; corns.push(g); }
function launchCorn(e, origin, dir) {
  if (online && e.isPlayer) { netEv(['cn', v3a(origin), v3a(dir), +(performance.now() / 1000).toFixed(3)]); return; } // o servidor cria os grãos ('cl')
  const id0 = cornId; cornId += CORN.grains;
  cornDirs(dir, id0).forEach((v, k) => spawnCornFx({ id: id0 + k, owner: e, pos: new V3(origin.x + v.x * 0.5, origin.y + v.y * 0.5 - 0.1, origin.z + v.z * 0.5), vel: new V3(v.x, v.y, v.z).multiplyScalar(CORN.speed), t: 0 }));
}
function popFx(c) { // estouro de pipoca: poc, pipocas voando, clarãozinho amarelo
  window.__cornPops = (window.__cornPops || 0) + 1; if (player) sfx.pipoca(distVol(c));
  if (player) shake = Math.max(shake, clamp(1 - c.distanceTo(player.pos) / 6, 0, 1) * 0.15);
  for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(popGeo, new THREE.MeshBasicMaterial({ color: i % 3 ? 0xfff6dc : 0xffe7a0, transparent: true })); m.scale.set(rand(0.8, 1.3), rand(0.7, 1.1), rand(0.8, 1.3)); m.position.copy(c); scene.add(m); particles.push({ mesh: m, vel: new V3(rand(-1, 1), rand(0.6, 1.4), rand(-1, 1)).normalize().multiplyScalar(rand(2, 5)), life: rand(1.2, 1.8), t: 0, kind: 'corn', spin: new V3(rand(-10, 10), 0, rand(-10, 10)) }); }
  const fl = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.9 })); fl.position.copy(c); scene.add(fl); particles.push({ mesh: fl, vel: new V3(), life: 0.12, t: 0, kind: 'flash', radius: 0.6 });
}
function updateCorn(dt) {
  for (let i = corns.length - 1; i >= 0; i--) {
    const g = corns[i];
    if (!g.net && g.pos && g.pos.clone && deflectLocal(g, dt, CORN.speed)) { g.mesh.position.copy(g.pos); g.mesh.rotation.x += dt * 14; g.mesh.rotation.z += dt * 9; continue; }
    const h = stepCorn(PHYS, g, dt, g.net ? [] : entities, (t) => (t === g.owner && g.t < 0.15) || friends(t, g.owner));
    g.mesh.position.copy(g.pos); g.mesh.rotation.x += dt * 14; g.mesh.rotation.z += dt * 9;
    const sw = g.t > CORN.fuse - 0.1 ? 1 + (g.t - CORN.fuse + 0.1) * 5 : 1; g.mesh.scale.set(sw, 1.25 * sw, 0.85 * sw); // incha antes de estourar
    if (g.net) { if (h || g.t > 1.5) { scene.remove(g.mesh); corns.splice(i, 1); } continue; } // online: o estouro vem do servidor ('bm' tipo 'c')
    if (!h) continue; scene.remove(g.mesh); corns.splice(i, 1);
    popChain(PHYS, h.pos, h.n, g.id).forEach((p, k) => cornPops.push({ at: gameTime + k * CORN.gap, pos: new V3(p.x, p.y, p.z), owner: g.owner, direct: k ? null : h.e }));
  }
  for (let i = cornPops.length - 1; i >= 0; i--) { const q = cornPops[i]; if (gameTime < q.at) continue; cornPops.splice(i, 1); blast(q.pos, q.owner, popOpts(CORN_W), q.direct); }
}
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
    if (deflectLocal(r, dt, R.speed)) { r.pos.addScaledVector(r.dir, step); r.mesh.position.copy(r.pos); r.mesh.children[0].rotation.z += dt * 10; continue; }
    const wh = wallDistance(r.pos, r.dir, step + 0.1); if (wh) hitT = wh.distance;
    for (const e of entities) {
      if (!e.alive || (e === r.owner && gameTime - r.born < 0.3)) continue;
      if (friends(e, r.owner)) continue;
      const t = rayCapsule(r.pos, r.dir, step + 0.1, e.pos, ROCKET_PAD, e.crouch); if (t !== null && (hitT === null || t < hitT)) { hitT = t; hitE = e; } // casco do Docão
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
// bala: traceShot (shared/penetration.js) nas caixas de PHYS, a mesma regra do servidor: atravessa parede leve e corpos (collateral)
function fire(shooter, origin, dir, wIdx, spread, muzzle, mul = 1) {
  const w = WEAPONS[wIdx]; const res = { hit: false, kill: false, kills: 0, wall: false };
  if (shooter && shooter.model) setExpression(shooter.model, 'angry', 0.5); // cara de brava ao atirar
  const scale = wIdx === BOW ? clamp(Number(mul) || 1, 0.35, 1.3) : 1;
  const hitsBy = new Map(), bags = new Map(), dirs = [], heliDmg = new Map(), skies = shooter === player ? [] : skyHelis();
  const targets = entities.filter((e) => e !== shooter && e.alive && !friends(e, shooter)).map((e) => ({ e, p: e.pos, crouch: e.crouch || 0, size: e.zt ? e.size : 1 })); // zumbi grande: hitbox escalada; // time: bala atravessa o companheiro; agachado achata o corpo
  const helis = skies.map((sh) => ({ h: sh, c: sh.pos, r: heliR(sh) }));
  const shotW = invMode() ? { ...w, pierce: 8, pierceMul: 0.82 } : w; // Invasão: a bala segue na fila de zumbis (8 corpos, ×0,82 de dano). Fora dela, o pierce da arma.
  for (let p = 0; p < w.pellets; p++) {
    const d = dir.clone(); d.x += (Math.random() - 0.5) * 2 * spread; d.y += (Math.random() - 0.5) * 2 * spread; d.z += (Math.random() - 0.5) * 2 * spread; d.normalize(); dirs.push(d);
    const tr = traceShot(PHYS, origin, d, shotW, targets, helis, scale), end = origin.clone().addScaledVector(d, tr.end), vis = p < 4 || shooter.isPlayer;
    if (vis) tracer(muzzle, end, !!w.beam);
    for (const h of tr.holes) bulletHole(h, vis);
    if (tr.holes.length && vis) sfx.wallPen(shooter.isPlayer ? 0.8 : distVol(end) * 0.6);
    for (const h of tr.hits) { const a = hitsBy.get(h.e) || { dmg: 0, head: false, fx: 0 }; a.dmg += h.dmg; a.head = a.head || h.head; a.fx |= (h.walls ? 1 : 0) | (h.bodies ? 2 : 0); hitsBy.set(h.e, a); const bag = bags.get(h.e) || []; bag.push(h.dmg); bags.set(h.e, bag); puff(origin.clone().addScaledVector(d, h.t), 0xff9fb0); }
    if (tr.heli) { heliDmg.set(tr.heli.h, (heliDmg.get(tr.heli.h) || 0) + tr.heli.dmg); puff(end, 0xffe08a); } else if (tr.stop === 'wall') puff(end);
    if (shooter.isPlayer) window.__lastTrace = { end: +tr.end.toFixed(3), stop: tr.stop, holes: tr.holes.length, hits: tr.hits.map((h) => ({ name: h.e.name, dmg: +h.dmg.toFixed(2), head: h.head, walls: h.walls, bodies: h.bodies })) };
  }
  for (const [sh, dmg] of heliDmg) { hurtHeli(dmg, sh); res.hit = true; if (shooter && shooter.isPlayer) sfx.hit(); }
  if (online && shooter.isPlayer) { const ev = ['f', v3a(origin), dirs.map(v3a), wIdx, +(performance.now() / 1000).toFixed(3), +renderServerT().toFixed(3)]; if (wIdx === BOW) ev.push(+scale.toFixed(3)); netEv(ev); return res; } // dano: servidor. O arco manda a força da puxada.
  if (!online) {
    for (const [e, list] of bags) {
      const open = isSaber(e.weapon) ? guardOpen(ensureSaber(e), gameTime) : null;
      const front = open && inFront(e.yaw, saberSpace(e), e.pos, origin, SABER_KIT.block.half, 120);
      if (!front) continue;
      const pay = payGuard(ensureSaber(e), gameTime, { perfect: open.perfect, dmgEach: list });
      const kept = list.reduce((s, dmg, i) => s + (pay.blocked[i] ? 0 : dmg), 0);
      const agg = hitsBy.get(e);
      if (agg) { agg.dmg = kept; if (kept <= 0) hitsBy.delete(e); }
      if (pay.blocked.some(Boolean)) { saberSfx.parry(open.perfect); saberSparks(center(e, 1.1), open.perfect ? 16 : 8); }
      if (pay.reflect > 0 && shooter && shooter !== e) damage(shooter, pay.reflect, e, e.weapon, false);
    }
  }
  const hurt = new Set(); for (const [e, h] of hitsBy) { if (h.dmg <= 0) continue; res.hit = true; res.wall = res.wall || !!(h.fx & 1); const hp0 = e.hp; if (damage(e, h.dmg, shooter, wIdx, h.head, false, h.fx)) { res.kill = true; res.kills++; } if (e.hp < hp0) hurt.add(e); }
  if (w.knock) for (const [e, h] of hitsBy) { if (!e.alive || e.dummy || !hurt.has(e)) continue; const v = shotKnock(w, origin, e.pos, h.dmg, e.zt); if (!v) continue; e.vel.x += v.x; e.vel.z += v.z; e.vel.y = Math.max(e.vel.y, v.y); e.onGround = false; if (e.isPlayer) lastKnock = gameTime; } // Calibre 12: empurrão (mesma conta do servidor)
  if (shooter.isPlayer && res.kills >= 2) feedbackMedal('Collateral', `${res.kills} de uma bala só`);
  return res;
}

function damage(t, amount, attacker, wIdx, head, back = false, fx = 0, origin = attacker && attacker !== t && !attacker.fog ? attacker.pos : null) { // origin: de onde veio o golpe (explosão: o centro dela)
  if (state === 'over') return false; // resultado fechado
  if (!t.alive || gameTime < t.invulnUntil || friends(t, attacker) || bombFrozen(bombS)) return false; // sem fogo amigo; Bomba: sem dano na preparação
  if (invMode() && !t.zt && attacker && !attacker.zt && !attacker.fog) return false; // Invasão: jogador nunca machuca jogador (nem a si mesmo)
  t.hp -= amount; t.lastAttacker = attacker; t.flashUntil = gameTime + 0.12; noteHurt(t, attacker, gameTime); // regen só com dano de outro
  if (t.isPlayer) { hurtFlash(); noteHit(origin); sfx.oink(0.8, 1.15); }
  else { if (attacker && attacker !== t && !t.target) { t.target = attacker; t.aim = t.reaction * 0.5; } if (Math.random() < 0.3) sfx.oink(distVol(t.pos) * 0.6, 1.3); }
  if (attacker && attacker.isPlayer && attacker !== t) { if (t.hp > 0) feedbackHit({ head, wall: !!(fx & 1) }); sfx.hit(); if (training()) dmgPopup(t, amount, head); }
  if (t.hp <= 0) { kill(t, attacker, wIdx, head, back, false, null, fx); return true; }
  return false;
}

function kill(t, a, wIdx, head, back = false, noReward = false, label = null, fx = 0) { // fx: 1 pela parede, 2 collateral
  if (state === 'over') return; // resultado fechado
  if (t.zt) { killZombieLocal(t, a, wIdx, head, back); return; } // Invasão: zumbi
  t.alive = false; t.hp = 0; t.deaths++; t.deathAt = gameTime; t.respawnAt = gameTime + (t.dummy ? TRAIN.respawn : exploreMode() && t.isPlayer ? 1 : RESPAWN_TIME); t.killW = wIdx; t.killBack = !!back;
  if (a && a !== t) a.kills++;
  addKillFeed(a, t, wIdx, head, back, label, fx);
  sfx.die(t.isPlayer ? 1 : distVol(t.pos));
  if (t.isPlayer && invMode() && inv && !inv.onPlayerDeath(t)) t.respawnAt = Infinity; // Invasão: sem vidas = assiste até alguém usar a Ressurreição
  if (a && a.isPlayer && a !== t) { sfx.kill(); if (!noReward) { notePlayerKill(t, head, fx); noteWeaponKill(a, wIdx); } }
  if (t.isPlayer) { if (a && a !== t) revengeName = a.name; showStamp(wIdx); onPlayerDeath(); }
  if (a && a.kills >= KILL_LIMIT && mode === 'dm') endGame();
}

function startReload(e) {
  if (emote.on && e.isPlayer) return;
  const w = WEAPONS[e.weapon];
  if (e.reloadEnd > gameTime || e.mag[e.weapon] >= w.mag || e.reserve[e.weapon] <= 0) return;
  e.reloadStartT = gameTime;
  if (online && e.isPlayer) netEv(['rl', e.weapon]);
  if (w.shellReload) e.reloadEnd = gameTime + w.reloadStart + w.reload; // Calibre 12: cartucho por cartucho
  else { e.reloadEnd = gameTime + w.reload; reloadSfx(w, e.isPlayer ? 1 : distVol(e.pos) * 0.5); }
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
function setWeapon(e, idx) { e.weapon = idx; if (e.model) e.model.guns.forEach((g, i) => { g.visible = i === idx; if (g.userData.twin) g.userData.twin.visible = g.visible; }); } // twin: o 2º sabre do Sabre Duplo (na outra mão)
// pinta as lâminas dos dois sabres (e do par do Sabre Duplo)
function colorSabers(guns, hex) { for (const i of [SABER, SABER2]) { const g = guns[i]; if (!g) continue; setSaberColor(g, hex); if (g.userData.twin) setSaberColor(g.userData.twin, hex); } }
function switchWeapon(e, idx) {
  if (idx === e.weapon || !e.alive) return;
  if (e.weapon !== KNIFE && !isSaber(e.weapon)) e.prevWeapon = e.weapon;
  const side = idx === PISTOL || idx === NAIL || idx === CROSS || idx === BOW || idx === EGG_W;
  if (e.mgWant) { e.mgWant = false; if (online && e.isPlayer) netEv(['mgs', 0, +(performance.now() / 1000).toFixed(3)]); } e.mgSpin = 0; e.mgFiring = false; // trocou de arma: os canos param na hora (servidor faz igual)
  setWeapon(e, idx); e.reloadEnd = 0; e.burstLeft = 0; e.switchDur = idx === KNIFE ? MELEE.draw : isSaber(idx) ? 0.22 : WEAPONS[idx].heavy ? 0.7 : side ? 0.28 : 0.4; e.switchEnd = gameTime + e.switchDur; // minigun pesada: saque de 0,7 s
  if (e.isPlayer) { fp.ins = null; showInspectHud(null); fp.actionT = 0; fp.stringT = 0; e.bowDraw = 0; e.eggDraw = 0; if (idx === KNIFE) { fp.knifeDrawT = MELEE.draw + 0.1; sfx.knifeDraw(0.8); rightStale = rightDown; } } // mirando (botão direito segurado) e trocou pra faca: só estoca num clique novo
}
// troca rápida (V): corpo a corpo (faca ou sabre) ↔ última arma
function quickKnife(e) {
  const mel = e.slots[2] ?? KNIFE;
  switchWeapon(e, e.weapon === mel ? (e.slots.includes(e.prevWeapon) && e.prevWeapon !== mel && !isSaber(e.prevWeapon) ? e.prevWeapon : e.slots[0]) : mel);
}
// ---------------- Faca de churrasqueiro (corpo a corpo) — regra em shared/melee.js (igual no servidor) ----------------
const modelYaw = (e) => (e.isPlayer ? e.yaw + Math.PI : e.yaw); // frente do boneco = (sin, cos)
function meleeTargets(attacker) {
  return entities.filter((t) => t !== attacker && t.alive && !friends(t, attacker)).map((t) => ({ e: t, p: t.pos, yaw: modelYaw(t) }));
}
const losPlain = (a, b) => losClear(new V3(a.x, a.y, a.z), new V3(b.x, b.y, b.z));
function knifeAttack(e, kind, eye, dir) { // offline (jogador e bots); online o jogador só manda o evento
  const K = MELEE[kind]; e.nextFire = gameTime + K.rate; e.invulnUntil = Math.min(e.invulnUntil, gameTime);
  const st = (window.__knifeStats ||= { player: 0, bot: 0, hits: 0 }); st[e.isPlayer ? 'player' : 'bot']++;
  sfx.knife(e.isPlayer ? 1 : distVol(e.pos) * 0.8, kind);
  if (e.model) { e.swingT = 0; e.swingKind = kind; }
  if (online && e.isPlayer) { netEv(['m', MELEE_KINDS.indexOf(kind), v3a(eye), v3a(dir), +(performance.now() / 1000).toFixed(3), +renderServerT().toFixed(3)]); window.__lastMelee = { kind, net: true }; return null; }
  const h = meleeHit(eye, dir, kind, meleeTargets(e), losPlain);
  window.__lastMelee = e.isPlayer ? { kind, hit: h ? h.e.name : null, back: !!(h && h.back), dmg: h ? h.dmg : 0, dist: h ? +h.dist.toFixed(2) : null } : window.__lastMelee;
  if (h) { st.hits++; puff(new V3(h.point.x, h.point.y, h.point.z), 0xff9fb0); sfx.knifeHit(e.isPlayer || h.e.isPlayer ? 1 : distVol(e.pos) * 0.7); damage(h.e, h.dmg, e, KNIFE, false, h.back); }
  return h;
}

// ---------------- HUD ----------------
let hurtLevel = 0, msgTimer = 0;
function notePlayerKill(victim, head, fx = 0) {
  if (!player || !victim || victim === player) return;
  const dist = player.pos.distanceTo(victim.pos);
  const revenge = !!(revengeName && victim.name === revengeName);
  if (revenge) revengeName = null;
  const streak = feedbackKill({ head: !!head, dist, revenge, wall: !!(fx & 1) });
  if (streak >= 2) sfx.streak(streak);
  onRewardKill();
}
function hurtFlash() { hurtLevel = 1; }
// Indicador de direção do dano (estilo Fortnite): arco vermelho na borda da tela apontando de onde veio o golpe, relativo à câmera.
// Sem origem conhecida (névoa, queda, dano próprio) vale só o flash vermelho nas bordas (hurtFlash). Não aparece morto.
// origem = posição de onde veio o dano (explosão/helicóptero quando o servidor manda; senão a do atacante); golpes de direção parecida (≤30°) renovam o mesmo arco (ideia do @felipe-cheers, PR #15)
const hitMarks = []; let hitDirsEl = null;
function noteHit(origin) {
  if (!player || !player.alive || player.hp <= 0 || !origin) return;
  const r = addHit(hitMarks, origin, player.pos, gameTime); if (r && r.dropped && r.dropped.el) r.dropped.el.remove();
}
function clearHitMarks() { for (const m of hitMarks) if (m.el) m.el.remove(); hitMarks.length = 0; }
const hitDirDir = new V3();
function updateHitDirs() {
  if (!hitMarks.length) return;
  if (!player || !player.alive || state !== 'playing') { clearHitMarks(); return; }
  if (!hitDirsEl) { hitDirsEl = document.createElement('div'); hitDirsEl.id = 'hitDirs'; $('hud').appendChild(hitDirsEl); }
  camera.getWorldDirection(hitDirDir); const fx = hitDirDir.x, fz = hitDirDir.z, fl = Math.hypot(fx, fz) || 1, rx = -fz / fl, rz = fx / fl; // direção da câmera e "direita" no chão
  for (let i = hitMarks.length - 1; i >= 0; i--) {
    const m = hitMarks[i], age = gameTime - m.t;
    if (age >= HIT_DIR_LIFE) { if (m.el) m.el.remove(); hitMarks.splice(i, 1); continue; }
    if (!m.el) { m.el = document.createElement('div'); m.el.className = 'hitmark'; m.el.innerHTML = '<i></i>'; hitDirsEl.appendChild(m.el); }
    const dx = m.x - player.pos.x, dz = m.z - player.pos.z;
    const ang = Math.atan2(dx * rx + dz * rz, (dx * fx + dz * fz) / fl); // 0 = na frente (topo da tela), + = pra direita
    m.el.style.transform = `rotate(${ang}rad)`; m.el.style.opacity = age < 0.35 ? 1 : Math.max(0, 1 - (age - 0.35) / (HIT_DIR_LIFE - 0.35));
  }
}
function flashMsg(t) { $('centermsg').textContent = t; msgTimer = 1.5; }

// Abates sem morrer. O ciclo mostra 3, 5, 7, 10 (Chopper) e 13 (Grelha) e volta depois do 15. O 15 é o nuke secreto, fora da barra.
const STREAK_LAP = 15;
const streakCycle = (kills) => (kills <= 0 ? 0 : ((kills - 1) % STREAK_LAP) + 1);
let rewardKills = 0, nukeAt = 0, uavLive = false, pickingStrike = false, nukeReady = false;
let nukeRideFrom = -1, nukeRider = null, nukeRiderDone = false, nukeWin = false; // nukeRideFrom: instante em que a contagem local começou
let streakReady = [];
// UAV e Gavião: puxa o rádio e chama por 1 s antes de o streak entrar. Morrer no meio devolve o streak pro banco.
const RADIO_CALL = 1;
let radioCall = null;
let tabletWant = 0, radioWant = 0, laptopWant = 0, tabletK = 0, radioK = 0, laptopK = 0;
let heli = null;
const HELI = { hp: 280, life: 30, height: 17, hit: 3.1, dmg: 16, rate: 0.22, points: 25, miss: 0.3 }; // mesmos números de shared/killstreaks.js (servidor)
function syncRewardHud() {
  setStreakCount(rewardKills);
  setStreakCycle(streakCycle(rewardKills));
}
function resetRewards(keepBoom = false) {
  const pending = keepBoom && nukeAt > gameTime ? nukeAt : 0;
  rewardKills = 0; uavLive = false; nukeReady = false;
  endGunner(true); if (!keepBoom && gunHeli) { scene.remove(gunHeli.mesh); gunHeli = null; }
  endAc130(true); if (!keepBoom && ac130Ship) { scene.remove(ac130Ship.mesh); ac130Ship = null; }
  if (radioCall && keepBoom) streakReady.unshift(radioCall.id);
  radioCall = null;
  if (!keepBoom) streakReady = []; // morreu: a sequência zera, mas o que já foi ganho continua guardado pra usar depois de renascer
  tabletWant = 0; laptopWant = 0;
  clearPredator();
  if (!pending) { nukeAt = 0; radioWant = 0; hideNuke(); nukeRideFrom = -1; nukeRiderDone = false; }
  if (!nukeAt && !netNukeAt) dropNukeRider();
  hideUav(); syncRewardHud(); refreshStreakPrompt();
  if (pickingStrike) { pickingStrike = false; closeStrikeMap(); }
}
function grantUav() {
  if (!currentMap) return;
  showUav({ size: currentMap.size, boxes: currentMap.boxes, seconds: 10 });
  uavLive = true; flashMsg('Olho da granja');
}
// Chuva de torresmo: 3 foguetes descem do céu. O anel no chão é a área do estrago.
const STRIKE = { radius: 9, maxDmg: 320, selfMul: 0.22, knock: 18, lift: 12, speed: 42 };
const strikes = [];
function clearStrikes() {
  for (const s of strikes) { scene.remove(s.mesh); scene.remove(s.ring); }
  strikes.length = 0;
}
function spawnSkyMissile(spot, owner) {
  const y = groundAt(spot.x, spot.z, 8);
  const target = new V3(spot.x, y + 0.25, spot.z);
  const start = target.clone().add(new V3(14 + rand(-1.5, 1.5), 48, 5 + rand(-1.5, 1.5)));
  const dir = target.clone().sub(start).normalize();
  const mesh = makeRocket(3.6);
  mesh.children[0].rotation.y = Math.PI; // focinho no -Z, que é a direção do lookAt
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
  flame.position.z = 0.46; // rastro de fogo na cauda
  mesh.add(flame);
  const glow = new THREE.PointLight(0xffb15a, 14, 26);
  glow.position.z = 0.4;
  mesh.add(glow);
  scene.add(mesh);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xff4d3a, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.RingGeometry(STRIKE.radius * 0.88, STRIKE.radius, 64), ringMat);
  const fill = new THREE.Mesh(new THREE.CircleGeometry(STRIKE.radius * 0.88, 48), new THREE.MeshBasicMaterial({ color: 0xff4d3a, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }));
  rim.rotation.x = -Math.PI / 2; fill.rotation.x = -Math.PI / 2;
  ring.add(rim); ring.add(fill);
  ring.position.set(target.x, y + 0.08, target.z);
  scene.add(ring);
  const s = { owner, pos: start, dir, target, mesh, ring, flame, born: gameTime, nextSmoke: gameTime, speed: STRIKE.speed };
  aimStrike(s);
  if (player) sfx.incoming(clamp(1 - target.distanceTo(player.pos) / 70, 0.25, 1));
  strikes.push(s);
  return s;
}
function aimStrike(s) {
  s.mesh.position.copy(s.pos);
  s.mesh.lookAt(s.pos.clone().add(s.dir));
}
function strikeSmoke(s) {
  if (gameTime < s.nextSmoke) return;
  s.nextSmoke = gameTime + 0.018;
  const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: Math.random() < 0.35 ? 0x6a727a : 0xe7e2da, transparent: true, depthWrite: false }));
  m.position.copy(s.pos);
  scene.add(m);
  particles.push({ mesh: m, vel: new V3(rand(-0.6, 0.6), rand(0.6, 1.6), rand(-0.6, 0.6)), life: rand(1.1, 1.7), t: 0, kind: 'smoke', s0: rand(7, 11) });
}
function updateStrikes(dt) {
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i];
    const step = s.speed * dt;
    const left = s.target.distanceTo(s.pos);
    const pulse = 0.97 + Math.sin(gameTime * 10) * 0.03;
    s.ring.scale.set(pulse, pulse, pulse);
    s.flame.scale.setScalar(0.8 + Math.random() * 0.5);
    if (left <= step + 0.4 || gameTime - s.born > 3.5) {
      blast(s.target.clone(), s.owner, { radius: STRIKE.radius, maxDmg: STRIKE.maxDmg, selfMul: STRIKE.selfMul, knock: STRIKE.knock, lift: STRIKE.lift, wIdx: W_NADE });
      scene.remove(s.mesh); scene.remove(s.ring);
      strikes.splice(i, 1);
      continue;
    }
    s.pos.addScaledVector(s.dir, step);
    aimStrike(s);
    if (s.mesh.children[0]) s.mesh.children[0].rotation.z += dt * 16;
    strikeSmoke(s);
  }
}
function grantMissiles() {
  if (pickingStrike || !currentMap) return;
  pickingStrike = true;
  tabletWant = 1;
  if (document.pointerLockElement) document.exitPointerLock();
  const pending = openStrikeMap({ size: currentMap.size, boxes: currentMap.boxes });
  flashMsg('Escolhe 3 lugares no tablet');
  if (!pending || !pending.then) { pickingStrike = false; tabletWant = 0; return; }
  pending.then((spots) => {
    pickingStrike = false; tabletWant = 0;
    spots.forEach((spot, i) => {
      setTimeout(() => {
        if (!player || (state !== 'playing' && state !== 'paused')) return;
        spawnSkyMissile(spot, player);
      }, 280 + i * 420);
    });
    if (state === 'playing' && player && player.alive) lockPointer();
  }).catch(() => { pickingStrike = false; tabletWant = 0; });
}
function makeHeliMesh(gunnerLook = false) {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z, parent = g) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z);
    parent.add(m);
    outline(m, 0.015);
    return m;
  };
  add(new THREE.BoxGeometry(1.15, 0.72, 2.5), gunnerLook ? 0x3a3f4a : 0xe63946, 0, 0, 0);
  if (gunnerLook) { // Chopper: faixa vermelha, asinhas e a minigun embaixo do nariz
    add(new THREE.BoxGeometry(1.18, 0.12, 2.52), 0xe63946, 0, 0.1, 0);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.9, 0.06, 0.4), 0x2a2d35, s * 0.95, -0.12, -0.1);
    add(new THREE.BoxGeometry(0.3, 0.26, 0.4), 0x22252c, 0, -0.48, -1.1);
    for (const [x, y] of [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.05], [0.05, 0.05]]) add(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), 0x111318, x, -0.48 + y, -1.55).rotation.x = Math.PI / 2;
  }
  add(new THREE.BoxGeometry(0.72, 0.42, 0.95), 0x9ad7ef, 0, 0.18, 0.28);
  add(new THREE.BoxGeometry(0.28, 0.26, 1.9), 0xc1121f, 0, 0.16, 2.05);
  add(new THREE.BoxGeometry(0.08, 0.72, 0.38), 0xf5e6d0, 0, 0.5, 2.85);
  for (const [x, z] of [[-0.42, 0.35], [0.42, 0.35], [-0.42, -0.55], [0.42, -0.55]]) add(new THREE.BoxGeometry(0.08, 0.38, 0.08), 0x2a241c, x, -0.52, z);
  add(new THREE.BoxGeometry(1.15, 0.06, 0.08), 0x2a241c, 0, -0.7, 0.35);
  add(new THREE.BoxGeometry(1.15, 0.06, 0.08), 0x2a241c, 0, -0.7, -0.55);
  add(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 8), 0x22252c, 0, 0.5, 0);
  const rotor = new THREE.Group();
  rotor.position.y = 0.68;
  const bladeGeo = new THREE.BoxGeometry(5.2, 0.05, 0.2);
  const bladeMat = toon(0x1c1c1c);
  const b1 = new THREE.Mesh(bladeGeo, bladeMat);
  const b2 = new THREE.Mesh(bladeGeo, bladeMat);
  b2.rotation.y = Math.PI / 2;
  rotor.add(b1, b2);
  g.add(rotor);
  const tailR = new THREE.Group();
  tailR.position.set(0.16, 0.5, 2.9);
  tailR.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.1), bladeMat));
  g.add(tailR);
  add(new THREE.BoxGeometry(0.16, 0.16, 0.7), 0x22252c, 0, -0.32, -1.25);
  g.userData.rotor = rotor;
  g.userData.tailR = tailR;
  g.scale.setScalar(1.45);
  return g;
}
function ensureHeliHud() {
  let node = document.getElementById('heliHud');
  if (!node) {
    const style = document.createElement('style');
    style.textContent = '#heliHud{position:fixed;top:74px;left:50%;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(14,10,8,.92);border:2px solid #e63946;border-radius:8px;pointer-events:none;user-select:none}#heliHud[hidden]{display:none!important}#heliHud b{font-family:"Trebuchet MS",Arial,sans-serif;font-size:13px;color:#ffd27a}#heliHud i{display:block;width:120px;height:8px;border-radius:2px;background:#3a1818;box-shadow:inset 0 0 0 1px #000}#heliHud i span{display:block;height:100%;width:100%;background:linear-gradient(#ffd27a,#e63946)}#heliHud small{font-family:Impact,Arial,sans-serif;font-size:16px;color:#fff}';
    document.head.appendChild(style);
    node = document.createElement('div');
    node.id = 'heliHud';
    node.hidden = true;
    node.innerHTML = '<b>Gavião da granja</b><i><span></span></i><small>30s</small>';
    document.body.appendChild(node);
  }
  return node;
}
function removeHeli() {
  if (!heli) return;
  scene.remove(heli.mesh);
  heli = null;
  const hud = document.getElementById('heliHud');
  if (hud) hud.hidden = true;
}
function clearHeli() { removeHeli(); clearNetHelis(); netNukeAt = 0; if (!nukeAt) dropNukeRider(); }
// ---------- killstreaks online: o servidor decide (eventos 'hl'/'hh'/'hx'/'hs', 'nk'/'nb', 'bm' tipo 'p'); aqui é só o visual ----------
const netHelis = new Map(); let netNukeAt = 0;
function clearNetHelis() { for (const h of netHelis.values()) scene.remove(h.mesh); netHelis.clear(); }
function netHeliSpawn([, id, oid, ang, orbit, born, until, hp, gun]) {
  if (netHelis.has(id)) return; const mesh = makeHeliMesh(!!gun); scene.add(mesh);
  const owner = entOf(oid), h = { id, owner, mesh, ang, orbit, born, until, hp, max: gun ? GUNNER.hp : HELI.hp, alive: true, crash: false, dieT: 0, pos: new V3(), vel: new V3() };
  if (gun) Object.assign(h, { gunner: true, height: GUNNER.height, spin: GUNNER.spin });
  const p = heliPos(h, gameTime); h.pos.set(p.x, p.y, p.z); mesh.position.copy(h.pos); netHelis.set(id, h);
  if (gun) { if (owner === player) startGunner(h, true); else if (owner) flashMsg(`${owner.name} chamou o Chopper`); return; }
  if (owner === player) { ensureHeliHud().hidden = false; flashMsg('Gavião da granja'); } else if (owner) flashMsg(`${owner.name} chamou o Gavião`);
}
function netHeliDown(id, crash) {
  const h = netHelis.get(id); if (!h || !h.alive) return;
  h.alive = false; h.crash = !!crash; h.dieT = crash ? 0.9 : 1.25; if (crash && !h.gunner) flashMsg('Derrubaram o gavião');
}
function updateNetHelis(dt) {
  for (const h of [...netHelis.values()]) {
    const ud = h.mesh.userData; if (ud.rotor) ud.rotor.rotation.y += dt * 26; if (ud.tailR) ud.tailR.rotation.x += dt * 32;
    const mine = h.owner === player, hud = mine && !h.gunner ? ensureHeliHud() : null;
    if (!h.alive) {
      h.pos.y += dt * (h.crash ? -20 : 16); h.mesh.rotation.z += dt * (h.crash ? 2.4 : 0); h.mesh.position.copy(h.pos); h.dieT -= dt;
      if (hud) hud.hidden = true;
      if (h.dieT <= 0 || h.pos.y < 0.5) { if (h.crash) blastFx(h.pos.clone(), 5); scene.remove(h.mesh); netHelis.delete(h.id); }
      continue;
    }
    const prev = h.pos.clone(), p = heliPos(h, gameTime); h.pos.set(p.x, p.y + Math.sin(gameTime * 1.6) * 0.35, p.z);
    h.vel.copy(h.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.001)); h.mesh.position.copy(h.pos);
    if (h.vel.lengthSq() > 0.04) h.mesh.lookAt(h.pos.clone().add(h.vel));
    if (hud) { hud.hidden = false; const bar = hud.querySelector('span'); if (bar) bar.style.width = Math.max(0, h.hp / h.max * 100) + '%'; const tm = hud.querySelector('small'); if (tm) tm.textContent = Math.max(0, Math.ceil(h.until - gameTime)) + 's'; }
  }
}
function hurtHeli(amount, h = heli) {
  if (!h || !h.alive || !(amount > 0)) return;
  h.hp = Math.max(0, h.hp - amount);
  if (h.hp <= 0) { h.alive = false; h.crash = true; h.dieT = 0.9; if (!h.gunner) flashMsg('Derrubaram o gavião'); }
}
function grantHeli() {
  if (!currentMap) return;
  if (heli) removeHeli();
  const mesh = makeHeliMesh();
  scene.add(mesh);
  const half = Math.min(mapBounds[0] || 24, mapBounds[1] || 24);
  heli = {
    mesh, alive: true, crash: false, dieT: 0, hp: HELI.hp, max: HELI.hp,
    until: gameTime + HELI.life, ang: Math.random() * Math.PI * 2,
    orbit: clamp(half * 0.42, 10, 18), cool: 0.4,
    pos: new V3(), vel: new V3(),
  };
  ensureHeliHud().hidden = false;
  flashMsg('Gavião da granja');
}

// ---------- Chopper da granja (Chopper Gunner): a câmera vai pro helicóptero e você atira lá de cima ----------
// Offline o helicóptero é gunHeli; online vem do servidor (netHelis, com gunner = true). gunner = o modo de controle.
let gunHeli = null, gunner = null;
let ac130Ship = null, ac130 = null;
const netGunships = new Map();
const skyHelis = () => [heli, gunHeli].filter((h) => h && h.alive);
const heliR = (h) => (h.gunner ? GUNNER.hit : HELI.hit);
function grantGunner() {
  if (!currentMap || !player) return;
  if (gunHeli) { scene.remove(gunHeli.mesh); gunHeli = null; }
  const mesh = makeHeliMesh(true); scene.add(mesh);
  gunHeli = { mesh, gunner: true, alive: true, crash: false, dieT: 0, hp: GUNNER.hp, max: GUNNER.hp, until: gameTime + GUNNER.life, ang: Math.random() * Math.PI * 2, orbit: heliOrbit(mapBounds) * GUNNER.orbit, height: GUNNER.height, spin: GUNNER.spin, born: gameTime, pos: new V3(), vel: new V3() };
  const p = heliPos(gunHeli, gameTime); gunHeli.pos.set(p.x, p.y, p.z); mesh.position.copy(gunHeli.pos);
  startGunner(gunHeli, false);
}
function startGunner(h, net) {
  gunner = { h, net, mode: 'mini', yaw: Math.atan2(h.pos.x, h.pos.z), pitch: -0.85, heat: 0, hot: false, next: 0, fov: GUNNER.mini.fov, kick: 0, rWas: rightDown };
  mouseDown = false; player.bowDraw = player.eggDraw = 0; resetAds(); showGunnerHud(true); gunnerRig.setArms(player.skinId);
  flashMsg('Chopper da granja'); if (state === 'playing' && !document.pointerLockElement) lockPointer();
}
function endGunner(leave = false) {
  if (!gunner) return;
  const g = gunner; gunner = null; showGunnerHud(false); gunnerRig.root.visible = gunnerRig.door.visible = false;
  camera.fov = BASE_FOV; camera.updateProjectionMatrix();
  if (!leave) return;
  if (g.net) netEv(['ks', 'gx']); else if (g.h.alive) { g.h.alive = false; g.h.crash = false; g.h.dieT = 1.25; }
}
function setGunnerMode(mode) {
  if (!gunner || gunner.mode === mode) return;
  gunner.mode = mode; gunner.next = Math.max(gunner.next, gameTime + 0.18); sfx.bolt(0.6); // troca de arma lá em cima
}
function updateGunHeli(dt) { // offline: roda em círculo, sobe e some no fim ou cai derrubado
  const h = gunHeli; if (!h) return;
  const ud = h.mesh.userData; if (ud.rotor) ud.rotor.rotation.y += dt * 26; if (ud.tailR) ud.tailR.rotation.x += dt * 32;
  if (!h.alive) {
    h.pos.y += dt * (h.crash ? -20 : 16); h.mesh.rotation.z += dt * (h.crash ? 2.4 : 0); h.mesh.position.copy(h.pos); h.dieT -= dt;
    if (h.dieT <= 0 || h.pos.y < 0.5) { if (h.crash) blastFx(h.pos.clone(), 5); scene.remove(h.mesh); gunHeli = null; }
    return;
  }
  if (gameTime >= h.until) { h.alive = false; h.crash = false; h.dieT = 1.25; return; }
  const prev = h.pos.clone(), p = heliPos(h, gameTime); h.pos.set(p.x, p.y + Math.sin(gameTime * 1.3) * 0.3, p.z);
  h.vel.copy(h.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.001)); h.mesh.position.copy(h.pos);
  if (h.vel.lengthSq() > 0.04) h.mesh.lookAt(h.pos.clone().add(h.vel));
}
function updateGunnerMode(dt) {
  const g = gunner, h = g.h;
  if (!h.alive) { endGunner(); flashMsg(h.crash ? 'Derrubaram o Chopper' : 'O Chopper foi embora'); return; }
  const M = GUNNER[g.mode];
  if (rightDown && !g.rWas) setGunnerMode(g.mode === 'mini' ? 'sniper' : 'mini'); g.rWas = rightDown; // botão direito troca
  g.fov += (M.fov - g.fov) * Math.min(1, dt * 10); g.kick = Math.max(0, g.kick - dt * (g.mode === 'sniper' ? 0.25 : 0.6));
  const ih = Math.hypot(h.pos.x, h.pos.z) || 1; // porta do lado de dentro da volta (olhando pro meio do mapa)
  camera.position.set(h.pos.x - h.pos.x / ih * 1.25, h.pos.y - 0.55, h.pos.z - h.pos.z / ih * 1.25); camera.rotation.set(g.pitch + g.kick, g.yaw, 0);
  if (Math.abs(camera.fov - g.fov) > 0.01) { camera.fov = g.fov; camera.updateProjectionMatrix(); }
  // minigun: cada tiro esquenta; parada esfria; no talo trava até esfriar tudo
  const spinning = g.mode === 'mini' && mouseDown && !g.hot;
  if (!spinning) g.heat = Math.max(0, g.heat - GUNNER.mini.cool * dt); if (g.hot && g.heat <= 0) g.hot = false;
  const latched = !mouseDown && clickLatch && performance.now() - clickLatch < 250;
  if (gameTime >= g.next) {
    if (spinning) { gunnerShot(g); g.heat += GUNNER.mini.heat; if (g.heat >= 1) { g.heat = 1; g.hot = true; sfx.empty(); flashMsg('Minigun superaqueceu'); } }
    else if (g.mode === 'sniper' && ((mouseDown && !firedThisPress) || latched)) { firedThisPress = true; clickLatch = 0; gunnerShot(g); }
  }
  paintGunnerHud();
}
function gunnerShot(g) {
  const M = GUNNER[g.mode]; g.next = gameTime + M.rate;
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  if (M.spread) { dir.x += rand(-1, 1) * M.spread; dir.y += rand(-1, 1) * M.spread; dir.z += rand(-1, 1) * M.spread; dir.normalize(); }
  const o = camera.position.clone(), muzzle = camera.localToWorld(g.mode === 'mini' ? new V3(0.16, -0.24, -1.2) : new V3(0, -0.3, -0.6));
  const wh = wallDistance(o, dir, GUNNER.range), wallD = wh ? wh.distance : GUNNER.range;
  let best = null;
  for (const e of entities) {
    if (e === player || !e.alive || friends(e, player)) continue;
    for (const [y, r, head] of [[1.5, 0.5, true], [0.8, 0.58, false]]) { const t = raySphere(o, dir, center(e, y), r); if (t > 0 && t < wallD && (!best || t < best.t)) best = { e, t, head }; }
  }
  const end = o.clone().addScaledVector(dir, best ? best.t : wallD);
  tracer(muzzle, end, g.mode === 'sniper'); puff(end, best ? 0xff9fb0 : 0xffffff);
  if (g.mode === 'mini') { sfx.uzi(0.85); g.kick = Math.min(0.03, g.kick + 0.0035); gunnerRig.flashT = 0.04; gunnerRig.shake = Math.min(1, gunnerRig.shake + 0.5); } else { sfx.sniper(0.75); g.kick += 0.035; }
  window.__gunnerShots = (window.__gunnerShots || 0) + 1;
  if (online) { netEv(['gf', g.mode, v3a(dir)]); return; } // dano: servidor
  if (best) gunnerHit(best.e, M.dmg * (best.head ? M.headMul : 1), best.head);
}
function gunnerHit(t, dmg, head) {
  if (!t.alive || gameTime < t.invulnUntil) return;
  t.hp -= dmg; t.lastAttacker = player; t.flashUntil = gameTime + 0.12; noteHurt(t, player, gameTime);
  sfx.hit();
  if (t.hp > 0) { feedbackHit({ head }); return; }
  kill(t, player, 0, head, false, true, 'Chopper da granja'); feedbackAward(HELI.points); // abate do Chopper não conta pra sequência
}
// ---------- Grelha da granja: o avião gira sozinho; quem chamou só aponta as três armas ----------
const AC130_LABEL = { espeto: 'Espeto', panela: 'Panela', caldeirao: 'Caldeirão' };
const AC130_RANGE = 180;
function makeAc130Mesh() {
  const g = new THREE.Group();
  const add = (geo, color, x, y, z) => {
    const m = new THREE.Mesh(geo, toon(color));
    m.position.set(x, y, z); g.add(m); outline(m, 0.02); return m;
  };
  add(new THREE.BoxGeometry(1.05, 0.62, 4.4), 0x3a342c, 0, 0, 0);
  add(new THREE.BoxGeometry(2.7, 0.1, 1.05), 0xc4a15a, -1.85, 0.06, 0.15);
  add(new THREE.BoxGeometry(2.7, 0.1, 1.05), 0xc4a15a, 1.85, 0.06, 0.15);
  add(new THREE.BoxGeometry(0.12, 0.95, 0.72), 0x2a241c, 0, 0.62, 1.85);
  g.scale.setScalar(2.6);
  return g;
}
function ensureAc130Hud() {
  if (document.getElementById('ac130Vig')) return;
  const style = document.createElement('style');
  style.textContent = '#ac130Vig{position:fixed;inset:0;z-index:5;pointer-events:none;background:transparent;box-shadow:inset 0 0 120px 42px rgba(184,98,16,.72)}#ac130Vig[hidden]{display:none!important}#ac130Lock{position:fixed;left:50%;bottom:108px;transform:translateX(-50%);z-index:26;pointer-events:none;user-select:none;font:700 14px "Trebuchet MS",Arial,sans-serif;color:#ffd27a;text-shadow:0 1px 0 #000;background:rgba(28,16,6,.8);border:2px solid #c47820;border-radius:6px;padding:4px 10px;white-space:nowrap}#ac130Lock[hidden]{display:none!important}';
  document.head.appendChild(style);
  const vig = document.createElement('div'); vig.id = 'ac130Vig'; vig.hidden = true; document.body.appendChild(vig);
  const lock = document.createElement('div'); lock.id = 'ac130Lock'; lock.hidden = true; document.body.appendChild(lock);
}
function showAc130Hud(on) {
  ensureAc130Hud();
  document.getElementById('ac130Vig').hidden = !on;
  document.getElementById('ac130Lock').hidden = !on;
}
function paintAc130Lock() {
  const node = document.getElementById('ac130Lock'); if (!node || !ac130) return;
  const mode = ac130.mode, M = AC130[mode];
  const wait = Math.max(0, ac130.last[mode] + M.rate - gameTime);
  node.textContent = `${AC130_LABEL[mode]} · ${wait.toFixed(1)}s`;
}
function grantAc130() {
  if (!currentMap || !player) return;
  if (ac130Ship) { scene.remove(ac130Ship.mesh); ac130Ship = null; }
  const mesh = makeAc130Mesh(); scene.add(mesh);
  ac130Ship = { mesh, alive: true, dieT: 0, hp: AC130.hp, max: AC130.hp, until: gameTime + AC130.life, ang: Math.random() * Math.PI * 2, orbit: heliOrbit(mapBounds) * AC130.orbit, height: AC130.height, spin: AC130.spin, born: gameTime, pos: new V3(), vel: new V3() };
  const p = heliPos(ac130Ship, gameTime); ac130Ship.pos.set(p.x, p.y, p.z); mesh.position.copy(ac130Ship.pos);
  const ahead = heliPos(ac130Ship, gameTime + 0.05); mesh.lookAt(ahead.x, ahead.y, ahead.z);
  startAc130(ac130Ship, false);
}
function startAc130(h, net) {
  ac130 = { h, net, mode: 'espeto', yaw: Math.atan2(h.pos.x, h.pos.z), pitch: -1.05, last: { espeto: -9, panela: -9, caldeirao: -9 } };
  mouseDown = false; player.bowDraw = player.eggDraw = 0; resetAds(); showAc130Hud(true);
  flashMsg('Grelha da granja'); if (state === 'playing' && !document.pointerLockElement) lockPointer();
}
function endAc130(leave = false) {
  if (!ac130) return;
  const g = ac130; ac130 = null; showAc130Hud(false);
  camera.fov = BASE_FOV; camera.updateProjectionMatrix();
  if (!leave) return;
  if (g.net) netEv(['ks', 'ax']); else if (g.h.alive) { g.h.alive = false; g.h.dieT = 1.25; }
}
function setAc130Mode(mode) { if (!ac130 || ac130.mode === mode || !AC130[mode]) return; ac130.mode = mode; }
function updateAc130Ship(dt) {
  const h = ac130Ship; if (!h) return;
  if (!h.alive) {
    h.pos.y += dt * 16; h.mesh.position.copy(h.pos); h.dieT -= dt;
    if (h.dieT <= 0) { scene.remove(h.mesh); if (ac130Ship === h) ac130Ship = null; }
    return;
  }
  if (gameTime >= h.until) { h.alive = false; h.dieT = 1.25; return; }
  const prev = h.pos.clone(), p = heliPos(h, gameTime); h.pos.set(p.x, p.y, p.z);
  h.vel.copy(h.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.001)); h.mesh.position.copy(h.pos);
  if (h.vel.lengthSq() > 0.04) h.mesh.lookAt(h.pos.clone().add(h.vel));
}
function updateAc130Mode() {
  const g = ac130, h = g.h;
  if (!h.alive || gameTime >= h.until) {
    if (h.alive) { h.alive = false; h.dieT = 1.25; }
    endAc130(); flashMsg('A Grelha foi embora'); return;
  }
  camera.position.set(h.pos.x, h.pos.y - 1.6, h.pos.z); camera.rotation.set(g.pitch, g.yaw, 0);
  const M = AC130[g.mode];
  const latched = !mouseDown && clickLatch && performance.now() - clickLatch < 250;
  if (gameTime >= g.last[g.mode] + M.rate && (mouseDown || latched)) { clickLatch = 0; ac130Shot(g); }
  paintAc130Lock();
}
function ac130Shot(g) {
  const mode = g.mode, M = AC130[mode]; g.last[mode] = gameTime;
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  if (M.spread) { dir.x += rand(-1, 1) * M.spread; dir.y += rand(-1, 1) * M.spread; dir.z += rand(-1, 1) * M.spread; dir.normalize(); }
  const o = camera.position.clone();
  if (M.radius > 0) {
    const wh = wallDistance(o, dir, AC130_RANGE), wallD = wh ? wh.distance : AC130_RANGE;
    const end = o.clone().addScaledVector(dir, wallD);
    tracer(o, end, false); puff(end, 0xffb15a); burst(end, M.radius);
    if (mode === 'caldeirao') sfx.boom(0.8); else sfx.boom(0.4);
    if (online) { netEv(['af', mode, v3a(dir)]); return; }
    for (const e of entities) {
      if (e === player || !e.alive || friends(e, player)) continue;
      const d = end.distanceTo(center(e, 1)), dmg = M.dmg * (1 - d / M.radius);
      if (d < M.radius && dmg > 0) ac130Hurt(e, dmg);
    }
    return;
  }
  const wh = wallDistance(o, dir, AC130_RANGE), wallD = wh ? wh.distance : AC130_RANGE;
  let best = null;
  for (const e of entities) {
    if (e === player || !e.alive || friends(e, player)) continue;
    for (const [y, r] of [[1.5, 0.5], [0.8, 0.58]]) { const t = raySphere(o, dir, center(e, y), r); if (t > 0 && t < wallD && (!best || t < best.t)) best = { e, t }; }
  }
  const end = o.clone().addScaledVector(dir, best ? best.t : wallD);
  tracer(o, end, false); puff(end, best ? 0xff9fb0 : 0xffffff); sfx.uzi(0.35);
  if (online) { netEv(['af', mode, v3a(dir)]); return; }
  if (best) ac130Hurt(best.e, M.dmg);
}
function ac130Hurt(t, dmg) {
  if (!t.alive || gameTime < t.invulnUntil || !(dmg > 0)) return;
  t.hp -= dmg; t.lastAttacker = player; t.flashUntil = gameTime + 0.12; noteHurt(t, player, gameTime);
  sfx.hit();
  if (t.hp > 0) { feedbackHit({ head: false }); return; }
  kill(t, player, 0, false, false, true, 'Grelha da granja');
}
function clearGunships() {
  ac130 = null;
  const vig = document.getElementById('ac130Vig'), lock = document.getElementById('ac130Lock');
  if (vig) vig.hidden = true; if (lock) lock.hidden = true;
  if (ac130Ship) { scene.remove(ac130Ship.mesh); ac130Ship = null; }
  for (const h of netGunships.values()) scene.remove(h.mesh); netGunships.clear();
}
function netAc130Spawn([, id, oid, ang, orbit, born, until, hp]) {
  if (netGunships.has(id)) return;
  const mesh = makeAc130Mesh(); scene.add(mesh);
  const owner = entOf(oid), h = { id, owner, mesh, ang, orbit, born, until, hp, max: AC130.hp, alive: true, dieT: 0, height: AC130.height, spin: AC130.spin, pos: new V3(), vel: new V3() };
  const p = heliPos(h, gameTime); h.pos.set(p.x, p.y, p.z); mesh.position.copy(h.pos);
  const ahead = heliPos(h, gameTime + 0.05); mesh.lookAt(ahead.x, ahead.y, ahead.z);
  netGunships.set(id, h);
  if (owner === player) startAc130(h, true); else if (owner) flashMsg(`${owner.name} chamou a Grelha`);
}
function netAc130Down(id) {
  const h = netGunships.get(id); if (!h || !h.alive) return;
  h.alive = false; h.dieT = 1.25;
}
function updateNetGunships(dt) {
  for (const h of [...netGunships.values()]) {
    if (!h.alive) {
      h.pos.y += dt * 16; h.mesh.position.copy(h.pos); h.dieT -= dt;
      if (h.dieT <= 0) { scene.remove(h.mesh); netGunships.delete(h.id); }
      continue;
    }
    if (gameTime >= h.until) { h.alive = false; h.dieT = 1.25; continue; }
    const prev = h.pos.clone(), p = heliPos(h, gameTime); h.pos.set(p.x, p.y, p.z);
    h.vel.copy(h.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.001)); h.mesh.position.copy(h.pos);
    if (h.vel.lengthSq() > 0.04) h.mesh.lookAt(h.pos.clone().add(h.vel));
  }
}
const _gm = new V3();
// barra de calor da minigun (embaixo da mira)
function ensureMiniHud() { let n = document.getElementById('mgHud'); if (n) return n; const st = document.createElement('style'); st.textContent = `#mgHud{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);width:200px;z-index:12;pointer-events:none;text-align:center;font:700 11px "Trebuchet MS",Arial,sans-serif;color:#e8fbff;text-shadow:0 1px 0 #000}#mgHud[hidden]{display:none!important}#mgHud i{display:block;margin-top:3px;height:8px;background:rgba(0,0,0,.6);border:1px solid #e8fbff;border-radius:4px;overflow:hidden}#mgHud i span{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd27a,#ff4a2a)}#mgHud.hot{color:#ff6a4a;animation:mgHot .4s steps(2) infinite}@keyframes mgHot{50%{opacity:.35}}`; document.head.appendChild(st); n = document.createElement('div'); n.id = 'mgHud'; n.hidden = true; n.innerHTML = '<b>CALOR</b><i><span></span></i>'; document.body.appendChild(n); return n; }
function paintMiniHud(p) { const n = ensureMiniHud(), on = !!(p.alive && p.weapon === MINIGUN && !gunner); n.hidden = !on; if (!on) return; n.classList.toggle('hot', !!p.mgHot); n.firstChild.textContent = p.mgHot ? 'SUPERAQUECEU' : (p.mgSpin || 0) < 1 && p.mgWant ? 'EMBALANDO' : 'CALOR'; n.querySelector('span').style.width = ((p.mgHeat || 0) * 100).toFixed(0) + '%'; }
function ensureGunnerHud() {
  let node = document.getElementById('gunnerHud');
  if (node) return node;
  const style = document.createElement('style');
  style.textContent = `#gunnerHud{position:fixed;inset:0;z-index:24;pointer-events:none;user-select:none;font-family:"Trebuchet MS",Arial,sans-serif;color:#e8fbff}
#gunnerHud[hidden]{display:none!important}
#gunnerHud .gh-top{position:absolute;top:74px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px}
#gunnerHud .gh-top b{font-family:Impact,"Arial Black",sans-serif;font-size:16px;letter-spacing:1px;text-shadow:0 2px 0 #000}
#gunnerHud .gh-hp{width:220px;height:8px;background:rgba(0,0,0,.6);border:1px solid #e8fbff;border-radius:4px;overflow:hidden}
#gunnerHud .gh-hp span{display:block;height:100%;background:#7ee08a;transition:width .15s}
#gunnerHud .gh-top small{font-weight:700;text-shadow:0 1px 0 #000}
#gunnerHud .gh-modes{position:absolute;left:24px;bottom:28px;display:flex;flex-direction:column;gap:6px}
#gunnerHud .gh-modes span{padding:5px 10px;border:2px solid rgba(232,251,255,.35);border-radius:6px;background:rgba(0,0,0,.45);font-weight:700;opacity:.6}
#gunnerHud .gh-modes span.on{opacity:1;border-color:#ffd27a;color:#ffd27a}
#gunnerHud .gh-heat{position:absolute;left:50%;bottom:70px;transform:translateX(-50%);width:240px;text-align:center;font-size:12px;font-weight:700;text-shadow:0 1px 0 #000}
#gunnerHud .gh-heat i{display:block;margin-top:4px;height:10px;background:rgba(0,0,0,.6);border:1px solid #e8fbff;border-radius:5px;overflow:hidden}
#gunnerHud .gh-heat i span{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffd27a,#ff4a2a)}
#gunnerHud .gh-heat.hot{color:#ff6a4a;animation:ghHot .4s steps(2) infinite}
@keyframes ghHot{50%{opacity:.35}}
#gunnerHud .gh-x{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)}
#gunnerHud .gh-x.mini{width:30px;height:30px;border:2px solid rgba(232,251,255,.8);border-radius:50%;box-shadow:0 0 0 1px rgba(0,0,0,.6)}
#gunnerHud .gh-x.mini::before,#gunnerHud .gh-x.mini::after{content:"";position:absolute;background:#e8fbff;box-shadow:0 0 0 1px #000}
#gunnerHud .gh-x.mini::before{left:50%;top:50%;width:4px;height:4px;border-radius:50%;transform:translate(-50%,-50%)}
#gunnerHud .gh-x.mini::after{display:none}
#gunnerHud .gh-scope{position:absolute;inset:0;background:radial-gradient(circle at center,transparent 0 min(34vh,34vw),#0b0b0b calc(min(34vh,34vw) + 3px))}
#gunnerHud .gh-x.sniper{width:min(68vh,68vw);height:min(68vh,68vw)}
#gunnerHud .gh-x.sniper::before,#gunnerHud .gh-x.sniper::after{content:"";position:absolute;background:#111}
#gunnerHud .gh-x.sniper::before{left:50%;top:0;bottom:0;width:2px;transform:translateX(-50%)}
#gunnerHud .gh-x.sniper::after{top:50%;left:0;right:0;height:2px;transform:translateY(-50%)}
body.in-gunner #crosshair,body.in-gunner #bottomright,body.in-gunner #streakBar,body.in-gunner #score,body.in-gunner #nukeReady{visibility:hidden}
#gunnerHud .gh-modes{bottom:96px!important}
#gunnerHud .gh-tag{position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;border:2px solid #ff3b3b;transform:rotate(45deg);opacity:.85}
#gunnerHud .gh-hint{position:absolute;right:24px;bottom:28px;text-align:right;font-size:12px;font-weight:700;line-height:1.5;text-shadow:0 1px 0 #000;opacity:.85}`;
  document.head.appendChild(style);
  node = document.createElement('div'); node.id = 'gunnerHud'; node.hidden = true;
  node.innerHTML = '<div class="gh-tags"></div><div class="gh-scope" hidden><div class="gh-x sniper"></div></div><div class="gh-x mini"></div>'
    + '<div class="gh-top"><b>CHOPPER DA GRANJA</b><div class="gh-hp"><span></span></div><small>60s</small></div>'
    + '<div class="gh-modes"><span data-m="mini">1 · MINIGUN</span><span data-m="sniper">2 · SNIPER</span></div>'
    + '<div class="gh-heat">MINIGUN<i><span></span></i></div>'
    + '<div class="gh-hint">clique: atira<br>1 / 2 ou botão direito: troca<br>F: sai do Chopper</div>';
  document.body.appendChild(node);
  return node;
}

// Minigun do Chopper em 1ª pessoa: o Docão sentado na porta segurando a arma montada no helicóptero
const gunnerRig = (() => {
  const root = new THREE.Group(); root.visible = false; root.scale.setScalar(0.62); fpScene.add(root);
  const add = (geo, color, x, y, z, parent = root, ol = 0.006) => { const m = new THREE.Mesh(geo, toon(color)); m.position.set(x, y, z); parent.add(m); if (ol) outline(m, ol); return m; };
  add(new THREE.BoxGeometry(0.17, 0.17, 0.44), 0x3a3f4a, 0, 0, -0.04); // corpo
  add(new THREE.CylinderGeometry(0.075, 0.075, 0.12, 14), 0x2a2d35, 0, 0, -0.3).rotation.x = Math.PI / 2; // motor
  add(new THREE.BoxGeometry(0.18, 0.04, 0.1), 0xe63946, 0, 0.1, -0.04, root, 0.004); // faixa da granja
  const barrels = new THREE.Group(); barrels.position.set(0, 0, -0.62); root.add(barrels);
  const barrelMat = new THREE.MeshToonMaterial({ color: 0x22252c, emissive: 0x000000 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.56, 8), barrelMat); b.rotation.x = Math.PI / 2; b.position.set(Math.cos(a) * 0.045, Math.sin(a) * 0.045, 0); outline(b, 0.003); barrels.add(b); }
  for (const z of [-0.24, 0.05]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 16), toon(0x1a1c22)); r.position.z = z; outline(r, 0.003); barrels.add(r); }
  add(new THREE.BoxGeometry(0.065, 0.16, 0.08), 0x2a2d35, 0, -0.13, 0.13).rotation.x = 0.2; // cabo de trás (mão direita)
  add(new THREE.BoxGeometry(0.05, 0.13, 0.06), 0x2a2d35, -0.03, -0.12, -0.3); // empunhadura da frente (mão esquerda)
  add(new THREE.BoxGeometry(0.13, 0.17, 0.2), 0x5c6b3a, -0.17, -0.05, 0.0); // caixa de munição
  add(new THREE.BoxGeometry(0.03, 0.02, 0.2), 0xd9a441, -0.09, 0.04, -0.02, root, 0.003); // fita de balas
  add(new THREE.CylinderGeometry(0.03, 0.04, 0.7, 10), 0x1a1c22, 0, -0.45, -0.06); // pino da montagem
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), new THREE.MeshBasicMaterial({ color: 0xfff27a })); flash.position.z = -0.96; flash.scale.set(1, 1, 2.2); flash.visible = false; root.add(flash);
  let arms = null;
  const setArms = (skinId) => { if (arms) root.remove(arms); arms = makeFPArms(getSkin(skinId)); root.add(arms); };
  const door = new THREE.Group(); door.visible = false; fpScene.add(door);
  const pillar = add(new THREE.BoxGeometry(0.09, 1.6, 0.09), 0x3a3f4a, -0.62, 0.05, -0.78, door); pillar.rotation.z = -0.1;
  add(new THREE.BoxGeometry(0.095, 0.12, 0.095), 0xe63946, -0.6, -0.25, -0.78, door, 0.004);
  add(new THREE.BoxGeometry(0.95, 0.07, 0.7), 0x2a2d35, -0.5, -0.5, -0.72, door); // piso da cabine
  add(new THREE.BoxGeometry(0.95, 0.02, 0.03), 0xd9a441, -0.5, -0.462, -0.38, door, 0.003); // friso da porta
  add(new THREE.BoxGeometry(1.6, 0.05, 0.05), 0x1a1c22, -0.1, -0.68, -0.95, door); // esqui lá fora
  return { root, door, barrels, barrelMat, flash, setArms, spin: 0, flashT: 0, shake: 0 };
})();
function poseGunnerRig(dt) {
  const R = gunnerRig, g = gunner, on = !!(g && g.mode === 'mini' && player && player.alive);
  R.root.visible = on; R.door.visible = on; if (!on) return;
  const firing = mouseDown && !g.hot;
  R.spin += (firing ? 1 : -0.6) * dt * 3; R.spin = clamp(R.spin, 0, 1); R.barrels.rotation.z += R.spin * dt * 40; // os canos giram e vão parando
  R.barrelMat.emissive.setRGB(g.heat * 0.85, g.heat * 0.22, 0); // esquenta: os canos ficam vermelhos
  R.flashT -= dt; R.flash.visible = R.flashT > 0; R.flash.rotation.z = Math.random() * 3;
  R.shake = Math.max(0, R.shake - dt * 8);
  const sx = (Math.random() - 0.5) * R.shake * 0.02, sy = (Math.random() - 0.5) * R.shake * 0.02;
  R.root.position.set(0.2 + sx, -0.3 + sy + Math.sin(gameTime * 1.3) * 0.004, -0.62 + R.shake * 0.015);
  R.root.rotation.set(R.shake * 0.02, 0.06, 0);
}
function showGunnerHud(on) { ensureGunnerHud().hidden = !on; document.body.classList.toggle('in-gunner', !!on); } // some o HUD da arma de chão
function paintGunnerHud() {
  const node = ensureGunnerHud(), g = gunner, h = g.h, sn = g.mode === 'sniper';
  node.querySelector('.gh-hp span').style.width = Math.max(0, h.hp / (h.max || GUNNER.hp) * 100) + '%';
  node.querySelector('.gh-top small').textContent = Math.max(0, Math.ceil(h.until - gameTime)) + 's';
  node.querySelectorAll('.gh-modes span').forEach((s) => s.classList.toggle('on', s.dataset.m === g.mode));
  node.querySelector('.gh-scope').hidden = !sn; node.querySelector('.gh-x.mini').hidden = sn;
  const heat = node.querySelector('.gh-heat'); heat.hidden = sn; heat.classList.toggle('hot', g.hot);
  heat.firstChild.textContent = g.hot ? 'SUPERAQUECEU' : 'MINIGUN'; heat.querySelector('span').style.width = (g.heat * 100).toFixed(0) + '%';
  // marcadores vermelhos nos inimigos (visão térmica)
  const box = node.querySelector('.gh-tags'); let n = 0;
  for (const e of entities) {
    if (e === player || !e.alive || friends(e, player)) continue;
    _gm.copy(center(e, 1)).project(camera); if (_gm.z > 1 || Math.abs(_gm.x) > 1 || Math.abs(_gm.y) > 1) continue;
    const tag = box.children[n] || box.appendChild(Object.assign(document.createElement('i'), { className: 'gh-tag' }));
    tag.style.left = ((_gm.x + 1) / 2 * innerWidth).toFixed(0) + 'px'; tag.style.top = ((1 - _gm.y) / 2 * innerHeight).toFixed(0) + 'px'; tag.hidden = false; n++;
  }
  for (let i = n; i < box.children.length; i++) box.children[i].hidden = true;
}
// bots miram no Gavião ou no Chopper do jogador (o mais perto que der pra ver)
function heliAimBot(b, dist) {
  if (dist && dist < 12) return null;
  const eye = center(b, 1.5); let best = null;
  for (const h of skyHelis()) { const hd = eye.distanceTo(h.pos); if (hd <= 62 && hd >= 4 && (!best || hd < best.d) && losClear(eye, h.pos)) best = { h, d: hd }; }
  return best;
}
function heliShoot() {
  let best = null, bd = 1e9;
  for (const e of entities) {
    if (!e.alive || e.isPlayer || friends(e, player)) continue;
    const d = heli.pos.distanceTo(e.pos);
    if (d < bd && losClear(heli.pos, center(e, 1.1))) { best = e; bd = d; }
  }
  if (!best) return;
  heli.cool = HELI.rate;
  const miss = Math.random() < HELI.miss; // erra de vez em quando: o tiro passa do lado
  const to = center(best, 1.0); if (miss) to.add(new V3(rand(-1, 1), rand(-0.6, 0.3), rand(-1, 1)).normalize().multiplyScalar(rand(0.9, 1.6)));
  const from = heli.pos.clone();
  from.y -= 0.4;
  tracer(from, to, false);
  sfx.rifle(distVol(heli.pos) * 0.45);
  if (miss || !best.alive || gameTime < best.invulnUntil) return;
  best.hp -= HELI.dmg;
  best.lastAttacker = player;
  best.flashUntil = gameTime + 0.08;
  if (best.hp <= 0) { kill(best, player, 0, false, false, true); feedbackAward(HELI.points); }
}
function updateHeli(dt) {
  if (!heli) return;
  const rotor = heli.mesh.userData.rotor;
  const tailR = heli.mesh.userData.tailR;
  if (rotor) rotor.rotation.y += dt * 26;
  if (tailR) tailR.rotation.x += dt * 32;
  if (!heli.alive) {
    heli.pos.y += dt * (heli.crash ? -20 : 16);
    heli.mesh.rotation.z += dt * (heli.crash ? 2.4 : 0);
    heli.mesh.position.copy(heli.pos);
    heli.dieT -= dt;
    const hud = document.getElementById('heliHud');
    if (hud) hud.hidden = true;
    if (heli.dieT <= 0 || heli.pos.y < 0.5) {
      if (heli.crash) blastFx(heli.pos.clone(), 5);
      removeHeli();
    }
    return;
  }
  if (gameTime >= heli.until) { heli.alive = false; heli.crash = false; heli.dieT = 1.25; return; }
  const prev = heli.pos.clone();
  heli.ang += dt * 0.42;
  heli.pos.set(Math.cos(heli.ang) * heli.orbit, HELI.height + Math.sin(gameTime * 1.6) * 0.35, Math.sin(heli.ang) * heli.orbit);
  heli.vel.copy(heli.pos).sub(prev).multiplyScalar(1 / Math.max(dt, 0.001));
  heli.mesh.position.copy(heli.pos);
  if (heli.vel.lengthSq() > 0.04) heli.mesh.lookAt(heli.pos.clone().add(heli.vel));
  heli.cool -= dt;
  if (heli.cool <= 0) heliShoot();
  const hud = ensureHeliHud();
  hud.hidden = false;
  const bar = hud.querySelector('span');
  if (bar) bar.style.width = Math.max(0, heli.hp / heli.max * 100) + '%';
  const time = hud.querySelector('small');
  if (time) time.textContent = Math.max(0, Math.ceil(heli.until - gameTime)) + 's';
}
// Míssil da granja: o de 5. Abre o laptop e você pilota um míssil que desce do céu.
const PREDATOR = { radius: 26, maxDmg: 460, selfMul: 0.4, knock: 20, lift: 14, speed: 28, boost: 1.85, life: 16, height: 98 };
const STREAK_PROMPT = { uav: 'F · Olho da granja', missile: 'F · Míssil da granja', heli: 'F · Gavião da granja', gunner: 'F · Chopper da granja', ac130: 'F · Grelha da granja', nuke: 'F · Fim da chapa' };
let predator = null;
function refreshStreakPrompt() {
  setStreakReady(streakReady);
  const id = streakReady[0];
  if (!id) { hideNukeReady(); return; }
  showNukeReady();
  const node = document.getElementById('nukeReady');
  if (node) node.textContent = STREAK_PROMPT[id] || 'F · killstreak';
}
function bankStreak(id) {
  if (invMode()) return;
  streakReady.push(id);
  flashMsg(`${(STREAK_PROMPT[id] || id).replace('F · ', '')} pronto · aperte F`);
  refreshStreakPrompt();
}
function ensurePredatorHud() {
  let node = document.getElementById('predatorHud');
  if (!node) {
    node = document.createElement('div');
    node.id = 'predatorHud';
    node.hidden = true;
    node.innerHTML = '<b>MÍSSIL DA GRANJA</b><i></i><small>mexe o mouse · segura o tiro pra acelerar</small>';
    document.body.appendChild(node);
    const style = document.createElement('style');
    style.textContent = '#predatorHud{position:fixed;inset:0;z-index:24;pointer-events:none;box-shadow:inset 0 0 0 34px #140e0c,inset 0 0 0 38px #3a2a22,inset 0 0 80px rgba(0,0,0,.45)}#predatorHud[hidden]{display:none!important}#predatorHud b{position:absolute;top:46px;left:50%;transform:translateX(-50%);font-family:Impact,Arial,sans-serif;letter-spacing:1px;color:#d7f3ff;text-shadow:0 2px 0 #000}#predatorHud small{position:absolute;bottom:46px;left:50%;transform:translateX(-50%);color:#ffe8c2;font-weight:bold;text-shadow:0 2px 0 #000}#predatorHud i{position:absolute;left:50%;top:50%;width:18px;height:18px;transform:translate(-50%,-50%)}#predatorHud i:before,#predatorHud i:after{content:"";position:absolute;background:#fff;box-shadow:0 0 0 1px #000}#predatorHud i:before{left:8px;top:-10px;width:2px;height:38px}#predatorHud i:after{top:8px;left:-10px;height:2px;width:38px}';
    document.head.appendChild(style);
  }
  return node;
}
function showPredatorHud(on) {
  const node = ensurePredatorHud();
  node.hidden = !on;
}
function clearPredator() {
  if (!predator) return;
  scene.remove(predator.mesh);
  predator = null;
  laptopWant = 0;
  showPredatorHud(false);
  if (camera.fov !== BASE_FOV) { camera.fov = BASE_FOV; camera.updateProjectionMatrix(); }
}
function grantPredator() {
  if (predator || !currentMap || !player) return;
  const yaw = player.yaw;
  const x = player.pos.x - Math.sin(yaw) * 8;
  const z = player.pos.z - Math.cos(yaw) * 8;
  const ground = groundAt(x, z, player.pos.y + 4);
  const mesh = makeRocket(3.2);
  mesh.children[0].rotation.y = Math.PI;
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
  flame.position.z = 0.55;
  mesh.add(flame);
  const glow = new THREE.PointLight(0xffb15a, 18, 30);
  glow.position.z = 0.4;
  mesh.add(glow);
  scene.add(mesh);
  predator = {
    mesh, flame, phase: 'laptop', until: gameTime + 0.7, born: gameTime,
    pos: new V3(x, ground + PREDATOR.height, z), yaw, pitch: -1.05, nextSmoke: 0,
  };
  laptopWant = 1;
  if (online) netEv(['ks', 'p', v3a(predator.pos)]); // online: o servidor confere o míssil e aplica a explosão
  mesh.position.copy(predator.pos);
  flashMsg('Laptop aberto · tiro acelera o míssil');
  if (state === 'playing' && !document.pointerLockElement) lockPointer();
}
function predatorDir(p) {
  const cp = Math.cos(p.pitch), sp = Math.sin(p.pitch);
  return new V3(-Math.sin(p.yaw) * cp, sp, -Math.cos(p.yaw) * cp);
}
function predatorAim(p, dir) {
  p.mesh.position.copy(p.pos);
  p.mesh.lookAt(p.pos.clone().add(dir));
}
function predatorSmoke(p) {
  if (gameTime < p.nextSmoke) return;
  p.nextSmoke = gameTime + 0.02;
  const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: Math.random() < 0.35 ? 0x6a727a : 0xe7e2da, transparent: true, depthWrite: false }));
  m.position.copy(p.pos);
  scene.add(m);
  particles.push({ mesh: m, vel: new V3(rand(-0.4, 0.4), rand(0.2, 0.8), rand(-0.4, 0.4)), life: rand(0.8, 1.3), t: 0, kind: 'smoke', s0: rand(4, 7) });
}
function missileHit(from, to) {
  for (let i = 1; i <= 4; i++) {
    const p = from.clone().lerp(to, i / 4);
    const g = groundAt(p.x, p.z, p.y + 1.2);
    if (p.y <= g + 0.45) return new V3(p.x, g + 0.25, p.z);
    if (collides(p.x, p.y, p.z)) return p;
  }
  return null;
}
function endPredator(at) {
  const where = at.clone();
  clearPredator();
  if (online) { netEv(['ms', v3a(where)]); refreshStreakPrompt(); return; } // a explosão (e o dano) vem do servidor
  blast(where, player, { radius: PREDATOR.radius, maxDmg: PREDATOR.maxDmg, selfMul: PREDATOR.selfMul, knock: PREDATOR.knock, lift: PREDATOR.lift, wIdx: W_NADE });
  refreshStreakPrompt();
}
const missileCam = new THREE.PerspectiveCamera(58, 0.5 / 0.28, 0.1, 400);
const missileRT = new THREE.WebGLRenderTarget(768, 430);
// HUD da tela do laptop: cantos, mira e textos por cima da imagem do míssil
const missileHud = (() => {
  const c = document.createElement('canvas'); c.width = 768; c.height = 430; const x = c.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0.08)'; for (let y = 0; y < c.height; y += 4) x.fillRect(0, y, c.width, 1); // linhas de monitor
  x.strokeStyle = '#d7f3ff'; x.lineWidth = 4;
  for (const [cx, cy, sx, sy] of [[24, 24, 1, 1], [744, 24, -1, 1], [24, 406, 1, -1], [744, 406, -1, -1]]) { x.beginPath(); x.moveTo(cx, cy + sy * 44); x.lineTo(cx, cy); x.lineTo(cx + sx * 44, cy); x.stroke(); }
  x.lineWidth = 3; x.beginPath(); x.arc(384, 215, 22, 0, Math.PI * 2); x.moveTo(384, 175); x.lineTo(384, 200); x.moveTo(384, 230); x.lineTo(384, 255); x.moveTo(344, 215); x.lineTo(369, 215); x.moveTo(399, 215); x.lineTo(424, 215); x.stroke();
  x.textAlign = 'center'; x.font = 'bold 30px Impact, Arial, sans-serif'; x.fillStyle = '#d7f3ff'; x.shadowColor = '#000'; x.shadowOffsetY = 2; x.fillText('MÍSSIL DA GRANJA', 384, 62);
  x.font = 'bold 20px Arial, sans-serif'; x.fillStyle = '#ffe8c2'; x.fillText('mexe o mouse · segura o tiro pra acelerar', 384, 392);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const hudScene = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  hudScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false })));
  return { scene: hudScene, cam: hudCam };
})();
let laptopBig = 0;
function laptopScreenLive(on) { // liga/desliga a imagem do míssil na tela do laptop
  const sc = fp.laptop.userData.screen; if (!sc || !!sc.material.map === on) return;
  sc.material.map = on ? missileRT.texture : null; sc.material.color.set(on ? 0xffffff : 0x8fd0ff); sc.material.needsUpdate = true;
}
function renderMissileScreen() {
  const fog = scene.fog, fn = fog && fog.near, ff = fog && fog.far;
  if (fog) { fog.near = fn + 90; fog.far = ff + 140; } // o míssil sai a ~100 m: sem isso a névoa apaga o chão na tela do laptop
  renderer.setRenderTarget(missileRT); renderer.clear(); renderer.render(scene, missileCam);
  if (fog) { fog.near = fn; fog.far = ff; }
  renderer.clearDepth(); renderer.render(missileHud.scene, missileHud.cam); renderer.setRenderTarget(null);
}
function posePredatorCam() {
  const dir = predatorDir(predator);
  const side = new V3(dir.z, 0, -dir.x);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  // Atrás, acima e um pouco de lado: dá pra ver o corpo do míssil e o chão pra onde ele aponta.
  // câmera do míssil (vai pra tela do laptop); a câmera do jogo continua nos olhos do Docão
  missileCam.position.copy(predator.pos).addScaledVector(dir, -5.2).addScaledVector(side, 1.7);
  missileCam.position.y += 2.2;
  missileCam.lookAt(predator.pos.clone().addScaledVector(dir, 16));
}
function updatePredator(dt) {
  if (!predator) return;
  const p = predator;
  if (p.phase === 'laptop') {
    predatorAim(p, predatorDir(p));
    if (gameTime >= p.until) { p.phase = 'fly'; p.born = gameTime; }
    return;
  }
  const dir = predatorDir(p);
  const boosting = mouseDown || (clickLatch && performance.now() - clickLatch < 400);
  const next = p.pos.clone().addScaledVector(dir, PREDATOR.speed * (boosting ? PREDATOR.boost : 1) * dt);
  const hit = missileHit(p.pos, next);
  if (hit || gameTime - p.born > PREDATOR.life) { endPredator(hit || next); return; }
  p.pos.copy(next);
  if (p.flame) p.flame.scale.setScalar(boosting ? 1.45 + Math.random() * 0.7 : 0.75 + Math.random() * 0.55);
  if (p.mesh.children[0]) p.mesh.children[0].rotation.z += dt * 14;
  predatorAim(p, dir);
  predatorSmoke(p);
  posePredatorCam();
}
function startNukeCountdown() {
  nukeReady = false; radioWant = 1; nukeRiderDone = false;
  nukeRideFrom = gameTime; // a queda usa este instante, não o frame em que o modelo entrou na cena
  nukeAt = gameTime + 5; showNukeCount(5); flashMsg('Fim da chapa');
  if (online) netEv(['ks', 'x']);
  refreshStreakPrompt();
}
function useStreak() {
  if (invMode()) return; // Invasão: sem killstreaks (F não faz nada; só G/X dos poderes)
  if (!player || !player.alive || predator || nukeAt || radioCall || gunner || ac130) return;
  if (isBomb() && bombFrozen(bombS)) { if (streakReady.length) flashMsg('Killstreak só depois da preparação'); return; } // Bomba: nada de streak na preparação
  const id = streakReady.shift();
  if (!id || !clientPower(id)) { refreshStreakPrompt(); return; }
  refreshStreakPrompt();
  if (id === 'uav' || id === 'heli' || id === 'gunner' || id === 'ac130') { radioCall = { id, at: gameTime + RADIO_CALL }; radioWant = 1; sfx.radioCall(); flashMsg(id === 'uav' ? 'Chamando o Olho da granja...' : id === 'heli' ? 'Chamando o Gavião...' : id === 'ac130' ? 'Chamando a Grelha...' : 'Chamando o Chopper...'); }
  else if (id === 'missile') grantPredator();
  else if (id === 'nuke') startNukeCountdown();
}
function finishRadioCall() {
  const id = radioCall.id; radioCall = null; radioWant = 0; sfx.radioOk();
  if (id === 'uav') grantUav();
  else if (id === 'gunner') { if (online) { netEv(['ks', 'g']); flashMsg('Chopper a caminho'); } else grantGunner(); }
  else if (id === 'ac130') { if (online) { netEv(['ks', 'a']); flashMsg('Grelha a caminho'); } else grantAc130(); }
  else if (online) { netEv(['ks', 'h']); flashMsg('Gavião a caminho'); } else grantHeli();
}
function grantNuke() { bankStreak('nuke'); }
function callNuke() {
  if (invMode()) return;
  if (!player || !player.alive || nukeAt) return;
  if (isBomb() && bombFrozen(bombS)) return;
  const i = streakReady.indexOf('nuke');
  if (i < 0 && !nukeReady) return;
  if (i >= 0) streakReady.splice(i, 1);
  startNukeCountdown();
}
function onRewardKill() {
  if (invMode()) return; // Invasão: abates não rendem killstreak
  if (!player || !player.alive) return;
  rewardKills++;
  const cycle = streakCycle(rewardKills);
  syncRewardHud();
  if (cycle === 3 && clientPower('uav')) bankStreak('uav');
  else if (cycle === 5 && clientPower('missile')) bankStreak('missile');
  else if (cycle === 7 && clientPower('heli')) bankStreak('heli');
  else if (cycle === 10 && clientPower('gunner')) bankStreak('gunner');
  else if (cycle === 13 && clientPower('ac130')) bankStreak('ac130');
  if (rewardKills % STREAK_LAP === 0 && clientPower('nuke')) bankStreak('nuke');
}
function nukeFlash() {
  let el = document.getElementById('nukeFlash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'nukeFlash';
    el.style.cssText = 'position:fixed;inset:0;z-index:55;pointer-events:none;background:#fff6d0;opacity:0';
    document.body.appendChild(el);
  }
  el.style.transition = 'none';
  el.style.opacity = '0.9';
  requestAnimationFrame(() => { el.style.transition = 'opacity .55s linear'; el.style.opacity = '0'; });
}
const NUKE_FALL = 5, NUKE_TOP = 44, NUKE_HIT = 8;
function dropNukeRider() {
  if (!nukeRider) return;
  if (nukeRider.parent) nukeRider.parent.remove(nukeRider);
  nukeRider = null;
}
function stepNukeRider(dt) {
  const impact = nukeAt || netNukeAt; // netNukeAt já é o instante do impacto
  if (nukeRiderDone || !(impact > 0)) {
    if (!(impact > 0)) nukeRiderDone = false;
    dropNukeRider();
    return;
  }
  if (!nukeRider || nukeRider.parent !== scene) { nukeRider = makeNukeRider(); scene.add(nukeRider); }
  const from = nukeAt && nukeRideFrom >= 0 ? nukeRideFrom : impact - NUKE_FALL;
  const t = clamp((gameTime - from) / Math.max(0.05, impact - from), 0, 1);
  nukeRider.position.set(0, NUKE_TOP + (NUKE_HIT - NUKE_TOP) * t, 0);
  updateExpression(nukeRider.userData.model, dt);
}
function updateRewards(dt) {
  if (uavLive && player) {
    const enemies = [];
    for (const e of entities) if (e.alive && e !== player && !friends(e, player)) enemies.push({ x: e.pos.x, z: e.pos.z });
    drawUav({ player: { x: player.pos.x, z: player.pos.z, yaw: player.yaw }, enemies });
    if (!tickUav(dt)) uavLive = false;
  }
  updateHeli(dt); updateGunHeli(dt); updateAc130Ship(dt);
  if (online) {
    updateNetHelis(dt); updateNetGunships(dt);
    if (netNukeAt && !nukeAt) { const l = Math.ceil(netNukeAt - gameTime); if (l > 0) showNukeCount(l); }
  }
  stepNukeRider(dt);
  if (!nukeAt) return;
  const left = Math.ceil(nukeAt - gameTime);
  if (left > 0) showNukeCount(left);
  if (gameTime < nukeAt) return;
  if (online) { nukeAt = 0; nukeRideFrom = -1; radioWant = 0; if (!netNukeAt) { hideNuke(); nukeRiderDone = true; dropNukeRider(); } return; } // online: o servidor detona (evento 'nb') e manda o fim
  nukeAt = 0; nukeRideFrom = -1; radioWant = 0; hideNuke(); nukeRiderDone = true; dropNukeRider();
  sfx.boom(1); shake = Math.max(shake, 1.2); nukeFlash();
  const victims = entities.filter((e) => e.alive && !e.isPlayer && !friends(e, player));
  if (!invMode() && state === 'playing') nukeWin = true; // antes dos abates: o limite de kills pode chamar endGame no meio
  for (const e of victims) kill(e, player, W_NADE, false, false, true);
  if (nukeWin) endGame();
}
const KILL_PHRASES = [
  (a, t) => `${a} pururucou ${t}`, (a, t) => `${a} pururucou ${t}`, (a, t) => `${a} pururucou ${t}`,
  (a, t) => `${a} fritou ${t}`, (a, t) => `${a} transformou ${t} em torresmo`, (a, t) => `${a} mandou ${t} pra chapa`,
  (a, t) => `${a} defumou ${t}`, (a, t) => `${a} fez ${t} virar bacon`, (a, t) => `${a} serviu ${t} no café da manhã`,
  (a, t) => `${a} botou ${t} no espeto`, (a, t) => `${a} temperou ${t} com chumbo`,
];
const SELF_PHRASES = [(t) => `${t} se pururucou`, (t) => `${t} virou bacon sozinho`, (t) => `${t} se jogou na frigideira`, (t) => `${t} fritou no próprio óleo`];
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
function showStamp(wIdx) { const s = $('stamp'); s.textContent = wIdx === KNIFE ? 'MOGGADO!' : wIdx === W_BOMB ? 'EXPLODIDO!' : wIdx === EGG_W ? 'OMELETADO!' : 'PURURUCADO!'; s.classList.remove('show'); void s.offsetWidth; s.classList.add('show'); }
function addKillFeed(a, t, wIdx, head, back = false, label = null, fx = 0) {
  if (wIdx === W_BOMB) { const n = `<b class="${t.isPlayer ? 'me' : ''}">${escapeHtml(t.name)}</b>`; addFeedLine(pick(BOOM_PHRASES)(n), `${t.name} explodiu com o botijão`); return; }
  const div = document.createElement('div'); div.className = 'kf' + (wIdx === KNIFE ? ' knife' : '');
  const nm = (e) => `<b class="${e.isPlayer ? 'me' : ''}">${escapeHtml(e.name)}</b>`;
  const knife = wIdx === KNIFE && a && a !== t; // faca: frase fixa "moggou"
  const zk = a && a.zt, fogK = (a && a.fog) || label === 'Névoa Assombrada'; // Invasão: zumbi / névoa
  div.innerHTML = zk ? `${nm(a)} pegou ${nm(t)} <i>[🧟 ${zk === 'boss' ? 'Chefão' : 'Zumbi'}]</i>` : fogK ? `${nm(t)} sumiu na <i>[🌫 Névoa Assombrada]</i>` : knife ? `${nm(a)} moggou ${nm(t)} ${killIcon('knife')} <i>Faca${back ? ' · pelas costas!' : ''}</i>`
    : a && a !== t ? `${pick(KILL_PHRASES)(nm(a), nm(t))} ${killIcon(wIdx === W_NADE ? 'nade' : WEAPONS[wIdx] && WEAPONS[wIdx].key, label, head, fx)} <i>${label || WEAPON_SHORT(wIdx)}${fx & 1 ? ' · pela parede' : ''}${fx & 2 ? ' · collateral' : ''}${head ? ' · no focinho!' : ''}</i>` : pick(SELF_PHRASES)(nm(t));
  // log canônico p/ testes (o texto exibido varia; faca é fixo)
  { const L = (window.__feedLog ||= []); L.push(knife ? `${a.name} moggou ${t.name} [Faca${back ? ' · pelas costas!' : ''}]` : a && a !== t ? `${a.name} pururucou ${t.name} [${label || WEAPON_SHORT(wIdx)}]${fx & 1 ? ' +parede' : ''}${fx & 2 ? ' +colat' : ''}` : `${t.name} se pururucou`); if (L.length > 20) L.shift(); }
  const kf = $('killfeed'); kf.prepend(div); while (kf.children.length > 6) kf.lastChild.remove();
  setTimeout(() => div.remove(), 6000);
}
function escapeHtml(s) { return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function boardHtml() {
  const rows = entities.filter((e) => !e.zt).sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths);
  const pg = (e) => (online ? `<td>${e.bot ? 'bot' : (e.isPlayer ? online.net.ping : e.ping || 0) + ' ms'}</td>` : '');
  return `<table><tr><th>#</th><th style="text-align:left">Docão</th><th>Abates</th><th>Mortes</th><th>K/D</th>${online ? '<th>Ping</th>' : ''}</tr>${rows.map((e, i) =>
    `<tr class="${e.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td style="text-align:left"><span class="dot" style="background:${teamMode() && e.team >= 0 ? TEAM_COLORS[e.team] : e.shirt}"></span>${escapeHtml(e.name)}${teamMode() ? ` <small style="color:${TEAM_COLORS[e.team] || '#fff'}">${e.caps || 0} ${mode === 'bomb' ? 'obj.' : (e.caps || 0) === 1 ? 'zona' : 'zonas'}</small>` : ''}</td><td>${e.kills}</td><td>${e.deaths}</td><td>${(e.kills / Math.max(1, e.deaths)).toFixed(2)}</td>${pg(e)}</tr>`).join('')}</table>`;
}
function paintSaberHud(p, w) {
  const el = $('saberhud'); if (!el) return;
  const on = !!(p.alive && w && w.saber);
  el.classList.toggle('hidden', !on);
  if (!on) return;
  const st = ensureSaber(p), prof = profileOf(w);
  const fill = $('saberstamfill'), bar = $('saberstam');
  if (fill) fill.style.width = Math.max(0, Math.min(100, st.stam)) + '%';
  if (bar) bar.classList.toggle('broke', gameTime < st.lockUntil);
  const pips = el.querySelectorAll('#saberpips i');
  pips.forEach((pip, i) => pip.classList.toggle('on', i <= st.combo && gameTime - st.swungAt < (prof ? prof.chain : 0.7) || (i === 0 && st.combo === 0 && gameTime >= st.nextSwing)));
  const c = $('saberc'), z = $('saberz');
  if (c) { const left = Math.max(0, st.dashReady - gameTime); c.textContent = left > 0.05 ? `C ${left.toFixed(1)}` : 'C'; c.classList.toggle('ready', left <= 0.05); }
  if (z) { const left = Math.max(0, st.specialReady - gameTime); z.textContent = left > 0.05 ? `Z ${left.toFixed(1)}` : (w.dual ? 'Z giro' : 'Z'); z.classList.toggle('ready', left <= 0.05 && !st.bladeOut); }
}
function updateHud(dt) {
  const p = player, w = WEAPONS[p.weapon];
  $('hpfill').style.width = Math.max(0, p.hp) + '%'; $('hptext').textContent = Math.max(0, Math.ceil(p.hp));
  $('hpfill').style.background = p.hp > 35 ? '' : 'linear-gradient(#ff7b7b,#e63946)';
  hpBar.classList.toggle('regen', !!(p.alive && p.regenOn)); // brilho verde + "+" pulsando enquanto regenera
  $('mag').textContent = w.melee ? '∞' : p.mag[p.weapon]; $('reserve').textContent = w.melee ? '' : ' / ' + p.reserve[p.weapon];
  { const title = weaponTitleParts(p), name = $('wtitle'), meta = $('wmeta'), mode = $('wmode'); if (name) name.textContent = title.name; if (meta) meta.textContent = title.meta ? '| ' + title.meta : ''; if (mode) mode.textContent = fireModeLabel(w); }
  for (let i = 0; i < NADE.max; i++) $('nade' + i).classList.toggle('on', i < p.nades);
  const pm = $('powermeter');
  const pulling = !!(p.alive && ((p.weapon === BOW && p.bowDraw) || (p.weapon === EGG_W && p.eggDraw)) && !p.charging && !gunner && !predator && !radioCall);
  pm.classList.toggle('hidden', !p.charging && !pulling);
  if (p.charging) { const k = chargePower(); $('powerfill').style.width = (k * 100).toFixed(0) + '%'; $('powertext').textContent = k >= 1 ? 'FORÇA MÁXIMA! solte Q' : 'Força do arremesso · solte Q'; }
  else if (pulling) { const egg = p.weapon === EGG_W, k = clamp((gameTime - (egg ? p.eggDraw : p.bowDraw)) / (WEAPONS[p.weapon].draw || 0.7), 0, 1); $('powerfill').style.width = (k * 100).toFixed(0) + '%'; $('powertext').textContent = egg ? (k >= 1 ? 'ELÁSTICO NO TALO! solte o clique' : 'Segura o clique · o ovo vai mais longe') : k >= 1 ? 'CORDA NO TALO! solte o clique' : 'Segura o clique · a flecha fica mais forte'; }
  paintSlot($('slot1'), 1, WEAPONS[p.slots[0]]); paintSlot($('slot2'), 2, WEAPONS[p.slots[1]]); paintSlot($('slot3'), 3, WEAPONS[p.slots[2]]);
  paintMiniHud(p);
  $('slot1').classList.toggle('active', p.weapon === p.slots[0]); $('slot2').classList.toggle('active', p.weapon === p.slots[1]); $('slot3').classList.toggle('active', p.weapon === p.slots[2]);
  const smokeN = $('smokeN'), stunN = $('stunN');
  if (smokeN) { smokeN.textContent = p.smokeNades || 0; smokeN.parentElement.classList.toggle('out', !(p.smokeNades > 0)); }
  if (stunN) { stunN.textContent = p.stunNades || 0; stunN.parentElement.classList.toggle('out', !(p.stunNades > 0)); }
  { const dh = p.alive || gameTime - p.deathAt < DEATHCAM_HOLD; document.body.classList.toggle('deadgray', !p.alive); const wasDead = document.body.classList.contains('dead'); $('deathpick').classList.toggle('hidden', dh); document.body.classList.toggle('dead', !dh); if (wasDead === dh) placeSocialHud(); if (!p.alive) updateRespawnBtn(p); } crossEl.style.visibility = p.alive && !(predator && predator.phase === 'fly') ? '' : 'hidden';
  $('reloadmsg').textContent = w.melee ? '' : p.reloadEnd > gameTime ? (w.shellReload ? 'Recarregando... (atire para interromper)' : 'Recarregando...') : (p.mag[p.weapon] === 0 ? (p.reserve[p.weapon] ? 'Aperte R' : 'Sem munição! Pegue uma caixa') : '');
  paintSaberHud(p, w);
  const left = Math.max(0, matchLimit() - gameTime); $('timer').textContent = exploreMode() ? '∞' : Number.isFinite(left) ? `${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, '0')}` : 'Treino ∞';
  $('score').textContent = exploreMode() ? `Exploração · ${currentMap ? currentMap.name : ''}` : `Abates: ${p.kills} · Mortes: ${p.deaths} · K/D: ${(p.kills / Math.max(1, p.deaths)).toFixed(2)} · Pontos: ${feedbackPoints()}`;
  const lead = entities.filter((e) => !e.zt).reduce((a, b) => (b.kills > a.kills ? b : a));
  $('leader').textContent = invMode() ? '' : exploreMode() ? 'Mapa vazio · , . ou [ ] trocam a primária' : mode === 'bomb' ? `Bomba (protótipo) · primeiro time a ${BOMB.WIN} rodadas vence` : training() ? 'Estande do Docão · B/N/M trocam a arma · munição infinita' : teamMode() ? `Dominação · primeiro time a ${DOM.WIN_CAPS} zonas vence` : lead.kills ? `Líder: ${lead.name} (${lead.kills}/${KILL_LIMIT})` : `Primeiro a ${KILL_LIMIT} abates vence`;
  updateLeaderboard(dt); tickFeedback(dt);
  hurtLevel = Math.max(0, hurtLevel - dt * 2.5);
  { const left = p.alive ? eggSplatUntil - gameTime : 0, el = $('eggsplat'); if (el) { el.style.opacity = left > 0 ? Math.min(1, left / 0.5).toFixed(2) : '0'; if (left > 0) drawEggSplat(); } } // sujeira de ovo na tela: 2 s escorrendo, some no último meio segundo
  updateHitDirs();
  $('vignette').style.opacity = Math.max(hurtLevel, p.alive && p.hp < 35 ? 0.35 + Math.sin(gameTime * 6) * 0.1 : 0);
  const cm = $('centermsg');
  const prot = $('protmsg');
  const shielded = !!(p.alive && gameTime < p.invulnUntil && msgTimer <= 0);
  if (prot) { prot.textContent = shielded ? 'PROTEGIDO' : ''; prot.classList.toggle('hidden', !shielded); }
  if (!p.alive) cm.textContent = `${p.killW === W_BOMB ? 'Você explodiu com o botijão 💥' : `Você foi ${p.killW === KNIFE ? 'moggado' : 'pururucado'} por ${p.lastAttacker && p.lastAttacker !== p ? p.lastAttacker.name : '???'}${p.killW === KNIFE && p.killBack ? ' (pelas costas!)' : ''}`} · ${respawnReady(p) ? (rsSent ? 'renascendo...' : 'clique em RENASCER (ou Espaço)') : Number.isFinite(p.respawnAt) ? `renasce em ${Math.max(0, p.respawnAt - gameTime).toFixed(1)}s` : 'aguarde...'}`;
  else if (msgTimer > 0) { msgTimer -= dt; if (cm.textContent.startsWith('Você foi ')) cm.textContent = ''; } // mensagem (ex.: "Mapa: …") tem prioridade; tira o "Você foi pururucado" que sobrou de antes de nascer
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
  const rMag = add(new THREE.BoxGeometry(0.075, 0.22, 0.11), toon(COLORS.red), 0, -0.15, -0.12, r); rMag.rotation.x = 0.2; // pente (sai/entra na recarga)
  add(new THREE.BoxGeometry(0.1, 0.15, 0.24), toon(COLORS.red), 0, -0.03, 0.3, r);
  add(new THREE.BoxGeometry(0.04, 0.04, 0.1), toon(COLORS.cyan), 0, 0.09, -0.02, r);
  const rCh = add(new THREE.BoxGeometry(0.03, 0.025, 0.04), toon(0x22252c), 0.07, 0.035, 0.08, r, 0.004); // alavanca de manejo
  // Calibre 12 (pump) no estilo SPAS-12: corpo preto, cano com protetor de calor furado, tubo de cartuchos, telha de polímero com sulcos, coronha de metal dobrada por cima
  const s = new THREE.Group(); root.add(s);
  const spasM = toon(0x2a2d33), spasD = toon(0x1b1d22), spasP = toon(0x202227), holeM = toon(0x08090b);
  add(new THREE.BoxGeometry(0.11, 0.13, 0.32), spasM, 0, 0, 0, s); // caixa da culatra
  add(new THREE.BoxGeometry(0.03, 0.014, 0.28), spasD, 0, 0.072, 0, s, 0.003); // trilho de cima
  add(new THREE.BoxGeometry(0.004, 0.04, 0.1), holeM, 0.056, 0.02, -0.03, s, 0); // janela de ejeção (direita)
  add(new THREE.BoxGeometry(0.004, 0.022, 0.07), toon(COLORS.red), 0.056, -0.035, 0.07, s, 0); // faixinha vermelha "12"
  add(new THREE.BoxGeometry(0.1, 0.11, 0.05), spasD, 0, -0.005, 0.185, s); // tampa de trás
  add(new THREE.BoxGeometry(0.065, 0.17, 0.075), spasP, 0, -0.14, 0.15, s).rotation.x = -0.35; // empunhadura de pistola
  add(new THREE.BoxGeometry(0.014, 0.01, 0.09), spasD, 0, -0.095, 0.07, s, 0.003); add(new THREE.BoxGeometry(0.014, 0.03, 0.01), spasD, 0, -0.08, 0.025, s, 0.003); // guarda-mato
  add(new THREE.CylinderGeometry(0.026, 0.026, 0.7, 14), toon(0x3a3d44), 0, 0.04, -0.5, s).rotation.x = Math.PI / 2; // cano
  add(new THREE.CylinderGeometry(0.037, 0.037, 0.42, 16), spasD, 0, 0.045, -0.48, s).rotation.x = Math.PI / 2; // protetor de calor
  for (const z of [-0.64, -0.56, -0.48, -0.4, -0.32]) for (const k of [-1, 0, 1]) add(new THREE.CylinderGeometry(0.007, 0.007, 0.006, 8), holeM, k * 0.021, k ? 0.0754 : 0.082, z, s, 0).rotation.z = -k * 0.62; // furos do protetor
  add(new THREE.CylinderGeometry(0.024, 0.024, 0.62, 12), spasM, 0, -0.035, -0.46, s).rotation.x = Math.PI / 2; // tubo de cartuchos
  add(new THREE.CylinderGeometry(0.029, 0.029, 0.045, 12), spasD, 0, -0.035, -0.78, s, 0.004).rotation.x = Math.PI / 2; // tampa do tubo
  add(new THREE.BoxGeometry(0.06, 0.1, 0.028), spasD, 0, 0.003, -0.74, s, 0.004); // braçadeira cano/tubo
  add(new THREE.TorusGeometry(0.028, 0.006, 6, 16), toon(0x14161a), 0, 0.04, -0.85, s, 0.003); // boca
  add(new THREE.BoxGeometry(0.012, 0.03, 0.014), spasD, 0, 0.09, -0.81, s, 0.003); add(new THREE.SphereGeometry(0.01, 8, 6), toon(COLORS.cyan), 0, 0.108, -0.81, s, 0.002); // massa de mira
  for (const x of [-0.042, 0.042]) { add(new THREE.BoxGeometry(0.01, 0.014, 0.44), spasD, x, 0.098, -0.05, s, 0.003); add(new THREE.BoxGeometry(0.012, 0.055, 0.02), spasD, x, 0.075, -0.27, s, 0.003); } // coronha dobrada: trilhos (o meio fica livre pra mira)
  add(new THREE.BoxGeometry(0.096, 0.014, 0.022), spasD, 0, 0.104, -0.27, s, 0.003); add(new THREE.BoxGeometry(0.1, 0.035, 0.035), spasD, 0, 0.085, 0.17, s, 0.003); // gancho da coronha + pivô
  const pumpPart = new THREE.Group(); pumpPart.position.set(0, -0.035, -0.36); s.add(pumpPart);
  const sShell = new THREE.Group(); s.add(sShell); sShell.visible = false; // cartucho entrando pela janela de baixo
  add(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 10), toon(COLORS.red), 0, 0, 0, sShell, 0.004).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.024, 0.024, 0.018, 10), toon(0xd9a441), 0, 0, 0.04, sShell, 0.003).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.1, 0.085, 0.24), spasP, 0, 0, 0, pumpPart); // telha de polímero
  for (const z of [-0.09, -0.054, -0.018, 0.018, 0.054, 0.09]) add(new THREE.BoxGeometry(0.106, 0.091, 0.012), holeM, 0, 0, z, pumpPart, 0); // sulcos
  add(new THREE.BoxGeometry(0.108, 0.095, 0.02), spasD, 0, 0, -0.125, pumpPart, 0.004); // lábio da frente
  const pumpShoulder = new THREE.Vector3(-0.42, -0.5, 0.28);
  let pumpHand = makeFPForearm(getSkin()); s.add(pumpHand);
  // Três snipers: a mão do ferrolho fica dentro de cada modelo (sniper-view.js)
  const sn = makeFPSniper('torresmo'); root.add(sn);
  // bala da recarga (vai pra sniper que estiver na mão: Torresmo, Canhão ou Carabina)
  const sRound = new THREE.Group(); sn.add(sRound); sRound.visible = false;
  add(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), toon(0xd9a441), 0, 0, 0, sRound, 0.003).rotation.x = Math.PI / 2;
  add(new THREE.ConeGeometry(0.012, 0.025, 8), toon(0xb87333), 0, 0, -0.042, sRound, 0.003).rotation.x = -Math.PI / 2;
  // Bazuca do Chiqueiro: RPG no ombro — tubo longo, boca na frente (-Z), traseira alargada, ogiva saindo da boca
  const bz = new THREE.Group(); bz.position.set(0.2, -0.16, -0.06); bz.rotation.set(0.06, 0.26, -0.07); bz.scale.setScalar(1.58); root.add(bz);
  const TY = 0.06, MZ = -1.34; // eixo do tubo e boca (z negativo = frente da câmera)
  const tube = add(new THREE.CylinderGeometry(0.09, 0.09, 1.52, 20), toon(0x6b7a3a), 0, TY, -0.54, bz); tube.rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.092, 0.122, 0.08, 18), toon(0x3d4a28), 0, TY, MZ + 0.02, bz).rotation.x = Math.PI / 2; // quebra-chama, largo na frente
  add(new THREE.TorusGeometry(0.116, 0.016, 8, 22), toon(0xf5e6d0), 0, TY, MZ, bz, 0.004); // anel da boca
  for (const z of [-1.02, -0.22]) add(new THREE.CylinderGeometry(0.102, 0.102, 0.05, 18), toon(COLORS.red), 0, TY, z, bz).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.102, 0.102, 0.38, 18), toon(0x5a6834), 0, TY, -0.35, bz).rotation.x = Math.PI / 2; // capa do meio
  const rear = add(new THREE.CylinderGeometry(0.17, 0.092, 0.3, 18), toon(0x4a5528), 0, TY, 0.36, bz); rear.rotation.x = Math.PI / 2; // venturi largo para trás (+Z)
  add(new THREE.TorusGeometry(0.164, 0.014, 8, 20), toon(0x2a2d24), 0, TY, 0.5, bz, 0.003);
  add(new THREE.BoxGeometry(0.05, 0.2, 0.062), toon(0x2c3038), 0, TY - 0.15, 0.08, bz).rotation.x = -0.48; // empunhadura
  add(new THREE.BoxGeometry(0.042, 0.014, 0.11), toon(0x22252c), 0, TY - 0.055, 0.0, bz, 0.003); // guarda-mato
  add(new THREE.BoxGeometry(0.046, 0.15, 0.05), toon(0x2c3038), 0, TY - 0.13, -0.52, bz); // grip dianteiro
  add(new THREE.BoxGeometry(0.016, 0.14, 0.016), toon(0x1a1c22), 0, TY + 0.12, -1.08, bz, 0.003); // poste da alça da frente
  add(new THREE.SphereGeometry(0.018, 8, 6), toon(0x1a1c22), 0, TY + 0.19, -1.08, bz, 0.003);
  add(new THREE.BoxGeometry(0.014, 0.13, 0.014), toon(0x1a1c22), -0.03, TY + 0.1, -0.02, bz, 0.003);
  add(new THREE.BoxGeometry(0.014, 0.13, 0.014), toon(0x1a1c22), 0.03, TY + 0.1, -0.02, bz, 0.003);
  add(new THREE.BoxGeometry(0.078, 0.016, 0.016), toon(0x1a1c22), 0, TY + 0.16, -0.02, bz, 0.003); // alça de trás
  const sticker = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.075), new THREE.MeshBasicMaterial({ transparent: true, map: (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 96; const x = c.getContext('2d'); x.fillStyle = '#f5e6d0'; x.beginPath(); x.roundRect(4, 4, 120, 88, 18); x.fill(); drawLogo(x, 64, 48, 60, '#e63946'); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })() }));
  sticker.position.set(-0.108, TY + 0.01, -0.48); sticker.rotation.y = -Math.PI / 2; bz.add(sticker);
  const rocketTip = makeRocket(1.15); rocketTip.rotation.y = Math.PI; rocketTip.position.set(0, TY, -1.62); bz.add(rocketTip); // ogiva (focinho) para -Z, cauda na boca
  const loadRocket = makeRocket(1.15); loadRocket.rotation.y = Math.PI; loadRocket.visible = false; bz.add(loadRocket); // foguete novo entrando no tubo
  // Pistolinha Leitão: ferrolho rosinha, cabo escuro
  const ps = new THREE.Group(); ps.position.set(0, 0.05, -0.04); root.add(ps);
  const slide = new THREE.Group(); ps.add(slide);
  add(new THREE.BoxGeometry(0.075, 0.08, 0.3), toon(0xff9fb6), 0, 0.03, -0.1, slide);
  add(new THREE.BoxGeometry(0.03, 0.03, 0.03), toon(COLORS.cyan), 0, 0.085, -0.23, slide, 0.003);
  add(new THREE.BoxGeometry(0.05, 0.025, 0.025), toon(0x22252c), 0, 0.083, 0.03, slide, 0.003);
  add(new THREE.CircleGeometry(0.014, 10), basic(0x111111), 0, 0.03, -0.252, slide, 0).rotation.y = Math.PI;
  add(new THREE.BoxGeometry(0.07, 0.05, 0.26), toon(0x3b3f4a), 0, -0.02, -0.08, ps);
  add(new THREE.BoxGeometry(0.065, 0.17, 0.09), toon(0x3b3f4a), 0, -0.12, 0.03, ps).rotation.x = 0.22;
  const pMag = add(new THREE.BoxGeometry(0.055, 0.16, 0.075), toon(0xff9fb6), 0, -0.14, 0.035, ps, 0.004); pMag.rotation.x = 0.22; pMag.scale.set(0.9, 1, 0.9); // pente da pistola (base aparece no cabo)
  // Faca de churrasqueiro: rig próprio (faca + braço direito) que faz as animações de sacar/golpe/estocada
  const kr = new THREE.Group(); root.add(kr); const kpiv = new THREE.Group(); kpiv.position.set(0.02, -0.12, 0.06); kr.add(kpiv);
  const knife = makeKnife(1.55, 0.006); knife.rotation.set(0.42, 0.32, -0.55); kpiv.add(knife);
  const snH = makeFPSniper('canhao'); root.add(snH);
  const snL = makeFPSniper('carabina'); root.add(snL);
  guns.push(r, s, sn, bz, ps, snH, snL, kr); for (const o of [s, sn, bz, ps, snH, snL, kr]) o.visible = false; // índice = arma (7 = faca)
  // sabre em 1ª pessoa: poseKnight() posiciona e aponta o cabo todo quadro (guarda de cavaleiro, lâmina erguida)
  const makeSaberHold = () => { const h = new THREE.Group(); h.scale.setScalar(2.45); const sb = makeFPSaber(); sb.rotation.set(0, 0, 0); h.add(sb); h.userData.saber = sb; h.userData.blade = sb.userData.blade; h.userData.glow = sb.userData.glow; return h; };
  const saberHold = makeSaberHold(); const saber = saberHold.userData.saber;
  saberHold.userData.blade = saber.userData.blade; saberHold.userData.glow = saber.userData.glow;
  saberHold.visible = false; root.add(saberHold); guns.push(saberHold); // 8 = sabre
  let saberR = makeFPForearm(getSkin()), saberL = makeFPForearm(getSkin());
  root.add(saberR, saberL); saberR.visible = saberL.visible = false;
  let bowGrip = makeFPForearm(getSkin()), bowDraw = makeFPForearm(getSkin());
  root.add(bowGrip, bowDraw); bowGrip.visible = bowDraw.visible = false;
  // 9 · MP5K: coronha dobrada na lateral, corpo retangular, cano curto, pente vertical, alça
  const uzi = new THREE.Group(); uzi.position.set(0.01, 0.03, 0.02); root.add(uzi);
  add(new THREE.BoxGeometry(0.1, 0.08, 0.36), toon(0x2a2d35), 0, 0, 0.02, uzi); // corpo retangular
  add(new THREE.BoxGeometry(0.1, 0.08, 0.024), toon(0x1a1c22), 0, 0, 0.21, uzi); // tampa de trás
  add(new THREE.BoxGeometry(0.078, 0.06, 0.18), toon(0x32363f), 0, -0.01, -0.26, uzi); // guarda-mão
  add(new THREE.BoxGeometry(0.034, 0.034, 0.12), toon(0x1a1c22), 0, 0.004, -0.41, uzi); // cano curto
  add(new THREE.BoxGeometry(0.044, 0.044, 0.016), toon(0x111318), 0, 0.004, -0.478, uzi); // boca
  add(new THREE.BoxGeometry(0.024, 0.016, 0.5), toon(0x22252c), 0, 0.05, -0.15, uzi); // tubo de manejo
  add(new THREE.BoxGeometry(0.012, 0.04, 0.012), toon(0x1a1c22), 0, 0.068, -0.4, uzi); // poste da alça da frente
  add(new THREE.BoxGeometry(0.04, 0.01, 0.032), toon(0x1a1c22), 0, 0.088, -0.4, uzi); // capuz da alça
  add(new THREE.BoxGeometry(0.034, 0.026, 0.034), toon(0x1a1c22), 0, 0.058, 0.1, uzi); // alça de trás
  add(new THREE.BoxGeometry(0.062, 0.14, 0.072), toon(0x3b3f4a), 0, -0.1, 0.14, uzi).rotation.x = 0.18; // empunhadura
  add(new THREE.BoxGeometry(0.014, 0.01, 0.08), toon(0x1a1c22), 0, -0.052, 0.06, uzi); // guarda-mato
  add(new THREE.BoxGeometry(0.056, 0.045, 0.058), toon(0x22252c), 0, -0.06, -0.02, uzi); // poço do pente
  add(new THREE.BoxGeometry(0.102, 0.016, 0.05), toon(COLORS.red), 0, 0.012, 0.08, uzi); // faixa da granja
  add(new THREE.BoxGeometry(0.012, 0.012, 0.32), toon(0x1a1c22), -0.058, 0, 0.04, uzi); // coronha dobrada na lateral
  add(new THREE.BoxGeometry(0.014, 0.068, 0.042), toon(0x1a1c22), -0.058, -0.012, 0.18, uzi); // soleira encostada
  const uMag = add(new THREE.BoxGeometry(0.05, 0.17, 0.055), toon(0x3b3f4a), 0, -0.16, -0.02, uzi, 0.004); uMag.rotation.x = 0.12; // pente mais curto que o da uzi (0,22)
  const uCh = add(new THREE.BoxGeometry(0.08, 0.016, 0.036), toon(0x111318), 0.055, 0.045, 0.02, uzi, 0.003); // alavanca de manejo
  const p90g = new THREE.Group(); p90g.position.set(0.0, 0.04, 0.0); root.add(p90g);
  add(new THREE.BoxGeometry(0.11, 0.075, 0.56), toon(0x4a5568), 0, 0.02, -0.02, p90g);
  add(new THREE.BoxGeometry(0.045, 0.04, 0.22), toon(0x22252c), 0, 0.02, -0.4, p90g);
  add(new THREE.BoxGeometry(0.06, 0.13, 0.08), toon(0x2a2d35), 0, -0.08, 0.16, p90g).rotation.x = 0.22;
  add(new THREE.BoxGeometry(0.09, 0.08, 0.16), toon(0x3a4250), 0, 0.0, 0.3, p90g);
  const p90Mag = add(new THREE.BoxGeometry(0.09, 0.07, 0.3), toon(0xc9a36a), 0, 0.09, -0.02, p90g, 0.004);
  const p90Ch = add(new THREE.BoxGeometry(0.025, 0.02, 0.05), toon(0x1a1c22), 0.06, 0.02, 0.18, p90g, 0.003);
  const nail = new THREE.Group(); nail.position.set(0, 0.08, -0.02); root.add(nail);
  add(new THREE.BoxGeometry(0.15, 0.12, 0.3), toon(0xf0c14a), 0, 0.02, 0.02, nail);
  add(new THREE.CylinderGeometry(0.022, 0.008, 0.32, 10), toon(0xd0d4dc), 0, 0.02, -0.28, nail).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.07, 0.16, 0.08), toon(0x2a2d35), 0, -0.12, 0.08, nail).rotation.x = 0.18;
  const nStrip = add(new THREE.BoxGeometry(0.06, 0.055, 0.14), toon(0xe8eef2), 0.04, 0.09, 0.04, nail, 0.004);
  for (const o of [uzi, p90g, nail]) o.visible = false;
  guns.push(uzi, p90g, nail); // 9 MP5K, 10 P90, 11 furadeira
  // Escopeta semi: cano curto, pente embaixo, sem telha de pump
  const semi = new THREE.Group(); semi.position.set(0.02, 0.02, 0.02); root.add(semi);
  add(new THREE.BoxGeometry(0.12, 0.12, 0.44), toon(0x2c3138), 0, 0.02, 0.02, semi);
  add(new THREE.BoxGeometry(0.1, 0.14, 0.28), toon(0x5c4030), 0, -0.02, 0.34, semi).rotation.x = -0.1;
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.5, 12), toon(0x3a3e46), 0, 0.045, -0.4, semi).rotation.x = Math.PI / 2;
  add(new THREE.TorusGeometry(0.03, 0.007, 6, 14), toon(0xf5e6d0), 0, 0.045, -0.64, semi, 0.003);
  add(new THREE.BoxGeometry(0.13, 0.035, 0.1), toon(COLORS.cyan), 0, 0.045, 0.1, semi, 0.004);
  const semiMag = add(new THREE.BoxGeometry(0.07, 0.16, 0.09), toon(0xc45a3a), 0, -0.12, 0.04, semi, 0.004); semiMag.rotation.x = 0.1;
  const semiCh = add(new THREE.BoxGeometry(0.02, 0.03, 0.06), toon(0x111318), 0.07, 0.07, 0.12, semi, 0.003);
  semi.visible = false; guns.push(semi); // 12 = semi
  const cross = makeFPCrossbow(); cross.position.set(0, 0.04, 0.02); cross.scale.setScalar(1.15); cross.visible = false; root.add(cross); // reta pra frente como o fuzil: trilho no eixo da mira, coronha no ombro (sai pelo canto de baixo)
  const bow = makeFPBow(); bow.position.set(0.08, -0.06, 0.16); bow.rotation.set(0.08, 0.28, 0); bow.scale.setScalar(1.7); bow.visible = false; root.add(bow);
  guns.push(cross, bow); // 13 besta, 14 arco
  // FAMAS da Pocilga (bullpup): alça de transporte com a alavanca embaixo, pente atrás do cabo, bipé dobrado sob a telha
  const famas = new THREE.Group(); famas.position.set(0, 0.01, 0.0); root.add(famas);
  add(new THREE.BoxGeometry(0.11, 0.13, 0.7), toon(0x4b5240), 0, 0, 0.0, famas);
  add(new THREE.BoxGeometry(0.1, 0.09, 0.26), toon(0x3a3f33), 0, -0.02, -0.46, famas);
  add(new THREE.CylinderGeometry(0.02, 0.02, 0.26, 10), toon(0x22252c), 0, 0.0, -0.68, famas).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.03, 0.026, 0.06, 10), toon(0x1a1c22), 0, 0.0, -0.79, famas, 0.004).rotation.x = Math.PI / 2; // quebra-chama
  add(new THREE.BoxGeometry(0.035, 0.03, 0.54), toon(0x22252c), 0, 0.155, -0.06, famas, 0.004); // alça de transporte
  for (const z of [-0.31, 0.19]) add(new THREE.BoxGeometry(0.035, 0.09, 0.035), toon(0x22252c), 0, 0.1, z, famas, 0.004);
  add(new THREE.BoxGeometry(0.02, 0.03, 0.02), toon(COLORS.cyan), 0, 0.185, -0.31, famas, 0.003); // massa de mira
  add(new THREE.BoxGeometry(0.065, 0.15, 0.08), toon(0x2a2d35), 0, -0.12, 0.08, famas).rotation.x = 0.22;
  add(new THREE.BoxGeometry(0.03, 0.02, 0.22), toon(0x2a2d35), 0, -0.18, 0.02, famas, 0.003); // guarda-mato inteiro
  add(new THREE.BoxGeometry(0.1, 0.13, 0.03), toon(0x22252c), 0, -0.005, 0.36, famas, 0.004); // soleira
  add(new THREE.BoxGeometry(0.115, 0.03, 0.08), toon(COLORS.red), 0, 0.035, -0.22, famas, 0.004);
  for (const x of [-0.028, 0.028]) add(new THREE.BoxGeometry(0.014, 0.014, 0.22), toon(0x1a1c22), x, -0.075, -0.46, famas, 0.003); // bipé dobrado
  add(new THREE.BoxGeometry(0.006, 0.04, 0.09), basic(0x111111), 0.057, 0.03, 0.24, famas, 0); // janela de ejeção
  const famasMag = add(new THREE.BoxGeometry(0.07, 0.2, 0.1), toon(COLORS.red), 0, -0.15, 0.27, famas, 0.004); famasMag.rotation.x = 0.1;
  const famasCh = add(new THREE.BoxGeometry(0.026, 0.026, 0.05), toon(0x111318), 0, 0.105, -0.12, famas, 0.003); // alavanca de manejo
  const famasCase = add(new THREE.CylinderGeometry(0.012, 0.012, 0.045, 8), toon(0xd9a441), 0.06, 0.03, 0.24, famas, 0.002); famasCase.rotation.z = Math.PI / 2; famasCase.visible = false; // cápsula (molde)
  famas.visible = false; guns.push(famas); // 15 = FAMAS
  // Disco Voador: lançador roxo com um berço na boca; o disco-OVNI carregado fica girando em cima do berço
  const dgun = new THREE.Group(); dgun.position.set(0, 0.02, 0); root.add(dgun);
  add(new THREE.BoxGeometry(0.13, 0.12, 0.5), toon(0x5b3fa0), 0, 0, -0.06, dgun);
  add(new THREE.BoxGeometry(0.1, 0.1, 0.18), toon(0x3a2a6a), 0, -0.01, 0.28, dgun);
  add(new THREE.BoxGeometry(0.065, 0.15, 0.08), toon(0x2a2d35), 0, -0.12, 0.1, dgun).rotation.x = 0.22;
  add(new THREE.CylinderGeometry(0.17, 0.12, 0.05, 22), toon(0x2a2d35), 0, 0.03, -0.42, dgun); // berço do disco
  for (const x of [-0.05, 0.05]) add(new THREE.SphereGeometry(0.018, 8, 6), basic(0x7be08a), x, 0.07, -0.02, dgun, 0.003); // luzinhas
  add(new THREE.BoxGeometry(0.135, 0.03, 0.12), toon(COLORS.cyan), 0, 0.03, 0.1, dgun, 0.004);
  const discLoaded = makeUfo(0.95); discLoaded.position.set(0, 0.09, -0.42); dgun.add(discLoaded);
  dgun.visible = false; guns.push(dgun); // 16 = Disco Voador
  const dualR = makeSaberHold(), dualL = makeSaberHold(); dualR.userData.twin = dualL; dualR.visible = dualL.visible = false; root.add(dualR, dualL);
  guns.push(dualR); // 17 = Sabre Duplo (o da mão esquerda é o twin)
  // Lança-Milho: pipoqueira de quermesse (tambor listrado com janelinha), funil com a espiga (pente) em cima, manivela do lado
  const corn = new THREE.Group(); corn.position.set(0, 0.02, 0); root.add(corn);
  add(new THREE.CylinderGeometry(0.1, 0.1, 0.34, 18), toon(COLORS.red), 0, 0, -0.08, corn, 0.005).rotation.x = Math.PI / 2;
  for (const z of [-0.2, -0.08, 0.04]) add(new THREE.CylinderGeometry(0.102, 0.102, 0.035, 18), toon(0xf5f1e8), 0, 0, z, corn, 0).rotation.x = Math.PI / 2; // listras
  add(new THREE.BoxGeometry(0.006, 0.07, 0.15), new THREE.MeshToonMaterial({ color: 0xbfefff, transparent: true, opacity: 0.5 }), 0.1, 0.01, -0.08, corn, 0.003); // janelinha
  const cornBits = []; for (let k = 0; k < 6; k++) { const b = add(new THREE.IcosahedronGeometry(0.016, 0), basic(0xfff6dc), 0.088, -0.02 + (k % 2) * 0.028, -0.14 + k * 0.022, corn, 0); b.userData.y0 = b.position.y; cornBits.push(b); } // pipoquinhas dentro
  add(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 14), toon(0x2a2d35), 0, 0.01, -0.36, corn, 0.004).rotation.x = Math.PI / 2; // cano
  add(new THREE.TorusGeometry(0.052, 0.012, 8, 18), toon(0xffd23f), 0, 0.01, -0.49, corn, 0.003); // boca amarela
  add(new THREE.ConeGeometry(0.07, 0.09, 14, 1, true), toon(0xffd23f), 0, 0.13, -0.02, corn, 0.004).rotation.x = Math.PI; // funil
  const cornCob = new THREE.Group(); cornCob.position.set(0, 0.2, -0.02); corn.add(cornCob);
  const cornCore = add(new THREE.CylinderGeometry(0.035, 0.03, 0.16, 10), toon(0xf2c230), 0, 0, 0, cornCob, 0.004); // espiga (pente)
  const cornKernels = []; for (let k = 0; k < 10; k++) { const a = k * 2.4; cornKernels.push(add(new THREE.SphereGeometry(0.012, 6, 4), toon(0xffd84a), Math.cos(a) * 0.034, -0.06 + (k % 5) * 0.03, Math.sin(a) * 0.034, cornCob, 0)); }
  add(new THREE.ConeGeometry(0.045, 0.06, 6), toon(0x7bbf4a), 0, 0.1, 0, cornCob, 0.003).rotation.z = 0.25; // palha
  const cornCrank = new THREE.Group(); cornCrank.position.set(-0.11, 0, -0.06); corn.add(cornCrank);
  add(new THREE.BoxGeometry(0.012, 0.09, 0.016), toon(0x8b5a2b), -0.01, 0.04, 0, cornCrank, 0.003); add(new THREE.CylinderGeometry(0.012, 0.012, 0.04, 8), toon(COLORS.red), -0.03, 0.085, 0, cornCrank, 0.003).rotation.z = Math.PI / 2; // manivela
  add(new THREE.BoxGeometry(0.065, 0.15, 0.08), toon(0x2a2d35), 0, -0.14, 0.12, corn).rotation.x = 0.22; // cabo
  add(new THREE.BoxGeometry(0.06, 0.06, 0.14), toon(0x8b5a2b), 0, -0.1, -0.24, corn, 0.004); // guarda-mão
  corn.visible = false; guns.push(corn); // 18 = Lança-Milho
  const sling = makeFPSlingshot(); sling.position.set(0.02, -0.06, -0.06); sling.rotation.set(0.12, 0.18, 0.04); sling.scale.setScalar(1.6); sling.visible = false; root.add(sling); guns.push(sling); // 19 = Estilingue de Ovo
  // Minigun do Galpão: 6 canos que giram, motor atrás, alça em cima, caixa de munição à esquerda com a fita de balas.
  // Cabos nas mãos dos braços de fuzil: direita (0,-0.13,0.13) e esquerda (-0.04,-0.1,-0.3).
  const mini = new THREE.Group(); root.add(mini);
  add(new THREE.BoxGeometry(0.16, 0.17, 0.46), toon(0x3a3f4a), 0, 0.0, -0.02, mini); // carcaça
  add(new THREE.CylinderGeometry(0.075, 0.075, 0.14, 14), toon(0x2a2d35), 0, 0.0, 0.27, mini).rotation.x = Math.PI / 2; // motor
  add(new THREE.BoxGeometry(0.165, 0.035, 0.12), toon(COLORS.red), 0, 0.09, -0.06, mini, 0.004); // faixa da granja
  add(new THREE.BoxGeometry(0.03, 0.03, 0.26), toon(0x22252c), 0, 0.17, -0.04, mini, 0.004); for (const z of [-0.15, 0.07]) add(new THREE.BoxGeometry(0.03, 0.08, 0.03), toon(0x22252c), 0, 0.12, z, mini, 0.004); // alça de cima
  add(new THREE.BoxGeometry(0.065, 0.16, 0.08), toon(0x2a2d35), 0, -0.12, 0.13, mini).rotation.x = 0.2; // cabo de trás (mão direita)
  add(new THREE.BoxGeometry(0.05, 0.13, 0.06), toon(0x2a2d35), -0.04, -0.12, -0.3, mini); // empunhadura da frente (mão esquerda)
  const mgBarrels = new THREE.Group(); mgBarrels.position.set(0, 0, -0.52); mini.add(mgBarrels);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(new THREE.CylinderGeometry(0.026, 0.026, 0.62, 8), toon(0x22252c), Math.cos(a) * 0.062, Math.sin(a) * 0.062, 0, mgBarrels, 0.003).rotation.x = Math.PI / 2; }
  for (const z of [-0.29, -0.05, 0.22]) add(new THREE.TorusGeometry(0.09, 0.016, 6, 18), toon(0x1a1c22), 0, 0, z, mgBarrels, 0.003); // anéis
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.64, 8), toon(0x15171c), 0, 0, 0, mgBarrels, 0).rotation.x = Math.PI / 2; // eixo
  const mgGlowMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const mgGlow = new THREE.Group(); mgGlow.userData.noCamo = true; mgGlow.visible = false; mgBarrels.add(mgGlow); // calor: capa que acende por cima dos canos (a camuflagem não mexe)
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, m = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.44, 8), mgGlowMat); m.rotation.x = Math.PI / 2; m.position.set(Math.cos(a) * 0.062, Math.sin(a) * 0.062, -0.08); mgGlow.add(m); }
  const mgBox = add(new THREE.BoxGeometry(0.2, 0.26, 0.32), toon(0x5c6b3a), -0.16, -0.08, 0.05, mini); // caixa de munição (cai na recarga)
  add(new THREE.BoxGeometry(0.21, 0.04, 0.1), toon(COLORS.red), 0, 0.1, 0, mgBox, 0.003);
  for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.036, 0.028, 0.06), toon(0xd9a441), -0.12 + i * 0.024, -0.01 + i * 0.016, 0.0, mini, 0.002); // fita de balas subindo pra carcaça
  add(new THREE.BoxGeometry(0.006, 0.04, 0.09), basic(0x111111), 0.082, 0.0, 0.02, mini, 0); // janela de ejeção
  const mgCase = add(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), toon(0xd9a441), 0.085, 0.0, 0.02, mini, 0.002); mgCase.rotation.z = Math.PI / 2; mgCase.visible = false; // cápsula (molde)
  mini.scale.setScalar(1.3); mini.userData.barrels = mgBarrels; mini.visible = false; guns.push(mini); // 20 = Minigun
  // Metralhadora do Chiqueiro: corpo longo, cano comprido, caixa de fita do lado, bipé dobrado. Índice 21.
  const lmg = new THREE.Group(); lmg.name = 'fp-lmg'; root.add(lmg);
  add(new THREE.BoxGeometry(0.13, 0.15, 0.78), toon(0x3a4034), 0, 0, -0.06, lmg);
  add(new THREE.CylinderGeometry(0.028, 0.028, 0.46, 10), toon(0x22252c), 0, 0.02, -0.64, lmg).rotation.x = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.04, 0.034, 0.08, 10), toon(0x1a1c22), 0, 0.02, -0.88, lmg, 0.004).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.12, 0.16, 0.26), toon(0x8b5a2b), 0, -0.02, 0.34, lmg).rotation.x = -0.08;
  add(new THREE.BoxGeometry(0.06, 0.16, 0.08), toon(0x2a2d35), 0, -0.12, 0.08, lmg).rotation.x = 0.18;
  add(new THREE.BoxGeometry(0.14, 0.03, 0.1), toon(COLORS.red), 0, 0.08, -0.1, lmg, 0.004);
  for (const x of [-0.04, 0.04]) add(new THREE.BoxGeometry(0.016, 0.016, 0.28), toon(0x1a1c22), x, -0.09, -0.42, lmg, 0.003);
  const lmgMag = add(new THREE.BoxGeometry(0.09, 0.2, 0.16), toon(0x5c6b3a), -0.12, -0.08, -0.02, lmg, 0.004);
  const lmgCh = add(new THREE.BoxGeometry(0.03, 0.025, 0.05), toon(0x22252c), 0.08, 0.04, 0.1, lmg, 0.004);
  lmg.visible = false; guns.push(lmg); // 21 = Metralhadora do Chiqueiro
  // Commando da Granja: fuzil reto, cano comprido, coronha, pente e alavanca. Índice 22.
  const cmd = new THREE.Group(); cmd.name = 'fp-commando'; root.add(cmd);
  add(new THREE.BoxGeometry(0.07, 0.085, 0.78), toon(0x3a4038), 0, 0.01, -0.02, cmd); // corpo fino
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.5, 10), toon(0x22252c), 0, 0.02, -0.64, cmd).rotation.x = Math.PI / 2; // cano comprido
  add(new THREE.CylinderGeometry(0.02, 0.016, 0.05, 10), toon(0x1a1c22), 0, 0.02, -0.9, cmd, 0.003).rotation.x = Math.PI / 2; // boca
  add(new THREE.BoxGeometry(0.065, 0.09, 0.28), toon(0x5c4632), 0, 0.0, 0.48, cmd); // coronha
  add(new THREE.BoxGeometry(0.045, 0.12, 0.055), toon(0x2a2d35), 0, -0.09, 0.18, cmd).rotation.x = 0.16; // cabo
  add(new THREE.BoxGeometry(0.03, 0.02, 0.22), toon(0x22252c), 0, 0.065, -0.06, cmd, 0.003); // trilho reto
  const cMag = add(new THREE.BoxGeometry(0.055, 0.2, 0.08), toon(0x2a2d35), 0, -0.15, -0.12, cmd, 0.004); cMag.rotation.x = 0.2; // pente (sai/entra na recarga, igual ao fuzil)
  const cCh = add(new THREE.BoxGeometry(0.028, 0.02, 0.04), toon(0x22252c), 0.05, 0.04, 0.08, cmd, 0.003); // alavanca de manejo
  cmd.visible = false; guns.push(cmd); // 22 = Commando da Granja
  // braços (pose de fuzil, de pistola e de faca)
  let arms = makeFPArms(getSkin()), armsP = makeFPArms(getSkin(), 'pistol'), armsK = makeFPArms(getSkin(), 'knife'); root.add(arms, armsP); kr.add(armsK); armsP.visible = false; armsP.position.set(0, 0.07, -0.04);
  const setSkin = (id) => { root.remove(arms, armsP); kr.remove(armsK); arms = makeFPArms(getSkin(id)); armsP = makeFPArms(getSkin(id), 'pistol'); armsK = makeFPArms(getSkin(id), 'knife'); armsP.position.set(0, 0.07, -0.04); root.add(arms, armsP); kr.add(armsK); fpRef.arms = arms; fpRef.armsP = armsP; s.remove(pumpHand); pumpHand = makeFPForearm(getSkin(id)); s.add(pumpHand); root.remove(saberR, saberL); saberR = makeFPForearm(getSkin(id)); saberL = makeFPForearm(getSkin(id)); root.add(saberR, saberL); fpRef.saberR = saberR; fpRef.saberL = saberL; root.remove(bowGrip, bowDraw); bowGrip = makeFPForearm(getSkin(id)); bowDraw = makeFPForearm(getSkin(id)); root.add(bowGrip, bowDraw); fpRef.bowGrip = bowGrip; fpRef.bowDraw = bowDraw; pumpHand.userData.noCamo = true; armsK.userData.noCamo = true; };
  const fpRef = { arms, armsP };
  // clarão do disparo
  const flash = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), basic(0xfff27a)); flash.position.set(0, 0.01, -0.78); flash.scale.set(1, 1, 2); flash.visible = false; root.add(flash);
  root.scale.setScalar(0.62);
  const cup = makeCup(0.55); cup.rotation.set(0.25, 0.4, 0.15); cup.visible = false; fpScene.add(cup);
  const hoofHint = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), toon(0xee9c22)); hoofHint.position.set(0.0, 0.07, 0.07); outline(hoofHint, 0.006); const cupHand = new THREE.Group(); cupHand.scale.setScalar(0.55); cupHand.add(hoofHint); cupHand.visible = false; fpScene.add(cupHand);
  fpRef.saberR = saberR; fpRef.saberL = saberL; fpRef.bowGrip = bowGrip; fpRef.bowDraw = bowDraw;
  return { root, guns, flash, setSkin, cup, cupHand, cupThrowT: 0, kick: 0, bob: 0, flashT: 0, pumpPart, get pumpHand() { return pumpHand; }, pumpShoulder, rocketTip, slide, fpRef, actionT: 0, actionLen: 1, shellT: 0, stringT: 0, kr, kpiv, rMag, rCh, cMag, cCh, pMag, uMag, uCh, p90Mag, p90Ch, nStrip, semiMag, semiCh, lmgMag, lmgCh, discLoaded, famasMag, famasCh, famasCase, cornCob, cornCore, cornCrank, cornBits, cornKernels, cornCrankT: 0, sling, mini: { group: mini, barrels: mgBarrels, glow: mgGlow, glowMat: mgGlowMat }, mgBox, mgCase, cycT: 0, climb: 0, sShell, sRound, loadRocket, drops: [], reloadSeen: 0, knifeT: 9, knifeKind: 'slash', knifeDrawT: 0 };
})();
fp.tablet = makeTablet(); fp.laptop = makeLaptop(); fp.radio = makeRadio(); fpScene.add(fp.tablet, fp.laptop, fp.radio);
// Mãos dentro da arma (pump, ferrolho, braço da faca) não entram na camuflagem nem na miniatura.
function markWeaponHands() {
  if (fp.pumpHand) fp.pumpHand.userData.noCamo = true;
  for (const g of fp.guns) {
    if (g.userData.boltHand) g.userData.boltHand.userData.noCamo = true;
    g.traverse((o) => {
      if (o === g || !o.userData) return;
      if (o.userData.handR || (o.userData.grip && 'support' in o.userData)) o.userData.noCamo = true;
    });
  }
}
markWeaponHands();
function paintSlot(el, n, w) {
  if (!el || !w) return;
  if (el.dataset.key !== w.key) { el.dataset.key = w.key; el.innerHTML = `<b>${n}</b>${weaponSvg(w.key)}`; }
  el.title = w.name;
}
function fireModeLabel(w) {
  if (w && w.saber) return w.dual ? 'ÁREA' : 'DUELO';
  if (!w || w.melee) return '';
  if (w.burst) return 'RAJADA';
  if (w.auto) return 'AUTO';
  if (w.draw || w.egg) return 'CORDA';
  return 'SEMI';
}
function weaponTitleParts(p) {
  const w = WEAPONS[p.weapon], n = (p.gunKills && p.gunKills[p.weapon]) || 0;
  const info = camoInfo(n), nxt = nextCamo(n);
  const meta = info && !nxt ? info.name : info && nxt ? `${info.name} · ${n}/${nxt.at}` : nxt ? `${n}/${nxt.at}` : '';
  return { name: w.name, meta };
}
function weaponTitle(p) {
  const t = weaponTitleParts(p);
  return t.meta ? `${t.name} · ${t.meta}` : t.name;
}
function noteWeaponKill(a, wIdx) {
  if (!a || !a.isPlayer || wIdx < 0 || wIdx >= WEAPONS.length) return;
  if (!a.gunKills) a.gunKills = WEAPONS.map(() => 0);
  const before = camoLevel(a.gunKills[wIdx]);
  a.gunKills[wIdx]++;
  const after = camoLevel(a.gunKills[wIdx]);
  if (after === before) return;
  applyWeaponCamo(fp.guns[wIdx], after);
  const info = camoInfo(a.gunKills[wIdx]);
  if (info) flashMsg(`${WEAPONS[wIdx].short}: ${info.name}`);
}
function resetMatchCamos() { for (const g of fp.guns) resetWeaponCamo(g); }

const _saberPt = new V3(), _saberInv = new THREE.Matrix4();
const SABER_SHOULDERS = [new V3(0.46, -0.62, 0.58), new V3(-0.28, -0.58, 0.52)];
const BOW_SHOULDERS = { grip: new V3(0.05, -0.62, 0.12), draw: new V3(0.46, -0.58, 0.22) };
const CROSS_SHOULDERS = { grip: new V3(0.16, -0.52, 0.48), draw: new V3(-0.46, -0.6, 0.24) }; // ombros como os do fuzil
const _crossFore = new V3(), CROSS_PINCH = new V3(-0.05, 0.05, 0); // besta: mão esquerda na telha; na recarga pinça a corda (em cima/à esquerda do nó)
const EGG_SHOULDERS = { grip: new V3(0.08, -0.62, 0.14), draw: new V3(0.42, -0.58, 0.24) };
const SABER_GRIPS = [new V3(0, 0, 0.05), new V3(0, 0, -0.035)]; // as duas mãos no cabo, uma acima da outra
const DUAL_GRIP = new V3(0, 0, 0.01);
function poseSaberHands() {
  const group = fp.guns[player.weapon], saber = group && group.userData.saber, twin = group && group.userData.twin;
  const hands = [fp.fpRef.saberR, fp.fpRef.saberL];
  if (!saber || !hands[0]) return;
  const sabers = twin ? [saber, twin.userData.saber] : [saber, saber], grips = twin ? [DUAL_GRIP, DUAL_GRIP] : SABER_GRIPS;
  for (const s of sabers) s.updateWorldMatrix(true, false);
  fp.root.updateWorldMatrix(true, false);
  _saberInv.copy(fp.root.matrixWorld).invert();
  hands.forEach((hand, i) => {
    _saberPt.copy(grips[i]);
    sabers[i].localToWorld(_saberPt);
    hand.position.copy(_saberPt).applyMatrix4(_saberInv);
    poseFPForearm(hand, SABER_SHOULDERS[i]);
  });
}
function poseBowHands(rk = 0) { // rk = fração da recarga (só a besta usa)
  const g = fp.guns[player.weapon];
  const hands = [fp.fpRef.bowGrip, fp.fpRef.bowDraw];
  if (!g || !g.userData.grip || !hands[0]) return;
  const shoulders = player.weapon === BOW ? BOW_SHOULDERS : player.weapon === EGG_W ? EGG_SHOULDERS : CROSS_SHOULDERS;
  const cross = player.weapon === CROSS, armK = cross ? sstep(0.04, 0.16, rk) * (1 - sstep(0.74, 0.9, rk)) : 1; // besta: a mão só vai na corda pra armar
  g.updateWorldMatrix(true, false);
  fp.root.updateWorldMatrix(true, false);
  _saberInv.copy(fp.root.matrixWorld).invert();
  if (cross) _crossFore.copy(g.userData.fore).applyMatrix4(g.matrixWorld).applyMatrix4(_saberInv);
  [[g.userData.grip, hands[0], shoulders.grip], [g.userData.draw, hands[1], shoulders.draw]].forEach(([pt, hand, shoulder]) => {
    _saberPt.copy(pt);
    g.localToWorld(_saberPt);
    hand.position.copy(_saberPt).applyMatrix4(_saberInv);
    if (hand === hands[1]) { if (cross) hand.position.add(CROSS_PINCH).lerp(_crossFore, 1 - armK); else hand.position.x += player.weapon === BOW ? 0.14 : 0.04; }
    poseFPForearm(hand, shoulder);
  });
}

// Sabre em 1ª pessoa: guarda de cavaleiro (lâmina erguida, quase em pé) e o corte desce na diagonal pela frente.
// side -1 = mão esquerda (espelha no X). dual: cabos mais abertos, um de cada lado.
const _kd = new V3(), _kZ = new V3(0, 0, -1), _kq = new THREE.Quaternion();
const KNIGHT = { hilt: [0.08, -0.46, -0.32], dir: [-0.16, 0.8, -0.58], cutHilt: [-0.08, -0.26, -0.5], cutDir: [-0.72, -0.28, -0.64] };
function poseKnight(hold, k, side = 1, dual = false, mode = '') {
  const t = k <= 0 ? 0 : k <= 0.4 ? sstep(0, 0.4, k) : 1 - sstep(0.4, 1, k); // sobe rápido, volta devagar
  const bx = dual ? (side > 0 ? 0.3 : -0.52) : 0, br = Math.sin(gameTime * 1.7 + (side > 0 ? 0 : 1.3)) * 0.012; // respiração
  if (mode === 'block') { // lâmina quase em pé, na frente do peito
    hold.position.set(bx * 0.35 + side * 0.02, -0.18 + br, -0.46);
    _kd.set(side * 0.04, 0.22, -0.97).normalize();
  } else if (mode === 'spin') { // os dois cabos orbitam
    const a = gameTime * 16 + (side > 0 ? 0 : Math.PI);
    hold.position.set(Math.cos(a) * (dual ? 0.42 : 0.22), -0.3 + Math.sin(a * 2) * 0.04, -0.5);
    _kd.set(Math.cos(a), 0.08, -Math.abs(Math.sin(a)) - 0.15).normalize();
  } else if (mode === 'dash') { // lâmina apontada pra frente, no impulso
    hold.position.set(bx * 0.4, -0.26 + br, -0.68);
    _kd.set(side * 0.06, -0.02, -1).normalize();
  } else {
    const fin = mode === 'fin' ? 1.35 : 1; // o terceiro golpe abre mais o corte
    const H = KNIGHT.hilt, C = KNIGHT.cutHilt, D = KNIGHT.dir, X = KNIGHT.cutDir;
    hold.position.set(bx + side * (H[0] + (C[0] - H[0]) * t), H[1] + (C[1] - H[1]) * t * fin + br, H[2] + (C[2] - H[2]) * t);
    _kd.set(side * (D[0] + (X[0] - D[0]) * t * fin), D[1] + (X[1] - D[1]) * t, D[2] + (X[2] - D[2]) * t).normalize();
  }
  hold.quaternion.copy(_kq.setFromUnitVectors(_kZ, _kd));
}
// ---------------- Inspecionar arma (I): gira, mostra os dois lados e volta. Só visual, nada vai pro servidor ----------------
const INS_ZERO = { ry: 0, rz: 0, rx: 0, x: 0, y: 0, z: 0, flip: 0, twist: 0, spin: false, k: 0 }, _ins = {};
function canInspect(p) {
  return state === 'playing' && !!p && p.alive && !gunner && !predator && !radioCall && !p.charging && !p.bowDraw && !p.eggDraw && !p.burstLeft && !(p.mgSpin > 0.05) && p.reloadEnd <= gameTime && p.switchEnd <= gameTime && ads < 0.05 && fp.actionT <= 0
    && !(p.weapon === KNIFE && fp.knifeT < KNIFE_ANIM[fp.knifeKind]) && tabletK < 0.04 && radioK < 0.04 && laptopK < 0.04 && !!fp.guns[p.weapon];
}
function startInspect(p) {
  if (!canInspect(p) || (fp.ins && !fp.ins.out && fp.ins.t < INSPECT_DUR * 0.8)) return false; // no meio: só reinicia na volta
  fp.ins = { t: 0, wpn: p.weapon, kind: inspectKind(WEAPONS[p.weapon]), fade: 1, out: false, hold: false, flipped: false };
  sfx.inspect(); showInspectHud(p); return true;
}
function stopInspect(hard) { if (!fp.ins) return; if (hard) fp.ins = null; else fp.ins.out = true; showInspectHud(null); }
function showInspectHud(p) {
  const el = $('inspect'); if (!el) return; if (!p) { el.classList.add('hidden'); return; }
  const w = WEAPONS[p.weapon], n = (p.gunKills && p.gunKills[p.weapon]) || 0, info = camoInfo(n), nxt = nextCamo(n), from = info ? info.at : 0;
  $('inspName').textContent = w.name; $('inspCamo').textContent = info ? info.name : 'Sem camuflagem';
  $('inspKills').textContent = `${n} abate${n === 1 ? '' : 's'}` + (nxt ? ` · ${nxt.name} em ${nxt.left}` : ' · camuflagem máxima');
  $('inspFill').style.width = (nxt ? clamp((n - from) / (nxt.at - from), 0, 1) * 100 : 100) + '%';
  el.title = weaponTitle(p); el.classList.remove('hidden');
}
function inspectStep(p, dt) {
  const s = fp.ins; if (!s) return INS_ZERO;
  if (!p.alive || p.weapon !== s.wpn || state !== 'playing') { stopInspect(true); return INS_ZERO; } // trocou/morreu: corta seco (o saque já anima)
  const click = mouseDown || rightDown || (clickLatch && performance.now() - clickLatch < 250);
  if (!s.out && (click || p.reloadEnd > gameTime || p.switchEnd > gameTime || p.charging || p.bowDraw || p.eggDraw || fp.actionT > 0 || gunner || predator || radioCall)) stopInspect(false);
  if (s.out) { s.fade -= dt / INSPECT_FADE; if (s.fade <= 0) { fp.ins = null; return INS_ZERO; } }
  else {
    s.hold = !!keys.KeyI && s.t >= INSPECT_DUR * INSPECT_HOLD; // segurando I: fica olhando o lado B
    if (!s.hold) s.t += dt;
    if (s.t >= INSPECT_DUR) { fp.ins = null; showInspectHud(null); return INS_ZERO; }
    if (!s.flipped && s.t >= INSPECT_DUR * 0.44) { s.flipped = true; sfx.inspect(0.5); }
  }
  const o = inspectPose(Math.min(1, s.t / INSPECT_DUR), INSPECT_PROFILES[s.kind], _ins), f = s.out ? Math.max(0, s.fade) : 1;
  for (const c of ['ry', 'rz', 'rx', 'x', 'y', 'z', 'twist', 'flip']) o[c] *= f;
  return o;
}
function updateFP(dt) {
  const p = player, moving = Math.hypot(p.vel.x, p.vel.z) > 1 && p.onGround;
  if (moving) fp.bob += dt * 10;
  fp.kick = Math.max(0, fp.kick - dt * 6);
  fp.guns.forEach((g, i) => { g.visible = i === p.weapon; if (g.userData.twin) g.userData.twin.visible = g.visible; });
  const w = WEAPONS[p.weapon];
  const ins = inspectStep(p, dt); // inspecionar (I): delta de pose aplicado no root lá embaixo
  const bolting = !!(w.bolt && fp.actionT > 0);
  const drawn = p.weapon === CROSS || p.weapon === BOW || p.weapon === EGG_W;
  fp.fpRef.arms.visible = p.weapon !== PISTOL && p.weapon !== NAIL && p.weapon !== KNIFE && !isSaber(p.weapon) && !drawn && !bolting; fp.fpRef.armsP.visible = p.weapon === PISTOL || p.weapon === NAIL;
  if (p.weapon === KNIFE) { knifeAnim(dt); fp.kpiv.rotation.x = ins.flip; } // inspecionar: gira a faca no dedo (só a lâmina; o braço fica em kr)
  let dip = 0, tilt = 0;
  // animações de ação: pump da Calibre 12, ferrolho do Sniper, ferrolho da pistola, foguete na boca da bazuca
  fp.actionT = Math.max(0, fp.actionT - dt); fp.shellT = Math.max(0, fp.shellT - dt);
  const ak = fp.actionT > 0 ? 1 - fp.actionT / fp.actionLen : 0; // 0..1 ao longo da ação
  const cyc = ak > 0.25 && ak < 0.85 ? Math.sin((ak - 0.25) / 0.6 * Math.PI) : 0;
  const pumpZ = -0.36 + cyc * 0.14;
  fp.pumpPart.position.z = pumpZ;
  const onShotgun = p.weapon === 1;
  const support = fp.fpRef.arms.userData.support;
  if (support) support.visible = !onShotgun;
  fp.pumpHand.visible = onShotgun;
  if (onShotgun) { fp.pumpHand.position.set(-0.11, -0.07, pumpZ); poseFPForearm(fp.pumpHand, fp.pumpShoulder); }
  fp.guns.forEach((g, i) => {
    if (!g.userData.boltHand) return;
    const active = i === p.weapon && w.bolt && fp.actionT > 0;
    g.userData.boltHand.visible = active;
    poseSniperBolt(g, active ? ak : 0);
  });
  if (isSaber(p.weapon) && fp.guns[p.weapon]) {
    const g = fp.guns[p.weapon], k = fp.actionT > 0 ? 1 - fp.actionT / fp.actionLen : 0;
    const st = p.saber;
    const mode = (st && st.spinUntil > gameTime) || (fp.saberMode === 'spin' && fp.actionT > 0) ? 'spin' : fp.saberMode === 'dash' && fp.actionT > 0 ? 'dash' : st && st.blocking && fp.actionT <= 0 ? 'block' : fp.saberMode === 'fin' && fp.actionT > 0 ? 'fin' : '';
    if (g.userData.twin) { poseKnight(g, mode === 'spin' || fp.saberSide === 0 ? k : 0, 1, true, mode); poseKnight(g.userData.twin, mode === 'spin' || fp.saberSide === 1 ? k : 0, -1, true, mode); }
    else poseKnight(g, k, 1, false, mode);
    const hot = Math.min(1, Math.hypot(p.vel.x, p.vel.z) / SPEED * 0.2 + (fp.actionT > 0 ? 0.4 : 0) + (st && st.blocking ? 0.18 : 0));
    for (const hold of g.userData.twin ? [g, g.userData.twin] : [g]) {
      const glow = hold.userData.glow;
      if (glow && glow.material) glow.material.opacity = 0.2 + hot * 0.18; // no máximo ~0,38: o brilho não vira uma mancha na mira
    }
    if (ins.twist) { g.rotateZ(ins.twist); if (g.userData.twin) g.userData.twin.rotateZ(-ins.twist); } // inspecionar: torce o cabo (o poseKnight reescreve o quaternion todo quadro)
  }
  if (fp.fpRef.saberR) { const on = isSaber(p.weapon); fp.fpRef.saberR.visible = on; fp.fpRef.saberL.visible = on; if (on) poseSaberHands(); }
  if (fp.fpRef.bowGrip) {
    fp.fpRef.bowGrip.visible = drawn; fp.fpRef.bowDraw.visible = drawn;
    if (drawn) {
      const g = fp.guns[p.weapon];
      fp.stringT = Math.max(0, fp.stringT - dt);
      const reloading = p.reloadEnd > gameTime;
      const k = reloading ? clamp(1 - (p.reloadEnd - gameTime) / w.reload, 0, 1) : 0;
      if (fp.stringT > 0) poseRelease(g, 1 - fp.stringT / 0.14);
      else if (reloading) poseDraw(g, p.weapon === EGG_W ? 0 : k); // estilingue: o ovo novo entra pelo fpReload (reloadEgg)
      else if (p.weapon === EGG_W && p.eggDraw) poseDraw(g, 0.25 + 0.75 * clamp((gameTime - p.eggDraw) / (w.draw || 0.55), 0, 1));
      else if (p.weapon === EGG_W) poseDraw(g, p.mag[p.weapon] > 0 ? 0.25 : 0);
      else if (p.weapon === BOW && p.bowDraw) poseDraw(g, 0.28 + 0.72 * clamp((gameTime - p.bowDraw) / (w.draw || 0.7), 0, 1));
      else if (p.weapon === BOW) poseDraw(g, p.mag[p.weapon] > 0 ? 0.28 : 0);
      else poseDraw(g, p.mag[p.weapon] > 0 ? 1 : 0);
      poseBowHands(reloading ? k : 0);
    }
  }
  fp.slide.position.z = p.weapon === PISTOL ? fp.kick * 0.9 : 0;
  fp.rocketTip.visible = p.mag[3] > 0;
  const rl = fpReload(p, w, dt); dip = rl.dip; tilt = rl.tilt;
  fp.cycT = Math.max(0, fp.cycT - dt); fp.climb *= Math.exp(-dt * 6); // FAMAS: a arma volta pro lugar na pausa entre rajadas
  if (p.weapon === FAMAS && fp.cycT > 0) fp.famasCh.position.z = -0.12 + Math.sin((1 - fp.cycT / 0.06) * Math.PI) * 0.07;
  // sacar: a arma sobe de baixo girando, passa um tiquinho do ponto e assenta (easeOutBack). A faca tem o saque dela.
  let drawRoll = 0, drawYaw = 0;
  if (p.switchEnd > gameTime && p.weapon !== KNIFE) {
    const k = 1 - clamp((p.switchEnd - gameTime) / (p.switchDur || 0.4), 0, 1), c1 = 1.70158, e = 1 + (c1 + 1) * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
    const d = 1 - e; dip = d > 0 ? Math.max(dip, d * 1.2) : dip + d * 0.6; drawRoll = (1 - k) * (1 - k); drawYaw = drawRoll * 0.35;
  }
  // balanço com inércia: a arma atrasa um pouco quando a mira vira e inclina quando anda de lado (mirando quase não mexe)
  let dyaw = p.yaw - (fp.lastYaw ?? p.yaw); dyaw = Math.atan2(Math.sin(dyaw), Math.cos(dyaw));
  const dpit = p.pitch - (fp.lastPitch ?? p.pitch); fp.lastYaw = p.yaw; fp.lastPitch = p.pitch;
  const sk = Math.min(1, dt * 10), sideVel = p.vel.x * Math.cos(p.yaw) - p.vel.z * Math.sin(p.yaw);
  fp.swayX = (fp.swayX || 0) + (clamp(dyaw * 1.6, -0.09, 0.09) - (fp.swayX || 0)) * sk;
  fp.swayY = (fp.swayY || 0) + (clamp(-dpit * 1.6, -0.07, 0.07) - (fp.swayY || 0)) * sk;
  fp.strafe = (fp.strafe || 0) + (clamp(-sideVel * 0.012, -0.09, 0.09) - (fp.strafe || 0)) * Math.min(1, dt * 8);
  const swA = 1 - ads * 0.85;
  if (w.pump || w.bolt) tilt += cyc * 0.12;
  let vib = 0; // minigun: canos giram com o embalo, a capa acende com o calor, a arma treme
  if (fp.mini) { const M = fp.mini, on = p.weapon === MINIGUN, h = p.mgHeat || 0; if (on) M.barrels.rotation.z += (p.mgSpin || 0) * dt * 42; M.glow.visible = on && h > 0.25; M.glowMat.opacity = sstep(0.25, 1, h) * 0.85; M.glowMat.color.setRGB(1, 0.18 + 0.3 * (1 - h), 0.06); if (on) vib = (p.mgSpin || 0) * 0.0025 + (p.mgFiring ? 0.006 : 0); }
  const bobA = 1 - ads * 0.8; // mirando: arma no centro, levantada, quase sem balanço
  const adsX = w.rocket ? 0.12 : w.corn ? 0.1 : 0, adsY = w.rocket ? 0.0 : w.corn ? -0.05 : 0.065; // Lança-Milho: a espiga em cima não pode tapar a mira
  const hipX = p.weapon === CROSS ? 0.03 : 0, hipY = p.weapon === CROSS ? -0.04 : 0; // besta no quadril: um tico mais baixa/à direita pra os braços do arco não taparem a mira (no ADS some)
  fp.root.position.set(0.2 + hipX + (adsX - 0.2 - hipX) * ads + Math.cos(fp.bob) * 0.012 * bobA + fp.swayX * 0.45 * swA, -0.2 + hipY * (1 - ads) + ads * adsY + Math.abs(Math.sin(fp.bob)) * 0.015 * bobA - dip * 0.25 - fp.shellT * 0.1 + fp.swayY * 0.45 * swA, -0.62 + ads * 0.06 + fp.kick * (0.5 - ads * 0.25));
  fp.root.rotation.set(fp.kick * 1.2 - dip * 0.6 + rl.pitch + fp.climb * (1 - ads * 0.6) + fp.swayY * 0.6 * swA, rl.yaw - fp.swayX * 0.8 * swA + drawYaw, dip * 0.3 + tilt + fp.strafe * swA + drawRoll * 0.7);
  if (w.spin) { fp.root.position.y -= 0.03; fp.root.rotation.y += 0.04; } // minigun pesada: mais baixa
  if (vib) { fp.root.position.x += rand(-1, 1) * vib; fp.root.position.y += rand(-1, 1) * vib; fp.root.rotation.z += rand(-1, 1) * vib * 2; }
  if (ins !== INS_ZERO) { // inspecionar: soma a pose em cima de tudo (mãos são filhas do root e seguem juntas)
    fp.root.position.x += ins.x; fp.root.position.y += ins.y; fp.root.position.z += ins.z;
    fp.root.rotation.x += ins.rx; fp.root.rotation.y += ins.ry; fp.root.rotation.z += ins.rz;
    const bar = ins.spin && fp.guns[p.weapon] && fp.guns[p.weapon].userData.barrels; if (bar) bar.rotation.z += dt * 10 * (1 - ins.k); // minigun: canos rodam
  }
  fp.flashT -= dt; fp.flash.visible = fp.flashT > 0; fp.flash.position.set(w.rocket ? 0.04 : 0, w.rocket ? 0.056 : 0.01, w.flashZ); fp.flash.scale.setScalar(w.rocket ? 2.2 : w.scope ? 1.6 : w.spin ? 1.4 : 1).z *= 2; fp.flash.rotation.z = Math.random() * 3;
  fp.root.visible = p.alive && !scoped(); // com a luneta a arma some
  sampleSaberTrail();
  tabletK += (tabletWant - tabletK) * Math.min(1, dt * 7);
  radioK += (radioWant - radioK) * Math.min(1, dt * 7);
  laptopK += (laptopWant - laptopK) * Math.min(1, dt * 8);
  fp.tablet.visible = tabletK > 0.04; fp.radio.visible = radioK > 0.04; fp.laptop.visible = laptopK > 0.04;
  laptopBig += ((predator && predator.phase === 'fly' ? 1 : 0) - laptopBig) * Math.min(1, dt * 6); // pilotando: o laptop chega perto e a tela ocupa o meio da visão
  laptopScreenLive(!!predator); // a tela já mostra o míssil enquanto o laptop abre
  poseTablet(fp.tablet, tabletK); poseRadio(fp.radio, radioK); poseLaptop(fp.laptop, laptopK, laptopBig);
  if (radioCall) { const talk = clamp((gameTime - radioCall.at + RADIO_CALL - 0.25) / 0.6, 0, 1) * (1 - clamp((gameTime - radioCall.at + 0.15) / 0.15, 0, 1)); fp.radio.rotation.z += Math.sin(gameTime * 26) * 0.04 * talk; fp.radio.position.y += Math.sin(gameTime * 13) * 0.006 * talk; } // falando: o rádio treme de leve perto da boca
  if (tabletK > 0.2 || radioK > 0.2 || laptopK > 0.2) fp.root.visible = false; // guarda a arma para segurar o tablet, o laptop ou o rádio
  // copo na mão enquanto carrega o arremesso
  fp.cupThrowT = Math.max(0, fp.cupThrowT - dt);
  fp.cup.visible = p.charging && p.alive;
  fp.cupHand.visible = p.alive && (p.charging || fp.cupThrowT > 0);
  if (p.charging && p.alive) {
    poseChargeCup(chargePower());
    fp.cupHand.position.copy(fp.cup.position); fp.cupHand.quaternion.copy(fp.cup.quaternion);
  } else if (fp.cupThrowT > 0 && fp.cupReleasePos) {
    const k = 1 - fp.cupThrowT / 0.25, reach = Math.sin(k * Math.PI);
    fp.cupHand.position.copy(fp.cupReleasePos).add(new V3(0.12 * reach, 0.08 * reach - 0.3 * k * k, -0.24 * reach));
    fp.cupHand.quaternion.copy(fp.cupReleaseRot); fp.cupHand.rotation.x -= reach * 0.5;
  }
}

// ---------------- Recarga em 1ª pessoa (tempo = WEAPONS[i].reload, sincronizado com a recarga de verdade) ----------------
// Fuzil/pistola: inclina, pente velho cai, pente novo entra, puxa a alavanca/ferrolho. Sniper: abre o ferrolho, põe 3 balas, fecha.
// Calibre 12: cartucho por cartucho (entra pela janela) e pump no fim (interrompível). Bazuca: baixa do ombro, foguete novo entra pela boca.
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const RELOAD_SFX = { // momentos (fração do tempo de recarga) dos cliques
  rifle: [['out', 0.2], ['in', 0.7], ['charge', 0.88]], commando: [['out', 0.2], ['in', 0.7], ['charge', 0.88]], pistol: [['out', 0.2], ['in', 0.7], ['slide', 0.88]],
  uzi: [['out', 0.2], ['in', 0.7], ['charge', 0.88]], p90: [['out', 0.18], ['in', 0.62], ['charge', 0.88]],
  prego: [['out', 0.2], ['in', 0.68], ['slide', 0.9]],
  semi: [['out', 0.2], ['in', 0.68], ['charge', 0.88]],
  famas: [['out', 0.2], ['in', 0.7], ['charge', 0.88]],
  lmg: [['out', 0.2], ['in', 0.7], ['charge', 0.88]],
  disco: [['round', 0.32], ['in', 0.74], ['charge', 0.9]],
  milho: [['out', 0.22], ['in', 0.62], ['charge', 0.74], ['charge', 0.86]], // sabugo sai, espiga entra, duas voltas de manivela
  besta: [['charge', 0.42], ['in', 0.9]],
  arco: [['charge', 0.38], ['in', 0.86]],
  estilingue: [['round', 0.35], ['in', 0.8]], // ovo na bolsinha e o elástico encaixa
  minigun: [['clank', 0.15], ['out', 0.25], ['in', 0.68], ['charge', 0.88]], // caixa sai, caixa nova engata, puxa a fita
  sniper: [['bolt', 0.12], ['round', 0.4], ['round', 0.53], ['round', 0.66], ['bolt', 0.86]], bazooka: [['clank', 0.2], ['slide', 0.55], ['thunk', 0.8], ['in', 0.92]],
};
function reloadSfx(w, v = 1) {
  for (const [k, f] of RELOAD_SFX[w.key] || []) { const d = f * w.reload;
    if (k === 'out') { tone('square', 520, 400, 0.04, 0.1 * v, d); noise(0.05, 2400, 0.25 * v, 'bandpass', d); }
    else if (k === 'in') { noise(0.06, 1600, 0.4 * v, 'bandpass', d); tone('square', 300, 240, 0.05, 0.14 * v, d); }
    else if (k === 'charge' || k === 'slide') { noise(0.05, 3000, 0.3 * v, 'bandpass', d); tone('square', 700, 600, 0.04, 0.1 * v, d); noise(0.05, 3600, 0.3 * v, 'bandpass', d + 0.09); tone('square', 820, 700, 0.03, 0.1 * v, d + 0.09); }
    else if (k === 'bolt') { tone('square', 420, 380, 0.04, 0.1 * v, d); noise(0.07, 2400, 0.3 * v, 'bandpass', d + 0.06); }
    else if (k === 'round') { tone('triangle', 1500, 1300, 0.03, 0.08 * v, d); noise(0.03, 4000, 0.15 * v, 'highpass', d); }
    else if (k === 'clank') { tone('square', 180, 120, 0.08, 0.14 * v, d); noise(0.1, 900, 0.3 * v, 'lowpass', d); }
    else if (k === 'thunk') { noise(0.12, 500, 0.6 * v, 'lowpass', d); tone('sine', 140, 70, 0.12, 0.25 * v, d); }
  }
}
const _wp = new V3();
function playMag(mag, base, dir, k, outDist, inDist) {
  if (k > 0.16 && k < 0.3) mag.position.copy(base).addScaledVector(dir, sstep(0.16, 0.26, k) * outDist);
  if (k >= 0.24 && !fp.dropped) { fp.dropped = true; mag.position.copy(base).addScaledVector(dir, outDist); dropMag(mag); }
  if (k >= 0.26 && k < 0.45) mag.visible = false;
  if (k >= 0.45 && k < 0.72) mag.position.copy(base).addScaledVector(dir, (1 - sstep(0.45, 0.7, k)) * inDist);
}
function dropMag(src) { // pente velho caindo (cópia do mesh), some em 0,8 s
  fp.root.updateMatrixWorld(true); src.getWorldPosition(_wp);
  const m = new THREE.Mesh(src.geometry, src.material); m.position.copy(_wp); m.quaternion.copy(src.getWorldQuaternion(new THREE.Quaternion())); m.scale.setScalar(0.62);
  fpScene.add(m); fp.drops.push({ m, vel: new V3(0.15, -0.3, 0.05), spin: new V3(rand(-4, 4), 0, rand(-6, 6)), t: 0 });
  window.__magDrops = (window.__magDrops || 0) + 1;
}
function ejectCase(src) { // cápsula pulando pra direita a cada tiro da FAMAS
  fp.root.updateMatrixWorld(true); src.getWorldPosition(_wp);
  const m = new THREE.Mesh(src.geometry, src.material); m.position.copy(_wp); m.quaternion.copy(src.getWorldQuaternion(new THREE.Quaternion())); m.scale.setScalar(0.62);
  fpScene.add(m); fp.drops.push({ m, vel: new V3(rand(0.7, 1.0), rand(0.5, 0.8), rand(0.05, 0.25)), spin: new V3(rand(8, 14), 0, rand(-10, 10)), t: 0.35 });
}
function fpReload(p, w, dt) {
  const out = { dip: 0, tilt: 0, pitch: 0, yaw: 0 }, i = p.weapon, on = p.reloadEnd > gameTime;
  for (let j = fp.drops.length - 1; j >= 0; j--) { const d = fp.drops[j]; d.t += dt; d.vel.y -= 5 * dt; d.m.position.addScaledVector(d.vel, dt); d.m.rotation.x += d.spin.x * dt; d.m.rotation.z += d.spin.z * dt; if (d.t > 0.8) { fpScene.remove(d.m); fp.drops.splice(j, 1); } }
  // posições de descanso
  fp.rMag.position.set(0, -0.15, -0.12); fp.rMag.visible = true; fp.rCh.position.z = 0.08; fp.cMag.position.set(0, -0.15, -0.12); fp.cMag.visible = true; fp.cCh.position.z = 0.08; fp.pMag.position.set(0, -0.14, 0.035); fp.pMag.visible = true;
  fp.uMag.position.set(0, -0.16, -0.02); fp.uMag.visible = true; fp.uCh.position.set(0.055, 0.045, 0.02);
  fp.p90Mag.position.set(0, 0.09, -0.02); fp.p90Mag.visible = true; fp.p90Ch.position.set(0.06, 0.02, 0.18);
  fp.nStrip.position.set(0.04, 0.09, 0.04); fp.nStrip.visible = true;
  fp.semiMag.position.set(0, -0.12, 0.04); fp.semiMag.rotation.x = 0.1; fp.semiMag.visible = true; fp.semiCh.position.set(0.07, 0.07, 0.12);
  fp.famasMag.position.set(0, -0.15, 0.27); fp.famasMag.visible = true; fp.famasCh.position.set(0, 0.105, -0.12);
  if (fp.mgBox) { fp.mgBox.position.set(-0.16, -0.08, 0.05); fp.mgBox.visible = true; }
  fp.discLoaded.position.set(0, 0.09, -0.42); fp.discLoaded.visible = p.mag[DISC_W] > 0; fp.discLoaded.userData.body.rotation.y += dt * 5;
  fp.discLoaded.userData.lights.forEach((l, k) => { l.visible = Math.floor(gameTime * 6 + k) % 2 === 0; });
  fp.cornCob.position.set(0, 0.2, -0.02); fp.cornCob.rotation.set(0, 0, 0); fp.cornCob.visible = true;
  fp.cornKernels.forEach((g, j) => { g.visible = j < Math.ceil(p.mag[CORN_W] / WEAPONS[CORN_W].mag * 10); }); // a espiga vai ficando pelada
  fp.cornCrankT = Math.max(0, fp.cornCrankT - dt); fp.cornCrank.rotation.x = -(1 - fp.cornCrankT / 0.2) * Math.PI * 2; // volta inteira por tiro (termina em 2π = posição de descanso)
  fp.cornBits.forEach((b, j) => { b.position.y = b.userData.y0 + Math.abs(Math.sin(gameTime * 9 + j * 1.7)) * (0.006 + fp.cornCrankT * 0.12); });
  fp.sShell.visible = false; fp.sRound.visible = false; fp.loadRocket.visible = false;
  if (!on || w.melee) { fp.reloadKey = 0; return out; }
  if (w.shellReload) { // Calibre 12: inclinada; cada cartucho sobe até a janela e entra quando o servidor/cliente conta +1
    out.dip = 0.35; out.tilt = 0.5;
    const cycle = w.reload, ph = clamp(1 - (p.reloadEnd - gameTime) / cycle, 0, 1);
    if (p.reserve[i] > 0 && p.mag[i] < w.mag) { fp.sShell.visible = ph > 0.1; const a = sstep(0.1, 0.9, ph); fp.sShell.position.set(0.06 * (1 - a), -0.2 + 0.13 * a, 0.06 - 0.08 * a); fp.sShell.rotation.x = -0.6 * (1 - a); }
    return out;
  }
  const k = clamp(1 - (p.reloadEnd - gameTime) / w.reload, 0, 1);
  const key = p.reloadStartT || 0; if (fp.reloadKey !== key) { fp.reloadKey = key; fp.dropped = false; }
  const env = sstep(0, 0.14, k) * (1 - sstep(0.86, 1, k));
  if (i === CORN_W) { // Lança-Milho: inclina, o sabugo pula do funil, espiga nova desce girando e a manivela dá duas voltas
    out.tilt = -env * 0.4; out.dip = env * 0.15; out.pitch = env * 0.2; out.yaw = env * 0.15;
    const cob = fp.cornCob, base = new V3(0, 0.2, -0.02);
    if (k > 0.14 && k < 0.26) cob.position.copy(base).y += sstep(0.14, 0.24, k) * 0.12;
    if (k >= 0.24 && !fp.dropped) { fp.dropped = true; dropMag(fp.cornCore); }
    if (k >= 0.26 && k < 0.42) cob.visible = false;
    if (k >= 0.42 && k < 0.66) { cob.position.copy(base).y += (1 - sstep(0.42, 0.64, k)) * 0.22; cob.rotation.y = (1 - sstep(0.42, 0.64, k)) * 3; fp.cornKernels.forEach((g) => { g.visible = true; }); }
    if (k >= 0.66) fp.cornKernels.forEach((g) => { g.visible = true; }); // espiga nova cheia
    fp.cornCrank.rotation.x = -sstep(0.7, 0.95, k) * Math.PI * 4;
    out.pitch += 0.06 * sstep(0.62, 0.65, k) * (1 - sstep(0.65, 0.74, k)); // tranco da espiga encaixando
  } else if (i === DISC_W) { // Disco: vira a boca pra cima, um disco novo sobe flutuando e encaixa no berço
    out.tilt = env * 0.3; out.dip = env * 0.18; out.pitch = env * 0.25;
    if (k > 0.3) { const a = sstep(0.3, 0.75, k); fp.discLoaded.visible = true; fp.discLoaded.position.set(0.12 * (1 - a), 0.09 - 0.3 * (1 - a), -0.42 + 0.1 * (1 - a)); fp.discLoaded.userData.body.rotation.y += dt * 20 * (1 - a); }
    else fp.discLoaded.visible = false;
  } else if (i === FAMAS) { // bullpup: levanta a traseira pra mostrar o pente atrás do cabo, troca, bate o pente e puxa a alavanca da alça
    const base = fp.famasMag.position.clone();
    out.tilt = env * 0.45; out.dip = -env * 0.22; out.yaw = -env * 0.3; out.pitch = -env * 0.24;
    playMag(fp.famasMag, base, new V3(0, -1, 0.3).normalize(), k, 0.14, 0.3);
    out.pitch += 0.07 * sstep(0.68, 0.71, k) * (1 - sstep(0.71, 0.8, k)); // tranco do pente encaixando
    const pull = sstep(0.82, 0.88, k) * (1 - sstep(0.9, 0.97, k));
    fp.famasCh.position.z = -0.12 + pull * 0.13; out.yaw += pull * 0.06;
  } else if (i === 0 || i === PISTOL || i === UZI || i === P90 || i === NAIL || i === SEMI || i === LMG || i === COMMANDO) { // pente (uzi embaixo, P90 por cima, furadeira no pente de pregos, semi embaixo, LMG na caixa de fita, Commando igual ao fuzil)
    const mag = i === 0 ? fp.rMag : i === COMMANDO ? fp.cMag : i === PISTOL ? fp.pMag : i === UZI ? fp.uMag : i === P90 ? fp.p90Mag : i === NAIL ? fp.nStrip : i === LMG ? fp.lmgMag : fp.semiMag;
    const base = mag.position.clone();
    const dir = (i === P90 ? new V3(0, 1, 0.08) : i === NAIL ? new V3(1, -0.25, 0.05) : new V3(0, -1, i === 0 ? -0.2 : -0.2)).normalize();
    out.tilt = env * (i === P90 ? -0.4 : 0.5); out.dip = env * 0.24; out.yaw = env * (i === NAIL ? -0.16 : 0.12);
    if (i === P90) out.pitch = env * 0.18;
    playMag(mag, base, dir, k, i === P90 ? 0.16 : 0.12, i === P90 ? 0.26 : 0.28);
    const pull = sstep(0.84, 0.9, k) * (1 - sstep(0.92, 0.98, k));
    if (i === 0) fp.rCh.position.z = 0.08 + pull * 0.1;
    else if (i === COMMANDO) fp.cCh.position.z = 0.08 + pull * 0.1;
    else if (i === PISTOL) fp.slide.position.z = pull * 0.08;
    else if (i === UZI) fp.uCh.position.z = 0.02 + pull * 0.08;
    else if (i === P90) fp.p90Ch.position.z = 0.18 + pull * 0.06;
    else if (i === SEMI) fp.semiCh.position.z = 0.12 + pull * 0.07;
    else if (i === LMG) fp.lmgCh.position.z = 0.1 + pull * 0.08;
  } else if (i === MINIGUN) { // Minigun: tomba pra direita, a caixa de munição cai, a nova sobe e engata; no fim gira os canos na mão
    out.tilt = -env * 0.35; out.dip = env * 0.3; out.yaw = env * 0.1;
    playMag(fp.mgBox, fp.mgBox.position.clone(), new V3(-0.3, -1, 0).normalize(), k, 0.14, 0.3);
    if (k > 0.82 && fp.mini) fp.mini.barrels.rotation.z += dt * 18 * (1 - sstep(0.82, 1, k)); // engatilha girando os canos
  } else if (w.bolt) { // Sniper: ferrolho
    out.tilt = env * 0.35; out.dip = env * 0.15; out.yaw = -env * 0.1;
    const open = sstep(0.08, 0.16, k) * (1 - sstep(0.84, 0.92, k)), back = sstep(0.15, 0.24, k) * (1 - sstep(0.78, 0.86, k));
    // ferrolho do modelo da sniper na mão (sniper-view.js): abre e puxa (0→0,58), segura aberto enquanto entram as balas, empurra e fecha (0,58→1)
    const g = fp.guns[i], ak = k < 0.78 ? 0.58 * sstep(0.06, 0.26, k) : 0.58 + 0.42 * sstep(0.78, 0.94, k);
    if (g && g.userData.boltHand) { poseSniperBolt(g, ak); g.userData.boltHand.visible = true; fp.fpRef.arms.visible = false; out.boltHand = true; }
    const rest = (g && g.userData.boltRest) || { x: 0.055, y: 0.03, z: 0.12 };
    if (g && fp.sRound.parent !== g) g.add(fp.sRound);
    for (const c of [0.4, 0.53, 0.66]) if (k > c - 0.12 && k < c) { const a = sstep(c - 0.12, c, k); fp.sRound.visible = true; fp.sRound.position.set(rest.x + 0.085 - 0.14 * a, rest.y - 0.07 + 0.09 * a, rest.z + 0.04 - 0.06 * a); }
  } else if (w.rocket) { // Bazuca: baixa do ombro e carrega pela boca
    out.dip = env * 0.55; out.pitch = env * 0.35; out.tilt = -env * 0.15;
    fp.rocketTip.visible = k > 0.8;
    if (k > 0.35 && k <= 0.8) { const a = sstep(0.4, 0.8, k); fp.loadRocket.visible = true; fp.loadRocket.position.set(0, 0.06 - 0.28 * (1 - a), -1.62 - 0.95 * (1 - a)); fp.loadRocket.rotation.set(0.3 * (1 - a), Math.PI, 0); }
  } else if (i === EGG_W) { // estilingue: abaixa um pouco, a mão traz um ovo novo de baixo e assenta na bolsinha
    out.dip = env * 0.22; out.pitch = env * -0.12; out.tilt = env * 0.2;
    const g = fp.guns[i]; if (g && g.userData.reloadEgg) g.userData.reloadEgg(sstep(0.3, 0.78, k));
  } else if (i === CROSS || i === BOW) {
    out.dip = env * (i === BOW ? 0.2 : 0.12); out.pitch = env * (i === BOW ? -0.18 : -0.04); if (i === CROSS) out.tilt = env * 0.2; // besta: ponta desce de leve e inclina; a mão puxa a corda à vista
  }
  return out;
}

// animações da faca em 1ª pessoa: parada (balanço), sacar (sobe girando), golpe (arco da direita pra esquerda), estocada (recua e fura)
const KNIFE_ANIM = { slash: 0.32, stab: 0.5 };
function knifeAnim(dt) {
  const kr = fp.kr, kp = fp.kpiv; fp.knifeT += dt; fp.knifeDrawT = Math.max(0, fp.knifeDrawT - dt);
  let px = 0, py = Math.sin(gameTime * 1.7) * 0.006, pz = 0, rx = Math.sin(gameTime * 1.3) * 0.015, ry = 0, rz = 0;
  const L = KNIFE_ANIM[fp.knifeKind], k = fp.knifeT / L;
  if (k < 1) {
    const ease = (x) => x * x * (3 - 2 * x);
    if (fp.knifeKind === 'slash') {
      if (k < 0.22) { const a = ease(k / 0.22); px += 0.12 * a; py += 0.08 * a; ry += 0.7 * a; rz -= 0.35 * a; }
      else if (k < 0.55) { const a = ease((k - 0.22) / 0.33); px += 0.12 - 0.5 * a; py += 0.08 - 0.14 * a; pz -= 0.12 * Math.sin(a * Math.PI); ry += 0.7 - 1.8 * a; rz += -0.35 + 0.95 * a; rx -= 0.3 * Math.sin(a * Math.PI); }
      else { const a = ease((k - 0.55) / 0.45); px += -0.38 * (1 - a); py += -0.06 * (1 - a); ry += -1.1 * (1 - a); rz += 0.6 * (1 - a); }
    } else {
      if (k < 0.3) { const a = ease(k / 0.3); pz += 0.14 * a; py -= 0.03 * a; rx += 0.25 * a; }
      else if (k < 0.5) { const a = ease((k - 0.3) / 0.2); pz += 0.14 - 0.5 * a; py += -0.03 + 0.06 * a; px -= 0.06 * a; rx += 0.25 - 0.45 * a; }
      else { const a = ease((k - 0.5) / 0.5); pz += -0.36 * (1 - a); py += 0.03 * (1 - a); px -= 0.06 * (1 - a); rx -= 0.2 * (1 - a); }
    }
  }
  if (fp.knifeDrawT > 0) { const d = fp.knifeDrawT / (MELEE.draw + 0.1); py -= 0.35 * d; rx += 0.9 * d; rz += 1.6 * d; }
  kr.position.set(px, py, pz); kr.rotation.set(rx, ry, 0); kp.rotation.z = rz;
}

// ---------------- Mira (botão direito) ----------------
const hpBar = document.getElementById('hpbar');
const adsVig = document.getElementById('adsvig'), crossEl = document.getElementById('crosshair');
function updateAds(dt, want) {
  ads = clamp(ads + (want ? 1 : -1) * dt / ADS_TIME, 0, 1);
  const e = ads * ads * (3 - 2 * ads); // suavizado
  const target = WEAPONS[player ? player.weapon : 0].adsFov;
  const fov = BASE_FOV + (target - BASE_FOV) * e;
  if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
  const sc = scoped(); const scopeEl = $('scope');
  scopeEl.classList.toggle('hidden', !sc || emote.on); crossEl.classList.toggle('hidden', !!sc || emote.on);
  scopeEl.classList.remove('torresmo', 'canhao', 'carabina');
  const scopeStyle = player && WEAPONS[player.weapon].scopeStyle;
  if (scopeStyle) scopeEl.classList.add(scopeStyle);
  adsVig.style.opacity = emote.on || sc ? 0 : e.toFixed(3);
  crossEl.style.transform = `translate(-50%,-50%) scale(${(1 - 0.45 * e).toFixed(3)})`;
  crossEl.classList.toggle('ads', e > 0.5);
}
// sempre booleano: classList.toggle('hidden', undefined) vira toggle simples e a mira piscava a cada quadro (armas sem luneta)
const scoped = () => !!(player && player.alive && WEAPONS[player.weapon].scope && ads > 0.85 && !(fp.actionT > 0 && WEAPONS[player.weapon].bolt));
function resetAds() { $('scope').classList.add('hidden'); crossEl.classList.remove('hidden'); ads = 0; camera.fov = BASE_FOV; camera.updateProjectionMatrix(); adsVig.style.opacity = 0; crossEl.style.transform = ''; crossEl.classList.remove('ads'); }

// ---------------- Jogador ----------------
const fwd = new V3(), right = new V3();
const sparkGeo = new THREE.SphereGeometry(0.015, 5, 4);
function saberSparks(pos, n = 4) {
  if (!pos) return;
  let p0 = pos.clone ? pos.clone() : new V3(pos.x || 0, pos.y || 0, pos.z || 0);
  const camDist = p0.distanceTo(camera.position);
  if (camDist < 1.25) {
    const away = p0.clone().sub(camera.position);
    if (away.lengthSq() < 1e-6) away.set(-Math.sin(player && player.yaw || 0), 0.15, -Math.cos(player && player.yaw || 0));
    p0 = camera.position.clone().addScaledVector(away.normalize(), 1.35);
  }
  const count = Math.min(n, 5);
  const nearCam = camDist < 1.6;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfff1c2 : 0xffc4d0, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(p0); scene.add(m);
    const vel = new V3(rand(-1, 1), rand(0.35, 1.1), rand(-1, 1)).normalize().multiplyScalar(rand(1.1, 2.6));
    if (nearCam) { const away = p0.clone().sub(camera.position); if (away.lengthSq() > 1e-4 && vel.dot(away) < 0) vel.addScaledVector(away.normalize(), 2); }
    particles.push({ mesh: m, vel, life: rand(0.08, 0.14), t: 0, kind: 'spark' });
  }
}
// Rastro fino na cena da arma (mesmo espaço da lâmina). Some em ~0,15 s. Não vai pro mundo: uma linha na frente da câmera cobria o alvo.
const SABER_TRAIL_LIFE = 0.15;
const saberTrailLines = [null, null];
const saberTrailPts = [[], []];
const _tip = new V3();
function saberTrailLine(i) {
  if (saberTrailLines[i]) return saberTrailLines[i];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffd5e0, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: true }));
  line.frustumCulled = false; line.visible = false; line.renderOrder = 6; fpScene.add(line);
  saberTrailLines[i] = line; return line;
}
function sampleSaberTrail() {
  const p = player, g = p && fp.guns[p.weapon], st = p && p.saber;
  const now = gameTime;
  const hot = !!(p && p.alive && isSaber(p.weapon) && g && g.visible && fp.root.visible && (fp.actionT > 0 || (st && (st.dashUntil > now || st.spinUntil > now))));
  if (hot) {
    fp.root.updateWorldMatrix(true, true);
    const holds = g.userData.twin ? [g, g.userData.twin] : [g];
    const spin = st && st.spinUntil > now;
    holds.forEach((h, i) => {
      if (holds.length > 1 && !spin && fp.saberMode !== 'dash' && fp.saberSide !== i) return;
      _tip.set(0, 0, -0.83); h.localToWorld(_tip);
      if (_tip.z > -0.45) return; // ponta encostada na lente: não risca a tela
      const bag = saberTrailPts[i];
      const last = bag[bag.length - 1];
      const dist = last ? last.p.distanceTo(_tip) : 1;
      if (last && dist > 1.4) bag.length = 0; // a pose pulou: não liga dois pontos distantes
      if (!last || dist > 0.015) bag.push({ p: _tip.clone(), t: now });
    });
  }
  for (let i = 0; i < 2; i++) {
    const bag = saberTrailPts[i];
    while (bag.length && now - bag[0].t > SABER_TRAIL_LIFE) bag.shift();
    const line = saberTrailLine(i), attr = line.geometry.attributes.position, arr = attr.array;
    const n = Math.min(bag.length, 16), start = bag.length - n;
    line.visible = n > 1;
    for (let k = 0; k < 16; k++) {
      const q = bag[Math.min(bag.length - 1, start + Math.max(0, k))] ;
      const v = q ? q.p : _tip;
      arr[k * 3] = v.x; arr[k * 3 + 1] = v.y; arr[k * 3 + 2] = v.z;
    }
    line.geometry.setDrawRange(0, n);
    attr.needsUpdate = true;
    if (n > 1) line.geometry.computeBoundingSphere();
  }
}
function saberSpace(e) { return e && e.isPlayer ? 'aim' : 'model'; }
function saberForward(e) {
  const f = aimForward(e.yaw, saberSpace(e));
  return { x: f.x, z: f.z };
}
function swingSaber(p) {
  const prof = profileOf(WEAPONS[p.weapon]); if (!prof) return null;
  const st = ensureSaber(p);
  const sw = commitSwing(st, gameTime, prof); if (!sw) return null;
  p.nextFire = st.nextSwing;
  p.saberCombo = sw.idx;
  if (p.isPlayer) { fp.actionT = fp.actionLen = Math.min(0.42, sw.rate); fp.saberSide = WEAPONS[p.weapon].dual ? sw.idx % 2 : 0; fp.saberMode = sw.idx === 2 ? 'fin' : 'swing'; }
  if (!p.isPlayer) p.swingT = 0;
  saberSfx.swing(sw.idx === 2 ? 1.25 : 1);
  const origin = p.isPlayer ? camera.position.clone() : center(p, EYE);
  const forward = saberForward(p);
  if (online && p.isPlayer) { netEv(['sw', v3a(origin), [forward.x, 0, forward.z], +(performance.now() / 1000).toFixed(3)]); return sw; }
  const hit = saberArcLocal(p, origin, forward, sw.dmg, sw.reach, sw.arc);
  if (hit) saberSfx.clash();
  return sw;
}
function saberArcLocal(p, origin, forward, dmg, reach, arc) {
  const eye = origin.isVector3 ? origin : new V3(origin.x, origin.y, origin.z);
  const targets = [];
  for (const e of entities) {
    if (e === p || !e.alive || friends(e, p)) continue;
    if (!losClear(center(p, EYE), center(e, 1))) continue;
    targets.push({ e, x: e.pos.x, z: e.pos.z });
  }
  const hits = targetsInArc({ x: eye.x, z: eye.z }, forward, reach, arc, targets);
  for (const h of hits) { damage(h.e, dmg, p, p.weapon, false); if (p.isPlayer) saberSparks(center(h.e, 1.05), 4); }
  return hits.length > 0;
}
function saberRadiusLocal(p, dmg, radius) {
  const o = center(p, 1); let n = 0;
  for (const e of entities) {
    if (e === p || !e.alive || friends(e, p)) continue;
    if (Math.abs(e.pos.y - p.pos.y) > 1.7) continue;
    if (Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) > radius) continue;
    if (!losClear(o, center(e, 1))) continue;
    damage(e, dmg, p, p.weapon, false); n++;
    saberSparks(center(e, 1), 10);
  }
  if (n && p.isPlayer) saberSfx.spinHit();
  return n;
}
function saberDash(p) {
  const prof = profileOf(WEAPONS[p.weapon]); if (!prof || !p.alive || p.stunUntil > gameTime) return false;
  const st = ensureSaber(p);
  const res = tryDash(st, gameTime, prof, saberForward(p)); if (!res) return false;
  p.nextFire = Math.max(p.nextFire, st.nextSwing);
  if (p.isPlayer) { fp.actionT = fp.actionLen = res.dur; fp.saberMode = 'dash'; shake = Math.max(shake, 0.12); }
  if (!p.isPlayer) p.swingT = 0;
  saberSfx.dash();
  if (online && p.isPlayer) netEv(['sd', +res.dx.toFixed(3), +res.dz.toFixed(3), +(performance.now() / 1000).toFixed(3)]);
  return true;
}
function saberSpecial(p) {
  const prof = profileOf(WEAPONS[p.weapon]); if (!prof || !p.alive || p.stunUntil > gameTime) return false;
  const st = ensureSaber(p);
  const res = trySpecial(st, gameTime, prof); if (!res) return false;
  const forward = saberForward(p);
  if (p.isPlayer) { fp.actionT = fp.actionLen = res.kind === 'spin' ? res.dur : 0.28; fp.saberMode = res.kind; shake = Math.max(shake, res.kind === 'spin' ? 0.16 : 0.08); }
  if (res.kind === 'spin') { saberSfx.spin(); if (!p.isPlayer) p.saberSpinUntil = gameTime + res.dur; if (online && p.isPlayer) netEv(['ss', [forward.x, 0, forward.z], +(performance.now() / 1000).toFixed(3)]); return true; }
  saberSfx.throw();
  const origin = p.isPlayer ? camera.position.clone() : center(p, EYE);
  if (online && p.isPlayer) { netEv(['ss', [forward.x, 0, forward.z], +(performance.now() / 1000).toFixed(3)]); return true; }
  spawnBladeLocal(p, origin, forward, res);
  return true;
}
function spawnBladeLocal(owner, origin, dir, spec) {
  const mesh = makeWorldSaber(); mesh.scale.setScalar(1.15); scene.add(mesh);
  const pos = origin.isVector3 ? origin.clone() : new V3(origin.x, origin.y, origin.z);
  pos.add(new V3(dir.x, 0, dir.z).multiplyScalar(0.55));
  blades.push({ owner, pos, dir: new V3(dir.x, 0, dir.z), phase: 'out', traveled: 0, t: 0, spec, mesh, hit: new Set(), backHit: new Set() });
  mesh.position.copy(pos);
}
const blades = [];
function stepBladesLocal(dt) {
  for (let i = blades.length - 1; i >= 0; i--) {
    const b = blades[i], spec = b.spec, owner = b.owner;
    b.t += dt;
    if (!owner || !owner.alive || b.t > spec.life + 0.2) { endBladeLocal(i, false); continue; }
    if (b.phase === 'back') {
      const eye = center(owner, 1.2);
      const to = eye.clone().sub(b.pos); const L = to.length() || 1;
      b.dir.copy(to).divideScalar(L);
      if (L < 0.85) { endBladeLocal(i, true); saberSfx.catch(); continue; }
    }
    const step = spec.speed * (b.phase === 'back' ? 1.15 : 1) * dt;
    const wall = wallDistance(b.pos, b.dir, step + 0.05);
    let hit = null;
    for (const t of entities) {
      if (t === owner || !t.alive || friends(t, owner)) continue;
      const bag = b.phase === 'back' ? b.backHit : b.hit;
      if (bag.has(t)) continue;
      for (const [y, r] of [[1.5, 0.5], [0.8, 0.58]]) {
        const tt = raySphere(b.pos, b.dir, center(t, y), r + spec.radius);
        if (tt > 0 && tt <= step + 0.05 && (!wall || tt < wall.distance) && (!hit || tt < hit.tt)) hit = { t, tt };
      }
    }
    if (hit) {
      (b.phase === 'back' ? b.backHit : b.hit).add(hit.t);
      const at = b.pos.clone().addScaledVector(b.dir, hit.tt);
      saberSparks(at, 12); saberSfx.clash();
      if (!b.net) damage(hit.t, b.phase === 'back' ? spec.backDmg : spec.outDmg, owner, SABER, false);
    }
    if (wall && b.phase === 'out') { b.phase = 'back'; b.dir.multiplyScalar(-1); b.dir.y = 0.05; b.dir.normalize(); saberSparks(b.pos.clone(), 6); continue; }
    b.pos.addScaledVector(b.dir, step);
    if (b.phase === 'out') { b.traveled += step; if (b.traveled >= spec.range) b.phase = 'back'; }
    b.mesh.position.copy(b.pos);
    b.mesh.lookAt(b.pos.clone().add(b.dir));
    b.mesh.rotateZ(gameTime * 18);
  }
}
function endBladeLocal(i, caught) {
  const b = blades[i];
  if (b.owner && b.owner.saber) catchBlade(b.owner.saber);
  scene.remove(b.mesh);
  blades.splice(i, 1);
  if (caught) saberSparks(b.pos.clone(), 5);
}
function deflectLocal(proj, dt, speed) {
  if (online || (proj.guardSkip && gameTime < proj.guardSkip)) return false;
  const pos = proj.pos, dir = proj.dir || (proj.vel ? proj.vel.clone().normalize() : null);
  if (!pos || !dir) return false;
  const sp = proj.vel ? proj.vel.length() : speed;
  const to = pos.clone().addScaledVector(dir, sp * dt);
  for (const e of entities) {
    if (!e.alive || e === proj.owner) continue;
    const touch = bladeTouch(e.pos, e.yaw, saberSpace(e), pos, to, dir, gameTime, ensureSaber(e), isSaber(e.weapon));
    if (!touch) continue;
    payProjectile(e.saber, gameTime, touch.perfect);
    const nd = new V3(touch.dir.x, touch.dir.y, touch.dir.z);
    if (proj.vel) proj.vel.copy(nd).multiplyScalar(Math.max(0.01, sp));
    if (proj.dir && proj.dir.copy) proj.dir.copy(nd);
    if (touch.perfect) proj.owner = e;
    proj.guardSkip = gameTime + 0.3;
    saberSfx.parry(touch.perfect); saberSparks(pos.clone(), touch.perfect ? 16 : 8);
    if (proj.mesh && proj.mesh.lookAt) proj.mesh.lookAt(pos.clone().add(nd));
    return true;
  }
  return false;
}
function saberPreMove(p, dt) {
  if (!p || !p.alive || !isSaber(p.weapon)) return;
  stepOneSaber(p, dt, !!online);
}
function stepLocalSabers(dt) {
  if (!online) for (const e of entities) if (e !== player && e.alive && isSaber(e.weapon)) stepOneSaber(e, dt, false);
  stepBladesLocal(dt); // online a lâmina é só visual; o dano fica no servidor
}
function stepOneSaber(e, dt, netPlayer) {
  const st = ensureSaber(e), prof = profileOf(WEAPONS[e.weapon]); if (!prof) return;
  const holding = e.isPlayer ? rightDown && e.stunUntil <= gameTime && fp.actionT <= 0 && gameTime >= st.lockUntil : !!st.wantBlock;
  stepStamina(st, gameTime, dt, holding);
  if (e.isPlayer && netPlayer) {
    const bit = st.blocking ? 1 : 0;
    if (bit !== e.saberNetBlock) { e.saberNetBlock = bit; netEv(['sbg', bit, +(performance.now() / 1000).toFixed(3)]); }
  }
  if (gameTime < st.dashUntil) {
    const rate = st.dashDist / Math.max(0.05, st.dashDur || 0.16);
    e.vel.x = st.dashDir.x * rate; e.vel.z = st.dashDir.z * rate;
  }
  if (!netPlayer && !st.dashStruck && gameTime >= st.dashStrikeAt) {
    st.dashStruck = true;
    const D = prof.dash;
    if (saberArcLocal(e, center(e, EYE), st.dashDir, D.dmg, D.reach, D.arc)) saberSfx.clash();
  }
  if (!netPlayer) {
    const tick = spinDue(st, gameTime, prof);
    if (tick) saberRadiusLocal(e, tick.dmg, tick.radius);
  }
}
function botSaberThink(b, t, dist) {
  const prof = profileOf(WEAPONS[b.weapon]); if (!prof || b.stunUntil > gameTime) return;
  const st = ensureSaber(b);
  const skill = botSkill(b.reaction, b.accuracy);
  if (gameTime >= (b.saberPlanUntil || 0)) {
    let foes = 0;
    for (const o of entities) if (o !== b && o.alive && !friends(o, b) && Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z) <= (prof.spin ? prof.spin.radius : 3)) foes++;
    const gun = !!(t && WEAPONS[t.weapon] && !WEAPONS[t.weapon].melee);
    b.saberPlan = botPlan(skill, {
      dist, dual: !!WEAPONS[b.weapon].dual, foesNear: foes, gun, hp: b.hp,
      dashReady: gameTime >= st.dashReady, specialReady: gameTime >= st.specialReady && !st.bladeOut,
      canBlock: gameTime >= st.lockUntil && st.stam > 22, inReach: dist <= prof.reach + 0.15, roll: Math.random(),
    });
    b.saberPlanUntil = gameTime + (b.saberPlan.block ? b.saberPlan.blockSeconds || 0.25 : 0.28);
  }
  const plan = b.saberPlan || {};
  let block = !!plan.block;
  if (block && plan.blockSeconds <= 0.22 && st.blocking && gameTime - st.blockAt > SABER_KIT.block.parry) block = false;
  st.wantBlock = block;
  if (plan.dash && gameTime >= st.dashReady) saberDash(b);
  else if (plan.special) saberSpecial(b);
  else if (plan.swing && dist <= prof.reach + 0.2) swingSaber(b);
}
// Arco: segura o clique para puxar a corda. Soltar cedo sai fraco; no talo, mais forte. A besta continua no clique.
// Minigun: qualquer botão embala (0,6 s); só o esquerdo atira, e só embalada. Cada tiro esquenta; no talo trava, solta vapor e só volta fria.
function updateMinigun(p, dt, w) {
  const S = w.spin, free = p.reloadEnd <= gameTime && p.switchEnd <= gameTime && p.stunUntil <= gameTime && !p.charging;
  const want = free && !p.mgHot && (mouseDown || rightDown);
  if (want !== !!p.mgWant) { p.mgWant = want; if (online) netEv(['mgs', want ? 1 : 0, +(performance.now() / 1000).toFixed(3)]); if (want && (p.mgSpin || 0) < 0.3) sfx.mgStart(); else if (!want && (p.mgSpin || 0) > 0.5) sfx.mgStop(); }
  p.mgSpin = clamp((p.mgSpin || 0) + (want ? dt / S.up : -dt / S.down), 0, 1);
  const firing = p.mgFiring = want && mouseDown && p.mgSpin >= 1;
  if (!firing) { p.mgHeat = Math.max(0, (p.mgHeat || 0) - S.cool * dt); if (p.mgHot && p.mgHeat <= 0) p.mgHot = false; }
  if (p.mgHot) mgSteam(dt);
  if (!firing || gameTime < p.nextFire) return;
  if (p.mag[MINIGUN] <= 0) { sfx.empty(); p.nextFire = gameTime + 0.25; startReload(p); return; }
  p.mag[MINIGUN]--; p.nextFire = gameTime + w.rate; p.invulnUntil = Math.min(p.invulnUntil, gameTime);
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion), moving = Math.hypot(p.vel.x, p.vel.z) > 1 || !p.onGround;
  const spread = w.spread * (moving ? 1.35 : 1) * (1 + (p.mgHeat || 0) * 0.5); // quente abre um pouco
  fire(p, camera.position.clone(), dir, MINIGUN, spread, camera.localToWorld(new V3(0.16, -0.24, -1.0)));
  sfx.minigun(); fp.kick = Math.min(0.05, fp.kick + 0.012); fp.flashT = 0.035; shake = Math.max(shake, 0.07); ejectCase(fp.mgCase);
  p.pitch = clamp(p.pitch + w.recoil * (0.4 + Math.random() * 0.6), -1.5, 1.5); p.yaw += (Math.random() - 0.5) * w.recoil * 0.8;
  p.mgHeat = (p.mgHeat || 0) + S.heat; if (p.mgHeat >= 1) { p.mgHeat = 1; p.mgHot = true; p.mgFiring = false; sfx.steam(); flashMsg('Minigun superaqueceu!'); }
  window.__lastShot = { dir: dir.toArray(), origin: camera.position.toArray(), spread, w: MINIGUN }; window.__mgShots = (window.__mgShots || 0) + 1; // testes
  if (p.mag[MINIGUN] === 0) startReload(p);
}
// vapor saindo dos canos quentes (fumaça clara na boca da arma, no mundo)
const mgSteamGeo = new THREE.SphereGeometry(0.06, 6, 5);
function mgSteam(dt) { fp.steamAcc = (fp.steamAcc || 0) + dt; while (fp.steamAcc > 0.05) { fp.steamAcc -= 0.05; const m = new THREE.Mesh(mgSteamGeo, new THREE.MeshBasicMaterial({ color: 0xf4f4f4, transparent: true, opacity: 0.6, depthWrite: false })); m.position.copy(camera.localToWorld(new V3(0.16 + rand(-0.04, 0.04), -0.2, -0.95))); scene.add(m); particles.push({ mesh: m, vel: new V3(rand(-0.2, 0.2), rand(0.6, 1.1), rand(-0.2, 0.2)), life: rand(0.6, 0.9), t: 0, kind: 'smoke', s0: rand(1, 1.6) }); window.__mgSteam = (window.__mgSteam || 0) + 1; } }
function releaseBow(p) {
  const w = WEAPONS[BOW];
  const can = p.alive && p.reloadEnd <= gameTime && p.switchEnd <= gameTime && p.stunUntil <= gameTime && !p.charging && p.mag[BOW] > 0 && gameTime >= p.nextFire;
  if (!can) { p.bowDraw = 0; return; }
  if (mouseDown && !p.bowDraw) p.bowDraw = gameTime;
  const tap = !p.bowDraw && !mouseDown && clickLatch && performance.now() - clickLatch < 250;
  const release = !!p.bowDraw && !mouseDown;
  if (!tap && !release) return;
  const k = tap ? 0 : clamp((gameTime - p.bowDraw) / (w.draw || 0.7), 0, 1);
  p.bowDraw = 0; firedThisPress = true; clickLatch = 0;
  p.mag[BOW]--; p.nextFire = gameTime + w.rate; p.invulnUntil = Math.min(p.invulnUntil, gameTime);
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  const spread = w.spread * (1.7 - k);
  const muzzle = camera.localToWorld(new V3(0.2, -0.18, -0.9));
  const force = 0.35 + 0.95 * k;
  fire(p, camera.position.clone(), dir, BOW, spread, muzzle, force);
  sfx[w.key](); fp.kick = Math.min(0.14, fp.kick + w.recoil * (1.2 + k)); fp.flashT = 0.04; fp.stringT = 0.14;
  launchShaft(muzzle, dir, 16 + 26 * k);
  p.pitch = clamp(p.pitch + w.recoil * (0.35 + k), -1.5, 1.5);
  window.__lastShot = { dir: dir.toArray(), origin: camera.position.toArray(), spread, w: BOW, force };
  if (p.mag[BOW] === 0) startReload(p);
}
// Estilingue: segura o clique pra esticar o elástico e solta pra lançar o ovo (sem clarão, sem traçante, quase sem barulho)
function releaseEgg(p) {
  const w = WEAPONS[EGG_W];
  const can = p.alive && p.reloadEnd <= gameTime && p.switchEnd <= gameTime && p.stunUntil <= gameTime && !p.charging && gameTime >= p.nextFire;
  if (can && p.mag[EGG_W] <= 0) { p.eggDraw = 0; if (mouseDown && !firedThisPress) { firedThisPress = true; sfx.empty(); p.nextFire = gameTime + 0.25; startReload(p); } return; }
  if (!can) { p.eggDraw = 0; return; }
  if (mouseDown && !p.eggDraw) { p.eggDraw = gameTime; sfx.estica(); }
  const tap = !p.eggDraw && !mouseDown && clickLatch && performance.now() - clickLatch < 250;
  const release = !!p.eggDraw && !mouseDown;
  if (!tap && !release) return;
  const k = tap ? 0 : clamp((gameTime - p.eggDraw) / (w.draw || 0.55), 0, 1);
  p.eggDraw = 0; firedThisPress = true; clickLatch = 0;
  p.mag[EGG_W]--; p.nextFire = gameTime + w.rate; p.invulnUntil = Math.min(p.invulnUntil, gameTime);
  const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
  launchEgg(p, camera.localToWorld(new V3(0.12, -0.1, -0.6)), dir, k);
  sfx.estilingue(); fp.kick = Math.min(0.1, fp.kick + w.recoil * (1 + k)); fp.stringT = 0.14;
  window.__lastShot = { dir: dir.toArray(), origin: camera.position.toArray(), spread: 0, w: EGG_W, force: k };
  if (p.mag[EGG_W] === 0) startReload(p);
}
function updatePlayer(dt) {
  const p = player;
  if (p && p.demoForward) keys.KeyW = true;
  if (p && p.demoBlock) rightDown = true;
  // Consome o toque mesmo no ar: segurar Espaço não rearma o pulo ao aterrissar.
  const jumpPressed = !!keys.Space; keys.Space = false;
  if (!p.alive) {
    if (emote.on) stopEmote();
    saberSfx.hum(false);
    if (p.charging) { p.charging = false; arcLine.visible = arcMark.visible = false; }
    deathFx(p); if (!invSpectate()) deathCam(p, dt);
    // humano não renasce sozinho: espera RESPAWN_TIME e o clique em RENASCER (ou Espaço/Enter) — ver requestRespawn()
    updateAds(dt, false);
    return;
  }
  // mira com zoom: segura o botão direito (Shift agacha; com a faca o botão direito é a estocada). No ferrolho da sniper a luneta desce pra mão aparecer.
  const guiding = !!predator || !!gunner || !!ac130;
  stepCrouch(p, !guiding && !chatTyping() && (keys.ShiftLeft || keys.ShiftRight) ? 1 : 0, dt, PHYS);
  const bolting = fp.actionT > 0 && WEAPONS[p.weapon].bolt;
  updateAds(dt, !guiding && !bolting && !emote.on && p.weapon !== KNIFE && !isSaber(p.weapon) && !WEAPONS[p.weapon].noAds && rightDown && p.reloadEnd <= gameTime && p.switchEnd <= gameTime); // minigun sem zoom: o botão direito só embala
  if (p.weapon !== MINIGUN && p.mgHeat) { p.mgHeat = Math.max(0, p.mgHeat - WEAPONS[MINIGUN].spin.cool * dt); if (p.mgHeat <= 0) p.mgHot = false; } // guardada também esfria
  saberSfx.hum(isSaber(p.weapon) && !guiding);
  if (isSaber(p.weapon) && !guiding) saberSfx.humDrive(Math.min(1, Math.hypot(p.vel.x, p.vel.z) / SPEED + (fp.actionT > 0 ? 0.65 : 0) + (p.saber && p.saber.blocking ? 0.3 : 0)));
  fwd.set(-Math.sin(p.yaw), 0, -Math.cos(p.yaw)); right.set(Math.cos(p.yaw), 0, -Math.sin(p.yaw));
  const wish = new V3();
  if (!guiding && (keys.KeyW || keys.ArrowUp)) wish.add(fwd); if (!guiding && (keys.KeyS || keys.ArrowDown)) wish.sub(fwd);
  if (!guiding && (keys.KeyD || keys.ArrowRight)) wish.add(right); if (!guiding && (keys.KeyA || keys.ArrowLeft)) wish.sub(right);
  p.useHold = !!(keys[BOMB.KEY] && p.alive && !emote.on); if (bombLock(p)) wish.set(0, 0, 0); // Bomba: parado na preparação e enquanto planta/desarma
  if (wish.lengthSq()) wish.normalize().multiplyScalar(SPEED * moveScale(WEAPONS[p.weapon], p.weapon, KNIFE, MELEE.speedMul) * (p.stunUntil > gameTime ? SHOCK.slow : 1) * (p.ghostOn ? 1.3 : 1) * (1 - (1 - ADS_SPEED) * ads) * (1 - (1 - CROUCH.speed) * p.crouch)); // faca corre; sabre anda normal; agachado anda mais devagar
  const acc = p.onGround ? 14 : 4;
  p.vel.x += (wish.x - p.vel.x) * Math.min(1, acc * dt); p.vel.z += (wish.z - p.vel.z) * Math.min(1, acc * dt);
  if (!guiding && jumpPressed && p.onGround && !bombLock(p)) { p.vel.y = JUMP; p.onGround = false; sfx.jump(); }
  saberPreMove(p, dt);
  moveEntity(p, dt);
  const bob = p.onGround ? Math.abs(Math.sin(fp.bob)) * 0.05 * stanceScale(p.crouch) : 0;
  camera.position.set(p.pos.x, p.pos.y + eyeHeight(p) + bob, p.pos.z); camera.rotation.set(p.pitch, p.yaw, 0);
  if (p.alive && p.stunUntil > gameTime) { camera.rotation.x += rand(-1, 1) * 0.012; camera.rotation.y += rand(-1, 1) * 0.012; } // levou choque: mira tremendo
  if (shake > 0) {
    if (!guiding) { camera.position.add(new V3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).multiplyScalar(shake * 0.25)); camera.rotation.z += rand(-1, 1) * shake * 0.05; }
    shake = Math.max(0, shake - dt * 1.8);
  }
  if (gunner || guiding || radioCall) p.bowDraw = p.eggDraw = 0; // killstreak/rádio no meio da puxada: solta o elástico sem atirar
  if (gunner) { updateGunnerMode(dt); return; }
  if (ac130) { updateAc130Mode(); return; }
  if (guiding) { updatePredator(dt); if (predator) posePredatorCam(); return; }
  if (radioCall) { if (gameTime >= radioCall.at) finishRadioCall(); else return; } // chamando no rádio: sem tiro até terminar
  if (emote.on) { // dança: anda e olha, mas a arma não dispara até a animação acabar
    if (gameTime >= emote.until) stopEmote();
    else {
      p.charging = false; p.bowDraw = 0; p.eggDraw = 0; p.burstLeft = 0;
      arcLine.visible = arcMark.visible = false;
      return;
    }
  }
  // tiro
  finishReload(p);
  const w = WEAPONS[p.weapon];
  if (p.charging) updateArc();
  // Calibre 12: atirar interrompe a recarga cartucho a cartucho
  const canFire = p.reloadEnd <= gameTime || (w.shellReload && p.mag[p.weapon] > 0);
  const latched = !mouseDown && clickLatch && performance.now() - clickLatch < (w.burst ? 450 : 250); // FAMAS: clique na pausa entre rajadas fica guardado pra próxima
  if (isSaber(p.weapon)) {
    if (!p.charging && p.stunUntil <= gameTime && (mouseDown || latched) && gameTime >= p.nextFire && p.switchEnd <= gameTime) {
      firedThisPress = true; clickLatch = 0; swingSaber(p);
    }
    return;
  }
  if (w.melee) { // faca: clique = golpe (segurando repete), botão direito = estocada
    const rLatched = !rightDown && rightLatch && performance.now() - rightLatch < 250;
    const rHeld = rightDown && !rightStale;
    if (!p.charging && p.stunUntil <= gameTime && gameTime >= p.nextFire && p.switchEnd <= gameTime && (rHeld || rLatched || mouseDown || latched)) {
      const kind = rHeld || rLatched ? 'stab' : 'slash'; if (kind === 'stab') rightFired = true; else firedThisPress = true; clickLatch = 0; rightLatch = 0;
      fp.knifeT = 0; fp.knifeKind = kind;
      knifeAttack(p, kind, camera.position.clone(), new V3(0, 0, -1).applyQuaternion(camera.quaternion));
    }
    return;
  }
  if (w.spin) { updateMinigun(p, dt, w); return; }
  // FAMAS: um clique dispara a rajada inteira (os tiros seguintes saem mesmo soltando o botão)
  const bursting = !!(w.burst && p.burstLeft > 0 && p.burstW === p.weapon);
  if (p.weapon === BOW) releaseBow(p);
  else if (p.weapon === EGG_W) releaseEgg(p);
  else if ((mouseDown || latched || bursting) && !p.charging && p.stunUntil <= gameTime && (w.auto || bursting || !firedThisPress || latched) && gameTime >= p.nextFire && canFire && p.switchEnd <= gameTime) {
    firedThisPress = true; clickLatch = 0;
    if (p.mag[p.weapon] > 0) {
      if (p.reloadEnd > gameTime) p.reloadEnd = 0;
      if (w.burst) { if (!bursting) { p.burstLeft = w.burst; p.burstW = p.weapon; } p.burstLeft--; }
      p.mag[p.weapon]--; p.nextFire = gameTime + (w.burst && !p.burstLeft ? w.burstDelay : w.rate); p.invulnUntil = Math.min(p.invulnUntil, gameTime);
      if (w.burst && p.mag[p.weapon] === 0) p.burstLeft = 0;
      const dir = new V3(0, 0, -1).applyQuaternion(camera.quaternion);
      const moving = Math.hypot(p.vel.x, p.vel.z) > 1 || !p.onGround;
      let spread;
      if (w.scope) spread = sniperSpread(scoped(), Math.hypot(p.vel.x, p.vel.z), !p.onGround, w.scopeStyle === 'torresmo'); // luneta + parado = zero; Torresmo sem luneta abre bem mais
      else { const mv = w.moveSpread ?? 2.2; spread = w.spread * (moving ? mv - ads * (mv - 1) * 0.67 : 1) * (1 - (1 - w.adsSpread) * ads); } // moveSpread: quanto o cone abre andando (Calibre 12 abre pouco)
      const muzzle = scoped() ? camera.localToWorld(new V3(0, -0.12, -0.6)) : p.weapon === CROSS ? camera.localToWorld(new V3(0.25 * (1 - ads), -0.19 + ads * 0.15, -1.0)) : camera.localToWorld(new V3(0.2 * (1 - ads), -0.18 + ads * 0.06, -0.9));
      if (w.rocket) {
        const d = dir.clone(); if (spread) { d.x += rand(-1, 1) * spread; d.y += rand(-1, 1) * spread; d.normalize(); }
        launchRocket(p, camera.localToWorld(new V3(0.08 * (1 - ads), -0.05, 0)), d);
      } else if (w.disc) launchDisc(p, camera.localToWorld(new V3(0.1 * (1 - ads), -0.12, 0)), dir);
      else if (w.corn) { launchCorn(p, camera.localToWorld(new V3(0.12 * (1 - ads), -0.1, 0)), dir); fp.cornCrankT = 0.2; } // manivela dá uma volta
      else fire(p, camera.position.clone(), dir, p.weapon, spread, muzzle);
      sfx[w.key](); fp.kick = Math.min(0.14, fp.kick + w.recoil * 2.5); fp.flashT = w.rocket ? 0.08 : 0.04;
      if (p.weapon === CROSS || p.weapon === BOW) { fp.stringT = 0.14; launchShaft(muzzle, dir, p.weapon === CROSS ? 42 : 28); }
      if (w.pump) { sfx.pump(0.9, 0.3); fp.actionT = fp.actionLen = w.rate; fp.kick = 0.2; shake = Math.max(shake, 0.2); } // Calibre 12: coice e tranco de câmera mais pesados
      if (w.bolt) { sfx.bolt(0.9, 0.3); fp.actionT = fp.actionLen = w.rate; }
      if (w.burst) { fp.cycT = 0.06; fp.climb = Math.min(0.12, fp.climb + 0.04); ejectCase(fp.famasCase); } // alavanca corre, arma sobe na rajada, cápsula sai pela direita
      if (w.scope) shake = Math.max(shake, 0.15);
      if (!w.scope) { p.pitch = clamp(p.pitch + w.recoil * (0.5 + Math.random() * 0.5), -1.5, 1.5); p.yaw += (Math.random() - 0.5) * w.recoil * (w.burst ? 0.15 : 0.4); } // rajada sobe reto, quase sem desvio pro lado // Sniper: coice só visual, a mira não sai do lugar
      window.__lastShot = { dir: dir.toArray(), origin: camera.position.toArray(), spread, w: p.weapon }; // testes
      if (p.mag[p.weapon] === 0) startReload(p);
    } else { sfx.empty(); p.nextFire = gameTime + 0.25; startReload(p); }
  }
}

// ---------------- Bots ----------------
function updateBot(b, dt) {
  if (b.zt) { updateZombie(b, dt); return; } // Invasão: zumbi (o core/servidor move)
  const m = b.model;
  if (!b.alive) {
    deathFx(b);
    if (b.swallowedAt != null && b.swallowedAt === b.deathAt) m.group.visible = false; // engolido
    else if (b.fxDeath === b.deathAt && b.baconOk) popModel(m.group, gameTime - b.deathAt, b.yaw); // pop → puf → bacon
    else { const k = Math.min(1, (gameTime - b.deathAt) / 0.15); m.group.scale.set(1 + 0.45 * k, 1 - 0.85 * k, 1 + 0.45 * k); if (gameTime - b.deathAt > 2.2) m.group.visible = false; }
    if (!b.remote && gameTime >= b.respawnAt) respawn(b);
    return;
  }
  if (b.remote) { interpRemote(b); animateBot(b, dt); return; } // online: posição vem do servidor
  if (b.dummy) { placeDummy(b); const sp = b.travelV / Math.max(dt, 1e-3); b.vel.x = sp; animateBot(b, dt); b.vel.x = 0; return; } // Treino: não pensa nem atira
  if (!online && bombFrozen(bombS)) { b.vel.set(0, 0, 0); b.useHold = false; animateBot(b, dt); return; } // Bomba: preparação
  if (b.frozen) { m.group.position.copy(b.pos); m.group.rotation.y = b.yaw; if (b.frozen === 'anim') animateBot(b, dt); return; } // usado só em testes ('anim': parado mas animando)
  finishReload(b);
  b.think -= dt;
  if (b.think <= 0) {
    b.think = rand(0.18, 0.32);
    let best = null, bs = 1e9; const eye = center(b, 1.5);
    for (const o of entities) {
      if (o === b || !o.alive || friends(o, b)) continue;
      const d = o.pos.distanceTo(b.pos); if (d > 55) continue;
      const score = d * (o === b.lastAttacker ? 0.5 : 1) * (o.isPlayer ? 0.85 : 1);
      if (score < bs && losClear(eye, center(o, 1.2)) && !smoked(eye, center(o, 1.2))) { best = o; bs = score; }
    }
    if (b.passive || b.stunUntil > gameTime) best = null; // atordoado não trava alvo
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
    else if (zone || bombS) { /* dentro da zona / no objetivo: segura a posição, só strafe */ }
    else if (Math.abs(dy) > 1.2 && dist > 3) { const st = steer(b, t.pos); if (st) move.add(st); } // outro andar: vai pelo grafo (rampas)
    else if (isSaber(b.weapon)) { const reach = (profileOf(WEAPONS[b.weapon]) || { reach: 2.4 }).reach; if (dist > reach - 0.15) move.add(to); botSaberThink(b, t, dist); }
    else if (b.weapon === KNIFE) { if (dist > 1.1) move.add(to); } // faca: cola no alvo
    else if (dist > range + 3) move.add(to); else if (dist < range - 3) move.sub(to);
    b.strafeT -= dt; if (b.strafeT <= 0) { b.strafeDir = [-1, 1, 1, -1, 0][Math.floor(Math.random() * 5)]; b.strafeT = rand(0.6, 1.8); if (Math.random() < 0.15 && b.onGround) b.vel.y = JUMP; }
    move.add(new V3(to.z, 0, -to.x).multiplyScalar(b.strafeDir * 0.8));
    if (b.nades > 0 && dist > 8 && dist < 24 && gameTime > b.nextNade && b.aim > b.reaction && Math.abs(t.pos.y - b.pos.y) < 3) { if (Math.random() < 0.35) botThrow(b, t); else b.nextNade = gameTime + rand(1.5, 3); }
    b.aim += dt;
    const sky = heliAimBot(b, dist);
    let shotT = t, shotDist = dist;
    if (sky) { shotT = sky.h; shotDist = sky.d; desiredYaw = Math.atan2(sky.h.pos.x - b.pos.x, sky.h.pos.z - b.pos.z); }
    let diff = desiredYaw - b.yaw; diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    const scopeWait = WEAPONS[b.weapon].scope ? (b.weapon === 5 ? 1.15 : b.weapon === 6 ? 0.45 : 0.8) : 0;
    const needAim = b.reaction + scopeWait; // sniper: os bots demoram mais pra mirar (justo)
    if (b.aim > needAim && Math.abs(diff) < (sky ? 0.6 : 0.35)) botShoot(b, shotT, shotDist);
  } else {
    let goal = null;
    const hp = b.hp < 45 ? pickups.filter((p) => p.active && p.type === 'health').sort((a, c) => a.pos.distanceTo(b.pos) - c.pos.distanceTo(b.pos))[0] : null;
    const nadeP = !hp && b.nades < 2 ? pickups.filter((p) => p.active && p.type === 'grenade' && p.pos.distanceTo(b.pos) < 22).sort((a, c) => a.pos.distanceTo(b.pos) - c.pos.distanceTo(b.pos))[0] : null;
    const zg = zoneGoal(b), bc = b.hp < 60 ? nearBacon(b, 12) : null;
    if (bc) goal = bc.pos; else if (hp && b.hp < 30) goal = hp.pos; else if (zg) goal = zg; else if (zone || bombS) goal = b.pos; else if (hp) goal = hp.pos; else if (nadeP) goal = nadeP.pos;
    else if (b.lastSeen && gameTime - b.lastSeenAt < 4) goal = b.lastSeen;
    else { if (!b.wp) b.wp = randomWaypoint(); goal = b.wp; }
    const to = goal.clone().sub(b.pos); to.y = 0;
    if (to.length() < 1.5 && Math.abs(goal.y - b.pos.y) < 0.5 && !bc) { if (goal === b.wp) b.wp = null; else b.lastSeenAt = -99; }
    else { const st = steer(b, goal) || to.normalize(); move.copy(st); desiredYaw = Math.atan2(st.x, st.z); }
    if (b.mag[b.weapon] < WEAPONS[b.weapon].mag * 0.5) startReload(b);
  }
  if (b.useHold) move.set(0, 0, 0); // plantando/desarmando
  if (move.lengthSq()) move.normalize().multiplyScalar(BOT_SPEED * moveScale(WEAPONS[b.weapon], b.weapon, KNIFE, MELEE.speedMul) * (b.stunUntil > gameTime ? SHOCK.slow : 1));
  const botDash = b.saber && gameTime < b.saber.dashUntil;
  if (botDash) { const rate = b.saber.dashDist / Math.max(0.05, b.saber.dashDur || 0.16); b.vel.x = b.saber.dashDir.x * rate; b.vel.z = b.saber.dashDir.z * rate; }
  else { const acc = b.onGround ? 10 : 3; b.vel.x += (move.x - b.vel.x) * Math.min(1, acc * dt); b.vel.z += (move.z - b.vel.z) * Math.min(1, acc * dt); }
  const blocked = moveEntity(b, dt);
  if (blocked) { b.stuck += dt; if (b.onGround) b.vel.y = JUMP; if (b.stuck > 1.2) { b.wp = randomWaypoint(); b.path = null; b.lastSeenAt = -99; b.strafeDir *= -1; b.stuck = 0; b.stuckCount = (b.stuckCount || 0) + 1; } }
  else b.stuck = Math.max(0, b.stuck - dt);
  let d = desiredYaw - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 9);
  for (const i of b.slots) if (b.reserve[i] < WEAPONS[i].mag && !(WEAPONS[i].rocket && b.reserve[i] > 0)) b.reserve[i] = WEAPONS[i].reserve; // bots nunca ficam totalmente sem bala
  animateBot(b, dt);
}
function animateBot(b, dt) { // visual: andar, flutuar, piscar ao levar dano, bolha de proteção, pose de recarga
  const m = b.model;
  if (b.emote) {
    b.emoteT = (b.emoteT || 0) + dt;
    if (b.emoteT > DANCE_TIME) { b.emote = ''; resetVictoryPose(m); setWeapon(b, b.weapon); }
    else {
      if (!m._gunsHidden) hideVictoryGuns(m);
      const lift = b.float ? 0.14 + Math.sin(gameTime * 2.6 + (b.floatPh || 0)) * 0.07 : 0;
      m.danceBase = { x: b.pos.x, y: b.pos.y + lift, z: b.pos.z, yaw: b.yaw };
      poseVictory(m, b.emote, b.emoteT);
      const flashing = gameTime < b.flashUntil;
      for (const mat of m.flashMats) mat.emissive.copy(flashing ? FLASH : mat.userData.baseEmissive);
      b.bubble.visible = gameTime < b.invulnUntil;
      return;
    }
  }
  const speed = Math.hypot(b.vel.x, b.vel.z); b.walk += dt * speed * 2.2; b.travel = (b.travel || 0) + speed * dt;
  if (b.float) { // Fantasminha: flutua de leve e deixa um rastro fraquinho
    m.group.position.set(b.pos.x, b.pos.y + 0.14 + Math.sin(gameTime * 2.6 + b.floatPh) * 0.07, b.pos.z);
    if (gameTime > b.nextWisp && speed > 1) { b.nextWisp = gameTime + 0.12; wisp(b.pos); }
  } else m.group.position.set(b.pos.x, b.pos.y + (b.onGround ? Math.abs(Math.sin(b.walk)) * 0.07 : 0), b.pos.z);
  m.group.rotation.y = b.yaw;
  m.legs[0].rotation.x = Math.sin(b.walk) * 0.6 * Math.min(1, speed); m.legs[1].rotation.x = -m.legs[0].rotation.x;
  setCrouchPose(m, b.crouch);
  const sw = b.swingT ?? 9; if (sw < 0.05 && !b.swingFaced) { setExpression(m, 'angry', 0.55); b.swingFaced = true; } else if (sw >= 0.05) b.swingFaced = false; // faca/sabre (local ou online)
  updateExpression(m, dt);
  const flashing = gameTime < b.flashUntil;
  for (const mat of m.flashMats) mat.emissive.copy(flashing ? FLASH : mat.userData.baseEmissive);
  b.bubble.visible = gameTime < b.invulnUntil;
  const reloading = b.reloadEnd > gameTime, pose = b.weapon === KNIFE ? 'knife' : b.weapon === SABER2 ? 'saber2' : b.weapon === SABER ? 'saber' : reloading ? 'reload' : 'gun';
  if (pose !== b.wasPose) { setPose(m, pose); b.wasPose = pose; }
  // recarga em 3ª pessoa (bots e outros jogadores online: a flag de recarga já vem no snapshot)
  const gi = b.weapon, gun = m.guns[gi];
  if (gun && gun.userData.barrels) { const on = b.mgSpinOn || gameTime - (b.mgShotT ?? -9) < 0.2; b.mgSpinV = clamp((b.mgSpinV || 0) + (on ? dt / 0.6 : -dt / 0.9), 0, 1); gun.userData.barrels.rotation.z += b.mgSpinV * dt * 40; } // canos da minigun girando
  if (gun && gi !== KNIFE && !isSaber(gi)) {
    if (gun.userData.baseY === undefined) gun.userData.baseY = gun.position.y;
    let rx = 0, rz = 0, py = 0;
    if (reloading) {
      const W = WEAPONS[gi], el = gameTime - (b.reloadStartT ?? gameTime), k = W.shellReload ? (el % W.reload) / W.reload : clamp(el / W.reload, 0, 1);
      const env = W.shellReload ? 1 : sstep(0, 0.14, k) * (1 - sstep(0.86, 1, k));
      if (W.rocket) { rx = -0.55 * env; py = -0.3 * env; } else { rz = 0.6 * env; rx = 0.15 * env; }
      m.arms[1].rotation.x = -0.8 + 0.45 * Math.sin(k * Math.PI * 2); // mão de apoio: tira/põe pente, cartucho, foguete
      if ((gi === 0 || gi === PISTOL) && k >= 0.25 && b.magDropKey !== b.reloadStartT) { b.magDropKey = b.reloadStartT; worldMagDrop(b, gi); }
    }
    gun.rotation.set(rx, 0, rz); gun.position.y = gun.userData.baseY + py;
  }
  if (pose === 'knife') { // golpe em 3ª pessoa: braço direito faz o arco (golpe) ou fura pra frente (estocada)
    b.swingT = (b.swingT ?? 9) + dt; const L = KNIFE_ANIM[b.swingKind || 'slash'], k = b.swingT / L, a = m.arms[0];
    a.rotation.set(-1.05, 0.25, -0.1);
    if (k < 1) {
      const sn = Math.sin(Math.min(1, k / 0.6) * Math.PI);
      if (b.swingKind === 'stab') { a.rotation.x = k < 0.3 ? -1.05 + 0.5 * (k / 0.3) : -0.55 - 1.0 * Math.sin(Math.min(1, (k - 0.3) / 0.4) * Math.PI / 2) * (1 - Math.max(0, (k - 0.7) / 0.3)); }
      else { a.rotation.y = 0.25 + (k < 0.25 ? -0.9 * (k / 0.25) : -0.9 + 2.0 * Math.min(1, (k - 0.25) / 0.35)) * (1 - Math.max(0, (k - 0.6) / 0.4)); a.rotation.x = -1.05 - 0.35 * sn; }
    }
  }
  if (pose === 'saber') { // as duas mãos no cabo; o corte gira o braço direito e o sabre vai junto
    b.swingT = (b.swingT ?? 9) + dt; const k = b.swingT / 0.48, a = m.arms[0], off = m.arms[1];
    const spinning = (b.saber && b.saber.spinUntil > gameTime) || b.saberSpinUntil > gameTime;
    const blocking = !!(b.saber && b.saber.blocking) || !!b.saberBlocking;
    a.rotation.set(-1.15, 0.42, -0.08); off.rotation.set(-1.05, -0.55, 0.28);
    if (spinning) { const sn = Math.sin(gameTime * 18); a.rotation.y = sn * 1.4; off.rotation.y = -sn * 1.4; a.rotation.x = -0.4; off.rotation.x = -0.4; }
    else if (blocking) { a.rotation.set(-0.35, 0.15, -0.2); off.rotation.set(-0.35, -0.2, 0.15); }
    else if (k < 1) { const sn = Math.sin(Math.min(1, k / 0.45) * Math.PI); a.rotation.y = 0.42 - 1.15 * sn; a.rotation.x = -1.15 - 0.2 * sn; off.rotation.y = -0.55 - 0.65 * sn; }
  }
}

const magGeo = new THREE.BoxGeometry(0.1, 0.24, 0.13);
function worldMagDrop(b, gi) { // pente caindo da arma de quem recarrega (3ª pessoa)
  const m = new THREE.Mesh(magGeo, new THREE.MeshBasicMaterial({ color: gi === PISTOL ? 0xff9fb6 : 0xe63946, transparent: true }));
  m.position.set(b.pos.x + Math.sin(b.yaw) * 0.5, b.pos.y + 0.75, b.pos.z + Math.cos(b.yaw) * 0.5); scene.add(m);
  particles.push({ mesh: m, vel: new V3(rand(-0.4, 0.4), 0.5, rand(-0.4, 0.4)), life: 2.2, t: 0, kind: 'mag', spin: new V3(rand(-5, 5), 0, rand(-5, 5)) });
  window.__worldMags = (window.__worldMags || 0) + 1;
}
// Dominação: ponto dentro da zona pra onde o bot vai (null = já está dentro / sem zona)
function zoneGoal(b) {
  if (online) return null;
  if (bombS && bombL) { const o = botObjective(bombS, b, bombL.sites, entities); return o ? new V3(o.x, o.y, o.z) : null; } // Bomba
  if (!zone) return null;
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
  // faca: de vez em quando, colado no alvo, o bot saca a faca e persegue (até 7 m)
  if (dist < 3 && gameTime > (b.knifeRoll || 0)) { b.knifeRoll = gameTime + 1.5; b.knifeMode = Math.random() < 0.45; }
  if (b.knifeMode && dist < 7) return b.slots[2] ?? KNIFE; if (dist >= 7) b.knifeMode = false;
  const side = b.slots[1] ?? PISTOL;
  const pr = b.primary; if (!botWeapon(b, pr)) return side;
  if (pr === 1) return dist < 14 ? pr : side;
  if (WEAPONS[pr].scope) { const min = pr === 5 ? 14 : pr === 6 ? 6 : 9; return dist >= min ? pr : side; }
  if (pr === 3) return dist >= 6 && dist <= 28 ? pr : side;
  if (pr === UZI) return dist < 24 ? pr : side;
  if (pr === P90) return dist < 36 ? pr : side;
  if (pr === SEMI) return dist < 16 ? pr : side;
  if (pr === CORN_W) return dist >= 4 && dist <= 13 ? pr : side; // pipoca: nem colado (se explode) nem longe (estoura antes)
  return pr;
}
const BOT_RATE = [() => rand(2.2, 3.4), () => 1.4, () => 1.6, () => 1, () => rand(1.8, 2.6), () => 1.15, () => 1.05, () => 1.5];
function botShoot(b, t, dist = 10) {
  if (b.stunUntil > gameTime) return;
  const w = WEAPONS[b.weapon];
  if (isSaber(b.weapon)) return; // combo, bloqueio, investida e especial ficam em botSaberThink
  if (gameTime < b.nextFire || b.switchEnd > gameTime) return;
  if (w.melee) { // faca: só golpeia de perto; às vezes estocada
    if (dist > MELEE.slash.range + 0.8) return;
    const kind = Math.random() < 0.3 ? 'stab' : 'slash', eye = center(b, 1.5), dir = center(t, 1.1).sub(eye).normalize();
    knifeAttack(b, kind, eye, dir); b.nextFire = gameTime + MELEE[kind].rate * rand(1.3, 1.9); return;
  }
  if (b.reloadEnd > gameTime) { if (w.shellReload && b.mag[b.weapon] > 0) b.reloadEnd = 0; else return; }
  if (b.mag[b.weapon] <= 0) { startReload(b); return; }
  if (w.rocket && dist < 6) return; // não se explode
  if (w.corn && dist < 4) return;
  b.mag[b.weapon]--; setExpression(b.model, 'angry', 0.5); // bazuca/milho/rajada também
  b.nextFire = gameTime + w.rate * (BOT_RATE[b.weapon] || (() => 1.2))();
  if (w.burst) { b.burstLeft = (b.burstLeft || w.burst) - 1; b.nextFire = gameTime + (b.burstLeft > 0 ? w.rate : w.burstDelay * rand(1.6, 2.6)); } // FAMAS: rajada de 3 e respira
  const origin = center(b, 1.3);
  const tMoving = Math.hypot(t.vel.x, t.vel.z) > 2 ? 1.5 : 1;
  const muzzle = origin.clone().add(new V3(Math.sin(b.yaw) * 1.0, -0.25, Math.cos(b.yaw) * 1.0));
  if (w.rocket) { // mira no pé, com antecipação
    const lead = dist / w.rocket.speed; const at = t.pos.clone().add(new V3(t.vel.x * lead + rand(-0.8, 0.8), 0.25, t.vel.z * lead + rand(-0.8, 0.8)));
    const o = center(b, 1.4); launchRocket(b, o, at.sub(o).normalize());
  } else if (w.corn) { // mira com queda (shared/corn.js cornAim), um pouco à frente de quem corre
    const o = center(b, 1.4), a = cornAim(o, t.pos.clone().add(new V3(t.vel.x * 0.35 + rand(-0.6, 0.6), 0.7, t.vel.z * 0.35 + rand(-0.6, 0.6)))); launchCorn(b, o, new V3(a.x, a.y, a.z));
  } else {
    const aimPt = (w.scope ? center(t, rand(0.75, 1.15)) : center(t, rand(0.7, 1.6))).add(new V3(rand(-0.3, 0.3), 0, rand(-0.3, 0.3)));
    const dir = aimPt.sub(origin).normalize();
    const spread = (w.pellets > 1 ? w.spread * 1.2 : w.scope ? 0.02 * tMoving : b.accuracy * tMoving * (b.weapon === PISTOL ? 0.9 : 1)) * (b.eggUntil > gameTime ? 2.5 : 1); // ovo na cara: erra mais
    fire(b, origin, dir, b.weapon, spread, muzzle);
    if (w.scope) b.aim = b.reaction * 0.4; // precisa remirar depois de cada tiro de sniper
  }
  sfx[w.key](distVol(b.pos) * 0.7);
  if (w.pump) sfx.pump(distVol(b.pos) * 0.5, 0.3); if (w.bolt) sfx.bolt(distVol(b.pos) * 0.5, 0.3);
  b.invulnUntil = Math.min(b.invulnUntil, gameTime);
}

// Entradas do menu fazem parte da vitrine; a comanda mantém a partida a um clique.
const menuViewButtons = [...document.querySelectorAll('[data-menu-view]')];
let menuViewTrigger = null;
function setMenuView(view, trigger) {
  for (const name of ['match', 'arsenal', 'operator', 'settings']) $('menu-' + name).hidden = name !== view;
  for (const button of menuViewButtons) button.setAttribute('aria-expanded', String(button.dataset.menuView === view));
  $('menuBack').hidden = view === 'match';
  $('menu').dataset.view = view;
  $('menu').querySelector('.menu-content').scrollTop = 0;
  if (trigger) menuViewTrigger = trigger;
  if (view !== 'match') $('menu-' + view).focus();
  else if (menuViewTrigger) menuViewTrigger.focus();
}
// Uma única progressão dirige tampa, personagem, câmera e interface, inclusive na volta.
const crateJourney = { progress: 0, target: 0, phase: 'closed', view: 'arsenal', nextView: 'match', homeNear: .1, homePosition: new V3(), homeQuaternion: new THREE.Quaternion(), homeOffset: 0 };
function crateMenuBusy(busy) {
  const menu = $('menu'); menu.setAttribute('aria-busy', String(busy));
  for (const selector of ['.menu-panel', '.menu-tools', '.showcase-actions', '.menu-key-hints', '.loadout-dock', '.dance-dock']) menu.querySelector(selector).inert = busy;
  if (busy) { menu.tabIndex = -1; menu.focus({ preventScroll: true }); }
}
function openMenuView(view, trigger) {
  if ((view === 'arsenal' || view === 'operator') && crateJourney.phase === 'closed') {
    if (trigger) menuViewTrigger = trigger;
    crateJourney.view = view; crateJourney.homeNear = camera.near;
    $('menu').dataset.container = view === 'operator' ? 'wardrobe' : 'arsenal';
    crateJourney.homePosition.copy(camera.position); crateJourney.homeQuaternion.copy(camera.quaternion);
    crateJourney.homeOffset = camera.view?.enabled ? camera.view.offsetX / innerWidth : 0;
    crateJourney.target = 1; crateJourney.phase = 'opening';
    $('menu').dataset.crateState = 'opening'; crateMenuBusy(true);
    return;
  }
  if (crateJourney.phase !== 'closed') {
    if (view === crateJourney.view) return;
    crateJourney.nextView = view; crateJourney.target = 0; crateJourney.phase = 'closing';
    $('menu').dataset.crateState = 'closing'; crateMenuBusy(true);
    return;
  }
  setMenuView(view, trigger);
}
menuViewButtons.forEach((button) => button.onclick = () => openMenuView(button.dataset.menuView, button));
$('menuBack').onclick = () => openMenuView('match');
$('menu').addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && (crateJourney.phase !== 'closed' || ($('menu').dataset.view && $('menu').dataset.view !== 'match'))) {
    event.preventDefault(); openMenuView('match');
  }
});
$('menuSound').onclick = () => {
  const muted = $('menuSound').getAttribute('aria-pressed') !== 'true';
  $('menuSound').setAttribute('aria-pressed', String(muted));
  $('menuSound').setAttribute('aria-label', muted ? 'Ativar áudio' : 'Silenciar áudio');
  $('menuSound').title = muted ? 'Ativar áudio' : 'Silenciar áudio';
  menuMuted = muted;
  if (master) master.gain.value = muted ? 0 : 0.4;
};

// Os valores acompanham os controles nativos, inclusive pelo teclado.
for (const id of ['sens', 'sensAds']) {
  const updateRangeTicket = () => {
    $(id + 'Value').value = Number($(id).value).toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  };
  $(id).addEventListener('input', updateRangeTicket);
  // As preferências salvas são carregadas mais abaixo durante a inicialização.
  requestAnimationFrame(updateRangeTicket);
}

// ---------------- Fluxo do jogo ----------------
// Vitrine independente: a arte do menu e sua luz não alteram os mapas jogáveis.
const menuScene = new THREE.Scene();
menuScene.background = new THREE.Color(0xdfb477);
const menuBackdrop = makeMenuBackdrop(THREE, menuScene, camera);
menuScene.add(new THREE.HemisphereLight(0xffe6bd, 0x79522f, 2.1));
const menuSun = new THREE.DirectionalLight(0xffd292, 2.4);
menuSun.position.set(-3, 7, 5); menuScene.add(menuSun);
const menuStage = new THREE.Group(); menuScene.add(menuStage);
const menuActorRoot = new THREE.Group(); menuScene.add(menuActorRoot);
const crateLid = new THREE.Group(); crateLid.position.set(0, -.02, -.53); menuStage.add(crateLid);
function onCrateLid(mesh) { crateLid.attach(mesh); return mesh; }
// Pinceladas largas e veios quentes aproximam a caixa do assoalho ilustrado.
const crateWood = ['#a76a36', '#b77b43', '#986032'].map((base, board) => {
  const map = canvasTex(512, 256, (ctx) => {
    ctx.fillStyle = base; ctx.fillRect(0, 0, 512, 256);
    let seed = 43 + board * 137;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 65; i++) {
      const x = rand() * 512, y = rand() * 256, length = 25 + rand() * 170;
      ctx.fillStyle = i % 3 ? '#4c281318' : '#f4bd7425';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y - 2 - rand() * 5);
      ctx.lineTo(x + length * .82, y + 2); ctx.lineTo(x - 12, y + 3 + rand() * 5); ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      const x = rand() * 512, y = rand() * 256;
      ctx.strokeStyle = '#512a1965'; ctx.lineWidth = 1 + rand() * 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 30, y - 5, x + 65, y + 6, x + 100, y - 2); ctx.stroke();
    }
    // Nós e pequenas lascas, desenhados em poucos planos como o chão da cena.
    const knotX = 115 + board * 113, knotY = 90 + board * 32;
    ctx.strokeStyle = '#59331d66'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(knotX, knotY, 27, 7, -.05, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#59331d66'; ctx.beginPath(); ctx.ellipse(knotX + 3, knotY, 12, 3, 0, 0, Math.PI * 2); ctx.fill();
    for (const x of [35 + board * 23, 340 - board * 35]) {
      ctx.fillStyle = '#5b331c88'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 9, 0); ctx.lineTo(x + 4, 25); ctx.lineTo(x - 5, 34); ctx.fill();
      ctx.fillStyle = '#e4a56066'; ctx.beginPath(); ctx.moveTo(x + 9, 0); ctx.lineTo(x + 13, 0); ctx.lineTo(x + 8, 27); ctx.lineTo(x - 5, 34); ctx.fill();
    }
    ctx.strokeStyle = '#e8ac644c'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(512, 3); ctx.stroke();
    ctx.fillStyle = '#49291455'; ctx.fillRect(0, 249, 512, 7);
  });
  return new THREE.MeshStandardMaterial({ map, roughness: .95 });
});
const crateIron = new THREE.MeshStandardMaterial({ color: 0x544a37, roughness: 0.8, metalness: 0.12 });
function crateBox(w, h, d, x, y, z, material) {
  // Chanfros pequenos capturam a luz nas bordas das tábuas sem textura realista.
  let geometry;
  if (crateWood.includes(material) && Math.min(w, h, d) >= 0.1) {
    const bevel = Math.min(0.015, Math.min(w, h, d) / 8);
    const shape = new THREE.Shape();
    const hw = w / 2 - bevel, hh = h / 2 - bevel;
    shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.closePath();
    geometry = new THREE.ExtrudeGeometry(shape, { depth: d - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 1, steps: 1 });
    geometry.translate(0, 0, -d / 2 + bevel);
  } else geometry = new THREE.BoxGeometry(w, h, d);
  const part = new THREE.Mesh(geometry, material);
  part.position.set(x, y, z); menuStage.add(part); return part;
}
// Tampa, corpo de tábuas e moldura frontal: o personagem fica sobre a caixa.
for (let i = 0; i < 6; i++) {
  onCrateLid(crateBox(0.34, 0.13, 1.1, (i - 2.5) * 0.35, -0.085, 0, crateWood[i % 3]));
}
for (let row = 0; row < 3; row++) {
  const y = -0.24 - row * 0.26;
  // Quatro paredes, em vez de blocos maciços: a câmera pode entrar de verdade.
  for (const z of [-.478, .478]) crateBox(2.06, .25, .075, 0, y, z, crateWood[row % 3]);
  for (const x of [-.993, .993]) crateBox(.075, .25, .9, x, y, 0, crateWood[(row + 1) % 3]);
}
crateBox(2.06, .1, 1.03, 0, -.88, 0, crateWood[0]);
crateBox(2.13, 0.12, 0.12, 0, -0.18, 0.55, crateWood[2]);
crateBox(2.13, 0.12, 0.12, 0, -0.91, 0.55, crateWood[0]);
for (const x of [-0.97, 0.97]) {
  crateBox(0.14, 0.85, 0.14, x, -0.54, 0.56, crateWood[2]);
}
for (const x of [-0.76, 0.76]) {
  crateBox(0.095, 0.88, 0.035, x, -0.52, 0.61, crateIron);
  onCrateLid(crateBox(0.095, 0.028, 1.09, x, -0.011, 0, crateIron));
  for (const y of [-0.17, -0.86]) {
    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.016, 6), new THREE.MeshBasicMaterial({ color: 0xb7a37d }));
    rivet.rotation.x = Math.PI / 2; rivet.position.set(x, y, 0.64); menuStage.add(rivet);
  }
}
// Pequeno estojo sobre a tampa, ao lado do Docão.
onCrateLid(crateBox(0.48, 0.18, 0.24, -0.68, 0.08, -0.18, new THREE.MeshStandardMaterial({ color: 0x893d2b, roughness: 1 })));
for (const x of [-0.83, -0.53]) onCrateLid(crateBox(0.035, 0.19, 0.25, x, 0.085, -0.18, crateIron));
// Dobradiças e travessas ficam visíveis com a tampa aberta.
for (const x of [-.72, .72]) {
  crateBox(.17, .09, .10, x, -.12, -.53, crateIron);
  onCrateLid(crateBox(.10, .06, .94, x, -.18, 0, crateWood[0]));
}
// Mala de figurinos apoiada na quina direita, com a base no mesmo piso da caixa.
const wardrobeCase = makeWardrobeCase(THREE, canvasTex);
wardrobeCase.position.set(1.43, -.975, .38); wardrobeCase.rotation.set(0, .10, .14);
menuStage.add(wardrobeCase);
const wardrobeAnchor = new V3(), wardrobeCorner = new V3();
// A tinta faz parte da geometria: recebe a mesma luz e perspectiva da madeira.
// O botão HTML transparente preserva foco, teclado e nome acessível.
const cratePaint = new THREE.MeshStandardMaterial({ color: 0xe5bf85, transparent: true, roughness: 1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
const crateInscription = new THREE.Mesh(new THREE.PlaneGeometry(1.38, .34), cratePaint);
crateInscription.position.set(0, -.52, .518); crateInscription.visible = false; menuStage.add(crateInscription);
const crateLetters = new Image();
crateLetters.onload = () => {
  cratePaint.map = canvasTex(1024, 256, (ctx) => {
    ctx.drawImage(crateLetters, 200, 8, 810, 240);
    const pixels = ctx.getImageData(0, 0, 1024, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      // Retira a extrusão escura do lettering original, mantendo só a face pintada.
      const face = Math.min(1, Math.max(0, (pixels.data[i + 1] - 95) / 60));
      pixels.data[i + 3] *= face * .92;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 3; i++) {
      const x = 25 + i * 48;
      ctx.beginPath(); ctx.moveTo(x, 214); ctx.lineTo(x + 2, 76); ctx.lineTo(x + 17, 27);
      ctx.lineTo(x + 33, 76); ctx.lineTo(x + 34, 214); ctx.closePath(); ctx.fill();
    }
    ctx.globalCompositeOperation = 'destination-out';
    // Falhas de tinta seguem os veios e a junta entre as duas tábuas.
    for (let i = 0; i < 110; i++) {
      ctx.fillStyle = i % 4 ? '#0005' : '#000b';
      ctx.fillRect((i * 173 + 39) % 1024, (i * 47 + 13) % 256, 4 + i % 23, 1 + i % 2);
    }
    ctx.clearRect(0, 202, 1024, 8);
  });
  cratePaint.needsUpdate = true; crateInscription.visible = true;
};
crateLetters.src = './assets/menu/lettering-arsenal.webp';
const crateLabelPoint = new V3(), crateBasePoint = new V3(), crateLabelLeft = new V3(), crateLabelRight = new V3(), pigPoint = new V3();
const stageShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.4), new THREE.MeshBasicMaterial({
  map: canvasTex(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 64); g.addColorStop(0, '#24160cc0'); g.addColorStop(1, '#24160c00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  }), transparent: true, depthWrite: false,
}));
stageShadow.rotation.x = -Math.PI / 2; stageShadow.position.y = -0.012; menuStage.add(stageShadow);
const crateContactShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 1.7), stageShadow.material.clone());
crateContactShadow.rotation.x = -Math.PI / 2;
crateContactShadow.position.set(.08, -.98, .05); menuStage.add(crateContactShadow);
const wardrobeShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.05, .65), stageShadow.material.clone());
wardrobeShadow.rotation.x = -Math.PI / 2; wardrobeShadow.position.set(1.45, -.98, .38); menuStage.add(wardrobeShadow);
const crateEndPosition = new V3(), crateEndLook = new V3(), crateLookMatrix = new THREE.Matrix4(), crateEndQuaternion = new THREE.Quaternion();
const crateEase = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const prefersReducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function updateCrateJourney(dt) {
  const trip = crateJourney;
  if (trip.phase === 'closed') { menuActorRoot.position.set(0, 0, 0); stageShadow.material.opacity = 1; return; }
  const reducedMotion = prefersReducedMotion.matches;
  const direction = trip.target ? 1 : -1;
  trip.progress = reducedMotion ? trip.target : clamp(trip.progress + direction * dt / 1.85, 0, 1);
  const p = trip.progress, dressing = trip.view === 'operator';
  // O Docão dá espaço à tampa antes de a câmera descer.
  const step = dressing ? 0 : crateEase(p / .24);
  stageShadow.material.opacity = 1 - step;
  menuActorRoot.position.set(1.75 * step, -.94 * step, -.8 * step).applyAxisAngle(new V3(0, 1, 0), menuStage.rotation.y);
  const opening = crateEase((p - .14) / .38);
  crateLid.rotation.x = dressing ? 0 : -1.95 * opening;
  wardrobeCase.userData.door.rotation.y = dressing ? -1.95 * opening : 0;
  const dive = crateEase((p - .32) / .68);
  if (dressing) {
    crateEndPosition.set(0, .42, .035).applyMatrix4(wardrobeCase.matrixWorld);
    crateEndLook.set(0, .42, -.16).applyMatrix4(wardrobeCase.matrixWorld);
  } else {
    crateEndPosition.set(0, -.23, .21).applyMatrix4(menuStage.matrixWorld);
    crateEndLook.set(0, -.79, -.37).applyMatrix4(menuStage.matrixWorld);
  }
  crateLookMatrix.lookAt(crateEndPosition, crateEndLook, camera.up); crateEndQuaternion.setFromRotationMatrix(crateLookMatrix);
  camera.position.lerpVectors(trip.homePosition, crateEndPosition, dive);
  camera.quaternion.copy(trip.homeQuaternion).slerp(crateEndQuaternion, dive);
  camera.near = THREE.MathUtils.lerp(trip.homeNear, dressing ? .015 : .1, dive);
  camera.setViewOffset(innerWidth, innerHeight, trip.homeOffset * innerWidth * (1 - dive), 0, innerWidth, innerHeight);
  if (trip.target && p === 1 && trip.phase === 'opening') {
    trip.phase = 'inside'; $('menu').dataset.crateState = 'inside';
    crateMenuBusy(false); setMenuView(trip.view);
    $('menuBack').textContent = dressing ? '← FECHAR MALA' : '← FECHAR CAIXA';
  } else if (!trip.target && p === 0) {
    trip.phase = 'closed'; delete $('menu').dataset.crateState; delete $('menu').dataset.container;
    crateMenuBusy(false); setMenuView(trip.nextView);
    $('menuBack').textContent = '← VOLTAR À PARTIDA';
    menuActorRoot.position.set(0, 0, 0);
  }
}
const showcase = new THREE.Group(); showcase.position.set(0, 3, 0); scene.add(showcase);
const wardrobePreviewScene = new THREE.Scene();
wardrobePreviewScene.add(new THREE.HemisphereLight(0xffedca, 0x46573a, 2.1));
const wardrobePreviewLight = new THREE.DirectionalLight(0xffd79b, 2.4);
wardrobePreviewLight.position.set(-3, 7, 5); wardrobePreviewScene.add(wardrobePreviewLight);
const wardrobePreviewCamera = new THREE.PerspectiveCamera(38, 1, .1, 20);
wardrobePreviewCamera.position.set(0, 1.05, 4.5); wardrobePreviewCamera.lookAt(0, 1.05, 0);
const wardrobePreviewPosition = new V3(), wardrobePreviewRotation = new THREE.Quaternion();
let wardrobePreviewRenderer = null;
let wardrobePreviewWidth = 0, wardrobePreviewHeight = 0;
function renderWardrobePreview() {
  if (crateJourney.phase !== 'inside' || crateJourney.view !== 'operator') return;
  if (!wardrobePreviewRenderer) {
    wardrobePreviewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    wardrobePreviewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    wardrobePreviewRenderer.domElement.setAttribute('aria-hidden', 'true');
    $('wardrobePreview').appendChild(wardrobePreviewRenderer.domElement);
  }
  const rect = $('wardrobePreview').getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  wardrobePreviewPosition.copy(showcase.position); wardrobePreviewRotation.copy(showcase.quaternion);
  wardrobePreviewScene.add(showcase); showcase.position.set(0, 0, 0); showcase.rotation.set(0, .12 + Math.sin(menuT * 1.8) * .1, 0);
  wardrobePreviewCamera.aspect = rect.width / rect.height; wardrobePreviewCamera.updateProjectionMatrix();
  if (wardrobePreviewWidth !== rect.width || wardrobePreviewHeight !== rect.height) {
    wardrobePreviewRenderer.setSize(rect.width, rect.height, false);
    wardrobePreviewWidth = rect.width; wardrobePreviewHeight = rect.height;
  }
  wardrobePreviewRenderer.render(wardrobePreviewScene, wardrobePreviewCamera);
  menuActorRoot.add(showcase); showcase.position.copy(wardrobePreviewPosition); showcase.quaternion.copy(wardrobePreviewRotation);
}
let selectedSkin = getSkin(localStorage.getItem('docao.skin') || DEFAULT_SKIN).id, preview = null;
// loadout: arma primária escolhida (salva no navegador)
let selectedPrimary = (() => { const v = parseInt(localStorage.getItem('docao.primary')); return PRIMARIES.includes(v) ? v : 0; })();
let selectedSecondary = (() => { const v = parseInt(localStorage.getItem('docao.secondary')); return SECONDARIES.includes(v) ? v : PISTOL; })();
let selectedMelee = (() => { const v = parseInt(localStorage.getItem('docao.melee')); return MELEES.includes(v) ? v : KNIFE; })();
let saberColor = (() => { try { const v = localStorage.getItem('docao.saber'); if (SABER_COLORS.some((c) => c.hex === v)) return v; } catch (e) { /* sem storage */ } return SABER_COLORS[0].hex; })();
function paintSabers() {
  colorSabers(fp.guns, saberColor);
  for (const e of entities) if (e.model) colorSabers(e.model.guns, saberColor);
}
function buildSaberColors() {
  const row = $('saberColors'); if (!row) return;
  row.innerHTML = '';
  for (const c of SABER_COLORS) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'saberchip'; b.title = c.id; b.style.background = c.hex;
    b.classList.toggle('active', c.hex === saberColor);
    b.onclick = () => {
      saberColor = c.hex; try { localStorage.setItem('docao.saber', saberColor); } catch (e) { /* sem storage */ }
      document.querySelectorAll('.saberchip').forEach((el) => el.classList.toggle('active', el.title === c.id));
      paintSabers();
    };
    row.appendChild(b);
  }
  paintSabers();
  const wrap = $('saberRow'); if (wrap) wrap.hidden = !isSaber(selectedMelee);
}
function primChip(i, keyHint, onPick, kind) {
  const w = WEAPONS[i]; const b = document.createElement('button'); b.className = 'primchip'; b.dataset.i = i; b.dataset.pick = kind || 'primary';
  const name = w.key === 'shotgun' ? 'Calibre 12 Chiqueiro' : w.name;
  b.innerHTML = `${keyHint ? `<kbd>[${keyHint}]</kbd>` : ''}<span class="wthumb" data-w="${i}"></span><span class="wtxt">${escapeHtml(name)}<small>${escapeHtml(w.desc)}</small></span>`;
  if (weaponThumbs[i]) b.querySelector('.wthumb').style.backgroundImage = `url("${weaponThumbs[i]}")`;
  b.onclick = () => onPick(i); return b;
}
function markPick(kind, i) {
  document.querySelectorAll(`.primchip[data-pick="${kind}"]`).forEach((c) => c.classList.toggle('active', +c.dataset.i === i));
}
// ---------------- Treino (Estande do Docão) ----------------
// B / N / M: próxima primária / secundária / faca-sabre, na hora e com pente cheio (online o servidor faz o mesmo ao receber 'pr')
function trainSwap(code) {
  const cyc = (list, cur) => { const L = pool(list); if (!L.length) return cur; const i = L.includes(cur) ? L.indexOf(cur) : 0; return L[(i + 1) % L.length]; };
  let w;
  if (code === 'KeyB') { setPrimary(cyc(PRIMARIES, selectedPrimary)); w = selectedPrimary; }
  else if (code === 'KeyN') { setSecondary(cyc(SECONDARIES, selectedSecondary)); w = selectedSecondary; }
  else { setMelee(cyc(MELEES, selectedMelee)); w = selectedMelee; }
  equipLiveLoadout(w);
}
// aplica o loadout escolhido no jogador vivo: slots novos, pente cheio só nas armas que entraram, saca a que trocou
function equipLiveLoadout(w) {
  const p = player; if (!p) return;
  const old = p.slots; p.primary = selectedPrimary; p.secondary = selectedSecondary; p.melee = selectedMelee; p.slots = [p.primary, p.secondary, p.melee];
  for (const i of p.slots) if (!old.includes(i)) { p.mag[i] = WEAPONS[i].mag; p.reserve[i] = WEAPONS[i].reserve; }
  p.reloadEnd = 0; p.knifeMode = false; switchWeapon(p, w); if (p.weapon !== w) setWeapon(p, w);
  flashMsg(`${WEAPONS[w].name} · ${WEAPONS[w].desc}`);
}
// munição de reserva infinita e Copo Bomba/fumaça voltam sozinhos; pau de choque em 10 s (offline e online; online o servidor confere)
function trainRefill() {
  const p = player; if (!p || !p.alive) return;
  for (const i of p.slots) p.reserve[i] = WEAPONS[i].reserve;
  if (p.nades < NADE.max && gameTime - (p.lastNadeT ?? -9) > TRAIN.nadeRefill + 0.25 && !p.charging) p.nades = NADE.max;
  if (!online) { p.smokeNades = clientPower('smoke') ? Math.max(p.smokeNades || 0, 1) : 0; shockRefill(p); } // pau de choque: volta em 10 s (online o servidor manda 'skn')
}
// número de dano subindo em cima do alvo (amarelo = cabeça) + painel "último acerto"
const dmgPops = [];
function dmgPopup(t, amount, head) {
  const n = Math.round(amount); if (!(n > 0) || !t.pos) return;
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 96; const x = cv.getContext('2d');
  x.font = '900 64px "Arial Black", Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = 10; x.strokeStyle = '#2a1410';
  const txt = head ? `${n}!` : String(n); x.strokeText(txt, 128, 52); x.fillStyle = head ? '#ffd23a' : '#ffffff'; x.fillText(txt, 128, 52);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true, sizeAttenuation: false }));
  sp.renderOrder = 999; const s = head ? 0.085 : 0.065; sp.scale.set(s * 2.67, s, 1);
  sp.position.set(t.pos.x + rand(-0.35, 0.35), t.pos.y + 2.3 + rand(0, 0.25), t.pos.z); scene.add(sp); dmgPops.push({ sp, born: gameTime, vy: 1.1 });
  const d = player ? Math.round(Math.hypot(t.pos.x - player.pos.x, t.pos.z - player.pos.z)) : 0;
  const tot = (t.trainTot && gameTime - t.trainLast < 3 ? t.trainTot : 0) + n; t.trainTot = tot; t.trainLast = gameTime;
  const el = $('trainInfo'); if (el) { el.classList.remove('hidden'); el.innerHTML = `Último: <b class="${head ? 'hd' : ''}">${n}</b> ${head ? 'CABEÇA' : 'corpo'} · ${d} m · ${escapeHtml(t.name)} · seguidos: <b>${tot}</b>`; }
}
function updateDmgPops(dt) {
  for (let i = dmgPops.length - 1; i >= 0; i--) {
    const q = dmgPops[i], age = gameTime - q.born; q.sp.position.y += q.vy * dt; q.sp.material.opacity = Math.max(0, 1 - Math.max(0, age - 0.5) / 0.4);
    if (age > 0.9 || age < 0) { scene.remove(q.sp); q.sp.material.map.dispose(); q.sp.material.dispose(); dmgPops.splice(i, 1); }
  }
}
function sendLoadout() {
  if (bombPick) { bombEquipNow(); renderBLoad(); } // Bomba: na preparação a troca vale na hora (offline e online)
  if (!online || !online.net) return;
  const c = clampLoadout(selectedPrimary, selectedSecondary, selectedMelee, activeWeapons());
  const inLobby = online.lobby && online.lobby.state !== 'playing';
  if (inLobby) online.net.send({ t: 'prof', name: myName(), skin: selectedSkin, primary: c.primary, secondary: c.secondary, melee: c.melee });
  else netEv(['pr', c.primary, c.secondary, c.melee]);
}
function setSpawnHand(h) {
  spawnHold = normHand(h); try { localStorage.setItem('docao.hand', spawnHold); } catch (e) { /* sem storage */ }
  syncLoadoutUi();
}
function setPrimary(i) {
  selectedPrimary = i; try { localStorage.setItem('docao.primary', String(i)); } catch (e) { /* sem storage */ }
  if (player) player.nextPrimary = i;
  if (player && !player.alive) { setSpawnHand('primary'); buildDeathSec(); }
  sendLoadout();
  markPick('primary', i);
  syncLoadoutUi();
}
function setSecondary(i) {
  selectedSecondary = i; try { localStorage.setItem('docao.secondary', String(i)); } catch (e) { /* sem storage */ }
  if (player) player.nextSecondary = i;
  sendLoadout();
  markPick('secondary', i);
  buildDeathSec();
  syncLoadoutUi();
}
function setMelee(i) {
  selectedMelee = i; try { localStorage.setItem('docao.melee', String(i)); } catch (e) { /* sem storage */ }
  if (player) player.nextMelee = i;
  sendLoadout();
  markPick('melee', i);
  const row = $('saberRow'); if (row) row.hidden = !isSaber(i);
  buildDeathMelee();
  syncLoadoutUi();
}
function buildPrimaryPickers() {
  const l = $('primList'); l.innerHTML = '';
  for (const cat of CATEGORIES) {
    const box = document.createElement('div'); box.className = 'wcat';
    const title = document.createElement('div'); title.className = 'label2'; title.textContent = cat.title; box.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'wgrid' + (cat.weapons.length < 3 || cat.id === 'secundaria' ? ' small' : '');
    const onPick = cat.pick === 'secondary' ? setSecondary : cat.pick === 'melee' ? setMelee : setPrimary;
    for (const i of cat.weapons) grid.appendChild(primChip(i, '', onPick, cat.pick));
    box.appendChild(grid);
    if (cat.id === 'faca') { const row = $('saberRow'); if (row) box.appendChild(row); }
    l.appendChild(box);
  }
  markPick('primary', selectedPrimary); markPick('secondary', selectedSecondary); markPick('melee', selectedMelee);
  buildDeathPrimaries();
  const row = $('saberRow'); if (row) row.hidden = !isSaber(selectedMelee);
  buildDeathSec(); buildDeathMelee();
}
function setPreview(id) {
  selectedSkin = getSkin(id).id; try { localStorage.setItem('docao.skin', selectedSkin); } catch (e) { /* sem storage */ }
  saveAcctSkin(selectedSkin); // com conta: guarda a skin (sem conta não faz nada)
  if (preview) showcase.remove(preview.group);
  preview = makeDocao(selectedSkin, { withGun: false, pose: 'idle' }); showcase.add(preview.group);
  $('skinName').textContent = getSkin(selectedSkin).name;
  $('wardrobePreview').setAttribute('aria-label', `Prévia do visual ${getSkin(selectedSkin).name}`);
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
const weaponThumbs = [];
buildSkinPicker(); setPreview(selectedSkin); buildPrimaryPickers(); buildSaberColors();
function paintWeaponThumbs() {
  document.querySelectorAll('.wthumb').forEach((el) => {
    const url = weaponThumbs[+el.dataset.w];
    if (url) el.style.backgroundImage = `url("${url}")`;
  });
}
function makeWeaponThumbs() {
  let i = 0;
  const next = () => {
    if (i >= fp.guns.length) { paintWeaponThumbs(); window.__gunThumbs = weaponThumbs.length; return; }
    try { weaponThumbs[i] = renderWeaponThumb(fp.guns[i]); } catch (e) { console.warn('miniatura da arma', i, e); }
    i++; requestAnimationFrame(next);
  };
  requestAnimationFrame(next);
}
makeWeaponThumbs();

// ---------------- Mapas ----------------
let navMs = 0, showBaseY = 3, menuPreviewX = 0, showCamYaw = 0;
let showSpin = 0, showSpinVel = 0, showDrag = null; // giro manual do Docão no menu
function menuCanSpin(ev) {
  if (state !== 'menu' || crateJourney.phase !== 'closed' || (ev.button != null && ev.button !== 0)) return false;
  const t = ev.target;
  return !!(t && t.closest && !t.closest('button, a, input, select, textarea, label, summary, .menu-panel, .loadout-dock, .dance-dock, .showcase-actions, .menu-tools, .menu-key-hints'));
}
$('menu').addEventListener('pointerdown', (ev) => {
  if (!menuCanSpin(ev)) return;
  showDrag = { x0: ev.clientX, spin0: showSpin, lastX: ev.clientX, lastT: performance.now() };
  showSpinVel = 0;
  $('menu').classList.add('spinning');
  try { $('menu').setPointerCapture(ev.pointerId); } catch (e) { /* sem capture */ }
});
$('menu').addEventListener('pointermove', (ev) => {
  if (!showDrag) return;
  const now = performance.now(), step = Math.max(0.016, (now - showDrag.lastT) / 1000);
  showSpin = showDrag.spin0 + (ev.clientX - showDrag.x0) * 0.012;
  showSpinVel = Math.max(-2.2, Math.min(2.2, (ev.clientX - showDrag.lastX) / step * 0.012));
  showDrag.lastX = ev.clientX; showDrag.lastT = now;
});
const endShowDrag = () => { if (!showDrag) return; showDrag = null; $('menu').classList.remove('spinning'); };
$('menu').addEventListener('pointerup', endShowDrag);
$('menu').addEventListener('pointercancel', endShowDrag);

// Sombras do menu: três Docões em miniatura, sempre dançando. O clique escolhe a da vitória.
const danceScene = new THREE.Scene();
const danceCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 30);
danceCam.position.set(0.9, 2.4, 8);
const danceCast = DANCES.map((d) => ({ ...d, model: null }));
let danceRenderer = null, danceW = 0, danceH = 0;
function setDance(id) {
  selectedDance = normDance(id);
  try { localStorage.setItem('docao.dance', selectedDance); } catch (e) { /* sem storage */ }
  document.querySelectorAll('[data-dance]').forEach((b) => b.classList.toggle('on', b.dataset.dance === selectedDance));
  danceCast.forEach((d) => { if (d.model && d.model.shadowMat) d.model.shadowMat.color.set(d.id === selectedDance ? 0x3a1612 : 0x140e0c); });
}
function buildDancePicks() {
  const card = (d, cls) => `<button type="button" class="${cls}" data-dance="${d.id}">${cls === 'small' ? d.name : `<b>${d.name}</b><small>${d.line}</small>`}</button>`;
  $('dancePicks').innerHTML = DANCES.map((d) => card(d, 'dance-pick')).join('');
  $('pauseDancePicks').innerHTML = DANCES.map((d) => card(d, 'small')).join('');
  const pick = (ev) => { const b = ev.target.closest('[data-dance]'); if (b) setDance(b.dataset.dance); };
  $('dancePicks').addEventListener('click', pick);
  $('pauseDancePicks').addEventListener('click', pick);
  $('dancePicks').addEventListener('pointerover', (ev) => {
    const b = ev.target.closest('[data-dance]');
    danceCast.forEach((d) => {
      if (!d.model || !d.model.shadowMat) return;
      const hot = b && d.id === b.dataset.dance;
      d.model.shadowMat.color.set(d.id === selectedDance ? 0x4a1a16 : hot ? 0x2c241c : 0x140e0c);
    });
  });
  $('dancePicks').addEventListener('pointerleave', () => setDance(selectedDance));
  setDance(selectedDance);
}
buildDancePicks();
function layoutDanceCast() {
  danceCast.forEach((d) => {
    if (!d.model) { d.model = makeShadowDancer(); danceScene.add(d.model.group); }
  });
  setDance(selectedDance);
}
function renderDanceShadows(t) {
  if ($('menu').classList.contains('hidden') || crateJourney.phase !== 'closed') return;
  const stage = $('danceStage'); if (!stage) return;
  const rect = stage.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;
  if (!danceRenderer) {
    danceRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    danceRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    danceRenderer.setClearColor(0x000000, 0);
    danceRenderer.domElement.setAttribute('aria-hidden', 'true');
    stage.insertBefore(danceRenderer.domElement, stage.firstChild);
  }
  if (!danceCast[0].model) layoutDanceCast();
  if (danceW !== rect.width || danceH !== rect.height) { danceRenderer.setSize(rect.width, rect.height, false); danceW = rect.width; danceH = rect.height; }
  const stacked = rect.height >= rect.width;
  const cols = stacked ? 1 : 3, rows = stacked ? 3 : 1;
  const cw = rect.width / cols, ch = rect.height / rows;
  danceRenderer.setScissorTest(true);
  danceRenderer.setClearColor(0x000000, 0);
  danceCast.forEach((d, i) => {
    const yaw = d.id === 'moonwalk' ? 0.95 : d.id === 'mewing' ? -0.65 : 0.15;
    d.model.group.scale.setScalar(1);
    d.model.danceBase = { x: 0, y: 0, z: 0, yaw };
    d.model.group.visible = true;
    danceCast.forEach((o, j) => { if (o.model) o.model.group.visible = j === i; });
    poseVictory(d.model, d.id, t);
    const col = stacked ? 0 : i, row = stacked ? i : 0;
    const x = col * cw, y = rect.height - (row + 1) * ch;
    danceRenderer.setViewport(x, y, cw, ch);
    danceRenderer.setScissor(x, y, cw, ch);
    const aspect = cw / ch, height = stacked ? 3.9 : 2.7, width = height * aspect, lookY = stacked ? 0.28 : 0.9;
    danceCam.left = -width / 2; danceCam.right = width / 2;
    danceCam.bottom = lookY - height / 2; danceCam.top = lookY + height / 2;
    danceCam.position.set(0.55, lookY, 6); danceCam.lookAt(0, lookY, 0);
    danceCam.updateProjectionMatrix();
    danceRenderer.clear(true, true, false);
    danceRenderer.render(danceScene, danceCam);
  });
  danceCast.forEach((d) => { if (d.model) d.model.group.visible = true; });
  danceRenderer.setScissorTest(false);
  danceRenderer.setViewport(0, 0, rect.width, rect.height);
}
// câmera da vitrine: por padrão olha o Docão de frente (+Z), mas se tiver parede/ônibus/casa no caminho (ex.: Vizinhança Cheers,
// onde a câmera ficava dentro do ônibus e o menu mostrava só um fundo escuro) gira em volta até achar um ângulo livre.
function pickShowcaseCam() {
  const sp = showcase.position, head = new V3(sp.x, showBaseY + 1.0, sp.z);
  for (const a of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2, -2, 2.5, -2.5, Math.PI]) {
    const far = new V3(sp.x + Math.sin(a) * 4.6, showBaseY + 1.25, sp.z + Math.cos(a) * 4.6);
    if (losClear(head, far)) { showCamYaw = a; return; }
  }
  showCamYaw = 0;
}
function loadMap(id, inv = false) { // inv: Invasão tem mais caixas de munição (map.invPickups)
  const map = getMap(id);
  if (currentMap === map && worldGroup) return map;
  if (worldGroup) { scene.remove(worldGroup); disposeWorld(worldGroup); }
  for (const p of pickups) scene.remove(p.mesh); pickups.length = 0;
  const w = buildWorld(map); worldGroup = w.group; scene.add(worldGroup);
  solids = w.solids; worldMeshes = w.meshes; mapBounds = map.size; indexSolids();
  applyPalette(scene, hemi, sun, map); fpHemi.intensity = map.palette.stars ? 1.25 : 1.8;
  SPAWNS = map.spawns.map(([x, z, y = 0]) => new V3(x, groundAt(x, z, y + 0.3), z));
  for (const [t, x, z, y] of inv && map.invPickups ? [...map.pickups, ...map.invPickups] : map.pickups) makePickup(t, x, z, y || 0);
  pickups.forEach((p) => (p.mesh.visible = state !== 'menu'));
  const t0 = performance.now();
  nav = buildNav({ hx: map.size[0], hz: map.size[1], spacing: map.navSpacing || 2, collides, groundAt, solids, topAt, seeds: SPAWNS.map((s) => [s.x, s.y, s.z]), extra: map.waypoints || [] });
  navMs = performance.now() - t0;
  showcase.position.set(...map.showcase); showBaseY = map.showcase[1]; pickShowcaseCam();
  currentMap = map; return map;
}
// seletor: mapa salvo no navegador ('random' = aleatório a cada partida)
const invMenu = () => $('modeSel').value === INV.mode; // Invasão tem lista de mapas própria (Rodízio + Fazenda + os normais)
const bombMenu = () => $('modeSel').value === 'bomb';
const menuPool = (md) => (md === 'bomb' ? BOMB_MAPS : isInvasion(md) ? INV_MAPS : PLAY_MAPS); // lista de mapas de cada modo (Bomba: só os com sites feitos à mão)
const mapKey = () => (bombMenu() ? 'docao.bombMap' : invMenu() ? 'docao.invMap' : 'docao.map');
const mapPool = () => menuPool($('modeSel').value);
function storedMap() { let v = null; try { v = localStorage.getItem(mapKey()); } catch (e) { /* */ } return v === 'random' || mapPool().some((m) => m.id === v) ? v : bombMenu() ? BOMB_MAP : invMenu() ? INV.DEFAULT_MAP : MAPS[0].id; }
let selectedMap = storedMap();
function syncMapForMode() { const v = storedMap(); if (v !== selectedMap) { selectedMap = v; if (v !== 'random') loadMap(v); } buildMapGrid(); }
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
  selectedMap = id; try { localStorage.setItem(mapKey(), id); } catch (e) { /* sem storage */ }
  if (id !== 'random') loadMap(id);
  refreshMapUI();
}
let invThumbsBusy = false;
function invThumbs() { // Rodízio/Fazenda: renderiza a miniatura só quando o menu da Invasão aparece (não pesa nos outros modos)
  if (invThumbsBusy) return; const todo = INV_MAPS.filter((m) => !thumbs[m.id] && !PLAY_MAPS.includes(m)); if (!todo.length) return; invThumbsBusy = true;
  const next = () => { const m = todo.shift(); if (!m) { invThumbsBusy = false; buildMapGrid(); return; } try { thumbs[m.id] = renderThumb(m); } catch (e) { console.warn('miniatura', m.id, e); } refreshMapUI(); requestAnimationFrame(next); };
  requestAnimationFrame(next);
}
function buildMapGrid() { if (invMenu()) invThumbs(); const g = $('mapGrid'); g.innerHTML = ''; for (const m of mapPool()) g.appendChild(mapCard(m.id)); g.appendChild(mapCard('random')); refreshMapUI(); }
function makeThumbs() { // miniaturas renderizadas da vista aérea, uma por quadro pra não travar o menu
  const L = MAPS.filter((m) => PLAY_MAPS.includes(m) || !INV_MAPS.includes(m)); // mapas só da Invasão: miniatura sob demanda (invThumbs)
  let i = 0; const next = () => {
    if (i >= L.length) { buildMapGrid(); window.__thumbsReady = true; return; }
    const m = L[i++]; try { thumbs[m.id] = renderThumb(m); } catch (e) { console.warn('miniatura', m.id, e); }
    refreshMapUI(); requestAnimationFrame(next);
  }; requestAnimationFrame(next);
}
function nextOfflineMap() { const P = mode === 'bomb' ? BOMB_MAPS : invMode() ? INV_MAPS : MAPS.filter((x) => PLAY_MAPS.includes(x) || !INV_MAPS.includes(x)); return P[(P.indexOf(currentMap) + 1) % P.length].id; } // Bomba: só mapas com sites
function pickMapForMatch() {
  if (selectedMap !== 'random' && mapPool().some((m) => m.id === selectedMap)) return selectedMap;
  if (selectedMap !== 'random') return bombMenu() ? BOMB_MAP : invMenu() ? INV.DEFAULT_MAP : PLAY_MAPS[0].id; // Bomba: mapa sem sites → Rodízio
  const pool = mapPool().filter((m) => !currentMap || m.id !== currentMap.id); return pool[Math.floor(Math.random() * pool.length)].id;
}
$('mapBtn').onclick = () => { buildMapGrid(); $('mapModal').classList.remove('hidden'); };
$('mapClose').onclick = () => $('mapModal').classList.add('hidden');
loadMap(selectedMap === 'random' ? MAPS[0].id : selectedMap); buildMapGrid(); makeThumbs();

function clearBots() {
  for (const e of entities) if (e.model) scene.remove(e.model.group); entities = [];
  for (const n of grenades) scene.remove(n.mesh); grenades.length = 0; for (const r of rockets) scene.remove(r.mesh); rockets.length = 0; for (const d of discs) scene.remove(d.mesh); discs.length = 0; for (const g of eggs) scene.remove(g.mesh); eggs.length = 0; for (const s of eggStains) scene.remove(s.m); eggStains.length = 0; eggSplatUntil = 0; for (const g of corns) scene.remove(g.mesh); corns.length = 0; cornPops.length = 0; for (const p of particles) scene.remove(p.mesh); particles.length = 0; shake = 0;
  clearStrikes();
  clearTacticals();
  clearHeli();
  clearGunships();
  clearBacon(); if (ghost) ghost.model.group.visible = false;
  for (const q of dmgPops) scene.remove(q.sp); dmgPops.length = 0; $('trainInfo').classList.add('hidden');
}
function cycleExplorePrimary(dir) {
  if (!exploreMode() || !player || !player.alive) return;
  const L = pool(PRIMARIES); if (!L.length) return; const cur = L.indexOf(player.primary);
  const i = L[(cur + dir + L.length) % L.length];
  setPrimary(i);
  player.primary = player.nextPrimary = i;
  player.slots[0] = i;
  player.mag[i] = WEAPONS[i].mag; player.reserve[i] = WEAPONS[i].reserve;
  player.reloadEnd = 0;
  if (player.weapon !== i) switchWeapon(player, i); else setWeapon(player, i);
  flashMsg(WEAPONS[i].name);
}
function startGame(mapId) {
  clearMatchEnding();
  endVictory(); stopEmote();
  resetAds(); stopInspect(true); // inspeção velha não sobrevive ao 'Jogar de novo'
  initAudio();
  loadMap($('modeSel').value === TRAIN.mode ? TRAIN.map : typeof mapId === 'string' ? mapId : pickMapForMatch(), invMenu());
  const name = myName(); saveName(name);
  sens = parseFloat($('sens').value) || 1.4; sensAds = parseFloat($('sensAds').value) || 1;
  try { localStorage.setItem('docao.sens', String(sens)); localStorage.setItem('docao.sensAds', String(sensAds)); } catch (e) { /* sem storage */ }
  revengeName = null; resetFeedback(); resetRewards(); resetMatchCamos();
  clearBots(); gameTime = 0; inv = null; invNet = null;
  const picked = $('modeSel').value;
  mode = MODE_OK(picked); teamScore = [0, 0]; zone = null; window.__capLog = []; offlineMinutes = normTime($('timeSel').value);
  matchLimits = { weapons: null, powers: null }; rulesLive = true; // solo: arsenal inteiro. O limite de armas é regra da sala, escolhida ao criar.
  player = makeEntity(name, true, selectedSkin, '#ffd27a'); entities.push(player); fp.setSkin(selectedSkin);
  const legal = clampLoadout(selectedPrimary, selectedSecondary, selectedMelee, matchLimits.weapons);
  player.nextPrimary = legal.primary; player.nextSecondary = legal.secondary; player.nextMelee = legal.melee;
  if (training()) (currentMap.dummies || []).forEach((d, i) => { const b = makeEntity(d.name, false, SKINS[Math.floor(Math.random() * SKINS.length)].id, TAG_COLORS[i % TAG_COLORS.length]); b.dummy = d; entities.push(b); });
  else { const n = exploreMode() || invMode() ? 0 : (parseInt($('botCount').value, 10) || 5);
    for (let i = 0; i < n; i++) entities.push(makeEntity(BOT_DEFS[i].name, false, SKINS[Math.floor(Math.random() * SKINS.length)].id, TAG_COLORS[i % TAG_COLORS.length])); }
  endBomb(); entities.forEach((e, i) => (e.id = i + 1));
  if (teamMode()) { // seu time (escolhido no menu ou automático); bots completam os dois lados
    applyTeam(player, menuTeam >= 0 ? menuTeam : Math.random() < 0.5 ? 0 : 1);
    for (const b of entities) if (!b.isPlayer) { const c = [0, 0]; for (const x of entities) if (x.team === 0 || x.team === 1) c[x.team]++; applyTeam(b, smallerTeam(c)); }
    if (mode === 'dom') zone = newZoneState(pickZone(nav));
  } else for (const e of entities) applyTeam(e, -1);
  const bombEv = mode === 'bomb' ? startBombOffline() : [];
  for (const e of entities) e.caps = 0;
  for (const e of entities) { e.alive = false; }
  for (const e of entities) respawn(e);
  pickups.forEach((p) => { const on = clientPower(p.type); p.active = on; p.mesh.visible = on; if (!on) p.respawnAt = Infinity; });
  invApplyLook(invMode()); if (invMode()) { player.id = -1; player.spawnedOnce = true; startInvasionOffline(); } // Invasão: decoração + core local
  showcase.visible = false;
  $('killfeed').innerHTML = ''; flashMsg(mode === 'bomb' ? `Bomba · você é do time ${TEAM_NAMES[player.team]}` : invMode() ? `Invasão 🎃 · ${currentMap.name} · ${INV.WAVES} waves · ${KEYS.useLabel} usa poder · ${KEYS.cycleLabel} troca` : exploreMode() ? `Exploração · ${currentMap.name} · , . ou [ ] trocam a primária` : teamMode() ? `Dominação · você é do time ${TEAM_NAMES[player.team]}` : training() ? 'Estande do Docão · B/N/M trocam a arma' : `Mapa: ${currentMap.name}`); refreshModeHud();
  for (const ev of bombEv) onBombEvent(ev);
  $('menu').classList.add('hidden'); $('gameover').classList.add('hidden'); $('pause').classList.add('hidden'); $('hud').classList.remove('hidden'); $('socialHud').classList.remove('hidden'); $('voiceHud').classList.add('hidden'); chatSetRoom(true); // offline: o chat fica (pros códigos), sem voz $('overChat').classList.add('hidden');
  camera.clearViewOffset(); state = 'playing'; lockPointer();
}
function endGame() {
  stopInspect(true); stopEmote(); // fim no meio da inspeção ou da dança (a mira com zoom continua na câmera lenta)
  if (state === 'over' || !player) return;
  const boom = nukeWin; nukeWin = false; // Fim da chapa: o dono (ou o time dele) vence, mesmo atrás no placar
  beginMatchEnding();
  if (boom && teamMode() && player && (player.team === 0 || player.team === 1) && teamScore[1 - player.team] > teamScore[player.team]) teamScore[player.team] = teamScore[1 - player.team] + 1;
  const rows = entities.filter((e) => !e.zt).sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths);
  invClosePick();
  const scoredTeam = teamScore[0] > teamScore[1] ? 0 : teamScore[1] > teamScore[0] ? 1 : -1;
  const nukeTeam = boom && player && (player.team === 0 || player.team === 1) ? player.team : scoredTeam;
  const teamW = teamMode() ? nukeTeam : -1;
  let outcome;
  if (invMode()) { $('winner').dataset.tone = inv && inv.won ? 'won' : 'lost'; $('winner').textContent = invEndText(); outcome = inv && inv.won ? 'win' : 'loss'; }
  else if (teamMode()) { setTeamWinner(teamW); outcome = teamW < 0 ? 'draw' : player.team === teamW ? 'win' : 'loss'; }
  else if (boom) {
    $('winner').textContent = player.isPlayer ? 'Você venceu! 🏆' : `${player.name} venceu!`;
    outcome = player.isPlayer ? 'win' : 'loss';
  } else {
    const tied = rows.length > 1 && scoreOf(rows[0]) === scoreOf(rows[1]) && rows[0].deaths === rows[1].deaths;
    $('winner').textContent = tied ? 'Empate!' : rows[0] && rows[0].isPlayer ? 'Você venceu! 🏆' : `${rows[0] ? rows[0].name : '???'} venceu!`;
    outcome = tied ? 'draw' : rows[0] && rows[0].isPlayer ? 'win' : 'loss';
  }
  if (training()) outcome = 'end';
  const winRows = boom && !teamMode() ? [player, ...rows.filter((e) => e !== player)] : rows;
  matchEnding.dance = outcome === 'win' && playerWonMatch({ mode, rows: winRows, teamW, invWon: inv && inv.won }); // a dança começa quando o placar entra
  $('finalboard').innerHTML = boardHtml();
  const nm = getMap(nextOfflineMap()); $('overMap').innerHTML = `Mapa: <b>${escapeHtml(currentMap.name)}</b> · próximo: <b>${escapeHtml(nm.name)}</b>`;
  ['againBtn', 'nextMapBtn'].forEach((id) => $(id).classList.remove('hidden')); $('overWait').classList.add('hidden');
  $('overChat').classList.add('hidden');
  presentMatchResult(outcome);
}
function setTeamWinner(w) {
  const el = $('winner'); el.dataset.tone = w === 0 ? 'red' : w === 1 ? 'blue' : ''; // cor no papel da comanda (style.css)
  el.textContent = w < 0 ? `Empate! ${teamScore[0]} × ${teamScore[1]}` : `Time ${TEAM_NAMES[w]} venceu! ${teamScore[0]} × ${teamScore[1]}${player && player.team === w ? ' 🏆' : ''}`;
}
function refreshModeHud() {
  $('domhud').classList.toggle('hidden', mode !== 'dom'); $('bombhud').classList.toggle('hidden', mode !== 'bomb'); document.body.classList.toggle('bombmode', mode === 'bomb');
  if (teamMode() && player) { $('myTeam').textContent = `Você: Time ${TEAM_NAMES[player.team] || '?'}`; $('myTeam').style.color = TEAM_COLORS[player.team] || '#fff'; }
  $('winner').dataset.tone = '';
}
// Pausa: trocar primária / secundária / corpo a corpo. data-pick próprio pra não brigar com os chips do menu.
const PAUSE_GROUPS = [
  { title: 'Primária', kind: 'pause-primary', pick: 'primary', slot: 0, set: (i) => setPrimary(i) },
  { title: 'Secundária', kind: 'pause-secondary', pick: 'secondary', slot: 1, set: (i) => setSecondary(i) },
  { title: 'Corpo a corpo', kind: 'pause-melee', pick: 'melee', slot: 2, set: (i) => setMelee(i) },
];
let pauseSwapUntil = 0; // online: o 'k' da troca chega depois do clique; enquanto isso, não reabre a pausa nem solta a mira
let pauseSwapWeapon = -1; // arma que o clique escolheu, pra nascer com ela na mão
const pauseSwapQuiet = () => performance.now() < pauseSwapUntil;
function markPauseGuns() {
  const root = $('pauseGuns'); if (!root || !player) return;
  const live = { 'pause-primary': player.slots[0], 'pause-secondary': player.slots[1], 'pause-melee': player.slots[2] };
  for (const [kind, i] of Object.entries(live)) root.querySelectorAll(`.primchip[data-pick="${kind}"]`).forEach((c) => c.classList.toggle('active', +c.dataset.i === i));
}
function buildPauseGuns() {
  const root = $('pauseGuns'); if (!root) return;
  root.innerHTML = '';
  for (const g of PAUSE_GROUPS) {
    const box = document.createElement('div'); box.className = 'wcat';
    const title = document.createElement('div'); title.className = 'label2'; title.textContent = g.title; box.appendChild(title);
    const grid = document.createElement('div'); grid.className = 'wgrid' + (g.pick === 'primary' ? '' : ' small');
    for (const cat of CATEGORIES) if (cat.pick === g.pick) for (const i of pool(cat.weapons)) grid.appendChild(primChip(i, '', (picked) => pausePick(g, picked), g.kind));
    box.appendChild(grid);
    root.appendChild(box);
  }
  markPauseGuns();
}
let pauseSwapLast = -1e9; // online: último pedido que derrubou (o servidor também limita; aqui é só pra avisar)
const PX_COOLDOWN = 10; // s, igual ao servidor
function pausePick(g, i) {
  if (state !== 'paused' || !player || !player.alive) return;
  if (invMode()) { flashMsg('Na Invasão a troca de arma é no painel B, entre as waves'); markPauseGuns(); return; } // Invasão: nunca derruba nem gasta vida
  const before = player.slots[g.slot];
  g.set(i); // setPrimary/setSecondary/setMelee: localStorage + ['pr', ...] enquanto vivo (não mexe em spawnHold)
  if (i === before) { markPauseGuns(); return; } // a arma do slot vivo: só o destaque
  if (training()) { equipLiveLoadout(i); markPauseGuns(); return; }
  if (online) {
    const wait = PX_COOLDOWN - (performance.now() - pauseSwapLast) / 1000;
    if (wait > 0) { flashMsg(`Espera ${Math.ceil(wait)} s pra trocar de arma de novo`); markPauseGuns(); return; }
    pauseSwapLast = performance.now();
    pauseSwapWeapon = i;
    pauseSwapUntil = performance.now() + 4000;
    netEv(['px', selectedPrimary, selectedSecondary, selectedMelee]);
    resume(); lockPointer();
    return;
  }
  kill(player, null, player.weapon); respawn(player); // morre sem abate e nasce na mesma ação (sem os 5 s nem a tela de RENASCER)
  if (player.slots.includes(i)) setWeapon(player, i);
  flashMsg('Nasceu de novo com o equipamento novo');
  resume(); lockPointer();
}
buildPauseGuns();
function releaseLook() { mouseDown = false; rightDown = false; keys.Space = keys.ShiftLeft = keys.ShiftRight = false; resetAds(); if (player) { player.charging = false; player.bowDraw = 0; player.eggDraw = 0; arcLine.visible = arcMark.visible = false; } if (pickingStrike) { pickingStrike = false; closeStrikeMap(); } }
function pause() { if (state !== 'playing') return; softPauseOn = false; state = 'paused'; releaseLook(); $('pauseInvite').classList.toggle('hidden', !online); $('pauseVoice').classList.toggle('hidden', !online); const note = document.querySelector('#pause .pause-note'); if (note) note.textContent = invMode() ? 'Na Invasão a troca de arma é no painel B, entre as waves.' : training() ? 'No estande a troca entra na hora e você continua de pé.' : 'Trocar uma arma te derruba. Você nasce de novo com o equipamento novo.'; buildPauseGuns(); $('pauseGuns').classList.toggle('hidden', invMode()); $('pauseDance').classList.toggle('hidden', invMode()); $('pause').classList.remove('hidden'); if (document.pointerLockElement) document.exitPointerLock(); }
// ` solta o mouse como o Esc, sem a pausa na chapa: o HUD fica como estava. Clique ou ` de novo volta a mirar.
function softPause() { if (state !== 'playing') return; state = 'paused'; softPauseOn = true; releaseLook(); if (document.pointerLockElement) document.exitPointerLock(); }
function resume() { softPauseOn = false; $('pause').classList.add('hidden'); state = 'playing'; lockPointer(); }
function toMenu() {
  clearMatchEnding();
  if (online) leaveOnline();
  endVictory(); stopEmote(); document.body.classList.remove('deadgray');
  zone = null; mode = 'dm'; endBomb(); $('domhud').classList.add('hidden'); $('zoneMark').classList.add('hidden'); $('teamPick').classList.add('hidden');
  state = 'menu'; rulesLive = false; clearBots(); inv = null; invNet = null; if (selectedMap !== 'random') loadMap(selectedMap); invApplyLook(false); showcase.visible = true; pickups.forEach((p) => (p.mesh.visible = false)); camera.clearViewOffset();
  ['pause', 'gameover', 'hud'].forEach((id) => $(id).classList.add('hidden')); $('menu').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
// pede o pointer lock DENTRO do gesto do usuário (clique/tecla). Se o navegador recusar, mostra o aviso e o próximo clique no jogo tenta de novo.
const RELOCK_MSG = 'Clique pra voltar a mirar';
function lockPointer() {
  window.__lockCalls = (window.__lockCalls || 0) + 1;
  const fail = () => { if (state === 'playing' && player && player.alive && document.pointerLockElement !== canvas) flashMsg(RELOCK_MSG); };
  try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(fail); } catch (e) { fail(); }
}

$('playBtn').onclick = () => startGame(); $('menuBtn').onclick = toMenu;
$('resumeBtn').onclick = resume; $('quitBtn').onclick = toMenu;
$('nameInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') startGame(); e.stopPropagation(); });

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) { hadLock = true; deathUnlock = false; chatNoteLocked(); if ($('centermsg').textContent === RELOCK_MSG) { $('centermsg').textContent = ''; msgTimer = 0; } }
  else if (state === 'playing' && hadLock && !deathUnlock && !pickingStrike && !chatConsumeUnlock() && !pauseSwapQuiet()) pause(); // soltar o mouse ao morrer, no chat, pra escolher o míssil ou no respawn da pausa, não pausa
});
document.addEventListener('mousemove', (e) => {
  if (state !== 'playing' || document.pointerLockElement !== canvas || !player) return;
  if (Math.abs(e.movementX) > 250 || Math.abs(e.movementY) > 250) return; // ignora saltos espúrios do pointer lock
  if (gunner) { const k = sens * (gunner.fov / BASE_FOV) * 0.0015; gunner.yaw -= e.movementX * k; gunner.pitch = clamp(gunner.pitch - e.movementY * k, -1.5, -0.1); return; }
  if (ac130) { const k = sens * 0.0015; ac130.yaw -= e.movementX * k; ac130.pitch = clamp(ac130.pitch - e.movementY * k, -1.5, -0.25); return; }
  if (predator && predator.phase === 'fly') {
    predator.yaw -= e.movementX * 0.0022;
    predator.pitch = clamp(predator.pitch - e.movementY * 0.002, -1.2, 0.22);
    return;
  }
  if (predator) return;
  const s = sens * (ads > 0.2 ? sensAds : 1) * (camera.fov / BASE_FOV); // mirando usa o slider "Mirando"; o zoom ainda deixa o mouse mais lento
  player.yaw -= e.movementX * 0.0015 * s; player.pitch = clamp(player.pitch - e.movementY * 0.0015 * s, -1.5, 1.5);
});
canvas.addEventListener('mousedown', (e) => {
  if (softPauseOn) { if (e.button === 0) resume(); return; }
  if (state !== 'playing') return;
  if (!$('teamPick').classList.contains('hidden')) return; // escolhendo time
  if ((player && !player.alive) || invPick) return; // morto ou com o painel de armas (B) aberto: o clique no jogo NÃO recaptura o mouse, o cursor fica livre pra clicar nas armas (volta ao renascer/fechar o B)
  if (chatTyping()) closeChat(false);
  if (e.button === 2) e.preventDefault(); // senão o navegador solta o mouse ao abrir o menu
  if (e.button === 0 && (document.pointerLockElement || !deathUnlock)) { mouseDown = true; firedThisPress = false; }
  if (e.button === 2 && (document.pointerLockElement || !deathUnlock)) { rightDown = true; rightFired = false; rightStale = false; }
  if (!document.pointerLockElement) lockPointer();
});
// botão direito: mira (ADS) nas armas de fogo; com a faca na mão vira a estocada
let clickLatch = 0, rightDown = false, rightLatch = 0, rightFired = false, rightStale = false; // clique mais curto que um frame ainda dispara (máquinas lentas)
document.addEventListener('contextmenu', (e) => { if (state === 'playing' || document.pointerLockElement) e.preventDefault(); });
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) { if (mouseDown && !firedThisPress) clickLatch = performance.now(); mouseDown = false; }
  if (e.button === 2) { if (rightDown && !rightFired && !rightStale && player && player.weapon === KNIFE) rightLatch = performance.now(); rightDown = false; rightStale = false; }
});
document.addEventListener('wheel', (e) => { // rodinha: primária → pistola → faca (e volta)
  if (state !== 'playing' || !player || !player.alive) return;
  if (bombPick) { const P = pool(PRIMARIES), i = P.indexOf(selectedPrimary); if (!P.length) return; setPrimary(P[(i + (e.deltaY < 0 ? P.length - 1 : 1)) % P.length]); return; } // Bomba: rodinha escolhe a primária
  const S = player.slots, i = Math.max(0, S.indexOf(player.weapon)), n = S.length; switchWeapon(player, S[(i + (e.deltaY < 0 ? n - 1 : 1)) % n]);
});
function tryOpenChat(e) {
  if (e.repeat || !chatShown() || !chatRoomOn() || state !== 'playing') return false;
  if (e.code === 'KeyT') { chatUseAll(); return openChat('all'); }
  if (e.code === 'KeyY' || e.code === 'KeyU') return openChat(socialTeam() ? 'team' : 'all');
  if ((e.code === 'Enter' || e.code === 'NumpadEnter') && player && player.alive) return openChat('all');
  return false;
}
document.addEventListener('keydown', (e) => {
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (chatTyping()) { if (e.code === 'Escape') { e.preventDefault(); closeChat(true); } return; }
  if (e.code === 'KeyK') voicePtt(true);
  if (e.code === 'KeyJ' && !e.repeat && online) { e.preventDefault(); voiceCycle(); }
  if (state === 'playing' && isBomb() && bombFrozen(bombS) && player && player.alive && !e.repeat) { // Bomba, preparação: painel de troca de arma
    if (e.code === 'KeyB') { if (bombPick) closeBombPick(); else openBombPick(); return; }
    if (bombPick && e.code === 'KeyN') { { const L = pool(SECONDARIES); if (L.length) setSecondary(L[(Math.max(0, L.indexOf(selectedSecondary)) + 1) % L.length]); } return; }
    if (bombPick && e.code === 'KeyM') { { const L = pool(MELEES); if (L.length) setMelee(L[(Math.max(0, L.indexOf(selectedMelee)) + 1) % L.length]); } return; }
    if (bombPick && e.code === 'KeyG') { deathUnlock = true; if (document.pointerLockElement) document.exitPointerLock(); return; } // solta o mouse pra clicar
  }
  if (tryOpenChat(e)) { e.preventDefault(); return; }
  if (e.code === 'KeyH' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey && state === 'playing') { // H: liga/desliga as vozes da granada no meio da partida (mesma preferência do menu)
    setNadeVoice(!grenadeVoiceEnabled()); flashMsg(grenadeVoiceEnabled() ? '🔊 Vozes da granada: ligadas' : '🔇 Vozes da granada: desligadas'); return;
  }
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.code !== 'Space' || !e.repeat) keys[e.code] = true;
  if (state === 'playing' && player && invKey(e)) { e.preventDefault(); return; } // Invasão: G poder · X troca · B painel de armas na pausa
  if (state === 'playing' && player && gunner) { // no Chopper: 1/2 trocam a arma dele, F sai
    if (e.code === 'Digit1') setGunnerMode('mini');
    if (e.code === 'Digit2') setGunnerMode('sniper');
    if (e.code === 'KeyF' && !e.repeat) endGunner(true);
    if (e.code === 'Tab') $('tabboard').classList.remove('hidden');
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    if (e.code === 'Backquote') { e.preventDefault(); softPause(); }
    return;
  }
  if (state === 'playing' && player && ac130) { // na Grelha: 1/2/3 trocam a arma, F sai (a mesma tecla do Chopper)
    if (e.code === 'Digit1') setAc130Mode('espeto');
    if (e.code === 'Digit2') setAc130Mode('panela');
    if (e.code === 'Digit3') setAc130Mode('caldeirao');
    if (e.code === 'KeyF' && !e.repeat) endAc130(true);
    if (e.code === 'Tab') $('tabboard').classList.remove('hidden');
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    if (e.code === 'Backquote') { e.preventDefault(); softPause(); }
    return;
  }
  if (state === 'playing' && player) {
    if (!emote.on && e.code === 'KeyR') startReload(player);
    if (!player.alive && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') && !e.repeat && requestRespawn()) keys[e.code] = false; // Espaço não vira pulo ao renascer
    if ((!player.alive || bombPick) && /^Digit[1-9]$/.test(e.code)) { const pick = pool(PRIMARIES)[+e.code.slice(5) - 1]; if (pick != null) setPrimary(pick); } // escolha na tela de morte
    else {
      if (!emote.on && e.code === 'Digit1') switchWeapon(player, player.slots[0]);
      if (!emote.on && e.code === 'Digit2') switchWeapon(player, player.slots[1]);
      if (!emote.on && e.code === 'Digit3') switchWeapon(player, player.slots[2]);
      if (!emote.on && e.code === 'KeyV' && !e.repeat) quickKnife(player);
      if (!emote.on && e.code === 'KeyC' && player.alive && !e.repeat) saberDash(player);
      if (!emote.on && e.code === 'KeyZ' && player.alive && !e.repeat) saberSpecial(player);
      if (!emote.on && e.code === 'KeyI' && player.alive && !e.repeat) startInspect(player);
      if (!emote.on && e.code === 'Digit4' && player.alive && !e.repeat) throwTactical();
      if (!emote.on && e.code === 'Digit5' && player.alive && !e.repeat) throwShock();
      if (!emote.on && e.code === 'KeyF' && player.alive && !e.repeat && !invMode()) useStreak();
      if (training() && player.alive && !emote.on && !e.repeat && (e.code === 'KeyB' || e.code === 'KeyN' || e.code === 'KeyM')) trainSwap(e.code);
      else if (e.code === 'KeyB' && !e.repeat && player.alive && !invMode() && !invPick) startEmote(); // Invasão: B é só o painel de armas (invKey), nunca dança
      if (exploreMode() && player.alive && !emote.on && !e.repeat && (e.code === 'Comma' || e.code === 'Period' || e.code === 'BracketLeft' || e.code === 'BracketRight')) cycleExplorePrimary(e.code === 'Period' || e.code === 'BracketRight' ? 1 : -1);
    }
    if (!emote.on && e.code === 'KeyQ' && !e.repeat) startCharge();
    if (e.code === 'Tab') $('tabboard').classList.remove('hidden');
    if (e.code === 'Escape' || e.code === 'KeyP') pause();
    if (e.code === 'Backquote') { e.preventDefault(); softPause(); }
  } else if (state === 'paused' && softPauseOn && e.code === 'Backquote') { e.preventDefault(); resume(); }
  else if (state === 'paused' && (e.code === 'KeyP')) resume();
});
document.addEventListener('keyup', (e) => { if (e.code === 'KeyK') voicePtt(false); keys[e.code] = false; if (e.code === 'KeyQ' && state === 'playing') releaseCharge(); if (e.code === 'Tab') $('tabboard').classList.add('hidden'); });
addEventListener('blur', () => { voicePtt(false); for (const k in keys) keys[k] = false; mouseDown = false; rightDown = false; if (player) { player.charging = false; player.bowDraw = 0; player.eggDraw = 0; arcLine.visible = arcMark.visible = false; } });

// ---------------- Loop ----------------
const clock = new THREE.Clock(); let menuT = 0, danceT = 0;
function loop() {
  requestAnimationFrame(loop);
  const realDt = clock.getDelta();
  let dt = Math.min(realDt, 0.05);
  if (window.__stopAt != null) dt = Math.max(0, Math.min(dt, window.__stopAt - gameTime)); // testes/screenshots: congela o tempo de jogo num instante exato
  if (state === 'playing' || (online && state === 'paused' && player)) { // online o jogo não pausa
    gameTime += dt;
    if (exploreMode() && player && player.alive) refillExplore(player);
    if (state === 'playing') updatePlayer(dt); else if (player.alive) { stepCrouch(player, 0, dt, PHYS); player.vel.x = player.vel.z = 0; moveEntity(player, dt); }
    if (emote.on && state === 'playing') stepEmote(dt);
    if (online) netTick(dt);
    for (const e of entities) if (!e.isPlayer) updateBot(e, dt);
    updatePickups(dt); updateGrenades(dt); updateTacticals(dt); updateShocks(dt); updateRockets(dt); updateDiscs(dt); updateCorn(dt); updateEggs(dt); updatePokeFx(dt); stepLocalSabers(dt); updateStrikes(dt); updateParticles(dt); updateBacon(dt); updateBaconPickups(); if (training()) { trainRefill(); updateDmgPops(dt); } if (!online) for (const e of entities) if (!e.zt) regenStep(e, gameTime, dt); updateFP(dt); updateEffects(dt); updateShafts(dt); updateHud(dt); updateRewards(dt);
    updateDomOffline(dt); updateZoneGfx(dt); invTick(dt); updateBombOffline(dt); updateBombGfx(dt);
    if (!online && !exploreMode() && gameTime >= matchLimit()) endGame();
  } else if (state === 'menu') {
    menuT += dt * 0.25; danceT += dt;
    const sp = showcase.position; camera.position.set(sp.x + Math.sin(showCamYaw) * 3.5, showBaseY + 1.25, sp.z + Math.cos(showCamYaw) * 3.5); camera.lookAt(sp.x, showBaseY + 1.0, sp.z);
    // Docão da vitrine centralizado no espaço livre à direita do painel do menu (recalcula a cada frame: janela redimensionada,
    // menu mais largo com as 6 primárias...). Antes era um deslocamento fixo de 22% e, em janelas menores, a skin ficava atrás do menu.
    const pr = $('menu').classList.contains('hidden') || crateJourney.phase !== 'closed' ? null : $('menu').querySelector('.panel').getBoundingClientRect();
    const free = pr ? innerWidth - pr.right : innerWidth, cx = pr && free >= 200 ? pr.right + free * (innerWidth > 720 ? 0.42 : 0.5) : innerWidth * 0.72;
    const offX = innerWidth / 2 - cx; menuPreviewX = cx;
    if (!camera.view || !camera.view.enabled || Math.abs(camera.view.offsetX - offX) > 0.5 || camera.view.fullWidth !== innerWidth || camera.view.fullHeight !== innerHeight) camera.setViewOffset(innerWidth, innerHeight, offX, 0, innerWidth, innerHeight);
    if (!showDrag) { showSpin += showSpinVel * dt; showSpinVel *= Math.exp(-6 * dt); if (Math.abs(showSpinVel) < 0.02) showSpinVel = 0; }
    const showIdle = showDrag || Math.abs(showSpinVel) > 0.05 ? 0 : Math.sin(menuT * 1.8) * 0.12;
    showcase.rotation.y = showCamYaw + 0.15 + showSpin + showIdle; showcase.position.y = showBaseY + (getSkin(selectedSkin).float ? 0.1 + Math.sin(menuT * 10) * 0.06 : Math.abs(Math.sin(menuT * 6)) * 0.06);
    for (const p of pickups) p.mesh.rotation.y += dt;
    renderDanceShadows(danceT);
  } else if (state === 'over' && (victory.on || matchEnding)) {
    if (matchEnding) updateMatchEnding(realDt); // câmera lenta do fim, na visão do jogador (e o relógio que leva à dança)
    if (victory.on) {
      if (window.__danceT != null) victory.clock = window.__danceT; // testes: congela o passo da dança
      else victory.clock += dt;
      poseVictory(victory.model, selectedDance, victory.clock);
      frameVictoryCam();
    }
  }
  renderer.clear();
  const camO = window.__cam; // testes/screenshots: câmera livre { p: [x, y, z], t: [x, y, z], fov }
  if (camO) { camera.position.set(...camO.p); camera.lookAt(...camO.t); if (camO.fov && camera.fov !== camO.fov) { camera.fov = camO.fov; camera.updateProjectionMatrix(); } }
  if (state === 'menu' && !camO) {
    if (showcase.parent !== menuActorRoot) menuActorRoot.add(showcase);
    menuStage.position.set(showcase.position.x, showBaseY, showcase.position.z);
    menuStage.rotation.y = showCamYaw - 0.23;
    menuStage.updateMatrixWorld(true);
    updateCrateJourney(dt);
    camera.updateMatrixWorld(true);
    if (crateJourney.phase === 'closed') menuBackdrop.fit(showBaseY - .985);
    if (innerWidth > 720) {
      crateLabelPoint.set(0, -0.52, 0.65).applyMatrix4(menuStage.matrixWorld).project(camera);
      crateBasePoint.set(0, -0.97, 0.61).applyMatrix4(menuStage.matrixWorld).project(camera);
      crateLabelLeft.set(-0.6, -0.52, 0.65).applyMatrix4(menuStage.matrixWorld).project(camera);
      crateLabelRight.set(0.6, -0.52, 0.65).applyMatrix4(menuStage.matrixWorld).project(camera);
      const labelAngle = Math.atan2(-(crateLabelRight.y - crateLabelLeft.y) * innerHeight, (crateLabelRight.x - crateLabelLeft.x) * innerWidth) * 180 / Math.PI;
      const menuStyle = $('menu').style;
      menuStyle.setProperty('--crate-label-angle', `${labelAngle}deg`);
      wardrobeAnchor.set(0, .44, .17).applyMatrix4(wardrobeCase.matrixWorld).project(camera);
      menuStyle.setProperty('--wardrobe-x', `${(wardrobeAnchor.x + 1) * innerWidth / 2}px`);
      menuStyle.setProperty('--wardrobe-y', `${(1 - wardrobeAnchor.y) * innerHeight / 2}px`);
      wardrobeCorner.set(.39, .94, .17).applyMatrix4(wardrobeCase.matrixWorld).project(camera);
      const wardrobeTop = (1 - wardrobeCorner.y) * innerHeight / 2;
      wardrobeCorner.set(-.39, 0, .17).applyMatrix4(wardrobeCase.matrixWorld).project(camera);
      menuStyle.setProperty('--wardrobe-height', `${Math.max(60, (1 - wardrobeCorner.y) * innerHeight / 2 - wardrobeTop)}px`);
      menuStyle.setProperty('--wardrobe-width', `${Math.max(55, Math.abs(wardrobeCorner.x - wardrobeAnchor.x) * innerWidth * 1.08)}px`);
      menuStyle.setProperty('--arsenal-x', `${(crateLabelPoint.x + 1) * innerWidth / 2}px`);
      menuStyle.setProperty('--arsenal-y', `${(1 - crateLabelPoint.y) * innerHeight / 2}px`);
      menuStyle.setProperty('--crate-bottom', `${Math.min(innerHeight - 55, (1 - crateBasePoint.y) * innerHeight / 2)}px`);
      showcase.getWorldPosition(pigPoint); pigPoint.y += 1.15; pigPoint.project(camera);
      const pigX = menuPreviewX || ((pigPoint.x + 1) * innerWidth / 2), pigY = (1 - pigPoint.y) * innerHeight / 2;
      const dockW = 168, stackH = 360, arsenalY = (1 - crateLabelPoint.y) * innerHeight / 2;
      const panelRight = $('menu').querySelector('.panel').getBoundingClientRect().right;
      const chest = pigY - stackH * 0.28, top = Math.max(58, Math.min(chest, arsenalY - stackH - 18));
      const left = Math.max(8, Math.min(panelRight + 18, pigX - dockW - 96));
      menuStyle.setProperty('--dock-x', `${left}px`);
      menuStyle.setProperty('--dock-y', `${top}px`);
      const danceW = 148;
      menuStyle.setProperty('--dance-x', `${Math.min(innerWidth - danceW - 10, Math.max(pigX + 130, left + dockW + 12))}px`);
      menuStyle.setProperty('--dance-y', '96px');
    }
    renderer.render(menuScene, camera);
    renderWardrobePreview();
  } else {
    if (showcase.parent !== scene) scene.add(showcase);
    if (predator && !camO) renderMissileScreen();
    renderer.render(scene, camera);
  }
  poseGunnerRig(dt); if (gunner || ac130) fp.root.visible = false;
  mgWhirr.set(state === 'playing' && player && player.alive && player.weapon === MINIGUN && !gunner ? player.mgSpin || 0 : 0, !!(player && player.mgFiring)); // giro da minigun (zera fora do jogo: nunca fica zumbindo)
  if (state !== 'menu' && (state !== 'over' || (matchEnding && matchEnding.firstPerson && !victory.on)) && !emote.on && player && player.alive && !camO) { renderer.clearDepth(); renderer.render(fpScene, fpCam); } // no fim suave a arma continua na mão
}
mountUav();
mountStreakUi();
if (!$('fogVeil')) { const v = document.createElement('div'); v.id = 'fogVeil'; document.body.appendChild(v); } // Invasão: tela roxa fora da área segura
if (!$('smokeVeil')) {
  const veil = document.createElement('div');
  veil.id = 'smokeVeil';
  veil.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:radial-gradient(circle,rgba(210,214,216,.15),rgba(140,146,150,.86));opacity:0';
  document.body.appendChild(veil);
}
if (!$('stunFlash')) {
  const flash = document.createElement('div');
  flash.id = 'stunFlash';
  flash.style.cssText = 'position:fixed;inset:0;z-index:6;pointer-events:none;background:radial-gradient(circle,rgba(160,220,255,.18),rgba(70,150,255,.62));opacity:0';
  document.body.appendChild(flash);
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
// duração da partida: online vem do servidor (start.limit); offline do select "Tempo" (0 = padrão do modo)
let offlineMinutes = 0;
function matchLimit() {
  if (training() || invMode()) return Infinity; // Treino: não acaba · Invasão: acaba na wave 20 ou quando todos caem
  if (online && online.limit) return online.limit;
  if (mode === 'bomb') return Infinity; // Bomba: acaba em 13 rodadas
  return offlineMinutes ? offlineMinutes * 60 : teamMode() ? DOM.TIME_LIMIT_DOM : TIME_LIMIT;
}
function updateLeaderboard(dt) {
  lbT -= dt; if (lbT > 0) return; lbT = 0.25;
  const rows = entities.filter((e) => !e.zt).sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths).slice(0, 10);
  const head = invMode() ? `<div class="lbh"><span>Invasão 🎃</span><span>abates</span></div>` : exploreMode() ? `<div class="lbh"><span>Exploração</span><span>só você</span></div>` : teamMode() ? `<div class="lbh"><span class="r">Vermelho ${teamScore[0]}</span><span>/${mode === 'bomb' ? BOMB.WIN : DOM.WIN_CAPS}</span><span class="b">${teamScore[1]} Azul</span></div>` : `<div class="lbh"><span>Placar</span><span>abates</span></div>`;
  $('lb').innerHTML = head + rows.map((e, i) => { const pid = online ? (e.isPlayer ? online.myId : (e.netId || 0)) : 0; return `<div class="row${e.isPlayer ? ' me' : ''}${e.alive ? '' : ' dead'}${pid && voiceTalking(pid) ? ' talking' : ''}${pid && voiceMuted(pid) ? ' vmuted' : ''}"${pid ? ` data-pid="${pid}"` : ''}><span>${i + 1}</span><span class="dot" style="background:${teamMode() && e.team >= 0 ? TEAM_COLORS[e.team] : e.shirt}"></span><span class="n">${escapeHtml(e.name)}</span><span class="k">${scoreOf(e)}</span></div>`; }).join('');
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
const MENU_RULES = {
  dm: 'Todos contra todos · vence quem fizer 20 abates ou liderar em 5 minutos',
  dom: 'Times · capture a zona · o primeiro a completar as capturas vence',
  treino: 'Estande do Docão: alvos que não atacam e voltam em 2 s. B/N/M trocam a arma, munição infinita, sem tempo.',
  bomb: `💣 COMO JOGAR · Bomba (protótipo, estilo Valorant)\n🔥 Ataque: leve o Botijão até o site A ou B e segure ${BOMB.KEY_LABEL} por ${BOMB.PLANT} s pra plantar. Ele explode em ${BOMB.FUSE} s.\n🛡️ Defesa: impeça a plantação ou segure ${BOMB.KEY_LABEL} por ${BOMB.DEFUSE} s perto do Botijão pra desarmar.\n🔁 ${BOMB.PREP} s de preparação por rodada (dá pra trocar de arma com 1–9) · renascimento normal · primeiro a ${BOMB.WIN} rodadas · troca de lado depois da ${BOMB.HALF}ª.`,
  inv: 'Invasão 🎃 · co-op contra 20 waves de Docões zumbis. 2 vidas cada, poderes caem dos zumbis (G usa, X troca) e a Névoa Assombrada fecha o mapa.',
  explore: 'Mapa vazio, só você. Ande e teste as armas. Vírgula, ponto ou [ ] trocam a primária. Munição não acaba e a partida não termina.',
};
function readLimitStore() {
  try { const o = JSON.parse(localStorage.getItem('docao.limits') || '{}'); return o && typeof o === 'object' ? o : {}; } catch (e) { return {}; }
}
function limitsFor(md) { return savedToLimits(readLimitStore()[md]); }
function saveLimits(md, limits) {
  const all = readLimitStore(); all[md] = limitsToSaved(limits);
  try { localStorage.setItem('docao.limits', JSON.stringify(all)); } catch (e) { /* sem storage */ }
}
function activeWeapons() {
  const inRoom = online && online.cfg && (($('lobby') && !$('lobby').classList.contains('hidden')) || online.inMatch || rulesLive);
  if (inRoom) return online.cfg.weapons || null;
  if (rulesLive) return matchLimits.weapons;
  return null;
}
function activePowers() {
  const inRoom = online && online.cfg && (($('lobby') && !$('lobby').classList.contains('hidden')) || online.inMatch || rulesLive);
  if (inRoom) return online.cfg.powers == null ? null : online.cfg.powers;
  if (rulesLive) return matchLimits.powers;
  return null;
}
function clientPower(id) { return powerOn(id, activePowers()); }
function weaponAllowed(i) { const w = activeWeapons(); return !w || w.includes(i); }
function pool(list) {
  const w = activeWeapons(); if (!w) return list.slice();
  return list.filter((i) => w.includes(i));
}
function pickBotPrimary() { const L = botPool(activeWeapons()); return L[Math.floor(Math.random() * L.length)]; }
function limitSummary(limits) {
  const saved = limitsToSaved(limits || { weapons: null, powers: null });
  const allW = saved.cats.length === CATEGORIES.length, allP = !limits || limits.powers == null;
  if (allW && allP) return 'Armas e power-ups deste modo · tudo liberado';
  const w = allW ? 'todas as armas' : saved.cats.map((id) => (CATEGORIES.find((c) => c.id === id) || {}).title).filter(Boolean).join(', ');
  const p = allP ? 'todos os power-ups' : (limits.powers.length ? limits.powers.map((id) => (POWER_UPS.find((x) => x.id === id) || {}).title).filter(Boolean).join(', ') : 'nenhum power-up');
  return `Armas: ${w} · Power-ups: ${p}`;
}
function limitsFromChecks(root) {
  const cats = [...root.querySelectorAll('[data-cat]:checked')].map((el) => el.dataset.cat);
  const powers = [...root.querySelectorAll('[data-pow]:checked')].map((el) => el.dataset.pow);
  return savedToLimits({ cats, powers });
}
function paintLimits(root, limits, editable) {
  const saved = limitsToSaved(limits), prev = root.querySelector('details');
  const open = prev ? prev.open : root.id === 'roomLimits';
  root.innerHTML = `<details ${open ? 'open' : ''}><summary>${escapeHtml(limitSummary(limits))}</summary><div class="label2">Tipos de arma</div><div class="limit-grid" data-cats></div><div class="label2">Power-ups</div><div class="limit-grid" data-pow></div><div class="sub limit-msg" data-msg></div></details>`;
  const cats = root.querySelector('[data-cats]'), pow = root.querySelector('[data-pow]');
  for (const c of CATEGORIES) { const lab = document.createElement('label'); lab.className = 'limit-chip'; lab.innerHTML = `<input type="checkbox" data-cat="${c.id}" ${saved.cats.includes(c.id) ? 'checked' : ''} ${editable ? '' : 'disabled'}> ${escapeHtml(c.title)}`; cats.appendChild(lab); }
  for (const p of POWER_UPS) { const lab = document.createElement('label'); lab.className = 'limit-chip'; lab.innerHTML = `<input type="checkbox" data-pow="${p.id}" ${saved.powers.includes(p.id) ? 'checked' : ''} ${editable ? '' : 'disabled'}> ${escapeHtml(p.title)}`; pow.appendChild(lab); }
}
function bindLimits(root, onChange) {
  root._onLim = onChange;
  if (root.dataset.bound) return; root.dataset.bound = '1';
  root.addEventListener('change', (ev) => {
    const t = ev.target; if (!t || !t.dataset || t.disabled) return;
    if (t.dataset.cat && !t.checked) {
      const on = [...root.querySelectorAll('[data-cat]:checked')].map((el) => el.dataset.cat);
      const cat = CATEGORIES.find((c) => c.id === t.dataset.cat);
      if (cat && !CATEGORIES.some((c) => c.pick === cat.pick && on.includes(c.id))) {
        t.checked = true; const msg = root.querySelector('[data-msg]'); if (msg) msg.textContent = 'Deixa pelo menos um tipo nesse grupo.'; return;
      }
    }
    const msg = root.querySelector('[data-msg]'); if (msg) msg.textContent = '';
    const next = limitsFromChecks(root), sum = root.querySelector('summary'); if (sum) sum.textContent = limitSummary(next);
    if (root._onLim) root._onLim(next);
  });
}
function syncRoomLimits() {
  const root = $('roomLimits'); if (!root) return; const md = $('roomMode').value, limits = limitsFor(md), key = md + JSON.stringify(limitsToSaved(limits));
  if (root.dataset.key !== key) { root.dataset.key = key; paintLimits(root, limits, true); }
  bindLimits(root, (next) => { root.dataset.key = $('roomMode').value + JSON.stringify(limitsToSaved(next)); saveLimits($('roomMode').value, next); });
}
function syncLobbyLimits(cfg, isHost) {
  const root = $('lobbyLimits'); if (!root || !cfg) return;
  const limits = { weapons: cfg.weapons || null, powers: cfg.powers == null ? null : cfg.powers };
  const editable = !!(isHost && online && online.lobby && online.lobby.state !== 'playing');
  const key = (cfg.mode || '') + JSON.stringify(limitsToSaved(limits)) + (editable ? '1' : '0');
  if (root.dataset.key !== key) { root.dataset.key = key; paintLimits(root, limits, editable); }
  bindLimits(root, (next) => {
    if (!(online && online.lobby && online.lobby.state !== 'playing' && online.myId === online.hostId)) return;
    saveLimits($('lobbyMode').value, next);
    root.dataset.key = $('lobbyMode').value + JSON.stringify(limitsToSaved(next)) + '1';
    sendCfg(next);
  });
}
const LOADOUT_FIELDS = [
  ['Primary', 'Primária', PRIMARIES, () => selectedPrimary, (v) => setPrimary(v)],
  ['Secondary', 'Secundária', SECONDARIES, () => selectedSecondary, (v) => setSecondary(v)],
  ['Melee', 'Corpo a corpo', MELEES, () => selectedMelee, (v) => setMelee(v)],
];
function loadoutNote() {
  const w = activeWeapons(); if (!w) return '';
  const chip = (list) => { const i = pool(list)[0]; return i == null ? '' : WEAPONS[i].chip; };
  const bits = [];
  if (!w.includes(selectedPrimary)) bits.push(`primária ${chip(PRIMARIES)}`);
  if (!w.includes(selectedSecondary)) bits.push(`secundária ${chip(SECONDARIES)}`);
  if (!w.includes(selectedMelee)) bits.push(`corpo a corpo ${chip(MELEES)}`);
  return bits.length ? `A sua escolha continua salva. Neste modo entra: ${bits.join(' · ')}.` : '';
}
function fillLoadoutRow(rowId, prefix, fancy) {
  const row = $(rowId); if (!row) return;
  if (!row.childElementCount) {
    for (const [id, label, list, , set] of LOADOUT_FIELDS) {
      const lab = document.createElement('label'); lab.innerHTML = fancy ? `<span class="field-caption">${label}</span>` : label;
      const sel = document.createElement('select'); sel.id = prefix + id; sel.setAttribute('aria-label', label); lab.appendChild(sel); row.appendChild(lab);
      sel.onchange = () => { const n = +sel.value; if (list.includes(n)) set(n); };
    }
    const lab = document.createElement('label'); lab.innerHTML = fancy ? '<span class="field-caption">Na mão</span>' : 'Na mão';
    const hand = document.createElement('select'); hand.id = prefix + 'Hand'; hand.setAttribute('aria-label', 'Arma na mão ao nascer');
    hand.innerHTML = '<option value="primary">Primária</option><option value="secondary">Secundária</option><option value="melee">Corpo a corpo</option>';
    lab.appendChild(hand); row.appendChild(lab); hand.onchange = () => setSpawnHand(hand.value);
  }
  for (const [id, , list, get] of LOADOUT_FIELDS) {
    const el = $(prefix + id); let opts = pool(list); if (!opts.length) opts = list.slice(0, 1); const cur = get(), show = opts.includes(cur) ? cur : opts[0], sig = opts.join(',') + ':' + show;
    if (el.dataset.sig !== sig) { el.innerHTML = opts.map((i) => `<option value="${i}">${escapeHtml(WEAPONS[i].name)}</option>`).join(''); el.value = String(show); el.dataset.sig = sig; }
  }
  const hand = $(prefix + 'Hand'); if (hand && hand.value !== spawnHold) hand.value = spawnHold;
  let note = row.parentElement.querySelector('.loadout-note');
  if (!note) { note = document.createElement('div'); note.className = 'sub loadout-note'; row.insertAdjacentElement('afterend', note); }
  const txt = loadoutNote(); if (note.textContent !== txt) note.textContent = txt;
}
function buildDeathPrimaries() {
  const d = $('deathList'); if (!d) return; d.innerHTML = '';
  pool(PRIMARIES).forEach((i, k) => d.appendChild(primChip(i, k < 9 ? String(k + 1) : '', setPrimary, 'primary')));
  markPick('primary', selectedPrimary);
}
const DOCK_SLOTS = [
  ['primary', 'Primária', PRIMARIES, () => selectedPrimary, (v) => setPrimary(v)],
  ['secondary', 'Secundária', SECONDARIES, () => selectedSecondary, (v) => setSecondary(v)],
  ['melee', 'Corpo a corpo', MELEES, () => selectedMelee, (v) => setMelee(v)],
];
function paintLoadoutDock() {
  const root = $('loadoutDock'); if (!root) return;
  if (!root.querySelector('.gun-card')) {
    for (const [slot, , list, get, set] of DOCK_SLOTS) {
      const card = document.createElement('div'); card.className = 'gun-card'; card.dataset.slot = slot;
      card.innerHTML = '<button type="button" class="gun-step" data-dir="-1" aria-label="Arma anterior">‹</button><button type="button" class="gun-face"><span class="wthumb" data-w="0"></span><b></b><small></small></button><button type="button" class="gun-step" data-dir="1" aria-label="Próxima arma">›</button>';
      card.querySelector('.gun-face').onclick = () => setSpawnHand(slot);
      card.querySelectorAll('.gun-step').forEach((b) => b.onclick = () => {
        const L = list, cur = get(), at = L.indexOf(cur);
        const n = L[(Math.max(0, at) + (b.dataset.dir === '1' ? 1 : L.length - 1)) % L.length];
        set(n);
      });
      root.appendChild(card);
    }
  }
  for (const [slot, label, , get] of DOCK_SLOTS) {
    const card = root.querySelector(`[data-slot="${slot}"]`), i = get(), w = WEAPONS[i];
    const thumb = card.querySelector('.wthumb'); thumb.dataset.w = String(i);
    thumb.style.backgroundImage = weaponThumbs[i] ? `url("${weaponThumbs[i]}")` : '';
    card.querySelector('b').textContent = (w && w.name) || '';
    const hand = spawnHold === slot; card.classList.toggle('in-hand', hand);
    card.querySelector('small').textContent = hand ? `${label} · na mão` : label;
    card.querySelector('.gun-face').setAttribute('aria-label', hand ? `${label}, ${w ? w.name : ''}. Já nasce com ela na mão` : `Nascer com ${label}`);
  }
}
function syncLoadoutUi() { paintLoadoutDock(); fillLoadoutRow('lobbyLoadoutRow', 'lobby', false); buildDeathPrimaries(); buildDeathSec(); buildDeathMelee(); }
function refreshMenuMode() {
  const v = ['dom', 'bomb', 'explore', TRAIN.mode, INV.mode].includes($('modeSel').value) ? $('modeSel').value : 'dm';
  $('menuTrain').classList.toggle('hidden', v !== TRAIN.mode);
  $('menuTeam').classList.toggle('hidden', v !== 'dom' && v !== 'bomb'); // Dominação e Bomba: escolhe o time
  $('botCount').closest('label').classList.toggle('hidden', v === 'explore' || v === TRAIN.mode || v === INV.mode);
  $('timeSel').closest('label').classList.toggle('hidden', v === 'explore' || v === TRAIN.mode || v === INV.mode);
  const playTitle = v === INV.mode ? 'SOBREVIVER' : v === 'explore' ? 'EXPLORAR' : v === TRAIN.mode ? 'TREINAR' : '<img class="menu-lettering" src="./assets/menu/lettering-jogar.webp" alt="Jogar">';
  const playHint = v === INV.mode ? 'SOLO · 20 WAVES DE ZUMBIS' : v === 'explore' ? 'SEM BOTS · SEM PRESSA' : v === TRAIN.mode ? 'ESTANDE · SEM LIMITE' : 'SOLO · CONTRA BOTS';
  $('playBtn').innerHTML = `<span class="play-title">${playTitle}</span><small>${playHint}</small>`;
  $('menuRules').textContent = MENU_RULES[v];
  teamButtons($('menuTeamBtns'), menuTeam, (t) => { menuTeam = t; refreshMenuMode(); });
  syncLoadoutUi();
}
$('modeSel').onchange = () => { try { localStorage.setItem('docao.mode', $('modeSel').value); } catch (e) { /* */ } refreshMenuMode(); syncMapForMode(); };
try { const m = localStorage.getItem('docao.mode'); if (m === 'dom' || m === 'dm' || m === 'explore' || m === TRAIN.mode || m === INV.mode || m === 'bomb') $('modeSel').value = m; } catch (e) { /* */ }
if (invMenu() || bombMenu()) syncMapForMode();
$('timeSel').onchange = () => { try { localStorage.setItem('docao.time', $('timeSel').value); } catch (e) { /* */ } };
try { $('timeSel').value = String(normTime(localStorage.getItem('docao.time'))); } catch (e) { /* */ }
refreshMenuMode();
// tela de morte: primária e secundária clicáveis; solta o mouse ao morrer e trava de novo ao voltar
let deathUnlock = false;
function buildDeathSec() {
  const d = $('deathSec'); if (!d) return; d.innerHTML = '';
  for (const i of pool(SECONDARIES)) {
    const b = primChip(i, '', (picked) => { selectedSecondary = picked; try { localStorage.setItem('docao.secondary', String(picked)); } catch (e) { /* */ } if (player) player.nextSecondary = picked; setSpawnHand('secondary'); sendLoadout(); markPick('secondary', picked); buildDeathSec(); }, 'secondary');
    b.classList.toggle('active', i === selectedSecondary);
    b.querySelector('small').textContent = i === selectedSecondary && spawnHold === 'secondary' ? 'Renasce com ela na mão ✓' : 'Clique pra levar essa';
    d.appendChild(b);
  }
}
function buildDeathMelee() {
  const d = $('deathMelee'); if (!d) return; d.innerHTML = '';
  for (const i of pool(MELEES)) {
    const b = primChip(i, i === KNIFE ? 'V' : '', setMelee, 'melee');
    b.classList.toggle('active', i === selectedMelee);
    d.appendChild(b);
  }
}
// botão RENASCER: só libera depois de RESPAWN_TIME; online pede ao servidor ({t:'rs'}), que é quem decide
let rsSent = false;
const invMeOut = () => { const v = invMode() && invView(); const s = v && v.lives.get(online ? online.myId : player && player.id); return !!(s && s.out); };
const respawnReady = (p) => !!p && !p.alive && Number.isFinite(p.respawnAt) && gameTime >= p.respawnAt && !invMeOut();
function updateRespawnBtn(p) {
  const b = $('respawnBtn'), ok = respawnReady(p) && !rsSent;
  const txt = invMeOut() ? 'Sem vidas · espere a ✨ Ressurreição' : rsSent ? 'Renascendo...' : ok ? 'RENASCER (Espaço)' : Number.isFinite(p.respawnAt) ? `Renascer em ${Math.max(0, p.respawnAt - gameTime).toFixed(1)}s` : 'Aguarde...';
  if (b.disabled === ok) b.disabled = !ok; if (b.textContent !== txt) b.textContent = txt; b.classList.toggle('ready', ok);
}
function requestRespawn() {
  const p = player; if (state !== 'playing' || !respawnReady(p) || rsSent) return false;
  lockPointer(); // primeiro, ainda dentro do gesto (clique em RENASCER ou Espaço/Enter): a mira volta na hora
  if (online) { rsSent = true; online.net.send({ t: 'rs' }); } else respawn(p);
  return true;
}
$('respawnBtn').onclick = (ev) => { ev.stopPropagation(); requestRespawn(); };
function onPlayerDeath(opts) { clearHitMarks(); if (player) { player.mgWant = false; player.mgSpin = 0; player.mgFiring = false; } rsSent = false; resetRewards(true); if (!(opts && opts.keepAim) && document.pointerLockElement) { deathUnlock = true; document.exitPointerLock(); } mouseDown = false; rightDown = false; if (player) player.bowDraw = player.eggDraw = 0; }
function onPlayerRespawn() { clearHitMarks(); rsSent = false; deathCamState.on = false; deathCamState.killer = null; document.body.classList.remove('deadgray'); if (ghost) ghost.model.group.visible = false;
  // o pointer lock é assíncrono: só avisa se ainda estiver sem mouse depois de um tempinho (o clique em RENASCER já pediu o lock)
  setTimeout(() => { if (!document.pointerLockElement && deathUnlock && state === 'playing' && player && player.alive) flashMsg(RELOCK_MSG); }, 600); }

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
function myName() { const a = getAccount(); return a ? a.nick : cleanName($('nameInput').value); } // conta: o apelido é fixo
function saveName(n, from) {
  const acc = getAccount(); n = acc ? acc.nick : cleanName(n); for (const id of NAME_FIELDS) if (id !== from) $(id).value = n;
  if (!acc) { try { localStorage.setItem('docao.name', n); } catch (e) { /* sem storage */ } } // o apelido da conta não vira o nome de convidado
  return n;
}
function profile() {
  const load = clampLoadout(selectedPrimary, selectedSecondary, selectedMelee, online && online.cfg ? online.cfg.weapons : null);
  return { name: saveName(myName()), skin: selectedSkin, primary: load.primary, secondary: load.secondary, melee: load.melee };
}
try { saveName(localStorage.getItem('docao.name') || $('nameInput').value); } catch (e) { saveName($('nameInput').value); }
for (const id of NAME_FIELDS) {
  const el = $(id); el.maxLength = NAME_MAX;
  el.addEventListener('input', () => { for (const o of NAME_FIELDS) if (o !== id) $(o).value = el.value; });
  el.addEventListener('change', () => { const n = saveName(el.value); el.value = n; if (id === 'lobbyName') sendName(); });
  el.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter' && id === 'lobbyName') { el.blur(); } });
}
// lobby: manda o nome novo pro servidor (ele limpa e evita repetido, ex.: "Matheus (2)")
function sendName() { if (!online || !online.net) return; const n = saveName($('lobbyName').value); online.net.send({ t: 'prof', name: n, skin: selectedSkin, primary: selectedPrimary, secondary: selectedSecondary, melee: selectedMelee }); online.nameSent = n; }
$('lobbyNameBtn').onclick = () => sendName();
// ---------- conta (opcional): apelido fixo + skin guardada ----------
function applyAccount(a) {
  for (const id of NAME_FIELDS) { const el = $(id); el.readOnly = !!a; el.title = a ? 'Apelido fixo da sua conta' : ''; el.classList.toggle('locked', !!a); }
  if (a) { saveName(a.nick); if (a.skin && SKINS.some((s) => s.id === a.skin) && a.skin !== selectedSkin) setPreview(a.skin); else if (!a.skin) saveAcctSkin(selectedSkin); }
  else { let n = ''; try { n = localStorage.getItem('docao.name') || ''; } catch (e) { /* sem storage */ } for (const id of NAME_FIELDS) $(id).value = cleanName(n || 'Docão'); }
}
onAccount(applyAccount); initAccountUI(); loadMe().then(() => applyAccount(getAccount()));
const roomLink = (code) => { const u = new URL(location.href); u.search = ''; const sv = new URLSearchParams(location.search).get('server'); if (sv) u.searchParams.set('server', sv); u.searchParams.set('sala', code); return u.toString(); };
function socialTeam() { if (!online) return false; const cfg = (online.lobby && online.lobby.cfg) || online.cfg; return !!(cfg && (cfg.mode === 'dom' || cfg.mode === 'bomb')); } // Dominação e Bomba: chat e voz do time
function inviteBlurb(code) { return `Bora jogar Docão Shooter! Sala ${code}\n${roomLink(code)}`; }
function fillInvite(code) { const link = roomLink(code); document.querySelectorAll('.invite-link').forEach((el) => { el.value = link; }); }
async function copyText(s) {
  try { await navigator.clipboard.writeText(s); return true; }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = s; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (err) { ok = false; } ta.remove(); return ok;
  }
}
function bindInvite(root) {
  const toast = root.querySelector('[data-toast]'); let timer = 0;
  const ping = (msg) => { toast.textContent = msg; clearTimeout(timer); timer = setTimeout(() => { if (toast.textContent === msg) toast.textContent = ''; }, 2200); };
  const code = () => (online && online.code) || '';
  root.querySelector('[data-act=link]').onclick = async () => { if (!code()) return; ping((await copyText(roomLink(code()))) ? 'Link copiado!' : 'Não deu para copiar'); };
  root.querySelector('[data-act=code]').onclick = async () => { if (!code()) return; ping((await copyText(code())) ? 'Código copiado!' : 'Não deu para copiar'); };
  root.querySelector('[data-act=wa]').onclick = () => { if (!code()) return; window.open('https://wa.me/?text=' + encodeURIComponent(inviteBlurb(code())), '_blank', 'noopener'); };
  root.querySelector('[data-act=tg]').onclick = () => { if (!code()) return; window.open('https://t.me/share/url?url=' + encodeURIComponent(roomLink(code())) + '&text=' + encodeURIComponent(inviteBlurb(code())), '_blank', 'noopener'); };
  root.querySelector('[data-act=slack]').onclick = async () => { if (!code()) return; await copyText(inviteBlurb(code())); ping('Mensagem copiada. Cole no Slack.'); window.open('slack://open'); };
  const native = root.querySelector('[data-act=native]');
  if (!navigator.share) native.classList.add('hidden');
  else { native.classList.remove('hidden'); native.onclick = async () => { if (!code()) return; try { await navigator.share({ title: 'Docão Shooter', text: inviteBlurb(code()), url: roomLink(code()) }); } catch (e) { /* cancelou */ } }; }
}

function joinRoom(code) {
  code = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) { $('onlineErr').textContent = 'O código tem 4 letras'; return; }
  if (online) leaveOnline(true);
  initAudio();
  online = { code, myId: 0, hostId: 0, ents: new Map(), evq: [], sendAcc: 0, cfg: null, lobby: null, inMatch: false, status: 'connecting' };
  online.net = new Net(code, profile(), { onMessage: onNetMessage, onStatus: onNetStatus });
  history.replaceState(null, '', roomLink(code));
  $('lobbyCode').textContent = code; fillInvite(code); chatClear(); voiceReset();
  $('lobbyPlayers').innerHTML = ''; $('lobbyStatus').textContent = 'Conectando…'; $('lobbyInfo').textContent = '';
  $('hostCtl').classList.add('hidden'); $('lobbyWait').classList.add('hidden');
  ['menu', 'onlineModal', 'gameover', 'pause'].forEach((id) => $(id).classList.add('hidden')); $('lobby').classList.remove('hidden');
}
function leaveOnline(silent) {
  const o = online; if (!o) return; voiceReset(); chatClear(); online = null; o.net.close();
  const u = new URL(location.href); u.searchParams.delete('sala'); history.replaceState(null, '', u.toString());
  $('lobby').classList.add('hidden'); $('netbar').classList.add('hidden'); $('socialHud').classList.add('hidden'); $('overChat').classList.add('hidden');
  if (!silent && state !== 'menu') toMenu(); else if (!silent) $('menu').classList.remove('hidden');
}
function onNetStatus(st, detail) {
  if (!online) return; online.status = st;
  if (st === 'error' && /^Sessão expirada/.test(detail || '')) { dropSession(); leaveOnline(); flashMenuErr(detail); return; } // token vencido: volta a convidado
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
    case 'welcome': o.myId = m.id; o.hostId = m.hostId; o.cfg = m.cfg; voiceReset(); chatSeed(m.chat); chatSetRoom(!m.cfg || m.cfg.chat !== false); chatSetTeam(socialTeam()); break;
    case 'lobby': o.lobby = m; o.hostId = m.hostId; o.cfg = m.cfg; renderLobby(); break;
    case 'chat': chatPush(m); break;
    case 'voices': voiceRoster(m.list); break;
    case 'sig': voiceSignal(m.from, m.kind, m.data); break;
    case 'start': startOnlineMatch(m); break;
    case 's': if (o.inMatch && state !== 'over') applySnapshot(m); break; // resultado fechado: snapshot atrasado não mexe na cena
    case 'p': if (o.inMatch && state !== 'over') for (const ev of m.ev) personalEvent(ev); break;
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
function fillMapSelect(sel, value, md) { // Invasão: lista própria (Rodízio, Fazenda Mal-Assombrada + mapas normais)
  const iv = isInvasion(md), L = menuPool(md), key = md === 'bomb' ? 'bomb' : iv ? 'inv' : 'play';
  if (!sel.options.length || sel.dataset.pool !== key) { sel.innerHTML = ''; sel.dataset.pool = key; for (const m of L) sel.add(new Option(m.name, m.id)); sel.add(new Option('Aleatório', 'random')); }
  if (value && [...sel.options].some((o) => o.value === value)) sel.value = value; else if (value) sel.value = md === 'bomb' ? BOMB_MAP : iv ? INV.DEFAULT_MAP : L[0].id; // Bomba: mapa sem sites → Rodízio
  if (md === 'bomb' && value === 'random') sel.value = BOMB_MAP;
}
function renderLobby() {
  const o = online, L = o.lobby; if (!L) return;
  const isHost = o.myId === o.hostId, cfg = L.cfg;
  const mapName = cfg.map === 'random' ? 'Aleatório' : getMap(cfg.map).name;
  const openSlots = Math.max(0, cfg.max - L.players.filter((p) => !p.bot).length);
  $('lobbyInfo').textContent = `${mapName} · até ${cfg.max} jogadores · bots: ${cfg.fillBots ? 'sim' : 'não'} · ${cfg.time ? cfg.time + ' min' : 'tempo padrão'}${L.state === 'playing' ? ' · partida em andamento' + (openSlots > 0 && cfg.fillBots ? ' · dá pra entrar no lugar de um bot' : '') : ''}${limitBlurb(cfg)}`;
  const rows = L.players.filter((p) => !p.bot), dom = cfg.mode === 'dom' || cfg.mode === 'bomb'; // modos com times
  const counts = [0, 0]; for (const p of rows) if (p.team === 0 || p.team === 1) counts[p.team]++;
  $('lobbyTeam').classList.toggle('hidden', !dom);
  if (dom) { const me = rows.find((p) => p.id === o.myId); teamButtons($('lobbyTeamBtns'), me ? me.pref : -1, (t) => o.net.send({ t: 'team', team: t }), counts); }
  $('lobbyInfo').textContent = (cfg.mode === 'bomb' ? 'BOMBA (protótipo) · ' : isInvasion(cfg.mode) ? 'INVASÃO 🎃 (co-op) · ' : dom ? 'DOMINAÇÃO · ' : isTraining(cfg.mode) ? 'TREINO (Estande do Docão) · ' : 'MATA-MATA · ') + $('lobbyInfo').textContent;
  $('lobbyPlayers').innerHTML = `<table><tr><th style="text-align:left">Jogadores (${rows.length}/${cfg.max})</th><th>Ping</th></tr>${rows.map((p) =>
    `<tr data-pid="${p.bot ? '' : p.id}" class="${p.id === o.myId ? 'me' : ''}${!p.bot && voiceTalking(p.id) ? ' talking' : ''}${!p.bot && voiceMuted(p.id) ? ' vmuted' : ''}"><td style="text-align:left"><span class="dot" style="background:${(getSkin(p.skin).shirt || {}).color || '#d8261c'}"></span>${escapeHtml(p.name)}${p.id === L.hostId ? '<span class="host">★ anfitrião</span>' : ''}${dom && p.team >= 0 ? `<span class="tm${p.team}">${TEAM_NAMES[p.team]}${p.pref < 0 ? ' (auto)' : ''}</span>` : ''}</td><td>${p.id === o.myId ? o.net.ping : p.ping} ms</td></tr>`).join('')}</table>`;
  chatSetRoom(cfg.chat !== false); chatSetTeam(!!dom); voiceRefresh();
  { const me = L.players.find((p) => p.id === o.myId); const inGame = L.state === 'playing';
    $('lobbyName').disabled = $('lobbyNameBtn').disabled = inGame;
    $('lobbyNameMsg').textContent = me && me.name !== myName() ? `Na sala você aparece como “${me.name}”${inGame ? '' : ' (nome repetido ou ajustado)'}` : inGame ? 'Partida em andamento: o nome muda na próxima partida' : ''; }
  $('hostCtl').classList.toggle('hidden', !isHost); $('lobbyWait').classList.toggle('hidden', isHost || L.state !== 'lobby');
  if (isHost) { fillMapSelect($('lobbyMap'), cfg.map, cfg.mode); $('lobbyMax').value = String(cfg.max); $('lobbyBots').value = cfg.fillBots ? '1' : '0'; $('lobbyMode').value = cfg.mode || 'dm'; $('lobbyTime').value = String(normTime(cfg.time)); $('lobbyChatOn').value = cfg.chat === false ? '0' : '1'; }
  syncLobbyLimits(cfg, isHost); syncLoadoutUi();
  if (state === 'over') { const h = o.myId === o.hostId; $('againBtn').classList.toggle('hidden', !h); $('nextMapBtn').classList.toggle('hidden', !h); $('overWait').classList.toggle('hidden', h); }
}
function limitBlurb(cfg) {
  const saved = limitsToSaved({ weapons: cfg.weapons || null, powers: cfg.powers == null ? null : cfg.powers });
  const allW = saved.cats.length === CATEGORIES.length, allP = cfg.powers == null;
  if (allW && allP) return '';
  const w = allW ? 'todas as armas' : saved.cats.map((id) => (CATEGORIES.find((c) => c.id === id) || {}).title).filter(Boolean).join(', ');
  const p = allP ? 'todos os power-ups' : (cfg.powers.length ? cfg.powers.map((id) => (POWER_UPS.find((x) => x.id === id) || {}).title).filter(Boolean).join(', ') : 'nenhum power-up');
  return ` · armas: ${w} · power-ups: ${p}`;
}
const sendCfg = (lim) => {
  if (!online) return; const mode = $('lobbyMode').value, L = lim || limitsFor(mode);
  online.net.send({ t: 'cfg', map: $('lobbyMap').value, max: +$('lobbyMax').value, fillBots: $('lobbyBots').value === '1', mode, time: +$('lobbyTime').value, chat: $('lobbyChatOn').value === '1', weapons: L.weapons, powers: L.powers });
};
['lobbyMap', 'lobbyMax', 'lobbyBots', 'lobbyTime', 'lobbyChatOn'].forEach((id) => ($(id).onchange = sendCfg));
$('lobbyMode').onchange = () => { fillMapSelect($('lobbyMap'), $('lobbyMode').value === 'bomb' ? BOMB_MAP : $('lobbyMap').value, $('lobbyMode').value); sendCfg(limitsFor($('lobbyMode').value)); };
$('startOnline').onclick = () => { if (online) { initAudio(); online.net.send({ t: 'start', map: $('lobbyMap').value }); } };
$('leaveLobby').onclick = () => leaveOnline();
// ---------- menu online ----------
function onlineTab(create) { $('tabCreate').classList.toggle('active', create); $('tabJoin').classList.toggle('active', !create); $('paneCreate').classList.toggle('hidden', !create); $('paneJoin').classList.toggle('hidden', create); }
$('roomMode').onchange = () => { fillMapSelect($('roomMap'), $('roomMode').value === 'bomb' ? BOMB_MAP : $('roomMap').value, $('roomMode').value); syncRoomLimits(); };
$('onlineBtn').onclick = () => { if (invMenu()) $('roomMode').value = INV.mode; else if (bombMenu()) $('roomMode').value = 'bomb'; fillMapSelect($('roomMap'), selectedMap, $('roomMode').value); syncRoomLimits(); $('onlineErr').textContent = ''; $('menu').classList.add('hidden'); $('onlineModal').classList.remove('hidden'); };
$('onlineClose').onclick = () => { $('onlineModal').classList.add('hidden'); $('menu').classList.remove('hidden'); };
$('tabCreate').onclick = () => onlineTab(true); $('tabJoin').onclick = () => { onlineTab(false); $('joinCode').focus(); };
$('createBtn').onclick = async () => {
  const b = $('createBtn'); b.disabled = true; $('onlineErr').textContent = 'Criando sala…';
  try { const lim = limitsFor($('roomMode').value); const code = await createRoom({ map: $('roomMap').value, max: +$('roomMax').value, fillBots: $('roomBots').value === '1', mode: $('roomMode').value, time: +$('roomTime').value, weapons: lim.weapons, powers: lim.powers }); $('onlineErr').textContent = ''; joinRoom(code); }
  catch (e) { $('onlineErr').textContent = 'Não deu pra criar a sala: ' + (e.message || 'servidor fora do ar'); }
  b.disabled = false;
};
$('joinBtn').onclick = async () => {
  const code = $('joinCode').value.trim().toUpperCase(); if (!/^[A-Z]{4}$/.test(code)) { $('onlineErr').textContent = 'O código tem 4 letras'; return; }
  $('onlineErr').textContent = 'Procurando sala…';
  try {
    const info = await roomInfo(code); if (!info.exists) { $('onlineErr').textContent = 'Sala não encontrada'; return; }
    const open = info.open != null ? info.open : info.max - info.players;
    if (open <= 0) { $('onlineErr').textContent = 'Sala cheia'; return; }
    $('onlineErr').textContent = ''; joinRoom(code);
    if (info.state === 'playing') $('lobbyStatus').textContent = info.bots > 0 ? 'Entrando na partida no lugar de um bot…' : 'Entrando na partida…';
  }
  catch (e) { $('onlineErr').textContent = 'Servidor fora do ar'; }
};
$('joinCode').addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') $('joinBtn').click(); });
// ---------- partida ----------
function remoteEnt(info) {
  const o = online; if (info.id === o.myId || o.ents.has(info.id)) return o.ents.get(info.id);
  if (info.zt) { // Invasão: zumbi do servidor
    const z = makeZombieEnt(info.zt, info.name); Object.assign(z, { id: info.id, remote: true, netId: info.id, bot: true, buf: [], alive: false, hp: info.hp ?? z.hp, maxHp: info.mx || z.maxHp, ping: 0 });
    z.model.group.visible = false; o.ents.set(info.id, z); entities.push(z); return z;
  }
  const e = makeEntity(info.name, false, info.skin, info.tag || '#ffffff');
  Object.assign(e, { id: info.id, remote: true, netId: info.id, bot: !!info.bot, buf: [], kills: info.kills || 0, deaths: info.deaths || 0, alive: false, primary: info.primary || 0, ping: 0 });
  e.model.group.visible = false; setWeapon(e, info.w || 0); e.slots = [e.primary, e.secondary ?? PISTOL, e.melee ?? KNIFE]; e.caps = info.caps || 0; applyTeam(e, info.team ?? -1);
  o.ents.set(info.id, e); entities.push(e); return e;
}
function removeEnt(id) {
  const o = online, e = o.ents.get(id); if (!e || e === player) return;
  scene.remove(e.model.group); o.ents.delete(id); entities = entities.filter((x) => x !== e);
}
function startOnlineMatch(m) {
  const o = online; stopInspect(true);
  if (o.inMatch && o.mapId === m.map && state !== 'over' && player) { // reconexão no meio da partida: só ressincroniza
    for (const info of m.ents) if (!o.ents.has(info.id) && info.id !== o.myId) remoteEnt(info);
    return;
  }
  clearMatchEnding(); resetAds(); loadMap(m.map, isInvasion(m.mode)); clearBots(); gameTime = m.T; o.mapId = m.map; o.inMatch = true; o.ents.clear(); o.tmap = [];
  mode = MODE_OK(m.mode); inv = null; invNet = m.iv ? parseState(m.iv) : null; window.__capLog = []; o.limit = m.limit > 0 ? m.limit : 0; endBomb();
  matchLimits = { weapons: (o.cfg && o.cfg.weapons) || null, powers: o.cfg && o.cfg.powers != null ? o.cfg.powers : null }; rulesLive = true;
  zone = m.zone ? newZoneState({ x: m.zone[0], y: m.zone[1], z: m.zone[2] }) : null; teamScore = m.zone ? [m.zone[8], m.zone[9]] : [0, 0];
  const me = m.ents.find((x) => x.id === o.myId) || { name: profile().name, skin: selectedSkin };
  player = makeEntity(me.name, true, me.skin, '#ffd27a'); player.netId = player.id = o.myId; player.sq = 0; player.alive = false; player.respawnAt = Infinity;
  player.kills = me.kills || 0; player.deaths = me.deaths || 0; player.gunKills = WEAPONS.map(() => 0); revengeName = null; resetFeedback(); resetMatchCamos();
  player.primary = player.nextPrimary = selectedPrimary; player.nextSecondary = selectedSecondary; player.nextMelee = selectedMelee; player.slots = [selectedPrimary, selectedSecondary, selectedMelee]; setWeapon(player, selectedPrimary); // até o servidor mandar o renascimento
  entities.push(player); o.ents.set(o.myId, player); fp.setSkin(me.skin); player.caps = me.caps || 0; applyTeam(player, me.team ?? -1);
  for (const info of m.ents) remoteEnt(info);
  invApplyLook(invMode()); if (invMode()) for (const [id, ki, pos] of m.drops || []) invAddDrop(id, DROP_KEYS[ki], pos);
  if (mode === 'bomb' && m.bomb) setupBomb({ sites: m.bomb.sites.map(([x, y, z], i) => ({ x, y, z, name: SITE_NAMES[i] })), atk: m.bomb.atk, def: m.bomb.def, pts: m.bomb.pts ? m.bomb.pts.map(([x, y, z]) => ({ x, y, z })) : undefined }, unpackBomb(m.bomb.s)); else if (mode === 'bomb') mode = 'dm';
  refreshModeHud(); $('teamPick').classList.add('hidden');
  if (teamMode() && me.pend) showTeamPick(m.ents);
  pickups.forEach((p, i) => { p.active = !!(m.pk ? m.pk[i] : 1); p.mesh.visible = p.active; });
  showcase.visible = false; $('killfeed').innerHTML = ''; flashMsg(invMode() ? `Invasão 🎃 · ${currentMap.name} · ${KEYS.useLabel} usa poder · ${KEYS.cycleLabel} troca` : `Mapa: ${currentMap.name}`);
  ['menu', 'gameover', 'pause', 'lobby', 'onlineModal'].forEach((id) => $(id).classList.add('hidden')); $('hud').classList.remove('hidden'); $('socialHud').classList.remove('hidden'); $('voiceHud').classList.remove('hidden'); $('overChat').classList.add('hidden');
  $('netbar').classList.remove('hidden'); $('netRoom').textContent = 'Sala ' + o.code;
  camera.clearViewOffset(); state = 'playing'; if ($('teamPick').classList.contains('hidden')) lockPointer(); // escolhendo time: mouse livre pros botões
}
function netTick(dt) {
  const o = online; if (!o || !o.inMatch || !player) return;
  o.sendAcc += dt; if (o.sendAcc < 1 / SEND_HZ) return; o.sendAcc = 0;
  const p = player, msg = { t: 'u', sq: p.sq, y: +p.yaw.toFixed(3), pi: +p.pitch.toFixed(3), c: +p.crouch.toFixed(3), g: p.onGround ? 1 : 0, w: p.weapon, pg: o.net.ping, dn: emote.on ? selectedDance : '' };
  if (p.alive) { msg.p = v3a(p.pos); msg.v = v3a(p.vel); }
  if (bombS && p.useHold) msg.bk = 1; // Bomba: segurando E
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
  e.crouch = crouchAmount((a.crouch || 0) + ((b.crouch || 0) - (a.crouch || 0)) * Math.min(1, k));
  let dy = b.yaw - a.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); e.yaw = a.yaw + dy * Math.min(1, k);
}
function applySnapshot(s) {
  const o = online, now = performance.now() / 1000;
  if (Math.abs(gameTime - s.T) > 0.25) gameTime = s.T; else gameTime += (s.T - gameTime) * 0.1;
  o.tmap.push({ t: now, T: s.T }); if (o.tmap.length > 40) o.tmap.shift();
  if (s.d && zone) { const d = s.d; Object.assign(zone, { x: d[0], y: d[1], z: d[2], progress: d[3], team: d[4], contested: !!d[5], counts: [d[6], d[7]] }); teamScore = [d[8], d[9]]; }
  if (s.iv) invNet = parseState(s.iv);
  if (s.b && bombS) { unpackBomb(s.b, bombS); teamScore = bombS.score; }
  for (const ev of s.ev) netEvent(ev);
  for (const [id, x, y, z, yaw, pitch, w, fl, hp, ping, crouch = 0] of s.e) {
    const e = o.ents.get(id); if (!e) continue;
    e.ping = ping; e.hp = hp; e.onGround = !!(fl & 4); e.regenOn = !!(fl & 16); // 16: regenerando (servidor novo)
    if (e === player) continue;
    const alive = !!(fl & 1);
    if (alive && !e.alive) { e.alive = true; e.model.group.visible = true; e.model.group.scale.setScalar(e.zt ? e.model.group.userData.size || 1 : 1); e.buf = []; e.pos.set(x, y, z); }
    else if (!alive && e.alive) { e.alive = false; e.deathAt = gameTime; }
    if (w !== e.weapon) setWeapon(e, w);
    e.invulnUntil = fl & 2 ? gameTime + 0.15 : 0; e.reloadEnd = fl & 8 ? gameTime + 0.15 : 0;
    if ((fl & 8) && !e.wasRl) { e.reloadStartT = gameTime; const W = WEAPONS[w]; if (W && !W.shellReload && !W.melee) reloadSfx(W, distVol(e.pos) * 0.5); } e.wasRl = !!(fl & 8);
    e.buf.push({ t: now, x, y, z, yaw, crouch: crouchAmount(crouch) });
    if (e.buf.length > 30) e.buf.shift();
  }
}
const entOf = (id) => (online ? online.ents.get(id) : null);
function remoteMuzzle(e) { return center(e, 1.3).add(new V3(Math.sin(e.yaw) * 1.0, -0.25, Math.cos(e.yaw) * 1.0)); }
const NET_SHOOTER = { sh: 1, ml: 1, dl: 2, el: 2, cl: 1, rk: 2, sk: 2 }; // índice do id de quem disparou em cada evento
function netEvent(ev) {
  const o = online, k = ev[0];
  { const si = NET_SHOOTER[k]; const se = si && entOf(ev[si]); if (se && se.model) setExpression(se.model, 'angry', 0.5); } // cara de brava de quem atirou/golpeou
  if (INV_EVENTS.has(k)) { invEvent(ev); return; } // Invasão
  if (k === 'sh') {
    const [, sid, w, , ends] = ev; if (sid === o.myId) return; const e = entOf(sid); if (!e) return; const W = WEAPONS[w];
    const vol = distVol(e.pos) * 0.7; sfx[W.key](vol); if (W.pump) sfx.pump(vol * 0.7, 0.3); if (W.bolt) sfx.bolt(vol * 0.7, 0.3);
    e.invulnUntil = 0; const mz = remoteMuzzle(e); if (W.spin) e.mgShotT = gameTime;
    ends.slice(0, 4).forEach(([x, y, z, hit]) => { const end = new V3(x, y, z); tracer(mz, end, !!W.beam); puff(end, hit ? 0xff9fb0 : 0xffffff); });
    const hs = ev[5] || []; for (const q of hs) bulletHole({ p: { x: q[0], y: q[1], z: q[2] }, n: { x: q[3], y: q[4], z: q[5] }, out: !!q[6] }, true); // furos da bala que atravessou parede
    if (hs.length) sfx.wallPen(vol);
  } else if (k === 'h') {
    const [, tid, aid, hp, head] = ev; const t = entOf(tid), a = entOf(aid); if (!t) return;
    const prevHp = t.hp; t.hp = hp; t.flashUntil = gameTime + 0.12; t.lastAttacker = a || null;
    if (t === player) { hurtFlash(); if (hp > 0 && (ev[5] ?? prevHp - hp) > 0) noteHit(ev.length > 7 ? ev[7] : a && a !== player && !a.fog ? a.pos : null); sfx.oink(0.8, 1.15); } else if (Math.random() < 0.3) sfx.oink(distVol(t.pos) * 0.6, 1.3);
    if (aid === o.myId && t !== player) { if (hp > 0) feedbackHit({ head: !!head, wall: !!((ev[6] || 0) & 1) }); sfx.hit(); if (training()) dmgPopup(t, ev[5] ?? Math.max(0, prevHp - hp), !!head); }
  } else if (k === 'ml') { // golpe de faca de alguém: animação + som (o dano vem nos eventos 'h'/'k')
    const [, id, kind, hit] = ev; const e = entOf(id); if (!e) return; const kn = MELEE_KINDS[kind] || 'slash';
    if (e === player) { if (hit) sfx.knifeHit(1); return; }
    e.swingT = 0; e.swingKind = kn; e.invulnUntil = 0; sfx.knife(distVol(e.pos) * 0.8, kn); if (hit) sfx.knifeHit(distVol(e.pos) * 0.7);
  } else if (k === 'dn') {
    const e = entOf(ev[1]); if (!e || e === player || !e.model) return;
    if (e.emote) { resetVictoryPose(e.model); setWeapon(e, e.weapon); }
    e.emote = danceId(ev[2]); e.emoteT = 0;
  } else if (k === 'k') {
    // ev[7] (servidor novo): 1 = faca, 2 = faca pelas costas. ev[3] vem como pistola pra clientes antigos.
    // ev[8] (servidor novo): killstreak 'p' míssil, 'h' Gavião, 'x' nuke. Gavião e nuke não contam pra sequência (Gavião vale 25 pts).
    const [, aid, tid, w0, head, aK, tD, mk, ks, fx = 0] = ev; const a = entOf(aid), t = entOf(tid); if (!t) return; const w = mk === 3 ? W_BOMB : mk ? KNIFE : w0, back = mk === 2; // ev[9]: 1 pela parede, 2 collateral; mk 3 = botijão
    if (t.zt) { // Invasão: zumbi caiu (sem bacon; feed só pro chefão)
      if (a) a.kills = aK; t.alive = false; t.hp = 0; t.deathAt = gameTime; t.respawnAt = Infinity; sfx.die(distVol(t.pos) * 0.7);
      if (t.zt === 'boss') addKillFeed(a, t, w, head, back);
      if (a === player) { sfx.kill(); if (ks !== 'h' && ks !== 'x' && ks !== 'a') { notePlayerKill(t, !!head); if (w >= 0 && w < WEAPONS.length) noteWeaponKill(player, w); } }
      return;
    }
    if (a) a.kills = aK; t.deaths = tD; t.mgSpinOn = false; t.alive = false; t.hp = 0; t.deathAt = gameTime; t.respawnAt = gameTime + RESPAWN_TIME; t.lastAttacker = a || null; t.killW = w; t.killBack = back;
    if (w === -2) { t.fxDeath = t.deathAt; return; } // trocou de time (sem bacon)
    addKillFeed(a, t, w, head, back, ks === 'fog' ? 'Névoa Assombrada' : KS_KILL_NAME[ks] || null, fx); sfx.die(t === player ? 1 : distVol(t.pos));
    if (a === player && t !== player) { sfx.kill(); if (ks === 'h' || ks === 'x' || ks === 'g' || ks === 'a') { if (ks === 'h' || ks === 'g') feedbackAward(HELI.points); } else { notePlayerKill(t, !!head, fx); if (w >= 0) noteWeaponKill(player, w); } }
    if (t === player) { const swap = pauseSwapQuiet(); if (!swap && a && a !== player) revengeName = a.name; onPlayerDeath(swap ? { keepAim: true } : undefined); if (!swap) showStamp(w); player.charging = false; arcLine.visible = arcMark.visible = false; }
  } else if (k === 'sp') {
    const [, id, pos, yaw, prim, sq] = ev; const e = entOf(id); if (!e) return;
    e.pos.set(pos[0], pos[1], pos[2]); e.vel.set(0, 0, 0); e.crouch = 0; e.hp = 100; e.alive = true; e.invulnUntil = gameTime + INVULN; resetRegen(e);
    e.primary = prim; e.secondary = e.secondary ?? PISTOL; e.melee = e.melee ?? KNIFE; e.slots = [prim, e.secondary, e.melee]; e.mag = WEAPONS.map((x) => x.mag); e.reserve = WEAPONS.map((x) => x.reserve); e.reloadEnd = 0; e.switchEnd = 0; e.nades = NADE.spawnWith; e.smokeNades = clientPower('smoke') ? 1 : 0; e.stunNades = clientPower('stun') ? SHOCK.spawnWith : 0; e.stunUntil = 0; e.mgSpin = 0; e.mgHeat = 0; e.mgHot = false; e.mgWant = false; e.mgFiring = false; e.mgSpinOn = false; setWeapon(e, prim);
    if (e === player) { keys.Space = false; eggSplatUntil = 0; player.sq = sq; player.yaw = yaw + Math.PI; player.pitch = 0; player.respawnAt = Infinity; player.nextPrimary = prim; const handLoad = clampLoadout(prim, selectedSecondary, selectedMelee, activeWeapons()); player.secondary = handLoad.secondary; player.melee = handLoad.melee; player.slots = [prim, player.secondary, player.melee]; player.onGround = true; $('stamp').classList.remove('show'); const hand = pauseSwapWeapon >= 0 && player.slots.includes(pauseSwapWeapon) ? pauseSwapWeapon : spawnHold === 'melee' ? player.melee : spawnHold === 'secondary' ? player.secondary : prim; if (player.slots.includes(hand)) setWeapon(player, hand); $('teamPick').classList.add('hidden'); onPlayerRespawn(); if (pauseSwapQuiet()) { flashMsg('Nasceu de novo com o equipamento novo'); pauseSwapWeapon = -1; pauseSwapUntil = performance.now() + 800; if (state === 'paused') resume(); } }
    else { e.yaw = yaw; e.model.group.visible = true; e.model.group.scale.set(1, 1, 1); e.buf = [{ t: performance.now() / 1000 - INTERP_DELAY, x: pos[0], y: pos[1], z: pos[2], yaw }]; }
  } else if (k === 'pk') { const p = pickups[ev[1]]; if (p) { p.active = !!ev[2]; p.mesh.visible = p.active; } }
  else if (k === 'sk') { const [, pid, oid, op, vel] = ev; const owner = entOf(oid); spawnShock({ net: true, pid, owner, pos: a3v(op), vel: a3v(vel) }); if (oid !== o.myId && owner) sfx.toss(distVol(owner.pos)); } // pau de choque lançado
  else if (k === 'sx') { const s = shocks.find((x) => x.pid === ev[1]); if (s) { s.wait = false; stickShock(s, { x: ev[2][0], y: ev[2][1], z: ev[2][2] }, { x: ev[3][0], y: ev[3][1], z: ev[3][2] }); } } // fincou (posição do servidor)
  else if (k === 'sz') { const s = shocks.find((x) => x.pid === ev[1]); const v = (ev[2] || []).map(entOf).filter(Boolean); if (s && s.stuck) shockPulseFx(s, v); else for (const t of v) t.stunUntil = Math.max(t.stunUntil || 0, gameTime + shockStun(t)); } // pulso (o dano vem nos 'h')
  else if (k === 'se') { const i = shocks.findIndex((x) => x.pid === ev[1]); if (i >= 0) removeShock(i); }
  else if (k === 'nd') {
    const [, pid, oid, op, vel, pk] = ev; const mesh = pk ? makePokeball() : makeCup(1.15); scene.add(mesh); const owner = entOf(oid);
    grenades.push({ net: true, poke: !!pk, pid, owner, pos: a3v(op), vel: a3v(vel), explodeAt: gameTime + (pk ? POKE.fuse : NADE.fuse), mesh, spin: new V3(rand(-8, 8), rand(-4, 4), rand(-8, 8)), lastBounce: 0 });
    if (oid !== o.myId && owner) { sfx.toss(distVol(owner.pos)); if (!pk) playGrenadeVoice('granada', nadeEarVol(owner.pos, 60), 0.3); } // Pokébola (pk) não tem a voz
  } else if (k === 'pke') { // Pokébola abriu (o servidor já matou quem foi engolido)
    const [, pid, pos, ids] = ev; const i = grenades.findIndex((x) => x.pid === pid); if (i >= 0) { scene.remove(grenades[i].mesh); grenades.splice(i, 1); }
    pokeOpenFx(a3v(pos), ids.map((id) => entOf(id)).filter(Boolean));
  } else if (k === 'dl') { // disco de alguém: voa aqui com a mesma conta; o servidor corrige em cada quique
    const [, pid, oid, pos, dir] = ev; spawnDiscFx({ net: true, pid, owner: entOf(oid), pos: a3v(pos), dir: a3v(dir), bounces: 0, t: 0 });
    if (oid !== o.myId) sfx.disco(distVol(a3v(pos)));
  } else if (k === 'db') { const d = discs.find((x) => x.pid === ev[1]); if (d) { d.pos.copy(a3v(ev[2])); d.dir.copy(a3v(ev[3])); d.bounces = ev[4]; } }
  else if (k === 'dx') { const i = discs.findIndex((x) => x.pid === ev[1]); if (i >= 0) removeDisc(i, a3v(ev[2]), !!ev[3]); }
  else if (k === 'el') { // ovo de alguém (estilingue é quase mudo: só ouve quem está perto)
    const [, pid, oid, pos, vel, kk] = ev; spawnEggFx({ net: true, pid, owner: entOf(oid), pos: a3v(pos), vel: a3v(vel), k: kk || 0, t: 0 });
    if (oid !== o.myId) sfx.estilingue(distVol(a3v(pos)) * 0.2);
  } else if (k === 'ex') { // ovo quebrou: [, pid, pos, acertou, normal|0]
    const i = eggs.findIndex((x) => x.pid === ev[1]); if (i >= 0) { scene.remove(eggs[i].mesh); eggs.splice(i, 1); }
    const at = a3v(ev[2]); eggBreakFx(at, !!ev[3]); if (!ev[3] && Array.isArray(ev[4])) eggStain(at, a3v(ev[4]));
  }
  else if (k === 'cl') { const [, oid, list] = ev; for (const [pid, pos, vel] of list || []) spawnCornFx({ net: true, pid, owner: entOf(oid), pos: a3v(pos), vel: a3v(vel), t: 0 }); } // grãos de alguém (o som veio no 'sh')
  else if (k === 'rk') {
    const [, pid, oid, pos, dir] = ev; const start = a3v(pos), d = a3v(dir);
    const mesh = makeRocket(1.5); scene.add(mesh); mesh.position.copy(start); mesh.lookAt(start.clone().add(d));
    rockets.push({ net: true, pid, owner: entOf(oid), pos: start, dir: d, mesh, born: gameTime, nextSmoke: 0 });
  } else if (k === 'bm' && ev[2] === 'c') { // pipoca do Lança-Milho (o servidor já deu o dano)
    const [, pid, , c] = ev; const i = pid ? corns.findIndex((x) => x.pid === pid) : -1; if (i >= 0) { scene.remove(corns[i].mesh); corns.splice(i, 1); }
    popFx(a3v(c));
  } else if (k === 'bm') {
    const [, pid, kind, c] = ev;
    const list = kind === 'n' ? grenades : rockets; const i = list.findIndex((x) => x.pid === pid && pid); if (i >= 0) { scene.remove(list[i].mesh); list.splice(i, 1); }
    if (kind === 'n') playGrenadeVoice('banana', nadeEarVol(a3v(c)), 0.25); // só o Copo Bomba (não míssil/foguete)
    blastFx(a3v(c), kind === 'n' ? NADE.radius : kind === 'p' ? PREDATOR.radius : WEAPONS[3].rocket.radius);
    if (kind === 'p') shake = Math.max(shake, 0.9);
  }
  else if (k === 'hl') netHeliSpawn(ev);
  else if (k === 'hh') { const h = netHelis.get(ev[1]); if (h) h.hp = ev[2]; }
  else if (k === 'hx') netHeliDown(ev[1], ev[2]);
  else if (k === 'mk') { if (ev[1] === o.myId) feedbackMedal('Collateral', `${ev[2]} de uma bala só`); } // várias mortes num tiro só (servidor)
  else if (k === 'gs') { const h = netHelis.get(ev[1]); if (h && h.owner !== player) { const from = h.pos.clone(); from.y -= 1.6; tracer(from, a3v(ev[2]), !!ev[3]); (ev[3] ? sfx.sniper : sfx.uzi)(distVol(h.pos) * 0.5); } } // tiro do Chopper de outro jogador
  else if (k === 'al') netAc130Spawn(ev);
  else if (k === 'ae') netAc130Down(ev[1]);
  else if (k === 'as') { const h = netGunships.get(ev[1]); if (h && h.owner !== player) { const from = h.pos.clone(); from.y -= 1.2; const end = a3v(ev[2]); const kind = ev[3] | 0; tracer(from, end, false); if (kind === 0) { puff(end, 0xfff6e0); sfx.uzi(distVol(h.pos) * 0.35); } else { puff(end, 0xffb15a); burst(end, kind === 2 ? AC130.caldeirao.radius : AC130.panela.radius); sfx.boom((kind === 2 ? 0.8 : 0.4) * distVol(end)); } } }
  else if (k === 'hs') { const h = netHelis.get(ev[1]); if (h) { const from = h.pos.clone(); from.y -= 0.4; tracer(from, a3v(ev[2]), false); sfx.rifle(distVol(h.pos) * 0.45); } }
  else if (k === 'nk') { const [, oid, at] = ev; if (oid !== o.myId) { netNukeAt = at; nukeRiderDone = false; const e = entOf(oid); flashMsg(`${e ? e.name : 'Alguém'} puxou o rádio · Fim da chapa`); showNukeCount(Math.max(1, Math.ceil(at - gameTime))); } }
  else if (k === 'nb') { netNukeAt = 0; nukeRiderDone = true; dropNukeRider(); if (!nukeAt) hideNuke(); sfx.boom(1); shake = Math.max(shake, 1.2); nukeFlash(); window.__nukeBooms = (window.__nukeBooms || 0) + 1; } else if (k === 'zc') {
    const [, team, s0, s1, nz, caps] = ev; teamScore = [s0, s1];
    for (const [id, c] of caps || []) { const e = entOf(id); if (e) e.caps = c; }
    onZoneCaptured(team, { x: nz[0], y: nz[1], z: nz[2] });
  } else if (k === 'tm') { const e = entOf(ev[1]); if (e) { applyTeam(e, ev[2]); if (e === player) refreshModeHud(); } }
  else if (k === 'bc') { // bacon comido (servidor): [, morto, quem comeu, vida nova]
    const [, did, eid, hp] = ev; const d = entOf(did), e = entOf(eid);
    if (e && hp != null) e.hp = hp; baconEaten(d && d.bacon && d.bacon.on ? d.bacon : null, e);
  }
  else if (k === 'mgs') { const e = entOf(ev[1]); if (e && e !== player) { const was = e.mgSpinOn; e.mgSpinOn = !!ev[2]; if (e.mgSpinOn && !was) sfx.mgStart(distVol(e.pos) * 0.6); else if (!e.mgSpinOn && was) sfx.mgStop(distVol(e.pos) * 0.5); } } // minigun de outro jogador embalando/parando
  else if (k === 'bb') { if (bombS) onBombEvent(ev.slice(1)); } // Modo Bomba (servidor novo)
  else if (k === 'swg') {
    const e = entOf(ev[1]); if (!e || e === player) return;
    e.swingT = 0; e.invulnUntil = 0; saberSfx.swing(ev[2] === 2 ? 1.25 : 1);
  } else if (k === 'sdp') {
    const e = entOf(ev[1]); if (!e || e === player) return;
    e.swingT = 0; saberSfx.dash();
  } else if (k === 'ssp') {
    const e = entOf(ev[1]); if (!e) return;
    e.saberSpinUntil = gameTime + (Number(ev[2]) || 0.48); if (e !== player) saberSfx.spin();
  } else if (k === 'sbb') {
    const e = entOf(ev[1]); if (!e) return;
    e.saberBlocking = !!ev[2]; if (e.saber) e.saber.blocking = !!ev[2];
  } else if (k === 'sbl') {
    const owner = entOf(ev[2]); if (!owner || blades.some((b) => b.pid === ev[1])) return;
    spawnBladeLocal(owner, a3v(ev[3]), { x: ev[4][0], z: ev[4][2] }, SABER_KIT.single.throw);
    blades[blades.length - 1].net = true; blades[blades.length - 1].pid = ev[1];
  } else if (k === 'sbr') {
    const b = blades.find((x) => x.pid === ev[1]); if (!b) return;
    b.phase = 'back'; if (ev[2]) b.pos.copy(a3v(ev[2]));
  } else if (k === 'sbx') {
    const i = blades.findIndex((x) => x.pid === ev[1]); if (i >= 0) endBladeLocal(i, !!ev[2]);
  } else if (k === 'srd') {
    const list = ev[1] === 'r' ? rockets : ev[1] === 'd' ? discs : ev[1] === 'e' ? eggs : corns;
    const proj = list.find((x) => x.pid === ev[2]); if (!proj) return;
    if (ev[4]) proj.pos.copy(a3v(ev[4]));
    const nd = a3v(ev[5]);
    if (proj.dir && proj.dir.copy) proj.dir.copy(nd);
    if (proj.vel) proj.vel.copy(nd).multiplyScalar(Math.max(0.01, proj.vel.length() || 16));
    if (ev[6]) proj.owner = entOf(ev[3]);
    if (proj.mesh && proj.mesh.lookAt) proj.mesh.lookAt(proj.pos.clone().add(nd));
  } else if (k === 'spr') {
    const at = a3v(ev[3]); saberSparks(at, ev[2] === 2 ? 16 : 8);
    if (ev[2] === 2) saberSfx.parry(true); else if (ev[2] === 3) saberSfx.spinHit(); else saberSfx.clash();
  } else if (k === 'j') { remoteEnt(ev[1]); }
  else if (k === 'l') { removeEnt(ev[1]); }
}
function personalEvent(ev) {
  const p = player; if (!p) return;
  if (ev[0] === 'pos') { p.pos.set(ev[1][0], ev[1][1], ev[1][2]); p.vel.set(0, 0, 0); }
  else if (ev[0] === 'pxw') { pauseSwapLast = performance.now() - (PX_COOLDOWN - (ev[1] | 0)) * 1000; flashMsg(`Espera ${ev[1]} s pra trocar de arma de novo`); } // servidor recusou a troca que derruba
  else if (ev[0] === 'inv') invSetInv(ev[1] || []); // Invasão: inventário de poderes
  else if (ev[0] === 'pkb') { const had = p.pokeballs || 0; p.pokeballs = ev[1]; if (ev[1] > had) { flashMsg(`Pokébola na mão (${ev[1]}) · Q joga`); sfx.pickup(); } }
  else if (ev[0] === 'mgn') grantMinigun(p); // servidor deu a minigun (código no chat)
  else if (ev[0] === 'kn') { const [x, y, z] = ev[1]; p.vel.x += x; p.vel.z += z; p.vel.y = Math.max(p.vel.y, y); p.onGround = false; lastKnock = gameTime; }
  else if (ev[0] === 'egg') { if (p.alive) eggSplat(Number(ev[1]) || EGG.splat); } // levou ovada: tela suja (evento pessoal do servidor)
  else if (ev[0] === 'skn') p.stunNades = ev[1] | 0; // servidor confirma as cargas do pau de choque
  else if (ev[0] === 'ndn') p.nades = ev[1] | 0; // servidor recusou o copo (choque): devolve a contagem
  else if (ev[0] === 'got') {
    const [, type, hp, nades] = ev; sfx.pickup(); p.hp = hp; p.nades = nades; if (type === 'ammo') refillAmmo(p); if (ev[4] != null) p.stunNades = ev[4];
    flashMsg(type === 'health' ? '+50 de vida' : type === 'grenade' ? `+1 Copo Bomba (${p.nades}/${NADE.max})${clientPower('stun') ? ` · Pau de choque ${p.stunNades || 0}/${SHOCK.max}` : ''}` : p.primary === 3 ? `Munição! +${invMode() ? INV_AMMO.rockets : 1} foguete${invMode() ? 's' : ''} (${p.reserve[3]}/${invMode() ? Math.ceil(WEAPONS[3].reserve * INV_AMMO.reserveMul) : WEAPONS[3].reserve})` : 'Munição cheia!');
  }
}
function onlineEnd(m) {
  dropNukeRider(); // o fim online já veio do servidor; só tira o docão se o 'nb' não tiver passado
  const o = online; stopInspect(true); stopEmote(); // a mira com zoom continua na câmera lenta
  if (state === 'over' || !player) return;
  o.endMsg = m; beginMatchEnding();
  for (const [id, , k, d] of m.board) { const e = entOf(id); if (e) { e.kills = k; e.deaths = d; } }
  for (const r of m.board) { const e = entOf(r[0]); if (e && r[6] != null) e.caps = r[6]; }
  const w = m.board[0];
  invClosePick();
  if (isInvasion(m.mode)) { $('winner').dataset.tone = m.inv && m.inv.won ? 'won' : 'lost'; $('winner').textContent = invEndText(); }
  else if (m.mode === 'dom' || m.mode === 'bomb') { teamScore = m.ts || teamScore; setTeamWinner(m.winTeam ?? -1); }
  else $('winner').textContent = w && w[0] === o.myId ? 'Você venceu! 🏆' : `${w ? w[1] : '???'} venceu!`;
  const rows = entities.filter((e) => !e.zt).sort((a, b) => scoreOf(b) - scoreOf(a) || a.deaths - b.deaths);
  const teamGame = m.mode === 'dom' || m.mode === 'bomb', winTeam = m.winTeam ?? -1;
  const tied = !isInvasion(m.mode) && !teamGame && m.board.length > 1 && m.board[0][2] === m.board[1][2] && m.board[0][3] === m.board[1][3];
  if (tied) $('winner').textContent = 'Empate!';
  const outcome = isInvasion(m.mode) ? (m.inv && m.inv.won ? 'win' : 'loss') : teamGame ? (winTeam < 0 ? 'draw' : player.team === winTeam ? 'win' : 'loss') : tied ? 'draw' : w && w[0] === o.myId ? 'win' : 'loss';
  matchEnding.dance = outcome === 'win' && playerWonMatch({ mode: m.mode, rows, teamW: winTeam, invWon: m.inv && m.inv.won });
  $('finalboard').innerHTML = boardHtml();
  $('overMap').innerHTML = `Mapa: <b>${escapeHtml(getMap(m.map).name)}</b> · próximo: <b>${escapeHtml(getMap(m.next).name)}</b>`;
  $('overChat').classList.remove('hidden');
  renderLobby();
  presentMatchResult(outcome);
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
$('nextMapBtn').onclick = () => (online ? online.net.send({ t: 'start', map: online.endMsg ? online.endMsg.next : 'random' }) : startGame(nextOfflineMap()));
function placeSocialHud() {
  const kf = $('killfeed'); if (!kf) return;
  if (!document.body.classList.contains('dead')) { kf.style.top = ''; return; }
  const tl = $('tl'); kf.style.top = Math.round((tl ? tl.getBoundingClientRect().bottom : 72) + 8) + 'px';
}
function paintVoiceMarks() {
  document.querySelectorAll('[data-pid]').forEach((el) => {
    const id = +el.dataset.pid; if (!id) return;
    el.classList.toggle('talking', voiceTalking(id));
    el.classList.toggle('vmuted', voiceMuted(id));
  });
}
initChat({
  send: (m) => { if (online && online.net) online.net.send(m); else if (m && m.t === 'say' && state === 'playing' && !invMode()) { if (isPokeCode(m.text)) grantPokeball(); if (isMiniCode(m.text)) grantMinigun(); } }, // offline: o chat só serve pros códigos (pokebola, minigun)
  teamMode: () => socialTeam(),
  me: () => {
    if (!online) return player ? { id: 0, name: player.name, team: -1, dead: !player.alive } : null;
    const id = online.myId;
    const row = online.lobby && online.lobby.players.find((p) => p.id === id);
    return { id, name: (player && player.name) || (row && row.name) || 'Você', team: player ? player.team : (row ? row.team : -1), dead: !!(state === 'playing' && player && !player.alive) };
  },
  shouldLock: () => state === 'playing' && !!player && player.alive && $('pause').classList.contains('hidden') && $('teamPick').classList.contains('hidden'),
  lockPointer,
  clearKeys: () => { for (const k in keys) keys[k] = false; mouseDown = false; rightDown = false; if (player) player.charging = false; },
});
initVoice({
  send: (m) => { if (online && online.net) online.net.send(m); },
  teamMode: () => socialTeam(),
  myId: () => (online && online.myId) || 0,
  onChange: paintVoiceMarks,
});
$('lb').addEventListener('click', (ev) => {
  const row = ev.target.closest('[data-pid]'); if (!row || !online) return;
  const id = +row.dataset.pid; if (!id || id === online.myId) return;
  voiceToggleMute(id); paintVoiceMarks();
});
$('lobbyPlayers').addEventListener('click', (ev) => {
  const row = ev.target.closest('tr[data-pid]'); if (!row || !online) return;
  const id = +row.dataset.pid; if (!id || id === online.myId) return;
  voiceToggleMute(id); paintVoiceMarks();
});
document.querySelectorAll('.invite').forEach(bindInvite);
// link ?sala=ABCD entra direto
{ const sala = new URLSearchParams(location.search).get('sala'); if (sala) joinRoom(sala); }

// ============================================================
//  Modo Bomba (PROTÓTIPO) — "Planta o Botijão". Regras em shared/bomb.js (iguais no servidor).
//  Offline: este cliente roda stepBomb e aplica explosão/renascimento. Online: o servidor manda o estado no snapshot ('b')
//  e os eventos 'bb'; aqui só desenha (sites, botijão, bipe, HUD, faixas e kill feed).
// ============================================================
const PLANT_PHRASES = [(a, s) => `${a} plantou o botijão no ${s}!`, (a, s) => `${a} abriu o gás no ${s}!`, (a, s) => `${a} deixou o churrasco armado no ${s}!`, (a, s) => `${a} acendeu a churrasqueira no ${s}!`];
const DEFUSE_PHRASES = [(a) => `${a} desarmou o botijão!`, (a) => `${a} fechou o registro do gás!`, (a) => `${a} salvou o churrasco!`, (a) => `${a} apagou o carvão a tempo!`];
const BOOM_PHRASES = [(t) => `${t} virou churrasco no botijão`, (t) => `${t} foi assado no gás`, (t) => `${t} voou com a explosão do botijão`, (t) => `${t} virou torresmo no estouro`];
const bombGfx = { sites: [], bomb: null, back: null, beepAt: 0, ledT: 0, fire: null, bannerT: 0, tickAt: 0 };
const byBid = (id) => (id ? entities.find((e) => e.id === id) : null);
const isBomb = () => mode === 'bomb' && !!bombS && !!bombL;
function bombLock(p) { return isBomb() && !!p && (bombFrozen(bombS) || (p.useHold && bombCanUse(bombS, p, bombL.sites))); }
function setupBomb(layout, S) {
  clearBombGfx(); bombL = layout; bombS = S; teamScore = S.score;
  bombGfx.sites = layout.sites.map((s) => { const g = makeSiteMark(s.name); g.position.set(s.x, s.y, s.z); scene.add(g); return g; });
  bombGfx.bomb = makeBotijao(1.3); bombGfx.bomb.visible = false; scene.add(bombGfx.bomb);
  bombGfx.back = makeBotijao(0.55); bombGfx.back.visible = false; scene.add(bombGfx.back);
}
function clearBombGfx() {
  for (const g of bombGfx.sites) scene.remove(g); bombGfx.sites = [];
  for (const k of ['bomb', 'back']) if (bombGfx[k]) { scene.remove(bombGfx[k]); bombGfx[k] = null; }
  if (bombGfx.fire) { scene.remove(bombGfx.fire.mesh); bombGfx.fire = null; }
  for (const id of ['bombhud', 'bProg', 'bombBanner', 'siteMark0', 'siteMark1', 'bombMark']) { const el = $(id); if (el) el.classList.add('hidden'); }
  $('timer').style.color = '';
}
// Bomba: painel compacto de troca de arma na preparação de cada rodada (miniaturas das armas). Vale na hora (online o
// servidor só aceita na preparação). Fecha sozinho no VALENDO; B fecha/abre. Não solta o mouse (G solta, se quiser clicar).
let bombPick = false;
function bLoadTile(i, key, on, pick) {
  const w = WEAPONS[i], b = document.createElement('button'); b.className = 'bltile' + (on ? ' on' : ''); b.dataset.w = i;
  b.innerHTML = `${key ? `<i>${key}</i>` : ''}<span>${escapeHtml(w.chip || w.short || w.name)}</span>`; b.title = w.name;
  if (weaponThumbs[i]) b.style.backgroundImage = `url("${weaponThumbs[i]}")`;
  b.onclick = (ev) => { ev.stopPropagation(); pick(i); }; return b;
}
function renderBLoad() {
  const pr = $('bLoadPri'), se = $('bLoadSec'), me = $('bLoadMel'); pr.innerHTML = se.innerHTML = me.innerHTML = '';
  pool(PRIMARIES).forEach((i, k) => pr.appendChild(bLoadTile(i, k < 9 ? String(k + 1) : '', i === selectedPrimary, setPrimary)));
  pool(SECONDARIES).forEach((i) => se.appendChild(bLoadTile(i, i === selectedSecondary ? 'N' : '', i === selectedSecondary, setSecondary)));
  pool(MELEES).forEach((i) => me.appendChild(bLoadTile(i, i === selectedMelee ? 'M' : '', i === selectedMelee, setMelee)));
}
function openBombPick() {
  if (!player || !isBomb() || !bombFrozen(bombS)) return;
  bombPick = true; document.body.classList.add('bombpick'); renderBLoad(); $('bLoad').classList.remove('hidden');
  window.__bombPicks = (window.__bombPicks || 0) + 1;
}
function closeBombPick() {
  if (!bombPick) return; bombPick = false; document.body.classList.remove('bombpick'); $('bLoad').classList.add('hidden');
  if (state === 'playing' && player && player.alive && document.pointerLockElement !== canvas && deathUnlock) lockPointer();
}
function updateBLoad() {
  if (!bombPick) return; if (!isBomb() || !bombFrozen(bombS)) { closeBombPick(); return; }
  const left = Math.max(0, bombS.phaseEnd - gameTime); $('bLoadFill').style.width = (100 * left / BOMB.PREP).toFixed(1) + '%';
  $('bLoadT').textContent = `rodada começa em ${Math.ceil(left)} s`;
}
function bombEquipNow() {
  const p = player; if (!p || !p.alive) return;
  const old = p.slots.slice(); p.primary = p.nextPrimary = selectedPrimary; p.secondary = p.nextSecondary = selectedSecondary; p.melee = p.nextMelee = selectedMelee; p.slots = [p.primary, p.secondary, p.melee];
  for (const i of p.slots) if (!old.includes(i)) { p.mag[i] = WEAPONS[i].mag; p.reserve[i] = WEAPONS[i].reserve; }
  const w = old[0] !== p.primary ? p.primary : old[1] !== p.secondary ? p.secondary : old[2] !== p.melee ? p.melee : p.weapon;
  p.reloadEnd = 0; p.knifeMode = false; switchWeapon(p, w); if (p.weapon !== w) setWeapon(p, w);
}
//  Modo Invasão 🎃 (cliente): core offline, eventos (offline e do servidor), zumbis, decoração, névoa, HUD,
//  poderes (G usa · X troca) e painel de troca de arma nas pausas entre waves. Regras em shared/invasion.js.
// ============================================================
function invView() { return online ? invNet : inv ? coreView(inv) : null; }
function makeZombieEnt(type, name) {
  const st = ZOMBIES[type] || ZOMBIES.walker;
  const e = { name: name || st.name, isPlayer: false, zt: type, size: st.size, pos: new V3(), vel: new V3(), yaw: 0, pitch: 0, crouch: 0, onGround: true, hp: st.hp, maxHp: st.hp, alive: true,
    kills: 0, deaths: 0, invulnUntil: 0, weapon: KNIFE, primary: KNIFE, slots: [KNIFE], mag: WEAPONS.map(() => 0), reserve: WEAPONS.map(() => 0), reloadEnd: 0, nextFire: 0, switchEnd: 0,
    respawnAt: Infinity, deathAt: 0, fxDeath: 0, flashUntil: 0, nades: 0, stunUntil: 0, walk: 0, shirt: '#7d5228', team: 1, caps: 0, gunKills: WEAPONS.map(() => 0), lastAttacker: null };
  e.model = makeZombie(type); scene.add(e.model.group); return e;
}
// zumbi: só visual (offline o core move; online vem do servidor)
function updateZombie(z, dt) {
  const m = z.model;
  if (!z.alive) { if (dieZombie(m, z, gameTime)) m.group.visible = false; return; }
  if (z.remote) interpRemote(z);
  m.group.visible = true; z.stunned = z.stunUntil > gameTime;
  animateZombie(m, z, dt, gameTime, gameTime < z.flashUntil);
}
function killZombieLocal(t, a, wIdx, head, back) {
  t.alive = false; t.hp = 0; t.deaths++; t.deathAt = gameTime; t.respawnAt = Infinity; t.fxDeath = t.deathAt;
  if (a && a !== t && !a.zt) a.kills++;
  sfx.die(distVol(t.pos) * 0.7);
  if (a && a.isPlayer) { sfx.kill(); notePlayerKill(t, head); if (wIdx >= 0) noteWeaponKill(a, wIdx); }
  if (t.zt === 'boss') addKillFeed(a, t, wIdx, head, back);
  if (inv) inv.onZombieDeath(t, a);
}
// ---------- core offline ----------
function startInvasionOffline() {
  const fogSrc = { fog: true, name: 'Névoa Assombrada', zt: 'fog', isPlayer: false, pos: new V3(), kills: 0 }; // "atacante" da névoa (câmera de morte olha pro centro)
  inv = new InvasionCore({
    T: () => gameTime, P: PHYS, nav, size: currentMap.size,
    players: () => entities.filter((e) => e.isPlayer),
    spawnZombie(type, pos) { const z = makeZombieEnt(type); z.id = invZid++; z.pos.set(pos.x, pos.y, pos.z); z.yaw = Math.atan2(-pos.x, -pos.z); entities.push(z); return z; },
    removeZombie(z) { scene.remove(z.model.group); entities = entities.filter((x) => x !== z); },
    hurtPlayer(p, dmg, src) { if (!src) fogSrc.pos.set(inv.fog.cx, p.pos.y, inv.fog.cz); damage(p, dmg, src || fogSrc, src ? KNIFE : W_NADE, false); },
    hurtZombie(z, dmg, by, kind) { damage(z, dmg, by, W_NADE, false); },
    knock(e, v) { e.vel.x += v.x; e.vel.z += v.z; e.vel.y = Math.max(e.vel.y, v.y); e.onGround = false; if (e.isPlayer) lastKnock = gameTime; },
    heal(p, hp) { p.hp = Math.min(100, p.hp + hp); },
    revive(p, at) { p.reviveAt = at; p.respawnAt = gameTime; if (p.isPlayer && !p.alive) { respawn(p); if (state === 'playing') lockPointer(); } },
    invChanged(p) { if (p.isPlayer) invSetInv(p.inv.map((k) => POWER_KEYS.indexOf(k))); },
    giveAmmo(p) { return !!p.isPlayer && refillAmmo(p); }, // caixa que o zumbi solta
    emit(ev) { invEvent(ev); },
    aimOf(p) { const d = new V3(); camera.getWorldDirection(d); return { o: camera.position.clone(), d }; },
    over(won, wave) { setTimeout(() => endGame(), 1800); },
  });
  inv.start();
}
// ---------- eventos (core offline chama direto; online chegam no snapshot) ----------
const INV_EVENTS = new Set(['wv', 'za', 'zs', 'zx', 'zb', 'dp', 'dg', 'pw', 'pb']);
function invEvent(ev) {
  const k = ev[0], ent = (id) => (online ? entOf(id) : inv ? inv.zombies.find((z) => z.id === id) : null);
  const isMe = (id) => (online ? id === online.myId : !!player && id === player.id);
  if (k === 'wv') {
    const [, ph, w, x] = ev;
    if (ph === 0) invBanner('🎃 INVASÃO', `Prepare-se! A wave 1 começa em ${INV.PREP} s · troque de arma no painel (B)`);
    else if (ph === 1) { invBanner(`WAVE ${w}/${INV.WAVES}`, x ? '🎃 O DOCÃO ABÓBORA chegou!' : w === 1 ? 'Os zumbis estão vindo da névoa!' : 'A névoa está fechando…', !!x); sfx.incoming(0.9); invClosePick(); }
    else if (ph === 2) { invBanner(`WAVE ${w} LIMPA!`, `Pausa de ${INV.BREAK} s · B troca de arma`); sfx.pickup(); if (player && player.alive) invOpenPick(); }
    else if (ph === 3) invBanner(x ? 'VOCÊS SOBREVIVERAM! 🎃' : 'A HORDA VENCEU', x ? `Sobreviveram às ${INV.WAVES} waves` : `Sobreviveu até a wave ${w}`, true);
  } else if (k === 'za') { const z = ent(ev[1]); if (z) { z.atkT = gameTime; if (player && z.pos.distanceTo(player.pos) < 25) sfx.knife(distVol(z.pos) * 0.6, 'slash'); } }
  else if (k === 'zs') { const [, id, big, p, v] = ev; const m = makeSpitMesh(!!big); m.position.set(...p); scene.add(m); invGfx.projs.set(id, { m, pos: a3v(p), vel: a3v(v), born: gameTime, spit: true }); if (player) tone('sawtooth', big ? 160 : 320, big ? 90 : 140, 0.18, 0.12 * distVol(a3v(p))); }
  else if (k === 'zx') { const [, id, c, big] = ev; invKillProj(id); const at = a3v(c); invRing(at, big ? '#ff8a1a' : '#7dff4a', 0.2, big ? 3.6 : 1.8, 0.4); if (big) blastFx(at, 3.6); else { puff(at, 0x7dff4a); noise(0.2, 900, 0.3 * distVol(at), 'bandpass'); } }
  else if (k === 'zb') { const at = a3v(ev[2]); blastFx(at, ZOMBIES.tank.boom.radius); invRing(at, '#ff7a1a', 0.5, ZOMBIES.tank.boom.radius, 0.5); }
  else if (k === 'dp') { const [, id, ki, p] = ev; invAddDrop(id, DROP_KEYS[ki], p); }
  else if (k === 'dg') { const [, id, pid, ki] = ev; const d = invGfx.drops.get(id); if (d) { scene.remove(d.m); invGfx.drops.delete(id); }
    if (DROP_KEYS[ki] === 'ammo') { if (pid && isMe(pid)) { if (online && player) refillAmmo(player); sfx.pickup(); flashMsg('📦 Munição!'); } } // offline o core já encheu (giveAmmo); online o servidor enche e a gente espelha
    else if (pid && isMe(pid)) { sfx.pickup(); flashMsg(`${POWERS[POWER_KEYS[ki]].icon} ${POWERS[POWER_KEYS[ki]].name}! · ${KEYS.useLabel} usa`); }
    else if (pid) { const e = online ? entOf(pid) : null; if (e && POWER_KEYS[ki] === 'revive') flashMsg(`✨ ${e.name} pegou uma Ressurreição`); } }
  else if (k === 'pw') invPowerFx(ev);
  else if (k === 'pb') { const [, id, c] = ev; invKillProj(id); const at = a3v(c); blastFx(at, POWERS.pumpkin.radius); invRing(at, '#ff8a1a', 0.5, POWERS.pumpkin.radius, 0.45); }
}
function invKillProj(id) { const p = invGfx.projs.get(id); if (p) { scene.remove(p.m); invGfx.projs.delete(id); } }
function invRing(at, color, from, to, life, y = 0.12) { const r = makeRing(color, from, to, life); r.position.set(at.x, (at.y || 0) + y, at.z); scene.add(r); invGfx.rings.push(r); }
function invAddDrop(id, kind, p) { if (invGfx.drops.has(id)) return; const m = makeDropMesh(kind); m.position.set(p[0], p[1], p[2]); scene.add(m); invGfx.drops.set(id, { m, kind, born: gameTime }); }
function invPowerFx(ev) {
  const [, ki, uid, p, d] = ev, kind = POWER_KEYS[ki], at = a3v(p), me = online ? uid === online.myId : true, user = online ? entOf(uid) : player;
  const v = player ? distVol(at) : 1;
  if (kind === 'pumpkin') { const [, , , , , pid, o, vel] = ev; const m = makePowerPumpkin(); m.position.set(...o); scene.add(m); invGfx.projs.set(pid, { m, pos: a3v(o), vel: a3v(vel), born: gameTime, nade: true }); sfx.toss(v); }
  else if (kind === 'howl') { invRing(at, '#a8c8ff', 0.5, POWERS.howl.radius, 0.6, 1); invRing(at, '#ffffff', 0.3, POWERS.howl.radius * 0.7, 0.45, 0.3); tone('sawtooth', 260, 520, 0.35, 0.25 * v); tone('sawtooth', 520, 200, 0.9, 0.22 * v, 0.3); shake = Math.max(shake, me ? 0.4 : 0.15); }
  else if (kind === 'potion') { invRing(at, '#5aff8a', 0.4, POWERS.potion.radius, 0.7); for (let i = 0; i < 14; i++) puff(at.clone().add(new V3(rand(-2, 2), rand(0.3, 2), rand(-2, 2))), 0x7dff9a); tone('sine', 520, 1040, 0.3, 0.2 * v); }
  else if (kind === 'lantern') { tone('sine', 880, 1320, 0.5, 0.15 * v); }
  else if (kind === 'ghost') { tone('sine', 700, 300, 0.7, 0.15 * v); if (me) flashMsg('👻 Fantasma! Os zumbis não te veem'); }
  else if (kind === 'revive') { invRing(at, '#ffd24a', 0.5, 12, 1.0, 0.2); tone('triangle', 520, 1560, 0.8, 0.25); flashMsg(`✨ ${user ? user.name : 'Alguém'} usou a Ressurreição! (${ev[5] || 0} de volta)`); }
  if (me && kind !== 'revive' && kind !== 'ghost') flashMsg(`${POWERS[kind].icon} ${POWERS[kind].name}`);
}
// inventário do jogador local (índices em POWER_KEYS)
function invSetInv(list) { invGfx.inv = list.map((i) => POWER_KEYS[i]).filter(Boolean); if (invGfx.sel >= invGfx.inv.length) invGfx.sel = Math.max(0, invGfx.inv.length - 1); invRenderSlots(); }
function invRenderSlots() {
  const el = $('invSlots'); if (!el) return; let h = '';
  for (let i = 0; i < INV.INV_MAX; i++) { const k = invGfx.inv[i]; h += `<div class="islot${k ? ' on' : ''}${k && i === invGfx.sel ? ' sel' : ''}" title="${k ? escapeHtml(POWERS[k].name + ' · ' + POWERS[k].desc) : 'vazio'}">${k ? POWERS[k].icon : ''}<small>${k ? escapeHtml(POWERS[k].name) : ''}</small></div>`; }
  el.innerHTML = h;
}
function invUsePower() {
  if (!player || !player.alive || !invGfx.inv.length) { if (player && player.alive) flashMsg('Sem poder · pegue os que caem dos zumbis'); return; }
  const slot = invGfx.sel, d = new V3(); camera.getWorldDirection(d); const o = camera.position.clone();
  if (invGfx.inv[slot] === 'revive' && !entities.some((e) => !e.zt && !e.alive && e !== player)) { flashMsg('✨ Ninguém pra reviver agora · guarde a Ressurreição'); return; }
  if (online) netEv(['pw', slot, v3a(o), v3a(d)]); else inv.usePower(player, slot, { o, d });
}
function invCycle() { if (invGfx.inv.length > 1) { invGfx.sel = (invGfx.sel + 1) % invGfx.inv.length; invRenderSlots(); const k = invGfx.inv[invGfx.sel]; flashMsg(`${POWERS[k].icon} ${POWERS[k].name} selecionado`); } }
// ---------- decoração de Halloween + névoa (só no modo Invasão) ----------
function invApplyLook(on) {
  if (invGfx.hal) { scene.remove(invGfx.hal); invGfx.hal.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); invGfx.hal = null; }
  if (!invGfx.fog) { invGfx.fog = makeFogWall(); scene.add(invGfx.fog.group); }
  invGfx.fog.group.visible = false;
  for (const d of invGfx.drops.values()) scene.remove(d.m); invGfx.drops.clear(); for (const p of invGfx.projs.values()) scene.remove(p.m); invGfx.projs.clear(); for (const r of invGfx.rings) scene.remove(r); invGfx.rings.length = 0;
  for (const c of invGfx.cones.values()) c.parent && c.parent.remove(c); invGfx.cones.clear();
  if (!currentMap) return;
  if (on) { applyHalloweenPalette(scene, hemi, sun, currentMap); fpHemi.intensity = 1.2; invGfx.hal = buildHalloween(currentMap, nav, groundAt); scene.add(invGfx.hal); }
  else { applyPalette(scene, hemi, sun, currentMap); fpHemi.intensity = currentMap.palette.stars ? 1.25 : 1.8; }
  document.body.classList.toggle('invmode', !!on); invMusicOn(!!on);
  ['invhud', 'invPowers'].forEach((id) => $(id).classList.toggle('hidden', !on)); if (!on) document.body.classList.remove('invout', 'ghostfx'); if (!on) { $('invBoss').classList.add('hidden'); $('invOut').classList.add('hidden'); $('fogVeil').style.opacity = '0'; invClosePick(); }
  invGfx.inv = []; invGfx.sel = 0; invRenderSlots();
}
// ---------- por quadro ----------
function invTick(dt) {
  if (!invMode()) return;
  if (!online && inv && state === 'playing') inv.step(dt);
  const v = invView(); if (!v) return;
  if (invMusic && invMusic.on) { if (v.phase === 'over') invMusic.stop(3); else { invMusic.setLevel(v.phase === 'wave' ? (v.bossId || v.wave % INV.BOSS_EVERY === 0 ? 2 : 1) : 0); invMusic.tick(); } }
  if (invGfx.hal) invGfx.hal.userData.tick(gameTime);
  invGfx.fog.update(v.fog, gameTime, v.phase === 'wave' || v.phase === 'break');
  for (const d of invGfx.drops.values()) tickDrop(d.m, gameTime, d.born);
  for (const [id, p] of invGfx.projs) {
    if (p.nade) { for (let s = 0; s < 2; s++) PHYS.stepNade(p.pos, p.vel, dt / 2); p.m.rotation.x += dt * 6; }
    else { p.vel.y -= SPIT_GRAV * dt; p.pos.addScaledVector(p.vel, dt); }
    p.m.position.copy(p.pos); if (gameTime - p.born > 4.5) invKillProj(id);
  }
  for (let i = invGfx.rings.length - 1; i >= 0; i--) if (tickRing(invGfx.rings[i], dt)) { scene.remove(invGfx.rings[i]); invGfx.rings.splice(i, 1); }
  // lanterna: cone na frente de quem usou
  const lit = new Set();
  for (const [id, left] of v.lanterns) {
    if (left <= 0) continue; const e = online ? entOf(id) : player; if (!e || !e.alive) continue; lit.add(id);
    let c = invGfx.cones.get(id); if (!c) { c = makeLanternCone(); invGfx.cones.set(id, c); scene.add(c); }
    if (e === player) { c.position.copy(camera.position).add(new V3(0, -0.25, 0)); c.quaternion.copy(camera.quaternion); }
    else { c.position.set(e.pos.x, e.pos.y + 1.4, e.pos.z); c.rotation.set(-(e.pitch || 0), e.yaw + Math.PI, 0, 'YXZ'); }
    c.material.opacity = 0.12 + Math.sin(gameTime * 20) * 0.03;
  }
  for (const [id, c] of invGfx.cones) if (!lit.has(id)) { scene.remove(c); invGfx.cones.delete(id); }
  // fantasma: jogadores transparentes (outros) / tela azulada (você)
  const meId = online ? online.myId : player && player.id;
  for (const [id, s] of v.lives) { const e = online ? entOf(id) : null; if (e && e !== player && e.model && !!e.ghostLook !== s.ghost) { e.ghostLook = s.ghost; setGhostLook(e.model, s.ghost); } }
  const me = v.lives.get(meId) || null;
  if (player) player.ghostOn = !!(me && me.ghost);
  document.body.classList.toggle('ghostfx', !!(me && me.ghost && player && player.alive));
  invHud(v, me, dt);
}
let invBannerT = 0;
function invBanner(title, sub, big = false) { const b = $('invBanner'); b.innerHTML = `<b>${escapeHtml(title)}</b><span>${escapeHtml(sub || '')}</span>`; b.classList.remove('hidden'); b.classList.toggle('big', big); invBannerT = big ? 4 : 3; }
function invHud(v, me, dt) {
  if (invBannerT > 0) { invBannerT -= dt; if (invBannerT <= 0) $('invBanner').classList.add('hidden'); }
  const ph = v.phase;
  $('invWaveN').textContent = ph === 'prep' ? 'PREPARAÇÃO' : `WAVE ${Math.max(1, v.wave)}/${INV.WAVES}`;
  $('invWaveSub').textContent = ph === 'wave' ? `🧟 ${v.remaining} zumbi${v.remaining === 1 ? '' : 's'} restando` : ph === 'break' || ph === 'prep' ? `Próxima wave em ${Math.ceil(v.left)} s · B troca de arma` : ph === 'over' ? 'Fim' : '';
  $('timer').textContent = ph === 'wave' ? `🧟 ${v.remaining}` : ph === 'over' ? '—' : `${Math.ceil(v.left)} s`;
  // chefão
  const boss = v.bossId ? (online ? entOf(v.bossId) : inv && inv.zombies.find((z) => z.id === v.bossId)) : null;
  $('invBoss').classList.toggle('hidden', !(boss && boss.alive)); if (boss && boss.alive) $('invBossFill').style.width = (100 * Math.max(0, boss.hp) / (boss.maxHp || 1)).toFixed(1) + '%';
  // vidas
  if (me) $('invLives').innerHTML = `${'❤'.repeat(Math.max(0, me.lives))}<span class="lost">${'❤'.repeat(Math.max(0, INV.LIVES - me.lives))}</span>`;
  const out = !!(me && me.out && player && !player.alive);
  $('invOut').classList.toggle('hidden', !out); document.body.classList.toggle('invout', out); // sem vidas: some a tela de morte normal
  if (out) { const mates = entities.filter((e) => !e.zt && e !== player && e.alive); $('invOutTxt').textContent = mates.length ? `Assistindo ${mates[0].name} · um aliado pode te reviver com a ✨ Ressurreição` : 'Ninguém de pé…'; }
  // névoa: fora da área segura = tela roxa + seta pro centro
  let outside = false;
  if (player && player.alive && v.fog) {
    const dx = v.fog.cx - player.pos.x, dz = v.fog.cz - player.pos.z, d = Math.hypot(dx, dz); outside = d > v.fog.r;
    const arr = $('invFogArrow'); arr.classList.toggle('hidden', !outside);
    if (outside) { const ang = Math.atan2(dx, dz), rel = ang - (player.yaw + Math.PI); arr.querySelector('i').style.transform = `rotate(${-rel}rad)`; $('invFogDist').textContent = Math.ceil(d - v.fog.r) + ' m'; }
  } else $('invFogArrow').classList.add('hidden');
  $('fogVeil').style.opacity = outside ? (0.55 + Math.sin(gameTime * 4) * 0.1).toFixed(2) : '0';
  if (invPick) invUpdatePick(v);
}
// espectador (sem vidas): câmera atrás de um aliado vivo
function invSpectate() {
  if (!invMode() || !player || player.alive || !invMeOut()) return false;
  if (gameTime - player.deathAt < 2.5) return false;
  const mates = entities.filter((e) => !e.zt && e !== player && e.alive); const t = mates[0]; if (!t) return false;
  const back = new V3(-Math.sin(t.yaw), 0, -Math.cos(t.yaw)); const cam = t.pos.clone().addScaledVector(back, 4.5); cam.y += 3;
  camera.position.lerp(cam, 0.15); camera.lookAt(t.pos.x, t.pos.y + 1.4, t.pos.z); return true;
}
// ---------- painel de troca de arma (pausa entre waves; mesmo jeito do modo Bomba) ----------
let invPick = false;
function iLoadTile(i, key, on, pickFn) {
  const w = WEAPONS[i], b = document.createElement('button'); b.className = 'bltile' + (on ? ' on' : ''); b.dataset.w = i;
  b.innerHTML = `${key ? `<i>${key}</i>` : ''}<span>${escapeHtml(w.chip || w.short || w.name)}</span>`; b.title = w.name;
  if (weaponThumbs[i]) b.style.backgroundImage = `url("${weaponThumbs[i]}")`;
  b.onclick = (ev) => { ev.stopPropagation(); pickFn(i); }; return b;
}
function invRenderPick() {
  const pr = $('iLoadPri'), se = $('iLoadSec'), me = $('iLoadMel'); pr.innerHTML = se.innerHTML = me.innerHTML = '';
  pool(PRIMARIES).forEach((i, k) => pr.appendChild(iLoadTile(i, k < 9 ? String(k + 1) : '', i === selectedPrimary, (x) => invPickW(setPrimary, x))));
  pool(SECONDARIES).forEach((i) => se.appendChild(iLoadTile(i, i === selectedSecondary ? 'N' : '', i === selectedSecondary, (x) => invPickW(setSecondary, x))));
  pool(MELEES).forEach((i) => me.appendChild(iLoadTile(i, i === selectedMelee ? 'M' : '', i === selectedMelee, (x) => invPickW(setMelee, x))));
}
const invCanPick = () => { const v = invView(); return !!(invMode() && v && (v.phase === 'break' || v.phase === 'prep') && player && player.alive); };
function invPickW(fn, i) { fn(i); invEquipNow(); if (invPick) invRenderPick(); } // troca na hora (online o servidor também troca: 'pr' na pausa)
function invOpenPick(unlock = false) { if (!invCanPick()) return; if (unlock) { deathUnlock = true; if (document.pointerLockElement) document.exitPointerLock(); } invPick = true; document.body.classList.add('invpick'); invRenderPick(); $('iLoad').classList.remove('hidden'); window.__invPicks = (window.__invPicks || 0) + 1; }
function invClosePick() { if (!invPick) return; invPick = false; document.body.classList.remove('invpick'); $('iLoad').classList.add('hidden'); if (state === 'playing' && player && player.alive && document.pointerLockElement !== canvas && deathUnlock) lockPointer(); }
function invUpdatePick(v) { if (!invCanPick()) { invClosePick(); return; } const tot = v.phase === 'prep' ? INV.PREP : INV.BREAK; $('iLoadFill').style.width = (100 * v.left / tot).toFixed(1) + '%'; $('iLoadT').textContent = `wave ${v.wave + 1} em ${Math.ceil(v.left)} s`; }
function invEquipNow() {
  const p = player; if (!p || !p.alive) return;
  const old = p.slots.slice(); p.primary = p.nextPrimary = selectedPrimary; p.secondary = p.nextSecondary = selectedSecondary; p.melee = p.nextMelee = selectedMelee; p.slots = [p.primary, p.secondary, p.melee];
  for (const i of p.slots) if (!old.includes(i)) { p.mag[i] = WEAPONS[i].mag; p.reserve[i] = WEAPONS[i].reserve; }
  const w = old[0] !== p.primary ? p.primary : old[1] !== p.secondary ? p.secondary : old[2] !== p.melee ? p.melee : p.weapon;
  p.reloadEnd = 0; p.knifeMode = false; switchWeapon(p, w); if (p.weapon !== w) setWeapon(p, w);
}
// Bomba, rodada nova: a sequência e os streaks guardados continuam (trocar de rodada não é morrer), mas o que estava
// no ar acaba: o Gavião vai embora, e o míssil pilotado e o Fim da chapa ainda na contagem voltam pro banco (F de novo).
function bombRoundStreaks() {
  if (predator) { clearPredator(); bankStreak('missile'); }
  if (nukeAt > gameTime) { nukeAt = 0; radioWant = 0; hideNuke(); bankStreak('nuke'); }
  if (netNukeAt) { netNukeAt = 0; hideNuke(); }
  removeHeli(); clearStrikes();
}
function endBomb() { closeBombPick(); clearBombGfx(); bombS = null; bombL = null; }
function startBombOffline() {
  setupBomb(bombLayout(nav, SPAWNS, currentMap, groundAt), newBombState());
  return startRound(bombS, gameTime, entities); // rodada 1: os respawns logo depois já usam o lado certo
}
// offline: avança a rodada e aplica explosão / renascimento / fim
function updateBombOffline(dt) {
  if (!isBomb() || online) return;
  for (const ev of stepBomb(bombS, entities, gameTime, dt, bombL.sites)) applyBombEvOffline(ev);
}
function applyBombEvOffline(ev) {
  const k = ev[0];
  if (k === 'plant' || k === 'defuse') { const e = byBid(ev[1]); if (e) e.caps = (e.caps || 0) + 1; }
  if (k === 'boom') { const pl = byBid(ev[4]); for (const v of blastVictims(bombS, entities, { x: ev[1], y: ev[2], z: ev[3] })) kill(v, pl && pl !== v && !friends(pl, v) ? pl : null, W_BOMB, false, false, true); }
  if (k === 'round') { clearTacticals(); for (const n of grenades) scene.remove(n.mesh); grenades.length = 0; for (const r of rockets) scene.remove(r.mesh); rockets.length = 0; for (const e of entities) respawn(e); }
  onBombEvent(ev);
  if (k === 'over') endGame();
}
function addFeedLine(html, canon) {
  const div = document.createElement('div'); div.className = 'kf bomb'; div.innerHTML = html;
  { const L = (window.__feedLog ||= []); L.push(canon); if (L.length > 20) L.shift(); }
  const kf = $('killfeed'); kf.prepend(div); while (kf.children.length > 6) kf.lastChild.remove(); setTimeout(() => div.remove(), 6000);
}
function bombBanner(t1, t2, color = '#fff', dur = 3) {
  const b = $('bombBanner'); b.querySelector('.b1').textContent = t1; b.querySelector('.b1').style.color = color; b.querySelector('.b2').textContent = t2 || '';
  b.classList.remove('hidden'); b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; bombGfx.bannerT = dur;
  window.__bombBanners = (window.__bombBanners || []).concat([t1]).slice(-30);
}
// eventos da rodada (offline vêm do stepBomb; online do servidor como ['bb', ...])
function onBombEvent(ev) {
  const S = bombS; if (!S) return; const k = ev[0];
  const nm = (id) => { const e = byBid(id); return e ? `<b class="${e.isPlayer ? 'me' : ''}">${escapeHtml(e.name)}</b>` : '<b>???</b>'; };
  const raw = (id) => { const e = byBid(id); return e ? e.name : '???'; };
  const mySide = player ? sideOf(S, player.team) : -1;
  if (k === 'round') {
    bombRoundStreaks(); openBombPick();
    const meCarry = player && ev[3] === player.id;
    bombBanner(`Rodada ${ev[1]} · ${mySide === 0 ? 'ATAQUE' : mySide === 1 ? 'DEFESA' : ''}`, mySide === 0 ? `Leve o botijão até o A ou o B e segure ${BOMB.KEY_LABEL} por ${BOMB.PLANT} s pra plantar${meCarry ? ' · VOCÊ está com o botijão!' : ''}` : mySide === 1 ? `Impeça a plantação ou segure ${BOMB.KEY_LABEL} por ${BOMB.DEFUSE} s no botijão pra desarmar` : '', mySide >= 0 ? TEAM_COLORS[player.team] : '#fff', 5);
  } else if (k === 'swap') {
    bombBanner('Troca de lado!', `Agora o time ${TEAM_NAMES[attackTeam(S.round)]} ataca${mySide >= 0 ? ` · você está no ${SIDE_NAMES[mySide]}` : ''}`, '#ffd27a', 4);
  } else if (k === 'go') { closeBombPick(); flashMsg(mySide === 0 ? 'VALENDO! Leve o botijão até o A ou o B 🔥' : mySide === 1 ? 'VALENDO! Defenda o A e o B 🛡️' : 'VALENDO!'); sfx.pickup(); }
  else if (k === 'pick') addFeedLine(`${nm(ev[1])} pegou o botijão`, `${raw(ev[1])} pegou o botijão`);
  else if (k === 'drop') addFeedLine(`${nm(ev[1])} deixou o botijão cair!`, `${raw(ev[1])} deixou o botijão cair`);
  else if (k === 'plant') {
    const site = SITE_NAMES[ev[2]] || '?'; addFeedLine(pick(PLANT_PHRASES)(nm(ev[1]), site), `${raw(ev[1])} plantou o botijão no ${site}`);
    bombBanner('BOTIJÃO PLANTADO!', `Site ${site} · explode em ${BOMB.FUSE} s${mySide === 1 ? ` · segure ${BOMB.KEY_LABEL} perto dele pra desarmar` : ''}`, '#ff6b6b', 3);
    tone('square', 600, 900, 0.15, 0.25); tone('square', 900, 1300, 0.15, 0.25, 0.16); bombGfx.beepAt = gameTime + 0.4;
  } else if (k === 'defuse') {
    addFeedLine(pick(DEFUSE_PHRASES)(nm(ev[1])), `${raw(ev[1])} desarmou o botijão`);
    tone('sine', 1400, 300, 0.4, 0.3); noise(0.5, 3000, 0.25, 'highpass'); // psssss
  } else if (k === 'boom') bombBoomFx(new V3(ev[1], ev[2], ev[3]));
  else if (k === 'win') {
    const [, team, reason, s0, s1] = ev; if (online) { S.score = [s0, s1]; teamScore = S.score; }
    const side = sideOf(S, team), mine = player && player.team === team;
    const why = { boom: 'O botijão explodiu! 💥', defuse: 'O botijão foi desarmado 🧯', time: 'O tempo acabou sem plantar ⏱️' }[reason] || '';
    bombBanner(`${SIDE_NAMES[side]} venceu a rodada!`, `${why} · Vermelho ${s0} × ${s1} Azul${mine ? ' · boa, seu time!' : ''}`, TEAM_COLORS[team], BOMB.END - 0.3);
    (mine ? sfx.kill : sfx.die)(0.7);
  }
}
function bombBoomFx(c) {
  blastFx(c, 9); for (let i = 0; i < 4; i++) burst(c.clone().add(new V3(rand(-4, 4), rand(0, 2), rand(-4, 4))), 8);
  sfx.boom(1); setTimeout(() => sfx.boom(0.8), 120); noise(2.5, 200, 1.2, 'lowpass', 0.05);
  if (player) shake = Math.max(shake, clamp(1 - c.distanceTo(player.pos) / 60, 0.2, 1) * 1.4);
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85, depthWrite: false }));
  mesh.position.copy(c); scene.add(mesh); if (bombGfx.fire) scene.remove(bombGfx.fire.mesh); bombGfx.fire = { mesh, t: 0 };
  window.__bombBooms = (window.__bombBooms || 0) + 1;
}
// marcador na tela (ou seta na borda quando fora de vista), igual ao da zona da Dominação
function placeMark(mk, wp, color, text) {
  mk.classList.remove('hidden'); mk.querySelector('span').textContent = text; mk.style.color = color;
  const v = wp.clone().project(camera), behind = v.z > 1; let x = v.x, y = v.y; if (behind) { x = -x; y = -y; }
  const off = behind || Math.abs(x) > 0.92 || Math.abs(y) > 0.85;
  if (off) { const k = 0.9 / Math.max(Math.abs(x) / 0.92, Math.abs(y) / 0.85, 1e-3); x *= k; y *= k; if (behind && Math.abs(y) < 0.85) y = -0.8; }
  let px = (x + 1) / 2 * innerWidth, py = (1 - y) / 2 * innerHeight;
  if (off) { const r = $('tl').getBoundingClientRect(); if (px < r.right + 30 && py < r.bottom + 30) { if (Math.abs(y) < 0.85) py = r.bottom + 40; else px = r.right + 40; } }
  mk.style.left = px + 'px'; mk.style.top = py + 'px'; mk.dataset.off = off ? '1' : '0';
  mk.querySelector('.zarrow').style.transform = off ? `rotate(${Math.atan2(x, y)}rad)` : 'rotate(180deg)';
}
const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
function updateBombGfx(dt) {
  if (!isBomb() || state === 'menu') return;
  const S = bombS, G = bombGfx, me = player, mySide = me ? sideOf(S, me.team) : -1, atk = attackTeam(S.round);
  // sites no chão
  G.sites.forEach((g, i) => { const hot = S.planted && S.site === i, u = g.userData, c = hot ? 0xff4d4d : 0xffd27a;
    u.ring.material.color.setHex(c); u.colm.material.color.setHex(c); u.colm.material.opacity = hot ? 0.16 + Math.sin(gameTime * 10) * 0.06 : 0.08;
    u.sprite.position.y = 6.5 + Math.sin(gameTime * 2 + i) * 0.25; });
  // botijão no chão (caído ou plantado) e nas costas de quem carrega
  const showBomb = !!S.bomb && (S.planted || S.dropped || (S.phase === 'end' && S.reason === 'defuse'));
  G.bomb.visible = showBomb;
  if (showBomb) { G.bomb.position.set(S.bomb.x, S.bomb.y, S.bomb.z); if (S.dropped) G.bomb.rotation.y += dt * 1.5; }
  const c = S.carrier ? byBid(S.carrier) : null, onBack = !!(c && c.alive && c.model && c.model.group.visible && (S.phase === 'prep' || S.phase === 'live'));
  G.back.visible = onBack;
  if (onBack) { G.back.position.set(c.pos.x - Math.sin(c.yaw) * 0.42, c.pos.y + 0.55, c.pos.z - Math.cos(c.yaw) * 0.42); G.back.rotation.y = c.yaw; }
  // bipe: 1/s, depois 2/s (20 s), 4/s (10 s), 8/s (4 s) — a luz pisca junto
  const led = G.bomb.userData.led.material;
  if (S.phase === 'planted') {
    const rem = S.explodeAt - gameTime, iv = rem > 20 ? 1 : rem > 10 ? 0.5 : rem > 4 ? 0.25 : 0.12;
    if (gameTime >= G.beepAt) { G.beepAt = gameTime + iv; G.ledT = 0.07; const vol = me ? clamp(1 - G.bomb.position.distanceTo(me.pos) / 70, 0.18, 1) : 0.5; tone('square', rem > 4 ? 1900 : 2300, rem > 4 ? 1900 : 2300, 0.06, 0.22 * vol); window.__bombBeeps = (window.__bombBeeps || 0) + 1; }
  }
  G.ledT -= dt; led.color.setHex(G.ledT > 0 ? 0xff2020 : S.phase === 'planted' ? 0x661111 : 0x331111);
  if (G.fire) { const f = G.fire; f.t += dt; const k = f.t / 0.9; f.mesh.scale.setScalar(1 + k * BOMB.BLAST_R); f.mesh.material.opacity = Math.max(0, 0.85 * (1 - k)); if (k >= 1) { scene.remove(f.mesh); G.fire = null; } }
  // faixa central
  if (G.bannerT > 0) { G.bannerT -= dt; if (G.bannerT <= 0) $('bombBanner').classList.add('hidden'); }
  // HUD: placar (Ataque × Defesa), tempo, quem carrega, seu lado
  const sa = $('bScore').querySelector('.ba'), sd = $('bScore').querySelector('.bd');
  sa.style.color = TEAM_COLORS[atk]; sd.style.color = TEAM_COLORS[1 - atk];
  sa.firstChild.textContent = `ATAQUE · ${TEAM_NAMES[atk].toUpperCase()} `; sd.lastChild.textContent = ` DEFESA · ${TEAM_NAMES[1 - atk].toUpperCase()}`;
  $('bs0').textContent = S.score[atk]; $('bs1').textContent = S.score[1 - atk];
  let tt = '';
  if (S.phase === 'prep') tt = `Preparação ${Math.ceil(Math.max(0, S.phaseEnd - gameTime))}`;
  else if (S.phase === 'live') tt = fmtT(Math.max(0, S.phaseEnd - gameTime));
  else if (S.phase === 'planted') tt = `💣 ${Math.max(0, S.explodeAt - gameTime).toFixed(1)} s`;
  else if (S.phase === 'end') tt = S.over ? 'Fim de jogo!' : `Próxima rodada em ${Math.ceil(Math.max(0, S.phaseEnd - gameTime))}`;
  else tt = 'Fim de jogo!';
  $('timer').textContent = tt; $('timer').style.color = S.phase === 'planted' ? '#ff4d4d' : S.phase === 'prep' ? '#ffd27a' : '';
  $('leader').textContent = `Bomba · Rodada ${S.round} · primeiro a ${BOMB.WIN}${S.round <= BOMB.HALF ? ` · troca após a ${BOMB.HALF}ª` : ''}`;
  let ct = '';
  if (S.planted) ct = `Botijão plantado no ${SITE_NAMES[S.site]}! ${mySide === 1 ? `Segure ${BOMB.KEY_LABEL} perto dele pra desarmar` : 'Proteja até explodir!'}`;
  else if (S.dropped) ct = mySide === 0 ? 'O botijão caiu! Passe por cima pra pegar' : 'O botijão caiu no chão!';
  else if (c && c === me) ct = `Você está com o botijão! Leve até o A ou o B e segure ${BOMB.KEY_LABEL} (${BOMB.PLANT} s)`;
  else if (c) ct = `Botijão: ${c.name}${mySide === 0 ? ' (escolte!)' : ''}`;
  $('bCarrier').textContent = ct;
  bombPrompt(S, me, mySide, c); updateBLoad();
  $('bSide').textContent = me && mySide >= 0 ? `Você: ${SIDE_NAMES[mySide]} · Time ${TEAM_NAMES[me.team]}` : '';
  $('bSide').style.color = me ? TEAM_COLORS[me.team] || '#fff' : '#fff';
  // barra de plantar/desarmar
  const pb = $('bProg'), planting = S.phase === 'live' && S.plantProg > 0, defusing = S.phase === 'planted' && (S.defuser || S.defuseProg > 0);
  pb.classList.toggle('hidden', !(planting || defusing)); pb.classList.toggle('defuse', !!defusing);
  if (planting) { $('bProgFill').style.width = (100 * S.plantProg / BOMB.PLANT).toFixed(0) + '%'; $('bProgText').textContent = `${S.planter === (me && me.id) ? 'Plantando' : (byBid(S.planter) || {}).name + ' plantando'} o botijão… ${(BOMB.PLANT - S.plantProg).toFixed(1)} s`; }
  else if (defusing) { $('bProgFill').style.width = (100 * S.defuseProg / BOMB.DEFUSE).toFixed(0) + '%'; $('bProgText').textContent = S.defuser ? `${S.defuser === (me && me.id) ? 'Desarmando' : (byBid(S.defuser) || {}).name + ' desarmando'}… ${(BOMB.DEFUSE - S.defuseProg).toFixed(1)} s${S.defuseProg >= BOMB.HALF_DEFUSE ? ' (metade salva)' : ''}` : `Desarme pela metade (salvo) · ${(BOMB.DEFUSE - S.defuseProg).toFixed(1)} s`; }
  if ((planting || (defusing && S.defuser)) && gameTime >= G.tickAt) { G.tickAt = gameTime + 0.5; tone('triangle', 700 + 400 * (planting ? S.plantProg / BOMB.PLANT : S.defuseProg / BOMB.DEFUSE), 700, 0.05, 0.08); }
  // marcadores A/B e do botijão com distância
  const hide = !me || state === 'over';
  bombL.sites.forEach((s, i) => { const mk = $('siteMark' + i); if (hide || inSiteNear(s, me)) { mk.classList.add('hidden'); return; }
    const hot = S.planted && S.site === i; placeMark(mk, new V3(s.x, s.y + 3, s.z), hot ? '#ff4d4d' : '#ffd27a', Math.round(Math.hypot(s.x - me.pos.x, s.z - me.pos.z)) + ' m'); });
  const bm = $('bombMark'), showMk = !hide && S.bomb && (S.planted || (S.dropped && mySide === 0));
  if (showMk) placeMark(bm, new V3(S.bomb.x, S.bomb.y + 1.6, S.bomb.z), S.planted ? '#ff4d4d' : '#ffd27a', Math.round(Math.hypot(S.bomb.x - me.pos.x, S.bomb.z - me.pos.z)) + ' m'); else bm.classList.add('hidden');
}
// instrução grande no meio da tela: o que fazer agora e com qual tecla
function bombPrompt(S, me, mySide, c) {
  const el = $('bPrompt'), K = `<kbd>${BOMB.KEY_LABEL}</kbd>`; let p1 = '', p2 = '', cls = 'soft';
  const dTo = (q) => Math.round(Math.hypot(q.x - me.pos.x, q.z - me.pos.z));
  const sitesTxt = () => bombL.sites.map((s) => `${s.name} ${dTo(s)} m`).join(' · ');
  if (me && me.alive && state === 'playing' && mySide >= 0) {
    const can = bombCanUse(S, me, bombL.sites);
    if (S.phase === 'prep') { p1 = mySide === 0 ? '🔥 ATAQUE: leve o botijão até o A ou o B' : '🛡️ DEFESA: proteja o A e o B'; p2 = mySide === 0 ? `Lá dentro, segure ${K} por ${BOMB.PLANT} s pra plantar` : `Plantaram? Segure ${K} por ${BOMB.DEFUSE} s no botijão pra desarmar`; }
    else if (S.phase === 'live' && mySide === 0) {
      if (c === me && S.planter === me.id && S.plantProg > 0) { p1 = ''; }
      else if (c === me && can) { p1 = `Segure ${K} para plantar o botijão`; p2 = `${BOMB.PLANT} s parado dentro do site ${SITE_NAMES[siteAt(bombL.sites, me.pos)] || ''}`; cls = 'hot'; }
      else if (c === me) { p1 = '💣 Você está com o botijão! Leve até o A ou o B'; p2 = sitesTxt(); }
      else if (S.dropped && S.bomb) { p1 = 'O botijão caiu! Passe por cima pra pegar'; p2 = `${dTo(S.bomb)} m`; }
      else if (c) { p1 = `Escolte ${escapeHtml(c.name)} até o A ou o B`; p2 = sitesTxt(); }
    } else if (S.phase === 'live' && mySide === 1) { p1 = 'Defenda o A e o B'; p2 = `Não deixe o Ataque plantar · ${sitesTxt()}`; }
    else if (S.phase === 'planted' && S.bomb) {
      const left = Math.max(0, S.explodeAt - gameTime).toFixed(0), sn = SITE_NAMES[S.site] || '';
      if (mySide === 1 && S.defuser === me.id) p1 = '';
      else if (mySide === 1 && can) { p1 = `Segure ${K} para desarmar`; p2 = `${BOMB.DEFUSE} s${S.defuseProg >= BOMB.HALF_DEFUSE ? ' (metade já salva)' : ` · passou de ${String(BOMB.HALF_DEFUSE).replace('.', ',')} s fica salvo`} · explode em ${left} s`; cls = 'hot'; }
      else if (mySide === 1) { p1 = `Corra pro ${sn} e desarme o botijão!`; p2 = `${dTo(S.bomb)} m · explode em ${left} s`; }
      else { p1 = `Proteja o botijão no ${sn}!`; p2 = `Explode em ${left} s · ${dTo(S.bomb)} m`; }
    }
  }
  el.classList.toggle('hidden', !p1); if (!p1) return;
  el.className = cls + (mySide === 1 ? ' def' : ''); el.querySelector('.bp1').innerHTML = p1; el.querySelector('.bp2').innerHTML = p2;
  window.__bombPrompt = el.textContent;
}
const inSiteNear = (s, p) => Math.hypot(s.x - p.pos.x, s.z - p.pos.z) < BOMB.SITE_R && Math.abs(p.pos.y - s.y) < 3;
// ganchos de teste do Modo Bomba (offline)
const bombTest = {
  get S() { return bombS; }, get L() { return bombL; }, BOMB, attackTeam, sideOf,
  plant(site = 0, who = null) { const S = bombS; if (!S) return null; if (S.phase === 'prep') { S.phase = 'live'; S.phaseEnd = gameTime + BOMB.ROUND; }
    const atk = attackTeam(S.round), e = who ? byBid(who) : (byBid(S.carrier) || entities.find((x) => x.team === atk)); const s = bombL.sites[site];
    e.pos.set(s.x, s.y, s.z); const ev = plantNow(S, gameTime, e, site); applyBombEvOffline(ev); return ev; },
  skip() { if (!bombS) return; if (bombS.phase === 'planted') bombS.explodeAt = gameTime; else bombS.phaseEnd = gameTime; }, // pula a fase atual
  setRound(n, s0, s1) { const S = bombS; S.round = n; S.score = [s0, s1]; teamScore = S.score; },
};
function invKey(e) { // teclas da Invasão; true = consumiu
  if (!invMode() || state !== 'playing' || !player || e.repeat) return false;
  if (e.code === KEYS.use && !invPick) { if (!emote.on) invUsePower(); return true; }
  if (e.code === KEYS.cycle) { invCycle(); return true; }
  if (invCanPick()) {
    if (e.code === 'KeyB') { if (invPick) invClosePick(); else invOpenPick(true); return true; }
    if (invPick && e.code === 'KeyN') { const L = pool(SECONDARIES); if (L.length) invPickW(setSecondary, L[(Math.max(0, L.indexOf(selectedSecondary)) + 1) % L.length]); return true; }
    if (invPick && e.code === 'KeyM') { const L = pool(MELEES); if (L.length) invPickW(setMelee, L[(Math.max(0, L.indexOf(selectedMelee)) + 1) % L.length]); return true; }
    if (invPick && /^Digit[1-9]$/.test(e.code)) { const pk = pool(PRIMARIES)[+e.code.slice(5) - 1]; if (pk != null) invPickW(setPrimary, pk); return true; }
  }
  return false;
}
function invEndText() {
  const v = invView(), won = online ? !!(online.endMsg && online.endMsg.inv && online.endMsg.inv.won) : !!(inv && inv.won);
  const w = online ? (online.endMsg && online.endMsg.inv ? online.endMsg.inv.wave : v ? v.wave : 0) : inv ? inv.wave : 0;
  return won ? `Vocês sobreviveram às ${INV.WAVES} waves! 🎃🏆` : `Sobreviveu até a wave ${w} 🧟`;
}

// ganchos para testes automatizados
window.__docao = { get state() { return state; }, get ending() { return matchEnding; }, get entities() { return entities; }, get player() { return player; }, get camera() { return camera; }, startGame, endGame, pause, visible: (e) => losClear(center(player, EYE), center(e, 1.2)),
  set time(v) { gameTime = v; }, get time() { return gameTime; }, get grenades() { return grenades; }, get grenadeAim() { return { origin: throwOrigin().toArray(), velocity: throwVelocity(throwPower()).toArray(), points: Array.from(arcGeo.attributes.position.array.slice(0, arcGeo.drawRange.count * 3)), marker: arcMark.position.toArray(), visible: arcLine.visible, cupVisible: fp.cup.visible, handVisible: fp.cupHand.visible }; }, get explosions() { return explosions; }, get pickups() { return pickups; }, get ads() { return ads; }, get fov() { return camera.fov; }, get rockets() { return rockets; }, get lastKnock() { return lastKnock; }, WEAPONS, setPrimary, get scoped() { return scoped(); },
  MAPS, loadMap, selectMap, get map() { return currentMap; }, get nav() { return nav; }, get navMs() { return navMs; }, get spawns() { return SPAWNS; }, groundAt, collides, get solids() { return solids; },
  get online() { return online; }, joinRoom, leaveOnline, netEv,
  get mode() { return mode; }, get zone() { return zone; }, set zone(v) { zone = v; }, get teamScore() { return teamScore; }, get spawnHold() { return spawnHold; }, get selectedPrimary() { return selectedPrimary; },
  DOM, applyTeam, damage, respawn: (e) => respawn(e), get discs() { return discs; }, fire, get lastTrace() { return window.__lastTrace; }, get holeCount() { return holes.length; }, get PHYS() { return PHYS; }, bulletHole, get eggs() { return eggs; }, get eggStains() { return eggStains.length; }, get eggSplat() { return Math.max(0, eggSplatUntil - gameTime); }, launchEgg: (e, o, d, k) => launchEgg(e, new V3(...o), new V3(...d).normalize(), k), fpGunNames: () => fp.guns.map((g) => g.name || ''), EGG_W, get effects() { return effects; }, fpGunEgg: () => { const e = fp.sling.userData.egg; return { vis: e.visible, y: +e.position.y.toFixed(3), z: +e.position.z.toFixed(3), pouchZ: +fp.sling.userData.pouch.position.z.toFixed(3) }; }, grantPokeball, get pokeFx() { return pokeFx; }, grantMinigun: () => grantMinigun(), MINIGUN, get mini() { const p = player; return p ? { spin: p.mgSpin || 0, heat: p.mgHeat || 0, hot: !!p.mgHot, firing: !!p.mgFiring, rot: fp.mini ? fp.mini.barrels.rotation.z : 0, glow: fp.mini ? fp.mini.glowMat.opacity : 0, glowOn: !!(fp.mini && fp.mini.glow.visible), shots: window.__mgShots || 0, steam: window.__mgSteam || 0, fov: camera.fov, guns: fp.guns.length, drops: fp.drops.length, hud: !document.getElementById('mgHud')?.hidden } : null; }, setMgHeat: (h) => { if (player) player.mgHeat = h; }, get fpSaberSide() { return fp.saberSide || 0; }, inspect: () => startInspect(player), stopInspect: () => stopInspect(true), get inspecting() { const s = fp.ins; return s ? { t: s.t, wpn: s.wpn, kind: s.kind, out: s.out, fade: s.fade, hold: s.hold } : null; },
  fpPumpZ: () => +fp.pumpPart.position.z.toFixed(3), get shake() { return shake; },
  fpHands: () => ({ arms: fp.fpRef.arms.visible, armsP: fp.fpRef.armsP.visible, pump: fp.pumpHand.visible, saberR: !!fp.fpRef.saberR && fp.fpRef.saberR.visible, saberL: !!fp.fpRef.saberL && fp.fpRef.saberL.visible, bowGrip: !!fp.fpRef.bowGrip && fp.fpRef.bowGrip.visible, bowDraw: !!fp.fpRef.bowDraw && fp.fpRef.bowDraw.visible, kr: fp.kr.visible, knifeFlip: fp.kpiv.rotation.x }),
  fpCross: () => { const g = fp.guns[CROSS]; fp.root.updateMatrixWorld(true); const w = (v) => g.localToWorld(v.clone()), h = fp.fpRef.bowDraw.getWorldPosition(new V3()); const tip = w(new V3(0, 0.05, -0.44)).project(fpCam), lt = w(new V3(-0.24, 0.14, -0.46)).project(fpCam), butt = w(new V3(0, -0.01, 0.33)); return { tip: [tip.x, tip.y], limbL: [lt.x, lt.y], butt: butt.toArray(), fore: h.distanceTo(w(g.userData.fore)), knot: h.distanceTo(w(g.userData.draw)) }; },
  fpHandErr: () => { const p = player, g = fp.guns[p.weapon]; if (!g) return 0; fp.root.updateWorldMatrix(true, true); const d = (h, o, pt) => h.getWorldPosition(new V3()).distanceTo(o.localToWorld(pt.clone()));
    if ((p.weapon === BOW || p.weapon === CROSS || p.weapon === EGG_W) && g.userData.grip) return d(fp.fpRef.bowGrip, g, g.userData.grip);
    if (isSaber(p.weapon)) { const tw = g.userData.twin; return Math.max(d(fp.fpRef.saberR, g.userData.saber, tw ? DUAL_GRIP : SABER_GRIPS[0]), d(fp.fpRef.saberL, tw ? tw.userData.saber : g.userData.saber, tw ? DUAL_GRIP : SABER_GRIPS[1])); }
    return 0; }, fpPose: () => ({ x: fp.root.position.x, y: fp.root.position.y, rx: fp.root.rotation.x, ry: fp.root.rotation.y, rz: fp.root.rotation.z, sway: fp.swayX || 0, strafe: fp.strafe || 0 }), get gunner() { return gunner; }, camPos: () => camera.position.toArray(), grantGunner, setGunnerMode, endGunner, get gunHeli() { return gunHeli; }, get radioCall() { return radioCall; }, kill: (e) => kill(e, null, 0, false), V3, KNIFE, MELEE, switchWeapon, quickKnife, knifeAttack, meleeHit, modelYaw, get fpBoltHand() { const g = fp.guns[player ? player.weapon : -1]; return !!(g && g.userData.boltHand && g.userData.boltHand.visible && fp.sRound.parent === g); }, get menuPreviewX() { return menuPreviewX; }, get menuSpin() { return { y: +showcase.rotation.y.toFixed(3), spin: +showSpin.toFixed(3), vel: +showSpinVel.toFixed(3), drag: !!showDrag, stage: +menuStage.rotation.y.toFixed(3) }; }, get dance() { return selectedDance; }, setDance, get victoryOn() { return victory.on; }, get emoting() { return emote.on; }, get previewScreen() { if (!preview || !showcase.visible) return null; const v = showcase.position.clone(); v.y += 0.9; v.project(camera); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight, skin: selectedSkin, kids: preview.group.children.length }; }, get fpKnife() { return { t: fp.knifeT, kind: fp.knifeKind, visible: fp.kr.visible }; }, get bacon() { return baconStats; }, los: (a, b) => losClear(new V3(...a), new V3(...b)), activeBacons, BACON, get deathCam() { return deathCamState; },
  blastAt: (x, y, z, kind = 'r', owner) => blast(new V3(x, y, z), owner || player, kind === 'n' ? { radius: NADE.radius, maxDmg: NADE.maxDmg, selfMul: NADE.selfMul, knock: NADE.knock, lift: NADE.lift, wIdx: W_NADE } : { ...WEAPONS[3].rocket, wIdx: 3 }),
  rocketAt: (o, d, owner) => launchRocket(owner || player, new V3(...o), new V3(...d).normalize()),
  cornAt: (o, d, owner) => launchCorn(owner || player, new V3(...o), new V3(...d).normalize()), get corns() { return corns; }, get cornPopsQ() { return cornPops; }, fpCorn: () => ({ vis: fp.guns[CORN_W].visible, cobY: fp.cornCob.position.y, cobVis: fp.cornCob.visible, crank: fp.cornCrank.rotation.x, kernels: fp.cornKernels.filter((g) => g.visible).length, cobScr: (() => { fp.root.updateMatrixWorld(true); const v = fp.cornCob.localToWorld(new V3(0, 0.1, 0)).project(fpCam); return [v.x, v.y]; })() }), setWeaponOf: (e, i) => setWeapon(e, i),
  rewardKill: () => onRewardKill(), endAc130, get ac130On() { return !!ac130; }, get rewardKills() { return rewardKills; }, useStreak, get streakReady() { return streakReady.slice(); }, callNuke, get nukeReady() { return nukeReady || streakReady.includes('nuke'); }, get nukeAt() { return nukeAt; }, spawnHeli: () => grantHeli(), get heli() { return heli; }, get netHelis() { return [...netHelis.values()].map((h) => ({ id: h.id, owner: h.owner ? h.owner.name : '', hp: h.hp, alive: h.alive, pos: h.pos.toArray() })); }, get netNukeAt() { return netNukeAt; }, hurtHeli, get predator() { return predator; }, throwSmoke: () => throwTactical(), throwStun: () => throwShock(), throwShock: () => throwShock(), spawnShock: (owner, pos, vel) => spawnShock({ owner, pos: new V3(...pos), vel: new V3(...vel) }), get shocks() { return shocks; }, SHOCK, get smokes() { return smokes; }, get tacticals() { return tacticals; }, strikeAt: (x, z) => spawnSkyMissile({ x, z }, player), get strikes() { return strikes; }, STRIKE, PREDATOR, get gunKills() { return player ? player.gunKills : null; }, addWeaponKills: (w, n = 1) => { for (let i = 0; i < n; i++) noteWeaponKill(player, w); }, camoLevel,
  swingSaber: () => swingSaber(player), saberDash: () => saberDash(player), saberSpecial: () => saberSpecial(player),
  holdMove: (on) => { if (player) player.demoForward = !!on; keys.KeyW = !!on; },
  holdBlock: (on) => { if (player) player.demoBlock = !!on; rightDown = !!on; },
  saberBlock: (on) => { if (player) { const st = ensureSaber(player); st.wantBlock = !!on; st.blocking = !!on && gameTime >= st.lockUntil; } },
  get saber() { return player && player.saber; }, get blades() { return blades; }, SABER_KIT,
  // Invasão 🎃
  get inv() { return inv; }, get invView() { return invView(); }, get invInv() { return invGfx.inv.slice(); }, get invSel() { return invGfx.sel; }, get invDrops() { return [...invGfx.drops.keys()]; }, get invPick() { return invPick; },
  invUse: () => invUsePower(), invCycle: () => invCycle(), invOpenPick: () => invOpenPick(), invEquipNow, INV, POWERS, ZOMBIES, INV_MAPS, makeZombieEnt, get invHal() { return invGfx.hal; }, get invMusic() { return invMusic && { on: invMusic.on, level: invMusic.level }; },
  invGive: (list) => { if (inv && player) { player.inv = list.slice(0, INV.INV_MAX); invSetInv(player.inv.map((k) => POWER_KEYS.indexOf(k))); } else if (online) online.net.send({ t: 'testInv', give: list }); },
  bomb: bombTest,
};

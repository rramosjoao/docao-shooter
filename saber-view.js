// Sabre de luz do Docão: cabo curto de ferramenta da fazenda + lâmina que brilha.
// A ponta é o −Z nos dois modelos. poseSaber gira o grupo; não esconde nem desloca a lâmina.
import * as THREE from 'three';
import { outline, toon } from './docao.js';

const BLADE = '#ff2a2a';

// 0 = em guarda, lâmina pra frente. ~0.45 = o corte sobe e cruza. 1 = voltou.
// X positivo levanta a ponta (−Z). O giro é no Y e no Z, em volta da guarda.
const GUARD = { x: -0.05, y: 1.15, z: -0.85 };
const CUT = { x: 0.45, y: 1.45, z: -1.7 };

function clamp01(k) {
  const t = Number(k);
  if (!Number.isFinite(t)) return 0;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

// Sobe até 1 em k = 0.45 e volta a 0 em k = 1.
function swingOf(k) {
  const t = clamp01(k);
  if (t <= 0.45) return smooth(t / 0.45);
  return smooth((1 - t) / 0.55);
}

function cyl(parent, r, len, color, z, ol) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), toon(color));
  mesh.rotation.x = Math.PI / 2;
  mesh.position.z = z;
  parent.add(mesh);
  if (ol) outline(mesh, ol);
  return mesh;
}

function ring(parent, r, tube, color, z, ol) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 6, 14), toon(color));
  mesh.position.z = z;
  parent.add(mesh);
  if (ol) outline(mesh, ol);
  return mesh;
}

function bladeMat(opacity) {
  return new THREE.MeshBasicMaterial({
    color: BLADE,
    transparent: true,
    opacity,
    depthWrite: false,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
}

function addHilt(group, s) {
  const ol = s.ol;
  cyl(group, s.pommelR, s.pommelLen, '#1c1f26', s.zPommel, ol);
  ring(group, s.pommelR * 1.02, s.tube * 0.85, '#f5e6d0', s.zPommel + s.pommelLen * 0.5 - s.tube * 0.85, ol * 0.7);
  cyl(group, s.gripR, s.gripLen, '#2a2e36', s.zGrip, ol);
  cyl(group, s.gripR + s.tube * 0.55, s.gripLen * 0.72, '#8b5a2b', s.zGrip, ol * 0.8);
  ring(group, s.gripR + s.tube, s.tube, '#6b3f22', s.zGrip - s.gripLen * 0.28, ol * 0.7);
  ring(group, s.gripR + s.tube, s.tube, '#f5e6d0', s.zGrip, ol * 0.7);
  ring(group, s.gripR + s.tube, s.tube, '#6b3f22', s.zGrip + s.gripLen * 0.28, ol * 0.7);
  cyl(group, s.gripR + s.tube * 1.3, s.gripLen * 0.16, '#e63946', s.zGrip + s.gripLen * 0.06, ol * 0.6);
  const stud = cyl(group, s.studR, s.studR * 1.5, '#e63946', s.zGrip, ol * 0.6);
  stud.rotation.set(0, 0, Math.PI / 2);
  stud.position.x = s.gripR + s.tube + s.studR;
  cyl(group, s.emitR, s.emitLen, '#3c414c', s.zEmit, ol);
  cyl(group, s.emitR * 1.18, s.emitLen * 0.38, '#1c1f26', s.zEmit - s.emitLen * 0.32, ol * 0.7);
}

function addBlade(group, s) {
  const along = Math.PI / 2;
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(s.thick * 0.45, s.thick * 0.45, s.bladeLen, 10), bladeMat(0.95));
  blade.rotation.x = along;
  blade.position.z = s.zBlade;
  blade.renderOrder = 3;
  group.add(blade);

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(s.thick * 0.16, s.thick * 0.16, s.bladeLen * 0.98, 8),
    new THREE.MeshBasicMaterial({
      color: '#fff6f2',
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  core.rotation.x = along;
  core.position.z = s.zBlade;
  core.renderOrder = 4;
  group.add(core);

  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(s.thick * 1.15, s.thick * 1.15, s.bladeLen * 0.96, 10),
    bladeMat(0.28),
  );
  glow.material.blending = THREE.AdditiveBlending;
  glow.rotation.x = along;
  glow.position.z = s.zBlade;
  glow.renderOrder = 2;
  group.add(glow);

  group.userData.blade = blade;
  group.userData.glow = glow;
}

function makeSaber(spec) {
  const group = new THREE.Group();
  group.name = spec.name;
  group.visible = true;
  addHilt(group, spec);
  addBlade(group, spec);
  poseSaber(group, 0);
  return group;
}

// Viewmodel: o cabo fica na origem (o casco). A lâmina sai da mão em direção ao −Z.
export function makeFPSaber() {
  return makeSaber({
    name: 'fp-saber',
    ol: 0.005,
    pommelR: 0.032,
    pommelLen: 0.046,
    zPommel: 0.09,
    gripR: 0.026,
    gripLen: 0.12,
    zGrip: 0,
    tube: 0.006,
    studR: 0.008,
    emitR: 0.038,
    emitLen: 0.04,
    zEmit: -0.1,
    thick: 0.036,
    bladeLen: 0.7,
    zBlade: -0.48,
  });
}

// Prop da mão em 3ª pessoa. Lâmina de 0.7. A ponta continua no −Z.
export function makeWorldSaber() {
  return makeSaber({
    name: 'world-saber',
    ol: 0.008,
    pommelR: 0.03,
    pommelLen: 0.048,
    zPommel: 0.12,
    gripR: 0.026,
    gripLen: 0.12,
    zGrip: 0.035,
    tube: 0.005,
    studR: 0.007,
    emitR: 0.034,
    emitLen: 0.04,
    zEmit: -0.05,
    thick: 0.02,
    bladeLen: 0.7,
    zBlade: -0.4,
  });
}

export function setSaberColor(group, hex) {
  try {
    const data = group && group.userData;
    if (!data) return;
    if (data.blade && data.blade.material && data.blade.material.color) data.blade.material.color.set(hex);
    if (data.glow && data.glow.material && data.glow.material.color) data.glow.material.color.set(hex);
  } catch (e) { /* grupo ou cor inválidos */ }
}

export function poseSaber(group, k) {
  if (!group || !group.rotation) return;
  const swing = swingOf(k);
  group.rotation.x = lerp(GUARD.x, CUT.x, swing);
  group.rotation.y = lerp(GUARD.y, CUT.y, swing);
  group.rotation.z = lerp(GUARD.z, CUT.z, swing);
}

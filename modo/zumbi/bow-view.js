// Besta e arco em 1ª pessoa. A ponta do virote/flecha é o −Z.
// poseDraw(k): 0 = corda solta, sem projétil; 1 = corda armada, projétil no lugar.
// poseRelease(t): 0 = ainda armada; 1 = corda já foi pra frente (snap do tiro).
import * as THREE from 'three';
import { outline, toon } from './docao.js';

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _axis = new THREE.Vector3(1, 0, 0);

function clamp01(k) {
  const t = Number(k);
  if (!Number.isFinite(t)) return 0;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function smooth(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function ramp(a, b, x) {
  return clamp01((x - a) / (b - a));
}

function box(parent, w, h, d, color, x, y, z, ol = 0.005) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  if (ol) outline(mesh, ol);
  return mesh;
}

function stringSeg(parent) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.016, 0.016), toon('#f4efe4'));
  parent.add(mesh);
  outline(mesh, 0.003);
  return mesh;
}

function span(mesh, ax, ay, az, bx, by, bz) {
  _a.set(ax, ay, az);
  _b.set(bx, by, bz);
  const len = Math.max(0.001, _a.distanceTo(_b));
  mesh.position.copy(_a).add(_b).multiplyScalar(0.5);
  mesh.scale.set(len, 1, 1);
  _b.sub(_a).multiplyScalar(1 / len);
  const dot = _b.dot(_axis);
  if (dot > 0.999) mesh.quaternion.identity();
  else if (dot < -0.999) mesh.quaternion.set(0, 0, 1, 0);
  else mesh.quaternion.setFromUnitVectors(_axis, _b);
}

function makeBolt(len) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 8), toon('#c4a574'));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -len / 2;
  g.add(shaft);
  outline(shaft, 0.003);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.055, 8), toon('#2a2d35'));
  tip.rotation.x = -Math.PI / 2;
  tip.position.z = -len - 0.02;
  g.add(tip);
  outline(tip, 0.003);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.028, 0.055), toon('#e63946'));
    f.position.set(s * 0.015, 0, -0.03);
    f.rotation.z = s * 0.35;
    g.add(f);
    outline(f, 0.002);
  }
  return g;
}

export function poseDraw(group, k) {
  const fn = group && group.userData.poseDraw;
  if (fn) fn(clamp01(k));
}

export function poseRelease(group, t) {
  const fn = group && group.userData.poseRelease;
  if (fn) fn(clamp01(t));
}

// Virote/flecha solto no mundo. A ponta continua no −Z local.
export function makeFlightShaft() {
  const g = makeBolt(0.42);
  g.name = 'flight-shaft';
  return g;
}

export function makeFPCrossbow() {
  const g = new THREE.Group();
  g.name = 'fp-crossbow';
  box(g, 0.075, 0.085, 0.3, '#6b3f22', 0, -0.01, 0.18);
  const gripMesh = box(g, 0.05, 0.13, 0.065, '#2a2d35', 0, -0.1, 0.22);
  gripMesh.rotation.x = 0.28;
  box(g, 0.055, 0.04, 0.64, '#3a342c', 0, 0.02, -0.14);
  box(g, 0.02, 0.012, 0.52, '#1c1f26', 0, 0.046, -0.18, 0.003);
  box(g, 0.07, 0.055, 0.06, '#5c4030', 0, 0.035, -0.46);
  const limbL = box(g, 0.24, 0.03, 0.038, '#7a4a28', -0.14, 0.08, -0.46);
  limbL.rotation.z = 0.5;
  const limbR = box(g, 0.24, 0.03, 0.038, '#7a4a28', 0.14, 0.08, -0.46);
  limbR.rotation.z = -0.5;
  const tipL = { x: -0.24, y: 0.14, z: -0.46 };
  const tipR = { x: 0.24, y: 0.14, z: -0.46 };
  box(g, 0.032, 0.032, 0.032, '#1c1f26', tipL.x, tipL.y, tipL.z, 0.003);
  box(g, 0.032, 0.032, 0.032, '#1c1f26', tipR.x, tipR.y, tipR.z, 0.003);
  box(g, 0.04, 0.03, 0.05, '#e63946', 0, 0.01, 0.06, 0.003);

  const sL = stringSeg(g);
  const sR = stringSeg(g);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), toon('#f7f1e1'));
  g.add(knot);
  outline(knot, 0.003);
  const bolt = makeBolt(0.38);
  g.add(bolt);

  const ny = 0.05;
  const loose = -0.4;
  const cock = 0.04;
  g.userData.string = knot;
  g.userData.bolt = bolt;
  g.userData.grip = new THREE.Vector3(0.02, -0.11, 0.24);
  g.userData.fore = new THREE.Vector3(-0.01, -0.085, -0.26); // telha: mão de apoio embaixo do trilho (fora da recarga)
  g.userData.draw = new THREE.Vector3(0, ny, cock);
  g.userData.gripHand = 0;
  g.userData.drawHand = 1;

  function place(nz, showBolt, boltK) {
    knot.position.set(0, ny, nz);
    span(sL, tipL.x, tipL.y, tipL.z, 0, ny, nz);
    span(sR, tipR.x, tipR.y, tipR.z, 0, ny, nz);
    g.userData.draw.set(0, ny, nz);
    bolt.visible = !!showBolt;
    if (showBolt) {
      const u = boltK;
      bolt.position.set((1 - u) * 0.2, ny + (1 - u) * 0.18, (1 - u) * 0.1 + u * nz);
      bolt.rotation.set((1 - u) * 0.85, (1 - u) * -0.45, 0);
    }
  }

  g.userData.poseDraw = (k) => {
    const pull = smooth(ramp(0.15, 0.7, k));
    const nz = loose + (cock - loose) * pull;
    const boltK = smooth(ramp(0.45, 0.85, k));
    place(nz, boltK > 0.02, boltK);
  };
  g.userData.poseRelease = (t) => {
    const e = 1 - Math.pow(1 - clamp01(t), 3);
    place(cock + (loose - cock) * e, false, 0);
  };
  poseDraw(g, 1);
  return g;
}

export function makeFPBow() {
  const g = new THREE.Group();
  g.name = 'fp-bow';
  box(g, 0.048, 0.22, 0.055, '#6b3f22', 0, 0, 0);
  box(g, 0.055, 0.09, 0.06, '#2a241c', 0, -0.02, 0.012, 0.003);
  const up = box(g, 0.034, 0.36, 0.028, '#7a4a28', 0, 0.26, -0.04);
  up.rotation.x = -0.4;
  const dn = box(g, 0.034, 0.32, 0.028, '#7a4a28', 0, -0.24, -0.03);
  dn.rotation.x = 0.35;
  const tipU = { x: 0, y: 0.42, z: -0.1 };
  const tipD = { x: 0, y: -0.38, z: -0.08 };
  box(g, 0.03, 0.03, 0.03, '#1c1f26', tipU.x, tipU.y, tipU.z, 0.003);
  box(g, 0.03, 0.03, 0.03, '#1c1f26', tipD.x, tipD.y, tipD.z, 0.003);

  const sU = stringSeg(g);
  const sD = stringSeg(g);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), toon('#f7f1e1'));
  g.add(knot);
  outline(knot, 0.003);
  const arrow = makeBolt(0.4);
  g.add(arrow);

  const ny = 0.02;
  const rest = 0.02;
  const pulled = 0.2;
  g.userData.string = knot;
  g.userData.bolt = arrow;
  g.userData.grip = new THREE.Vector3(-0.03, -0.02, 0.06);
  g.userData.draw = new THREE.Vector3(0.04, ny, pulled);
  g.userData.gripHand = 1;
  g.userData.drawHand = 0;

  function place(nz, nx, show, ak) {
    knot.position.set(nx, ny, nz);
    span(sU, tipU.x, tipU.y, tipU.z, nx, ny, nz);
    span(sD, tipD.x, tipD.y, tipD.z, nx, ny, nz);
    g.userData.draw.set(nx + 0.02, ny, nz);
    arrow.visible = !!show;
    if (show) {
      const u = ak;
      arrow.position.set((1 - u) * 0.24 + u * nx, ny + (1 - u) * -0.12, (1 - u) * 0.14 + u * nz);
      arrow.rotation.set((1 - u) * 0.3, (1 - u) * 1.05, (1 - u) * 0.45);
    }
  }

  g.userData.poseDraw = (k) => {
    const pull = smooth(ramp(0.12, 0.78, k));
    const nz = rest + (pulled - rest) * pull;
    const ak = smooth(ramp(0.2, 0.82, k));
    place(nz, 0.02 + pull * 0.08, ak > 0.02, ak);
  };
  g.userData.poseRelease = (t) => {
    const e = 1 - Math.pow(1 - clamp01(t), 3);
    place(pulled + (rest - pulled) * e, 0.1 * (1 - e), false, 0);
  };
  poseDraw(g, 1);
  return g;
}

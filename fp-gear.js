import * as THREE from 'three';

// Tablet e rádio que o Docão segura na visão em primeira pessoa.
// A câmera olha para −Z. A face mais perto dela é o +Z local (z maior).
// A tela fica nessa face. Rotação X negativa inclina o topo em direção ao rosto.

const SKIN = '#e7b898';
const SLEEVE = '#d8261c';

const TABLET_FROM = { x: 0.05, y: -0.62, z: -0.35, rx: -0.55 };
const TABLET_TO = { x: 0.0, y: -0.16, z: -0.62, rx: -0.62 };

const RADIO_FROM = { x: 0.28, y: -0.55, z: -0.4, rx: 0.22, rz: 0.12 };
const RADIO_TO = { x: 0.16, y: -0.08, z: -0.48, rx: -0.42, rz: 0.48 };

function basic(color) {
  return new THREE.MeshBasicMaterial({ color });
}

function put(parent, geometry, color, x, y, z) {
  const mesh = new THREE.Mesh(geometry, basic(color));
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function clamp01(k) {
  const t = Number(k);
  if (!Number.isFinite(t)) return 0;
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function addTabletHand(group, side) {
  put(group, new THREE.CapsuleGeometry(0.04, 0.11, 4, 8), SKIN, side * 0.245, -0.01, 0.03);
  const sleeve = put(group, new THREE.CapsuleGeometry(0.042, 0.08, 4, 8), SLEEVE, side * 0.34, -0.07, 0.015);
  sleeve.rotation.z = side * -1.9;
}

export function makeTablet() {
  const group = new THREE.Group();
  group.name = 'fp-tablet';

  put(group, new THREE.BoxGeometry(0.46, 0.32, 0.028), '#1c1c1e', 0, 0, 0);

  // Meio milímetro à frente do corpo, no +Z (lado da câmera).
  const screen = put(group, new THREE.PlaneGeometry(0.4, 0.26), '#16301c', 0, 0, 0.0165);
  group.userData.screen = screen;

  addTabletHand(group, -1);
  addTabletHand(group, 1);

  group.rotation.x = -0.55;
  group.visible = false;
  return group;
}

export function makeLaptop() {
  const g = new THREE.Group();
  g.name = 'fp-laptop';
  put(g, new THREE.BoxGeometry(0.58, 0.034, 0.4), '#2a241c', 0, 0, 0);
  put(g, new THREE.BoxGeometry(0.5, 0.01, 0.2), '#14161c', 0, 0.022, 0.05);
  const lid = new THREE.Group();
  lid.position.set(0, 0.02, -0.19);
  put(lid, new THREE.BoxGeometry(0.58, 0.36, 0.022), '#1c1c1e', 0, 0.18, 0);
  const screen = put(lid, new THREE.PlaneGeometry(0.5, 0.28), '#8fd0ff', 0, 0.19, 0.013);
  g.add(lid);
  g.userData.lid = lid;
  g.userData.screen = screen;
  addTabletHand(g, -1);
  addTabletHand(g, 1);
  g.visible = false;
  return g;
}

// big = 0..1: laptop grudado no rosto, tela em pé no meio da visão (míssil pilotado pela tela)
const LAPTOP_BIG = { s: 1.25, y: -0.2925, z: -0.289 }; // centro da tela em (0, -0.03, -0.51) na câmera
export function poseLaptop(group, k, big = 0) {
  const t = clamp01(k), b = clamp01(big) * t;
  // Sobe na frente do rosto. Rotação X negativa inclina a tela pra gente, igual o tablet.
  // A tampa começa deitada no teclado (1.35) e abre até ficar quase em pé (0.02).
  group.position.set(lerp(lerp(0.04, 0, t), 0, b), lerp(lerp(-0.52, -0.2, t), LAPTOP_BIG.y, b), lerp(lerp(-0.32, -0.55, t), LAPTOP_BIG.z, b));
  group.rotation.set(lerp(lerp(0.15, -0.42, t), 0, b), 0, 0);
  group.scale.setScalar(lerp(1, LAPTOP_BIG.s, b));
  const lid = group.userData.lid;
  if (lid) lid.rotation.x = lerp(lerp(1.35, 0.02, t), 0.02, b);
}

export function poseTablet(group, k) {
  const t = clamp01(k);
  group.position.set(
    lerp(TABLET_FROM.x, TABLET_TO.x, t),
    lerp(TABLET_FROM.y, TABLET_TO.y, t),
    lerp(TABLET_FROM.z, TABLET_TO.z, t),
  );
  group.rotation.x = lerp(TABLET_FROM.rx, TABLET_TO.rx, t);
}

function addRadioHand(group) {
  const palm = put(group, new THREE.SphereGeometry(0.048, 14, 12), SKIN, 0.028, -0.042, 0.02);
  palm.scale.set(1.05, 0.9, 1.2);
  const fingers = put(group, new THREE.CapsuleGeometry(0.032, 0.07, 4, 8), SKIN, 0, -0.028, 0.03);
  fingers.rotation.z = Math.PI / 2;
}

export function makeRadio() {
  const group = new THREE.Group();
  group.name = 'fp-radio';

  put(group, new THREE.BoxGeometry(0.068, 0.175, 0.036), '#2a2a28', 0, 0, 0);
  put(group, new THREE.CylinderGeometry(0.0045, 0.0045, 0.15, 8), '#3a3a36', 0.016, 0.16, 0);

  const button = put(group, new THREE.CylinderGeometry(0.012, 0.012, 0.01, 12), '#e63946', 0, 0.038, 0.022);
  button.rotation.x = Math.PI / 2;

  for (let i = 0; i < 3; i++) {
    put(group, new THREE.BoxGeometry(0.036, 0.006, 0.004), '#141412', 0, 0.058 + i * 0.016, 0.0195);
  }

  addRadioHand(group);

  group.visible = false;
  return group;
}

export function poseRadio(group, k) {
  const t = clamp01(k);
  group.position.set(
    lerp(RADIO_FROM.x, RADIO_TO.x, t),
    lerp(RADIO_FROM.y, RADIO_TO.y, t),
    lerp(RADIO_FROM.z, RADIO_TO.z, t),
  );
  group.rotation.x = lerp(RADIO_FROM.rx, RADIO_TO.rx, t);
  group.rotation.z = lerp(RADIO_FROM.rz, RADIO_TO.rz, t);
}

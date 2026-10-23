// Danças da vitória. O mesmo pose serve a sombra do menu e o Docão no mapa.
import * as THREE from 'three';
import { makeDocao } from './docao.js';

export const DANCES = [
  { id: 'moonwalk', name: 'Moonwalk', line: 'Desliza pra trás' },
  { id: 'mewing', name: 'Mewing', line: 'Dedo no queixo' },
  { id: 'sixseven', name: '6 7', line: 'Um de cada vez' },
];

export const normDance = (id) => (DANCES.some((d) => d.id === id) ? id : 'moonwalk');

function rest(model) {
  model.arms.forEach((a, i) => { const s = i === 0 ? -1 : 1; a.rotation.set(0.05, 0, s * 0.22); });
  model.legs.forEach((leg) => { leg.rotation.set(0, 0, 0); leg.position.y = 0.4; });
  model.head.rotation.set(0, 0, 0);
  if (model.snout && model.snoutBase) model.snout.scale.copy(model.snoutBase);
  if (model.jaw) model.jaw.visible = false;
  if (model.point) { model.point.visible = false; model.point.scale.set(1, 1, 1); }
  const thumb = model.arms[0] && model.arms[0].children.find((c) => c.userData.isThumb);
  if (thumb) thumb.visible = true;
}

// id + tempo em segundos. danceBase { x, y, z, yaw } é o chão; o pose mexe em cima disso.
export function poseVictory(model, id, t) {
  if (model.snout && !model.snoutBase) model.snoutBase = model.snout.scale.clone();
  rest(model);
  const g = model.group;
  g.rotation.order = 'YXZ';
  let hop = 0, lean = 0, sway = 0, slide = 0;
  if (id === 'moonwalk') {
    const u = (t % 1.7) / 1.7;
    const glide = Math.sin(u * Math.PI * 2);
    const step = u < 0.5 ? u * 2 : (u - 0.5) * 2;
    const lead = u < 0.5 ? 0 : 1;
    lean = -0.42;
    slide = (u < 0.5 ? u : u - 1) * 0.42;
    model.legs[lead].rotation.x = -0.2 - 1.15 * step;
    model.legs[1 - lead].rotation.x = 1.15 * Math.sin(step * Math.PI);
    model.arms[0].rotation.set(-1.15, 0.45, -0.7 - 0.4 * glide);
    model.arms[1].rotation.set(-1.15, -0.45, 0.7 + 0.4 * glide);
    model.head.rotation.set(0.18, -0.45, glide * 0.06);
    hop = Math.abs(glide) * 0.025;
  } else if (id === 'mewing') {
    const grow = 1 - Math.exp(-Math.max(0, t) * 1.6);
    const u = (t % 2.5) / 2.5;
    const stroke = u < 0.68 ? smooth(u / 0.68) : u < 0.84 ? 1 : 1 - smooth((u - 0.84) / 0.16);
    lean = -0.06;
    sway = 0.05;
    model.head.rotation.set(0.1, 0.22, -0.05);
    model.arms[1].rotation.set(0.2, 0.05, 1.05);
    model.legs[0].rotation.set(0.08, 0, -0.04);
    model.legs[1].rotation.set(-0.02, 0, 0.1);
    if (model.snout && model.snoutBase) {
      const s = model.snoutBase;
      model.snout.scale.set(s.x * (1 + 0.22 * grow), s.y * (1 - 0.08 * grow), s.z * (1 + 0.05 * grow));
    }
    if (model.jaw) {
      model.jaw.visible = true;
      model.jaw.scale.set(1.15 + 0.35 * grow, 0.8 + 0.7 * grow, 0.75 + 0.35 * grow);
    }
    pointAlongJaw(model, stroke);
  } else {
    const beat = (t * 0.95) % 2;
    const side = beat < 1 ? 0 : 1;
    const u = beat % 1;
    const k = u < 0.2 ? u / 0.2 : u < 0.58 ? 1 : u < 0.82 ? 1 - (u - 0.58) / 0.24 : 0;
    const out = side === 0 ? 1 : -1;
    hop = k * 0.14;
    sway = -out * 0.08 * k;
    model.arms[side].rotation.set(-0.2 - 2.6 * k, 0, out * (0.28 + 0.32 * k));
    model.arms[1 - side].rotation.set(0.35, 0, -out * 0.55);
    model.legs[side].rotation.x = 0.16 * k;
    model.legs[1 - side].rotation.x = 0.05;
    model.head.rotation.set(-0.06 * k, out * 0.08 * k, 0);
  }
  const b = model.danceBase;
  if (b) {
    const yaw = b.yaw || 0;
    g.rotation.y = yaw;
    g.position.set(b.x - Math.sin(yaw) * slide, b.y + hop, b.z - Math.cos(yaw) * slide);
  }
  g.rotation.x = lean;
  g.rotation.z = sway;
}

const smooth = (k) => k * k * (3 - 2 * k);
const FINGER_LEN = 0.26;
const _side = new THREE.Vector3(), _chin = new THREE.Vector3(), _tip = new THREE.Vector3(), _dir = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);

// Indicador na quina da mandíbula, deslizando até a frente do queixo.
function pointAlongJaw(model, stroke) {
  const finger = model.point, jaw = model.jaw, head = model.head, arm = model.arms[0];
  if (!finger || !jaw || !head) return;
  if (finger.parent !== head) head.add(finger);
  const thumb = arm.children.find((c) => c.userData.isThumb);
  if (thumb) thumb.visible = false;
  const sx = jaw.scale.x, sy = jaw.scale.y;
  const under = 0.065 * sy + 0.08;
  _side.set(jaw.position.x - 0.22 * sx, jaw.position.y - under, jaw.position.z + 0.02);
  _chin.set(jaw.position.x + 0.02, jaw.position.y - under - 0.02, jaw.position.z + 0.18);
  _tip.copy(_side).lerp(_chin, stroke);
  _dir.copy(_chin).sub(_side);
  if (_dir.lengthSq() < 1e-6) return;
  _dir.normalize();
  finger.position.copy(_tip).addScaledVector(_dir, -FINGER_LEN);
  finger.quaternion.setFromUnitVectors(_up, _dir);
  finger.scale.set(1, 1.35, 1);
  finger.visible = true;
  arm.rotation.set(-2.05 + 0.45 * stroke, 0.55 - 0.85 * stroke, 0.2 + 0.25 * stroke);
}

export function makeShadowDancer() {
  const model = makeDocao(undefined, { withGun: false, pose: 'idle' });
  const mat = new THREE.MeshBasicMaterial({ color: 0x140e0c, side: THREE.DoubleSide });
  model.group.traverse((o) => {
    if (!o.isMesh) return;
    if (o.userData.isOutline) { o.visible = false; return; }
    o.material = mat;
    o.castShadow = false;
  });
  model.shadowMat = mat;
  if (model.snout) model.snoutBase = model.snout.scale.clone();
  return model;
}

export function hideVictoryGuns(model) {
  if (!model || !model.guns || model._gunsHidden) return;
  model._gunVis = model.guns.map((g) => g.visible);
  model.guns.forEach((g) => { g.visible = false; if (g.userData.twin) g.userData.twin.visible = false; });
  if (model.backLid) { model._lidVis = model.backLid.visible; model.backLid.visible = false; }
  model._gunsHidden = true;
}

export function resetVictoryPose(model) {
  if (!model) return;
  rest(model);
  model.group.rotation.order = 'XYZ';
  model.group.rotation.x = 0;
  model.group.rotation.z = 0;
  if (model._gunsHidden && model.guns) {
    model.guns.forEach((g, i) => { g.visible = !!model._gunVis[i]; if (g.userData.twin) g.userData.twin.visible = g.visible; });
    if (model.backLid && model._lidVis != null) { model.backLid.visible = model._lidVis; model._lidVis = null; }
    model._gunsHidden = false;
  }
}

// Máquinas do Survival (Papada, Barraca da Sorte, arma na parede). Só visual.
import * as THREE from 'three';

const toon = (hex) => new THREE.MeshToonMaterial({ color: hex });
const basic = (hex, opacity = 1) => new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; return m;
}

export function makePapada() {
  const g = new THREE.Group();
  g.add(box(1.5, 1.15, 0.9, toon(0x4a3428), 0, 0.7, 0));
  g.add(box(1.62, 0.16, 1.02, toon(0x2a211c), 0, 1.28, 0));
  g.add(box(1.2, 0.42, 0.18, toon(0x1a120e), 0, 0.85, 0.42));
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.08), basic(0xff7a18, 0.9));
  mouth.position.set(0, 0.78, 0.5); g.add(mouth);
  const glow = new THREE.PointLight(0xff6a1a, 1.4, 6);
  glow.position.set(0, 1.1, 0.4); g.add(glow);
  const sign = signPlane('PAPADA', '#ffd27a', '#3a2418');
  sign.position.set(0, 1.7, 0); g.add(sign);
  g.userData.mouth = mouth; g.userData.glow = glow; g.userData.kind = 'papada';
  return g;
}

export function makeMysteryBox() {
  const g = new THREE.Group();
  const crate = box(1.15, 0.85, 1.15, toon(0x8b5a2b), 0, 0.55, 0);
  g.add(crate);
  g.add(box(1.22, 0.12, 1.22, toon(0x6b3f1d), 0, 1.02, 0));
  for (const [x, z] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), basic(0xffe08a));
    bulb.position.set(x, 1.12, z); g.add(bulb);
  }
  const mark = signPlane('?', '#fff6d8', '#6b2a1a');
  mark.position.set(0, 1.45, 0); g.add(mark);
  const lid = box(1.2, 0.1, 1.2, toon(0xc4892a), 0, 1.08, 0);
  g.add(lid);
  g.userData.lid = lid; g.userData.kind = 'box';
  return g;
}

export function makeWallGun(name) {
  const g = new THREE.Group();
  const board = box(0.18, 1.15, 1.7, toon(0x6b4423), 0, 1.15, 0);
  g.add(board);
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.85), toon(0x2c2c30));
  body.position.set(0.16, 1.2, 0.05); g.add(body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.55), toon(0x1a1a1e));
  barrel.position.set(0.2, 1.28, -0.45); g.add(barrel);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.28), toon(0x5a3a22));
  stock.position.set(0.16, 1.08, 0.42); g.add(stock);
  const label = signPlane(name, '#fff0cc', '#2a2118', 256, 64);
  label.scale.set(0.9, 0.28, 1); label.position.set(0.02, 1.85, 0); g.add(label);
  g.userData.kind = 'wall';
  return g;
}

export function makeOfferGun() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.9), toon(0xf2c94c));
  body.position.set(0, 1.5, 0); g.add(body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.5), basic(0xfff6d0));
  barrel.position.set(0, 1.58, -0.45); g.add(barrel);
  g.userData.kind = 'offer';
  return g;
}

function signPlane(text, fg, bg, cw = 256, ch = 96) {
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, cw, ch);
  x.strokeStyle = fg; x.lineWidth = 8; x.strokeRect(6, 6, cw - 12, ch - 12);
  x.fillStyle = fg; x.font = `900 ${ch * 0.46}px Fredoka, Arial Black, sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cw / 2, ch / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.48), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
  return m;
}

export function tickStation(mesh, t, phase) {
  const u = mesh.userData;
  if (u.kind === 'papada' && u.mouth) {
    const k = 0.55 + Math.sin(t * 8) * 0.35;
    u.mouth.material.opacity = k; if (u.glow) u.glow.intensity = 0.8 + k;
  }
  if (u.kind === 'box') {
    mesh.rotation.y = Math.sin(t * 0.7) * 0.08;
    if (u.lid) u.lid.rotation.x = phase && phase !== 'idle' ? -0.7 : 0;
  }
  if (u.kind === 'offer') mesh.rotation.y = t * 2.2;
}

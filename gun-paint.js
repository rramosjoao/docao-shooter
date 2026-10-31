// Pintura de skin de arma (caixote). Não mexe na camuflagem de abates: quem equipa skin, a camuflagem da partida espera.
import * as THREE from 'three';
import { toon, outline, canvasTex, drawLogo } from './docao.js';
import { resetWeaponCamo } from './weapon-camo.js';

const TEX = 64;

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function paintPixels(ctx, colorAt) {
  const image = ctx.createImageData(TEX, TEX);
  const data = image.data;
  for (let y = 0; y < TEX; y++) {
    for (let x = 0; x < TEX; x++) {
      const c = colorAt(x, y);
      const i = (y * TEX + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

function makeTex(draw) {
  const c = document.createElement('canvas');
  c.width = c.height = TEX;
  paintPixels(c.getContext('2d'), draw);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  return tex;
}

const G1 = rgb('#243018'), G2 = rgb('#3d5228'), G3 = rgb('#5c7340'), G4 = rgb('#1a2412');
const camoTex = makeTex((x, y) => {
  const n = Math.sin(x * 0.55 + y * 0.2) + Math.cos(y * 0.48 - x * 0.15) + Math.sin((x + y) * 0.22);
  if (n > 1.1) return G3;
  if (n > 0.15) return G2;
  if (n > -0.7) return G1;
  return G4;
});

const R1 = rgb('#3e2416'), R2 = rgb('#8a4a28'), R3 = rgb('#c46a32'), R4 = rgb('#d8a15a');
const rustTex = makeTex((x, y) => {
  const n = Math.sin(x * 0.9 + y * 0.35) * Math.cos(y * 0.7 + x * 0.2);
  if (n > 0.45) return R4;
  if (n > 0.05) return R3;
  if (n > -0.35) return R2;
  return R1;
});

const W1 = rgb('#0c3044'), W2 = rgb('#147a92'), W3 = rgb('#2eb8a0'), W4 = rgb('#f4f7f2');
const wavesTex = makeTex((x, y) => {
  const t = (y / TEX + Math.sin(x / 7) * 0.08) % 1;
  const u = t < 0 ? t + 1 : t;
  if (u < 0.12) return W4;
  if (u < 0.4) return W2;
  if (u < 0.62) return W3;
  return W1;
});

const rainbowTex = makeTex((x) => {
  const c = new THREE.Color().setHSL((x / TEX) % 1, 0.82, 0.52);
  return [Math.round(c.r * 255), Math.round(c.g * 255), Math.round(c.b * 255)];
});

const TEX_OF = { camo: camoTex, rust: rustTex, waves: wavesTex, rainbow: rainbowTex };

function skip(obj) {
  if (!obj) return true;
  if (obj.name === 'red-dot' || obj.name === 'gold-dress' || obj.name === 'lore-dress') return true;
  const u = obj.userData;
  return !!(u && (u.noCamo || u.noPaint || u.isOutline || u.loreBit));
}

function restoreMesh(mesh) {
  const mat = mesh.material;
  if (!mat || !mat.userData || !mat.userData.paintSrc) return;
  mesh.material = mat.userData.paintSrc;
  mat.dispose();
}

function walk(obj, fn) {
  if (!obj || skip(obj)) return;
  if (obj.isMesh) fn(obj);
  const children = obj.children;
  if (!children) return;
  for (let i = 0; i < children.length; i++) walk(children[i], fn);
}

function clearPaint(root) {
  const dress = root.userData && root.userData.goldDress;
  if (dress) { root.remove(dress); root.userData.goldDress = null; }
  walk(root, restoreMesh);
  if (root.userData) root.userData.gunPaint = '';
}

function ownMaterial(mesh) {
  const mat = mesh.material;
  if (!mat || mat.isMeshBasicMaterial || Array.isArray(mat) || !mat.color) return null;
  if (mat.userData && mat.userData.paintOwn) return mat;
  const clone = mat.clone();
  clone.userData = { paintOwn: true, paintSrc: mat };
  mesh.material = clone;
  return clone;
}

function paintMesh(mesh, paint) {
  const mat = ownMaterial(mesh);
  if (!mat) return;
  if (paint === 'gold') {
    mat.color.set('#e8c56b');
    mat.map = null;
    if (mat.emissive && mat.emissive.set) { mat.emissive.set('#c4892a'); mat.emissiveIntensity = 0.38; }
  } else {
    mat.color.set('#ffffff');
    mat.map = TEX_OF[paint];
    if (mat.emissive && mat.emissive.set) { mat.emissive.set('#000000'); mat.emissiveIntensity = 0.06; }
  }
  mat.needsUpdate = true;
}

function goldMark() {
  const tex = canvasTex(64, 64, (x, W, H) => {
    x.fillStyle = '#f3d78a';
    x.beginPath();
    x.roundRect(2, 2, W - 4, H - 4, 10);
    x.fill();
    drawLogo(x, W / 2, H / 2, H * 0.55, '#8a1420');
  });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.04), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
  plate.userData.noPaint = true;
  return plate;
}

function addGoldDress(group) {
  const dress = new THREE.Group();
  dress.name = 'gold-dress';
  dress.userData.noPaint = true;
  const gold = toon('#f3d78a'), skin = toon('#f7a531'), snoutC = toon('#f58a6e'), nose = toon('#3a0806');
  const put = (mesh, x, y, z) => { mesh.position.set(x, y, z); dress.add(mesh); outline(mesh, 0.003); return mesh; };
  const disc = put(new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.01, 14), gold), -0.062, 0.01, -0.06);
  disc.rotation.z = Math.PI / 2;
  const pig = put(new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.014, 12), snoutC), -0.072, 0.01, -0.06);
  pig.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) put(new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 6), nose), -0.08, s * 0.008, -0.06);
  for (const s of [-1, 1]) {
    const ear = put(new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), skin), -0.068, 0.04, -0.06 + s * 0.018);
    ear.scale.set(0.45, 1.3, 0.7);
  }
  const plate = goldMark();
  plate.position.set(-0.076, 0.0, 0.04);
  plate.rotation.y = -Math.PI / 2;
  dress.add(plate);
  group.add(dress);
  return dress;
}

export function applyGunPaint(root, paint) {
  if (!root) return;
  const next = paint === 'gold' || TEX_OF[paint] ? paint : '';
  if ((root.userData.gunPaint || '') === next && (next !== 'gold' || root.userData.goldDress)) return;
  clearPaint(root);
  resetWeaponCamo(root);
  root.userData.gunPaint = next;
  if (!next) return;
  walk(root, (o) => paintMesh(o, next));
  if (next === 'gold') root.userData.goldDress = addGoldDress(root);
}

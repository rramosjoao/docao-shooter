// Estilingue de Ovo em 1ª pessoa. Forquilha de madeira em pé, elástico vermelho e bolsinha de couro com o ovo.
// poseDraw(k) (bow-view.js): 0 = bolsinha solta, sem ovo; 1 = elástico no talo (bolsinha perto da câmera). poseRelease(t): bolsinha volta pra forquilha.
import * as THREE from 'three';
import { outline, toon } from './docao.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _axis = new THREE.Vector3(1, 0, 0);
const clamp01 = (k) => { const t = Number(k); return !Number.isFinite(t) ? 0 : t < 0 ? 0 : t > 1 ? 1 : t; };
const smooth = (t) => { const x = clamp01(t); return x * x * (3 - 2 * x); };
const ramp = (a, b, x) => clamp01((x - a) / (b - a));
function box(parent, w, h, d, color, x, y, z, ol = 0.004) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon(color)); m.position.set(x, y, z); parent.add(m); if (ol) outline(m, ol); return m; }
function span(mesh, ax, ay, az, bx, by, bz) { // estica uma caixa de comprimento 1 (eixo X) entre dois pontos
  _a.set(ax, ay, az); _b.set(bx, by, bz); const len = Math.max(0.001, _a.distanceTo(_b));
  mesh.position.copy(_a).add(_b).multiplyScalar(0.5); mesh.scale.set(len, 1, 1); _b.sub(_a).multiplyScalar(1 / len);
  const dot = _b.dot(_axis); if (dot > 0.999) mesh.quaternion.identity(); else if (dot < -0.999) mesh.quaternion.set(0, 0, 1, 0); else mesh.quaternion.setFromUnitVectors(_axis, _b);
}

export function makeFPSlingshot() {
  const g = new THREE.Group(); g.name = 'fp-estilingue';
  const cabo = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), toon('#8b5a2b')); cabo.position.set(0, -0.02, 0); g.add(cabo); outline(cabo, 0.004);
  box(g, 0.05, 0.05, 0.05, '#7a4a28', 0, 0.07, 0); // nó da forquilha
  const tips = [{ x: -0.07, y: 0.17, z: 0 }, { x: 0.07, y: 0.17, z: 0 }];
  for (const s of [-1, 1]) {
    const b = box(g, 0.03, 0.14, 0.03, '#8b5a2b', s * 0.035, 0.11, 0); b.rotation.z = -s * 0.45; // braço da forquilha
    box(g, 0.036, 0.03, 0.036, '#e63946', s * 0.07, 0.17, 0, 0.003); // fita vermelha na ponta
  }
  const bands = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.012, 0.006), toon('#e63946')); g.add(m); outline(m, 0.002); return m; });
  const pouch = box(g, 0.06, 0.035, 0.02, '#5a3a22', 0, 0.15, 0.03, 0.003); // bolsinha de couro
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), toon('#fff3dc')); egg.scale.set(1, 1.28, 1); outline(egg, 0.003); egg.userData.noCamo = true; g.add(egg);
  pouch.userData.noCamo = true;
  const ny = 0.15, rest = 0.03, pulled = 0.2;
  g.userData.grip = new THREE.Vector3(0, -0.06, 0.02); // mão esquerda no cabo
  g.userData.draw = new THREE.Vector3(0, ny, rest); // mão direita na bolsinha (o place atualiza)
  g.userData.egg = egg; g.userData.pouch = pouch;
  let pz = rest, loadA = -1;
  function place(z, show) {
    pz = z; pouch.position.set(0, ny, z);
    span(bands[0], tips[0].x, tips[0].y, tips[0].z, -0.03, ny, z); span(bands[1], tips[1].x, tips[1].y, tips[1].z, 0.03, ny, z);
    g.userData.draw.set(0, ny, z + 0.02); egg.visible = !!show;
    if (show && loadA < 0) egg.position.set(0, ny + 0.01, z - 0.015);
  }
  // recarga: o ovo novo sobe de baixo/direita até a bolsinha (a = 0..1)
  g.userData.reloadEgg = (a) => { const u = smooth(a); loadA = a; egg.visible = a > 0.02; egg.position.set(0.2 * (1 - u), (ny + 0.01) * u - 0.15 * (1 - u), (pz - 0.015) * u + 0.1 * (1 - u)); egg.rotation.set((1 - u) * 2.5, 0, (1 - u) * 1.2); if (a >= 1) loadA = -1; };
  g.userData.poseDraw = (k) => { loadA = -1; egg.rotation.set(0, 0, 0); place(rest + (pulled - rest) * smooth(ramp(0.1, 0.85, k)), k > 0.2); };
  g.userData.poseRelease = (t) => { loadA = -1; const e = 1 - Math.pow(1 - clamp01(t), 3); place(pulled + (rest - pulled) * e, false); };
  g.userData.poseDraw(1);
  return g;
}

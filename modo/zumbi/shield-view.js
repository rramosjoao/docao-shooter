// Tampa do Tacho em low-poly (toon, igual às outras armas). Sem importar docao.js — ele importa este arquivo.
import * as THREE from 'three';

const gradTex = (() => {
  const t = new THREE.DataTexture(new Uint8Array([95, 160, 210]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t;
})();
const toon = (color) => new THREE.MeshToonMaterial({ color, gradientMap: gradTex });
function outline(mesh) {
  const o = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ color: 0x2b1206, side: THREE.BackSide }));
  o.scale.setScalar(1.04); o.raycast = () => {}; o.userData.isOutline = true; mesh.add(o); return mesh;
}
const add = (geo, mat, x, y, z, parent) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); outline(m); return m; };

// Disco com um buraco de verdade. O caminho do buraco vai no sentido horário (o disco é anti-horário).
function lidGeo(R, thick, hole) {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, R, R, 0, Math.PI * 2, false, 0);
  const { x, y, w, h } = hole;
  const x0 = x - w / 2, x1 = x + w / 2, y0 = y - h / 2, y1 = y + h / 2;
  const path = new THREE.Path();
  path.moveTo(x0, y0); path.lineTo(x0, y1); path.lineTo(x1, y1); path.lineTo(x1, y0); path.closePath();
  shape.holes.push(path);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 14 });
  geo.translate(0, 0, -thick / 2);
  return geo;
}

// Disco de ferro com aro de latão, alça, visor e estágios (limpo / amassado / rachado / estilhaçado).
// see = primeira pessoa: o vidro não escreve profundidade, então o mapa aparece atrás, só tingido.
export function makeShieldMesh({ radius = 0.36, thick = 0.06, oval = 1.35, name = 'tampa', see = false } = {}) {
  const g = new THREE.Group(); g.name = name;
  const R = radius, iron = toon(0x8a9098), brass = toon(0xd7b15a), dark = toon(0x14161a), wood = toon(0x6b4423), skin = toon(0xee9c22);
  const face = new THREE.Group(); g.add(face);
  const hole = { x: R * 0.04, y: R * 0.18, w: R * 0.86, h: R * 0.34 };
  const disc = add(lidGeo(R, thick, hole), iron, 0, 0, 0, face);
  add(new THREE.TorusGeometry(R * 0.98, thick * 0.42, 6, 18), brass, 0, 0, 0, face);
  // aro do visor, em volta do buraco (coordenadas de antes do scale.y)
  const { x: hx, y: hy, w: hw, h: hh } = hole;
  add(new THREE.BoxGeometry(hw + R * 0.08, R * 0.045, thick * 0.55), brass, hx, hy + hh / 2, thick * 0.05, face);
  add(new THREE.BoxGeometry(hw + R * 0.08, R * 0.045, thick * 0.55), brass, hx, hy - hh / 2, thick * 0.05, face);
  add(new THREE.BoxGeometry(R * 0.045, hh, thick * 0.55), brass, hx - hw / 2, hy, thick * 0.05, face);
  add(new THREE.BoxGeometry(R * 0.045, hh, thick * 0.55), brass, hx + hw / 2, hy, thick * 0.05, face);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(hw * 0.96, hh * 0.9), new THREE.MeshBasicMaterial({
    color: see ? 0xc5d8e6 : 0x1c2830, transparent: true, opacity: see ? 0.22 : 0.72,
    depthWrite: !see, side: THREE.DoubleSide,
  }));
  glass.position.set(hx, hy, thick * 0.02); glass.userData.noCamo = true; face.add(glass);
  // alça e casco, do lado de quem segura (+Z, para a câmera)
  add(new THREE.BoxGeometry(R * 0.14, R * 0.55, thick * 1.3), wood, 0, -R * 0.12, thick * 1.1, face);
  add(new THREE.SphereGeometry(R * 0.16, 10, 8), skin, R * 0.16, -R * 0.42, thick * 1.6, face);
  for (const [x, y] of [[-0.62, 0.55], [0.62, 0.55], [-0.62, -0.55], [0.62, -0.55]]) {
    add(new THREE.CylinderGeometry(R * 0.055, R * 0.055, thick * 0.5, 6), brass, x * R, y * R, thick * 0.35, face).rotation.x = Math.PI / 2;
  }
  // +Z é o lado da câmera. Amassado e rachadura ficam no ferro, fora do visor e finos.
  const faceZ = thick * 0.85;
  const dents = new THREE.Group(); face.add(dents); dents.visible = false;
  add(new THREE.SphereGeometry(R * 0.1, 8, 6), toon(0x2a2e34), -R * 0.42, -R * 0.28, faceZ, dents);
  add(new THREE.SphereGeometry(R * 0.07, 8, 6), toon(0x24282e), R * 0.36, -R * 0.18, faceZ, dents);
  const cracks = new THREE.Group(); face.add(cracks); cracks.visible = false;
  const crack = (x, y, len, rot) => {
    const m = add(new THREE.BoxGeometry(R * 0.02, len, thick * 0.45), dark, x, y, faceZ, cracks);
    m.rotation.z = rot; return m;
  };
  crack(-R * 0.34, -R * 0.22, R * 0.42, 0.7);
  crack(R * 0.3, -R * 0.34, R * 0.32, -0.5);
  crack(-R * 0.08, -R * 0.48, R * 0.28, 0.2);
  const shards = new THREE.Group(); g.add(shards); shards.visible = false;
  const shard = (sx, sy, sz, rx, ry) => {
    const m = add(new THREE.CylinderGeometry(R * 0.22, R * 0.14, thick, 5), iron, sx, sy, sz, shards);
    m.rotation.set(Math.PI / 2 + rx, ry, 0);
    m.userData.home = { x: sx, y: sy, z: sz, rx: m.rotation.x, ry, rz: 0 };
    return m;
  };
  shard(-R * 0.2, R * 0.05, faceZ, 0.4, 0.3);
  shard(R * 0.22, -R * 0.08, faceZ, -0.5, -0.4);
  shard(0, -R * 0.28, faceZ, 0.2, 1);
  g.scale.y = oval;
  g.userData.span = { rx: R, ry: R * oval };
  const ironHex = 0x8a9098;
  g.userData.setStage = (stage) => {
    const broken = stage >= 3;
    face.visible = !broken; shards.visible = broken;
    dents.visible = stage >= 1 && !broken; cracks.visible = stage >= 2 && !broken;
    disc.material.color.setHex(stage >= 2 ? 0x5a6168 : stage >= 1 ? 0x727880 : ironHex);
    if (!broken) shards.children.forEach((m) => { const h = m.userData.home; if (!h) return; m.position.set(h.x, h.y, h.z); m.rotation.set(h.rx, h.ry, h.rz); m.scale.setScalar(1); });
  };
  // k = 1 no instante da quebra, 0 quando os cacos já saíram. A pistola entra no fim.
  g.userData.tickBreak = (k) => {
    const fly = 1 - Math.max(0, Math.min(1, k));
    shards.children.forEach((m, i) => {
      const h = m.userData.home; if (!h) return;
      m.position.set(h.x * (1 + fly * 2.2), h.y * (1 + fly * 1.6) + fly * 0.16, h.z + fly * (0.4 + i * 0.1));
      m.rotation.set(h.rx + fly * 2.2, h.ry + fly, fly * (1.8 + i));
      m.scale.setScalar(Math.max(0.08, 1 - fly * 0.85));
    });
  };
  g.userData.setStage(0);
  return g;
}

export function makeFPShield() { return makeShieldMesh({ radius: 0.42, thick: 0.055, oval: 1.22, name: 'fp-tampa', see: true }); }
export function makeWorldShield() { return makeShieldMesh({ radius: 0.42, thick: 0.06, oval: 1.48, name: 'tampa' }); }

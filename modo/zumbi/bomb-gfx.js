// Modo Bomba (protótipo): o "Botijão do Churrasco" (cel-shaded) e as marcas dos bomb sites A/B no chão.
import * as THREE from 'three';
import { toon, toonWarm, outline, canvasTex, drawLogo } from './docao.js';
import { BOMB } from './shared/bomb.js';

let bodyTex = null;
// Botijão de gás vermelho Cheers com faixa creme e "C!", alça em cima, registro de latão, grelhinha de churrasco e luzinha que pisca
export function makeBotijao(scale = 1) {
  if (!bodyTex) bodyTex = canvasTex(256, 128, (x, W, H) => {
    x.fillStyle = '#e63946'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#f5e6d0'; x.fillRect(0, H * 0.34, W, H * 0.32);
    for (const cx of [W * 0.25, W * 0.75]) drawLogo(x, cx, H / 2, H * 0.26, '#e63946');
  });
  const g = new THREE.Group();
  const m = (geo, mat, th = 0.008) => { const o = new THREE.Mesh(geo, mat); o.castShadow = true; g.add(o); if (th) outline(o, th); return o; };
  const prof = []; // perfil (lathe): pé, corpo, ombro arredondado
  const pts = [[0, 0], [0.2, 0], [0.21, 0.05], [0.19, 0.07], [0.24, 0.1], [0.25, 0.16], [0.25, 0.46], [0.235, 0.53], [0.19, 0.59], [0.11, 0.625], [0, 0.635]];
  for (const [r, y] of pts) prof.push(new THREE.Vector2(r, y));
  m(new THREE.LatheGeometry(prof, 28), toonWarm('#ffffff', 0.12, { map: bodyTex }), 0.01);
  const collar = m(new THREE.CylinderGeometry(0.12, 0.13, 0.1, 20, 1, true), toon('#c8202c', { side: THREE.DoubleSide })); collar.position.y = 0.67;
  const handle = m(new THREE.TorusGeometry(0.12, 0.022, 8, 24), toon('#c8202c')); handle.position.y = 0.73;
  const valve = m(new THREE.CylinderGeometry(0.035, 0.045, 0.08, 12), toon('#d9a441')); valve.position.y = 0.66;
  const knob = m(new THREE.CylinderGeometry(0.05, 0.05, 0.018, 14), toon('#2a1410')); knob.position.y = 0.705;
  // grelhinha de churrasco presa na frente (com dois espetinhos de linguiça)
  const grill = new THREE.Group(); grill.position.set(0, 0.32, 0.255); g.add(grill);
  for (let i = 0; i < 5; i++) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.012, 0.012), toon('#3a3a3a')); bar.position.y = -0.06 + i * 0.03; grill.add(bar); }
  for (const sx of [-0.05, 0.05]) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.12, 4, 8), toon('#8a3b1c')); s.rotation.z = Math.PI / 2; s.position.set(0, sx * 0.6, 0.02); grill.add(s); outline(s, 0.005); }
  // fio + luz piscando (vermelha → amarela perto de explodir)
  const wire = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.008, 6, 20, Math.PI), toon('#ffd27a')); wire.position.set(0, 0.5, 0); wire.rotation.y = Math.PI / 2; g.add(wire);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 8), new THREE.MeshBasicMaterial({ color: 0x551111 })); led.position.set(0, 0.6, 0.18); g.add(led);
  g.userData.led = led; g.scale.setScalar(scale); return g;
}
// marca do site no chão: anel grosso + letra gigante + coluna translúcida + letra flutuando
const letterTex = {};
function getLetterTex(L, color) {
  const k = L + color; if (letterTex[k]) return letterTex[k];
  return (letterTex[k] = canvasTex(256, 256, (x, W, H) => {
    x.clearRect(0, 0, W, H); x.font = 'bold 210px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineWidth = 18; x.strokeStyle = '#2a1410'; x.strokeText(L, W / 2, H / 2 + 10); x.fillStyle = color; x.fillText(L, W / 2, H / 2 + 10);
  }));
}
export function makeSiteMark(name) {
  const g = new THREE.Group(), R = BOMB.SITE_R, col = 0xffd27a;
  const flat = (geo, mat, y) => { const o = new THREE.Mesh(geo, mat); o.rotation.x = -Math.PI / 2; o.position.y = y; o.renderOrder = 2; g.add(o); return o; };
  const mat = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const ring = flat(new THREE.RingGeometry(R - 0.35, R, 64), mat(col, 0.95), 0.07);
  const fill = flat(new THREE.CircleGeometry(R - 0.35, 64), mat(0xffd27a, 0.12), 0.065);
  const letter = flat(new THREE.PlaneGeometry(R * 1.3, R * 1.3), new THREE.MeshBasicMaterial({ map: getLetterTex(name, '#ffd27a'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }), 0.08);
  const colm = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 5, 48, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })); colm.position.y = 2.5; g.add(colm);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getLetterTex(name, '#ffd27a'), depthTest: false, transparent: true })); sprite.scale.set(2.2, 2.2, 1); sprite.position.y = 6.5; sprite.renderOrder = 5; g.add(sprite);
  g.userData = { ring, fill, letter, colm, sprite }; return g;
}

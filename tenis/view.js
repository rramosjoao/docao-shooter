// Quadra de saibro, docões e a bola. A física mora em metros; aqui só se desenha.
import * as THREE from 'three';
import { makeDocao } from '../docao.js';
import { DOUBLES, HALF, SERVICE, SINGLES } from './physics.js';

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e7a56a');
  scene.fog = new THREE.Fog('#e7a56a', 42, 78);
  const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 80);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  scene.add(new THREE.AmbientLight('#ffe0c2', 0.72));
  const sun = new THREE.DirectionalLight('#fff0d2', 1.15);
  sun.position.set(-8, 18, -6);
  sun.castShadow = true;
  scene.add(sun);

  buildCourt(scene);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 22, 16),
    new THREE.MeshStandardMaterial({ color: '#d6e15a', roughness: 0.45 }),
  );
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.008, 8, 18),
    new THREE.MeshStandardMaterial({ color: '#f7f4ea', roughness: 0.4 }),
  );
  seam.rotation.y = 0.6;
  ball.add(seam);
  ball.castShadow = true;
  scene.add(ball);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 18),
    new THREE.MeshBasicMaterial({ color: '#3a2014', transparent: true, opacity: 0.35 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  scene.add(shadow);

  const aim = ring('#f4efe4');
  const mark = ring('#fffaf2');
  mark.scale.setScalar(0.42);
  const beacon = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 20),
    new THREE.MeshBasicMaterial({ color: '#c6ef4a', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthTest: false }),
  );
  beacon.visible = false;
  scene.add(aim, mark, beacon);

  const pigs = [];
  let snap = false;
  let camMode = 'wide';
  const camPos = new THREE.Vector3(0, 8, -16);
  const camLook = new THREE.Vector3();
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();

  function ring(color) {
    const mesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 32),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false, depthTest: false }),
    );
    mesh.rotation.x = -Math.PI / 2;
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(1.12, 1.32, 32),
      new THREE.MeshBasicMaterial({ color: '#fffaf2', side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthWrite: false }),
    );
    mesh.add(edge);
    mesh.visible = false;
    return mesh;
  }

  function setPlayers(seats) {
    for (const pig of pigs) scene.remove(pig.group);
    pigs.length = 0;
    seats.forEach((seat) => {
      const made = makeDocao(seat.skin || 'classico', { withGun: false, pose: 'idle' });
      const bat = racket();
      made.group.add(bat);
      made.racket = bat;
      made.group.scale.setScalar(0.78);
      scene.add(made.group);
      pigs.push(made);
    });
  }

  function sync(state, dt) {
    const { ball: b, players, aimAt, bounce, watch, mode } = state;
    if (players && players.length !== pigs.length) setPlayers(players);
    players?.forEach((p, i) => {
      const pig = pigs[i];
      if (!pig) return;
      pig.group.position.set(p.x, 0, p.z);
      const face = -p.side;
      pig.group.rotation.y = Math.atan2(0, face);
      pig.arms[0].rotation.set(0.35, 0.15, 0.55);
      pig.arms[1].rotation.set(0.2, -0.1, -0.35);
      if (pig.racket) {
        const hit = p.swing > 0;
        pig.racket.position.set(-0.72, hit ? 1.15 : 0.98, hit ? 0.85 : 0.48);
        pig.racket.rotation.set(hit ? -0.85 : 0.25, 0.85, hit ? -0.4 : 0.2);
      }
    });
    ball.visible = !!b;
    shadow.visible = !!b;
    if (b) {
      ball.position.set(b.x, Math.max(0.08, b.y), b.z);
      ball.rotation.x += dt * 6;
      shadow.position.set(b.x, 0.05, b.z);
      const lift = 1 + Math.max(0, b.y) * 0.12;
      shadow.scale.setScalar(lift);
    }
    aim.visible = !!aimAt;
    beacon.visible = !!aimAt;
    if (aimAt) {
      aim.position.set(aimAt.x, 0.1, aimAt.z);
      beacon.position.set(aimAt.x, 0.4, aimAt.z);
      const color = aimAt.ok ? '#c6ef4a' : '#e25a3c';
      aim.material.color.set(color);
      beacon.material.color.set(color);
      aim.material.opacity = 0.72;
    }
    mark.visible = !!bounce;
    if (bounce) mark.position.set(bounce.x, 0.1, bounce.z);
    placeCamera(watch, mode, dt);
    renderer.render(scene, camera);
  }

  function placeCamera(watch, mode, dt) {
    if (mode !== camMode) {
      if (mode === 'corner' || mode === 'wide' || camMode === 'wide') snap = true;
      camMode = mode;
    }
    if (!watch || mode === 'wide') {
      wantPos.set(0, 9.5, -18);
      wantLook.set(0, 0.4, 0);
    } else if (mode === 'corner') {
      const s = Math.sign(watch.z || 1);
      const flank = watch.x >= 0 ? -1 : 1;
      wantPos.set(flank * 7.2, 10.2, s * 18.5);
      wantLook.set(0, 0.45, s * 4);
    } else {
      const back = Math.sign(watch.side || -1);
      wantPos.set(watch.x * 0.3, 5.3, watch.z + back * 7.6);
      wantLook.set(watch.x * 0.08, 0.3, -back * 4.5);
    }
    const k = 1 - Math.exp(-dt * (mode === 'behind' ? 6 : 4));
    if (snap) {
      camPos.copy(wantPos);
      camLook.copy(wantLook);
      snap = false;
    } else {
      camPos.lerp(wantPos, k);
      camLook.lerp(wantLook, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  function pointerOnCourt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(ground, hit)) return null;
    return { x: hit.x, z: hit.z };
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  resize();
  return { resize, sync, pointerOnCourt };
}

function racket() {
  const g = new THREE.Group();
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.058, 0.42, 8),
    new THREE.MeshLambertMaterial({ color: '#2a211c' }),
  );
  grip.position.y = 0.16;
  const head = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.055, 8, 22),
    new THREE.MeshLambertMaterial({ color: '#141414' }),
  );
  head.position.y = 0.72;
  const strings = new THREE.Mesh(
    new THREE.CircleGeometry(0.33, 18),
    new THREE.MeshLambertMaterial({ color: '#f7f3ea', transparent: true, opacity: 0.95, side: THREE.DoubleSide }),
  );
  strings.position.y = 0.72;
  g.add(grip, head, strings);
  return g;
}

function buildCourt(scene) {
  const add = (mesh) => { scene.add(mesh); return mesh; };
  const box = (w, h, d, color, x, y, z) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    mesh.position.set(x, y, z);
    return add(mesh);
  };
  const dirt = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshLambertMaterial({ color: '#8a4b30' }));
  dirt.rotation.x = -Math.PI / 2;
  dirt.receiveShadow = true;
  add(dirt);
  const alley = box(DOUBLES * 2 + 0.4, 0.04, HALF * 2 + 0.4, '#b56538', 0, 0.02, 0);
  alley.receiveShadow = true;
  box(SINGLES * 2, 0.01, HALF * 2, '#d4844e', 0, 0.045, 0);
  const line = (w, d, x, z) => box(w, 0.012, d, '#f4efe4', x, 0.058, z);
  line(0.06, HALF * 2, SINGLES, 0);
  line(0.06, HALF * 2, -SINGLES, 0);
  line(0.06, HALF * 2, DOUBLES, 0);
  line(0.06, HALF * 2, -DOUBLES, 0);
  line(DOUBLES * 2, 0.06, 0, HALF);
  line(DOUBLES * 2, 0.06, 0, -HALF);
  line(SINGLES * 2, 0.05, 0, SERVICE);
  line(SINGLES * 2, 0.05, 0, -SERVICE);
  line(0.05, SERVICE * 2, 0, 0);
  line(0.05, 0.16, 0, HALF - 0.08);
  line(0.05, 0.16, 0, -HALF + 0.08);
  const post = DOUBLES + 0.55;
  box(0.08, 1.07, 0.08, '#f7f1e6', post, 0.53, 0);
  box(0.08, 1.07, 0.08, '#f7f1e6', -post, 0.53, 0);
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(post * 2, 0.96),
    new THREE.MeshLambertMaterial({ color: '#f7f3ea', transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
  );
  net.position.y = 0.5;
  add(net);
  box(post * 2, 0.04, 0.04, '#f4efe4', 0, 0.98, 0);
  box(5.2, 2.8, 4.2, '#7a4a32', 16, 1.4, -2);
  box(5.8, 0.55, 4.8, '#5c3824', 16, 2.95, -2);
  box(1.1, 1.6, 0.08, '#3d2918', 16, 0.9, -0.1);
}

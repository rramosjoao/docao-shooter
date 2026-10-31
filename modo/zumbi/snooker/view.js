// Celeiro, mesa e tacos. A física mora no plano; aqui só se desenha.
import * as THREE from 'three';
import { makeDocao } from '../docao.js';
import { FOOT, HEAD, L, POCKETS, R, W } from './physics.js';

const HX = L / 2;
const HZ = W / 2;
const TOP = 0.86;

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#24160f');
  scene.fog = new THREE.Fog('#24160f', 9, 18);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.02, 40);
  const raycaster = new THREE.Raycaster();
  const clothPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TOP);
  const pointer = new THREE.Vector2();

  scene.add(new THREE.AmbientLight('#ffe0b8', 0.55));
  const sun = new THREE.DirectionalLight('#ffd2a2', 1.15);
  sun.position.set(-3.2, 6.4, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  const lamp = new THREE.PointLight('#ffb060', 18, 9, 2);
  lamp.position.set(0.2, 2.7, 0);
  scene.add(lamp);

  const beam = buildBarn(scene);
  buildTable(scene);

  const ballMeshes = new Map();
  const preview = ballMesh('#f4efe4', 0, false);
  preview.visible = false;
  scene.add(preview);

  const ghost = new THREE.Mesh(
    new THREE.SphereGeometry(R, 18, 12),
    new THREE.MeshBasicMaterial({ color: '#3dbe6a', transparent: true, opacity: 0.35 }),
  );
  ghost.visible = false;
  scene.add(ghost);

  const aimLine = makeLine('#3dbe6a', false);
  const objLine = makeLine('#3dbe6a', false);
  const defLine = makeLine('#3dbe6a', false);
  const bounce = makeLine('#e23b2f', true);
  bounce.computeLineDistances();
  scene.add(aimLine, objLine, defLine, bounce);

  const pocketGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.045, 0.078, 24),
    new THREE.MeshBasicMaterial({ color: '#3dbe6a', transparent: true, opacity: 0.9, side: THREE.DoubleSide }),
  );
  pocketGlow.rotation.x = -Math.PI / 2;
  pocketGlow.visible = false;
  scene.add(pocketGlow);

  const stick = new THREE.Group();
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.026, 1.35, 12),
    new THREE.MeshLambertMaterial({ color: '#c9854a' }),
  );
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.675;
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.007, 0.01, 0.09, 8),
    new THREE.MeshLambertMaterial({ color: '#f3ecdf' }),
  );
  tip.rotation.x = Math.PI / 2;
  tip.position.z = -0.04;
  stick.add(shaft, tip);
  stick.visible = false;
  scene.add(stick);

  const pigs = [];
  let pigTurn = 0;
  let mode = 'aim';
  let aimAngle = 0;
  let cuePos = null;
  let watch = null;
  const camPos = new THREE.Vector3(0.2, 3.5, 2.8);
  const camLook = new THREE.Vector3();
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  let snapCam = false;

  function resize() {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
  }

  function setBalls(balls) {
    const seen = new Set();
    for (const b of balls) {
      seen.add(b.id);
      let mesh = ballMeshes.get(b.id);
      if (!mesh) {
        mesh = ballMesh(b);
        ballMeshes.set(b.id, mesh);
        scene.add(mesh);
      }
      mesh.visible = !b.pocketed;
      mesh.position.set(b.x, TOP + R, b.z);
    }
    for (const [id, mesh] of ballMeshes) {
      if (seen.has(id)) continue;
      scene.remove(mesh);
      ballMeshes.delete(id);
    }
  }

  function setPreview(spot) {
    preview.visible = !!spot;
    if (spot) preview.position.set(spot.x, TOP + R, spot.z);
  }

  function setAim(cue, result, legal) {
    aimLine.visible = false;
    objLine.visible = false;
    defLine.visible = false;
    bounce.visible = false;
    ghost.visible = false;
    pocketGlow.visible = false;
    if (!cue || cue.pocketed || !result) return;
    const y = TOP + 0.008;
    const ok = !!(result.ball && legal?.has(result.ball.id));
    const color = result.ball ? (ok ? '#3dbe6a' : '#e23b2f') : '#e23b2f';
    if (result.ghost && result.ball) {
      paint(aimLine, color, cue.x, cue.z, result.ghost.x, result.ghost.z, y);
      paint(objLine, color, result.ball.x, result.ball.z, result.objectEnd.x, result.objectEnd.z, y);
      const d = result.deflect;
      paint(defLine, color, result.ghost.x, result.ghost.z, result.ghost.x + d.x * d.len, result.ghost.z + d.z * d.len, y);
      ghost.position.set(result.ghost.x, TOP + R, result.ghost.z);
      ghost.material.color.set(color);
      ghost.visible = true;
      if (result.pocket) {
        pocketGlow.position.set(result.pocket.x, y, result.pocket.z);
        pocketGlow.material.color.set(color);
        pocketGlow.visible = true;
        const pulse = 1 + Math.sin(performance.now() / 180) * 0.08;
        pocketGlow.scale.setScalar(pulse);
      }
      return;
    }
    if (result.cushion) {
      const c = result.cushion;
      paint(bounce, color, cue.x, cue.z, c.x, c.z, y);
      if (result.reflect) paint(aimLine, color, c.x, c.z, result.reflect.x, result.reflect.z, y);
    }
  }

  function setCue(pos, angle, pullMeters, visible) {
    if (!visible || !pos) { stick.visible = false; return; }
    const gap = R + 0.012 + pullMeters;
    stick.visible = true;
    stick.position.set(pos.x - Math.cos(angle) * gap, TOP + 0.03, pos.z - Math.sin(angle) * gap);
    stick.rotation.order = 'YXZ';
    stick.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle));
    stick.rotation.x = -0.04;
  }

  function setPigs(seats) {
    for (const pig of pigs) scene.remove(pig.group);
    pigs.length = 0;
    const spots = [
      [0.2, -(HZ + 1.15)],
      [0.15, HZ + 1.15],
      [-(HX + 1.05), 0.2],
      [HX + 1.05, -0.2],
    ];
    seats.forEach((seat, i) => {
      const made = makeDocao(seat.skin || 'classico', { withGun: false, pose: 'idle' });
      const [x, z] = spots[i] || spots[0];
      const stick = handheldCue();
      made.group.add(stick);
      made.cueStick = stick;
      made.home = { x, z };
      made.group.position.set(x, 0, z);
      made.group.rotation.y = Math.atan2(-x, -z);
      made.group.scale.setScalar(0.52);
      restArms(made);
      scene.add(made.group);
      pigs.push(made);
    });
  }

  function placePlayers(turn, cueAt, angle) {
    pigs.forEach((pig, i) => {
      const shooting = i === turn && cueAt;
      pig.cueStick.visible = !shooting;
      if (!shooting) {
        pig.group.position.set(pig.home.x, 0, pig.home.z);
        pig.group.rotation.y = Math.atan2(-pig.home.x, -pig.home.z);
        pig.group.scale.setScalar(0.52);
        restArms(pig);
        return;
      }
      const stand = railStand(cueAt, angle);
      pig.group.position.set(stand.x, 0, stand.z);
      pig.group.rotation.y = Math.atan2(Math.cos(angle), Math.sin(angle));
      pig.group.scale.setScalar(0.48);
      pig.arms[0].rotation.set(-1.2, 0.42, -0.12);
      pig.arms[1].rotation.set(-0.95, -0.48, 0.22);
    });
  }

  function setTurn(index) { pigTurn = index; }

  function look(next, cue, angle, watchAt) {
    if (next === 'corner' && mode !== 'corner') snapCam = true;
    mode = next;
    aimAngle = angle || 0;
    cuePos = cue && !cue.pocketed ? cue : null;
    watch = watchAt || null;
    beam.visible = next !== 'top';
    const fov = next === 'aim' ? 42 : next === 'top' ? 36 : next === 'corner' ? 50 : 40;
    if (camera.fov !== fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function update(dt) {
    const k = 1 - Math.exp(-dt * (mode === 'aim' ? 8 : 4));
    if (mode === 'top') {
      wantPos.set(0, 4.6, 0.02);
      wantLook.set(0, 0, 0);
    } else if (mode === 'aim' && cuePos) {
      const stand = railStand(cuePos, aimAngle);
      const bx = -Math.cos(aimAngle);
      const bz = -Math.sin(aimAngle);
      wantPos.set(stand.x + bx * 0.9, TOP + 0.72, stand.z + bz * 0.9);
      wantLook.set(cuePos.x, TOP + 0.02, cuePos.z);
    } else if (mode === 'corner' && cuePos) {
      const feet = railPoint(cuePos, aimAngle);
      const bx = -Math.cos(aimAngle);
      const bz = -Math.sin(aimAngle);
      const sx = Math.sin(aimAngle);
      const sz = -Math.cos(aimAngle);
      wantPos.set(feet.x + bx * 0.85 - sx * 2.35, TOP + 2.15, feet.z + bz * 0.85 - sz * 2.35);
      wantLook.set(cuePos.x * 0.65 + feet.x * 0.35, TOP + 0.05, cuePos.z * 0.65 + feet.z * 0.35);
    } else if (mode === 'corner') {
      wantPos.set(0.1, TOP + 1.7, 2.05);
      wantLook.set(0, TOP, 0);
    } else if (watch) {
      const bx = -Math.cos(watch.angle);
      const bz = -Math.sin(watch.angle);
      wantPos.set(watch.x * 0.6 + bx * 1.8, TOP + 2.05, watch.z * 0.6 + bz * 1.8);
      wantLook.set(watch.x * 0.45, TOP, watch.z * 0.45);
    } else {
      wantPos.set(0, TOP + 2.4, 1.7);
      wantLook.set(0, TOP, 0);
    }
    if (snapCam) {
      camPos.copy(wantPos);
      camLook.copy(wantLook);
      snapCam = false;
    } else {
      camPos.lerp(wantPos, k);
      camLook.lerp(wantLook, k);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    const active = pigs[pigTurn];
    if (active) active.group.position.y = Math.sin(performance.now() / 420) * 0.015;
    renderer.render(scene, camera);
  }

  function pointerToTable(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(clothPlane, hit)) return null;
    return { x: hit.x, z: hit.z };
  }

  function project(x, z) {
    const v = new THREE.Vector3(x, TOP, z).project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + (v.x + 1) * 0.5 * rect.width,
      y: rect.top + (1 - v.y) * 0.5 * rect.height,
    };
  }

  resize();
  return { resize, setBalls, setPreview, setAim, setCue, setPigs, placePlayers, setTurn, look, update, pointerToTable, project };
}

function railPoint(cue, angle) {
  const bx = -Math.cos(angle);
  const bz = -Math.sin(angle);
  const ox = HX + 0.9;
  const oz = HZ + 0.85;
  let t = 0.15;
  for (; t < 5.2; t += 0.02) {
    const x = cue.x + bx * t;
    const z = cue.z + bz * t;
    if (Math.abs(x) >= ox || Math.abs(z) >= oz) break;
  }
  return { x: cue.x + bx * t, z: cue.z + bz * t };
}

function railStand(cue, angle) {
  const feet = railPoint(cue, angle);
  return {
    x: feet.x + Math.sin(angle) * 0.32,
    z: feet.z - Math.cos(angle) * 0.32,
  };
}

function restArms(pig) {
  pig.arms[0].rotation.set(-0.55, 0.25, -0.35);
  pig.arms[1].rotation.set(0.1, -0.05, 0.16);
}

function handheldCue() {
  const g = new THREE.Group();
  g.position.set(0.02, 0.48, 0.42);
  g.rotation.set(-0.15, 0.35, -0.55);
  const wood = new THREE.MeshLambertMaterial({ color: '#e7b56a' });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.048, 1.55, 8), wood);
  shaft.position.y = 0.72;
  const tip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.03, 0.16, 6),
    new THREE.MeshLambertMaterial({ color: '#fff6e4' }),
  );
  tip.position.y = 1.54;
  g.add(shaft, tip);
  return g;
}

function ballMesh(ball) {
  const spec = ball && typeof ball === 'object' ? ball : { color: ball || '#f4efe4', n: 0, stripe: false };
  const mat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    map: ballTexture(spec.color || '#f4efe4', !!spec.stripe),
    roughness: 0.32,
    metalness: 0.04,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(R, 32, 24), mat);
  mesh.castShadow = true;
  if (spec.n) {
    const mark = new THREE.Mesh(
      new THREE.CircleGeometry(R * 0.46, 20),
      new THREE.MeshBasicMaterial({ map: numberTexture(spec.n), transparent: true, depthWrite: false }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.y = R * 1.02;
    mesh.add(mark);
  }
  return mesh;
}

function ballTexture(color, stripe) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = stripe ? '#f4efe4' : color;
  g.fillRect(0, 0, 256, 128);
  if (stripe) {
    g.fillStyle = color;
    g.fillRect(0, 34, 256, 60);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function numberTexture(n) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 128, 128);
  g.fillStyle = '#fffaf2';
  g.beginPath();
  g.arc(64, 64, 58, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 7;
  g.strokeStyle = '#1a120e';
  g.stroke();
  g.fillStyle = '#1a120e';
  g.font = '700 ' + (n >= 10 ? 58 : 74) + 'px Trebuchet MS, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(String(n), 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeLine(color, dashed) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.05, gapSize: 0.04 })
    : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geo, mat);
  line.visible = false;
  return line;
}

function paint(line, color, x1, z1, x2, z2, y) {
  const pos = line.geometry.attributes.position.array;
  pos[0] = x1; pos[1] = y; pos[2] = z1;
  pos[3] = x2; pos[4] = y; pos[5] = z2;
  line.geometry.attributes.position.needsUpdate = true;
  line.material.color.set(color);
  line.visible = true;
  line.computeLineDistances();
}

function buildBarn(scene) {
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 12),
    new THREE.MeshLambertMaterial({ color: '#6a432c' }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const wallMat = new THREE.MeshLambertMaterial({ color: '#4a301f' });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.2), wallMat);
  back.position.set(0, 2.1, -4.2);
  scene.add(back);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4.2), wallMat);
    wall.position.set(side * 5.2, 2.1, -0.4);
    wall.rotation.y = side * -Math.PI / 2;
    scene.add(wall);
  }
  const beam = new THREE.Mesh(
    new THREE.BoxGeometry(10, 0.16, 0.22),
    new THREE.MeshLambertMaterial({ color: '#3a2418' }),
  );
  beam.position.set(0, 3.15, 0);
  scene.add(beam);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.5),
    new THREE.MeshBasicMaterial({ color: '#ff8a3d' }),
  );
  glow.position.set(-4.2, 2.2, -4.15);
  scene.add(glow);
  return beam;
}

function buildTable(scene) {
  const wood = new THREE.MeshLambertMaterial({ color: '#6e4128' });
  const bed = new THREE.Mesh(new THREE.BoxGeometry(L + 0.34, 0.16, W + 0.28), wood);
  bed.position.y = TOP - 0.1;
  bed.castShadow = true;
  bed.receiveShadow = true;
  scene.add(bed);
  const cloth = new THREE.Mesh(
    new THREE.BoxGeometry(L, 0.03, W),
    new THREE.MeshLambertMaterial({ color: '#1f6b3a' }),
  );
  cloth.position.y = TOP - 0.012;
  cloth.receiveShadow = true;
  scene.add(cloth);
  for (const x of [-HX - 0.02, HX + 0.02]) {
    for (const z of [-HZ + 0.28, HZ - 0.28]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, TOP - 0.18, 0.12), wood);
      leg.position.set(x, (TOP - 0.18) / 2, z);
      scene.add(leg);
    }
  }
  const cushion = new THREE.MeshLambertMaterial({ color: '#2f8a4c' });
  const rails = [
    [-HX * 0.5 - 0.08, HZ + 0.045, HX - 0.28, 0.07],
    [HX * 0.5 + 0.08, HZ + 0.045, HX - 0.28, 0.07],
    [-HX * 0.5 - 0.08, -HZ - 0.045, HX - 0.28, 0.07],
    [HX * 0.5 + 0.08, -HZ - 0.045, HX - 0.28, 0.07],
  ];
  for (const [x, z, len] of rails) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(len, 0.055, 0.07), cushion);
    box.position.set(x, TOP + 0.03, z);
    scene.add(box);
  }
  for (const x of [-HX - 0.045, HX + 0.045]) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.055, W - 0.22), cushion);
    box.position.set(x, TOP + 0.03, 0);
    scene.add(box);
  }
  const hole = new THREE.MeshBasicMaterial({ color: '#140c09' });
  for (const p of POCKETS) {
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.055, 16), hole);
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.set(Math.max(-HX, Math.min(HX, p.x)), TOP + 0.006, Math.max(-HZ, Math.min(HZ, p.z)));
    scene.add(mouth);
  }
  markCloth(scene);
}

function markCloth(scene) {
  const y = TOP + 0.006;
  const mat = new THREE.LineBasicMaterial({ color: '#f4efe4', transparent: true, opacity: 0.7 });
  const head = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(HEAD, y, -W / 2 + 0.04),
    new THREE.Vector3(HEAD, y, W / 2 - 0.04),
  ]);
  scene.add(new THREE.Line(head, mat));
  const dotMat = new THREE.MeshBasicMaterial({ color: '#f4efe4' });
  for (const spot of [{ x: HEAD, z: 0 }, { x: 0, z: 0 }, { x: FOOT, z: 0 }]) {
    const dot = new THREE.Mesh(new THREE.CircleGeometry(0.012, 12), dotMat);
    dot.rotation.x = -Math.PI / 2;
    dot.position.set(spot.x, y, spot.z);
    scene.add(dot);
  }
}

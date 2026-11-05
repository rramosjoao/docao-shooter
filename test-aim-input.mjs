// node test-aim-input.mjs — testa os handlers reais sem iniciar o renderizador.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import { kickRecoil, stepRecoil, cancelRecoilReturn } from './shared/recoil.js';
const source = readFileSync(new URL('./main.js', import.meta.url), 'utf8');
const start = source.indexOf("document.addEventListener('mousemove', (e) => {");
const handler = source.slice(start, source.indexOf('\n});', start) + 4);
function setup() {
  const canvas = {}, p = { yaw: 0, pitch: 0.3, weapon: 0 };
  kickRecoil(p, { key: 'rifle', recoil: 0.018, rate: 0.1, auto: true }, 0);
  const c = vm.createContext({ canvas, player: p, p, state: 'playing', gunner: null, ac130: null, predator: null,
    sens: 1, ads: 0, BASE_FOV: 75, camera: { fov: 75, rotation: {} }, lookInputSeq: 0,
    cancelRecoilReturn,
    WEAPONS: [{ recoilBack: 0.5 }], dt: 0.05, clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    document: { pointerLockElement: canvas, addEventListener: (_name, fn) => { c.mouse = fn; } } });
  vm.runInContext(handler, c);
  return c;
}
test('ajuste horizontal ou vertical cancela o retorno e mantém a nova direção', () => {
  for (const delta of [[90, 0], [0, -40], [-100, 80]]) {
    const c = setup(); c.mouse({ movementX: delta[0], movementY: delta[1] });
    assert.equal(c.p.recoil.pitch, 0); assert.equal(c.lookInputSeq, 1);
    const pitch = c.p.pitch, yaw = c.p.yaw;
    for (let i = 0; i < 30; i++) stepRecoil(c.p, 0.05, 0.05 * (i + 1));
    assert.equal(c.p.pitch, pitch); assert.equal(c.p.yaw, yaw);
  }
});
test('sem movimento, coice continua retornando normalmente', () => {
  const c = setup(); c.mouse({ movementX: 0, movementY: 0 });
  const pitch = c.p.pitch;
  assert.ok(c.p.recoil.pitch > 0); assert.equal(c.lookInputSeq, 0);
  stepRecoil(c.p, 0.05, 0.5); assert.ok(c.p.pitch < pitch);
});
test('mouse fora do jogo ou salto espúrio não cancela a recuperação', () => {
  for (const blocked of ['paused', 'unlocked', 'spike']) {
    const c = setup();
    if (blocked === 'paused') c.state = 'paused';
    if (blocked === 'unlocked') c.document.pointerLockElement = null;
    c.mouse({ movementX: blocked === 'spike' ? 300 : 10, movementY: 0 });
    assert.ok(c.p.recoil.pitch > 0); assert.equal(c.p.yaw, 0);
  }
});

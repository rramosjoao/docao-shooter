import assert from 'node:assert/strict';
import test from 'node:test';
import { kickRecoil, stepRecoil, resetRecoil, cancelRecoilReturn } from './shared/recoil.js';
import { WEAPONS } from './shared/rules.js';
const ent = () => ({ pitch: 0, yaw: 0, crouch: 0 });
const rifle = WEAPONS[0];
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);
test('Commando e LMG exigem compensação após cinco tiros, com dano original', () => {
  for (const [key, damage] of [['commando', 12], ['lmg', 15]]) {
    const w = WEAPONS.find(w => w.key === key), hip = ent(), ads = ent();
    for (let i = 0; i < 5; i++) { kickRecoil(hip, w, i * w.rate); kickRecoil(ads, w, i * w.rate, 1); }
    assert.ok(hip.pitch > 0.1, key); assert.ok(ads.pitch > 0.08, key); assert.equal(w.dmg, damage);
  }
});
test('só Canhão/Carabina têm coice sem luneta reforçado; com luneta mantêm o anterior', () => {
  for (const index of [2, 5, 6]) {
    const w = WEAPONS[index], hip = ent(), scope = ent();
    kickRecoil(hip, w, 0, 0, false); kickRecoil(scope, w, 0, 1, true);
    close(scope.pitch, w.recoil * 0.85 * 0.75);
    if (index === 2) close(hip.pitch, w.recoil * 0.85);
    else assert.ok(hip.pitch > w.recoil * 1.7);
  }
});
test('spray reproduzível, sobe e muda de lado sem sorteio', () => {
  const spray = () => {
    const p = ent(), trace = [];
    for (let i = 0; i < 20; i++) { const prev = p.yaw; kickRecoil(p, rifle, i * rifle.rate); trace.push([p.pitch, p.yaw - prev]); }
    return trace;
  };
  const a = spray(); assert.deepEqual(a, spray());
  assert.ok(a[8][0] > a[0][0]); assert.ok(a.some((v) => v[1] > 0) && a.some((v) => v[1] < 0));
});
test('ADS e agachamento reduzem o coice', () => {
  const hip = ent(), ads = ent(), crouch = { ...ent(), crouch: 1 };
  kickRecoil(hip, rifle, 0); kickRecoil(ads, rifle, 0, 1); kickRecoil(crouch, rifle, 0, 1);
  assert.ok(hip.pitch > ads.pitch && ads.pitch > crouch.pitch);
});
test('limites de spray e teto da câmera não acumulam recuperação invisível', () => {
  const p = ent();
  for (let i = 0; i < 600; i++) kickRecoil(p, rifle, i * rifle.rate);
  assert.ok(p.pitch <= 0.24 + 1e-8 && Math.abs(p.yaw) <= 0.065 + 1e-8);
  const high = { ...ent(), pitch: 1.499 };
  kickRecoil(high, rifle, 0); close(high.recoil.pitch, 0.001);
  stepRecoil(high, 10, 10); close(high.pitch, 1.499);
});
test('retorno começa depois da pausa e independe de FPS', () => {
  const run = (dt) => {
    const p = ent(); for (let i = 0; i < 7; i++) kickRecoil(p, rifle, 0);
    const top = p.pitch; stepRecoil(p, 0.1, 0.1); close(p.pitch, top);
    let t = 0.1;
    while (t < 1.6 - 1e-9) { const h = Math.min(dt, 1.6 - t); t += h; stepRecoil(p, h, t); }
    assert.ok(p.pitch < 0.0001); return p;
  };
  const reference = run(1 / 20);
  for (const fps of [30, 60, 144]) { const p = run(1 / fps); close(p.pitch, reference.pitch); close(p.yaw, reference.yaw); }
});
test('compensação manual cancela retorno, mas preserva sequência do spray', () => {
  const p = ent(); kickRecoil(p, rifle, 0); kickRecoil(p, rifle, 0.1);
  cancelRecoilReturn(p); p.pitch -= 0.02; p.yaw += 0.15;
  const before = { ...p }; stepRecoil(p, 0.3, 0.5);
  close(p.pitch, before.pitch); close(p.yaw, before.yaw);
  kickRecoil(p, rifle, 0.2); assert.equal(p.recoil.shots, 3); assert.ok(p.pitch > before.pitch);
});
test('pausa longa reinicia padrão; troca/respawn descartam retorno antigo', () => {
  const p = ent(); for (let i = 0; i < 5; i++) kickRecoil(p, rifle, i * 0.1);
  kickRecoil(p, rifle, 2); assert.equal(p.recoil.shots, 1);
  const pitch = p.pitch; resetRecoil(p); stepRecoil(p, 1, 4); close(p.pitch, pitch);
  kickRecoil(p, WEAPONS[4], 5); assert.equal(p.recoil.key, WEAPONS[4].key); assert.equal(p.recoil.shots, 1);
});
test('sniper, escopeta, SMG, revólver e metralhadora têm coice real; melee não', () => {
  for (const w of WEAPONS.filter((w) => w.recoil > 0 && !w.melee && !w.saber)) {
    const p = ent(); kickRecoil(p, w, 0); assert.ok(p.pitch > 0, w.key);
  }
  const p = ent(); kickRecoil(p, WEAPONS[7], 0); assert.equal(p.pitch, 0); assert.ok(!p.recoil);
});

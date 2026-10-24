// Inspecionar arma (tecla I): curva da animação e perfis por tipo. Sem DOM, sem three (testável no Node).
export const INSPECT_DUR = 2.2, INSPECT_HOLD = 0.7, INSPECT_FADE = 0.12;
const P = (ry, rz, rx, x, y, z) => ({ ry, rz, rx, x, y, z });
export const INSPECT_PROFILES = {
  rifle: { a: P(0.85, 0.35, 0.12, -0.08, 0.05, 0.05), b: P(-0.55, -0.55, 0.25, -0.05, 0.07, 0.03) },
  pistol: { a: P(1.1, 0.45, 0.1, -0.1, 0.06, 0.08), b: P(-0.8, -0.7, 0.3, -0.06, 0.08, 0.06) },
  sniper: { a: P(0.6, 0.3, 0.08, -0.06, 0.04, 0.03), b: P(-0.35, -0.5, 0.18, -0.04, 0.05, 0.02) },
  rocket: { a: P(0.38, 0.12, -0.1, -0.04, -0.08, 0), b: P(-0.15, -0.3, 0.12, 0, -0.05, 0) }, // bazuca: baixa do ombro e mostra o adesivo
  bow: { a: P(0.7, -0.25, 0.1, -0.08, 0.05, 0.04), b: P(-0.4, 0.35, 0.2, -0.05, 0.06, 0.03) },
  knife: { a: P(0.3, 0.2, 0.06, -0.05, 0.04, 0.02), b: P(-0.2, -0.3, 0.1, -0.03, 0.05, 0.02), flip: true }, // gira a faca no dedo
  saber: { a: P(0.35, 0.25, 0.05, -0.05, 0.03, 0), b: P(-0.3, -0.3, 0.08, -0.03, 0.04, 0), twist: 1.2 }, // torce o cabo
  disc: { a: P(0.7, 0.3, -0.15, -0.07, 0.06, 0.04), b: P(-0.45, -0.6, 0.2, -0.05, 0.07, 0.03) },
  heavy: { a: P(0.45, 0.2, -0.05, -0.05, -0.03, 0), b: P(-0.25, -0.35, 0.12, -0.03, -0.01, 0), spin: true }, // minigun: pesada, gira pouco
  lmg: { a: P(-1.25, 0.14, 0.06, -0.02, -0.04, 0.02), b: P(0.7, -0.18, 0.05, 0.03, -0.035, 0.02) }, // giro largo pro lado da caixa de fita e do cano; baixada leve
  revolver: { a: P(0.42, 0.16, 0.05, -0.03, 0.02, 0.015), b: P(-0.28, -0.2, 0.06, -0.02, 0.03, 0.012) }, // o giro no dedo mora no viewmodel; aqui só um inclinar curto
};
// perfil pelas flags que já existem (arma nova funciona sem mexer aqui); w.inspect força um perfil
export function inspectKind(w) {
  if (!w) return 'rifle';
  if (w.inspect && INSPECT_PROFILES[w.inspect]) return w.inspect;
  if (w.saber) return 'saber'; if (w.melee) return 'knife'; if (w.rocket) return 'rocket'; if (w.scope) return 'sniper'; if (w.disc) return 'disc';
  if (w.heavy || w.spin) return 'heavy';
  if (w.key === 'arco' || w.key === 'besta' || w.egg) return 'bow'; // estilingue usa as mesmas mãos do arco
  if (w.key === 'pistol' || w.key === 'prego') return 'pistol';
  return 'rifle';
}
const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const AX = ['ry', 'rz', 'rx', 'x', 'y', 'z'];
// k 0..1: descanso → lado A (0–0,18) · segura A (até 0,42) · vira pro B (0,42–0,62) · segura B (até 0,8) · volta (0,8–1)
export function inspectPose(k, prof, out = {}) {
  const ta = ss(0, 0.18, k) * (1 - ss(0.42, 0.62, k)), tb = ss(0.42, 0.62, k) * (1 - ss(0.8, 1, k));
  for (const c of AX) out[c] = prof.a[c] * ta + prof.b[c] * tb;
  out.ry += Math.sin(k * Math.PI * 3) * 0.04 * (ta + tb); // respira
  const f = ss(0.44, 0.6, k); out.flip = prof.flip && f < 1 ? f * Math.PI * 2 : 0;
  out.twist = (prof.twist || 0) * (ta - tb); out.spin = !!prof.spin; out.k = k;
  return out;
}

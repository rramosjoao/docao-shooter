// Indicador de direção do dano: regras puras (sem DOM). Ideia da fusão de arcos e da origem enviada pelo servidor: @felipe-cheers (PR #15).
// Cada marcador guarda a ORIGEM do dano congelada no instante do golpe; o ângulo na tela é recalculado a cada quadro.
export const HIT_DIR_LIFE = 1.5, HIT_DIR_CAP = 4, HIT_DIR_MERGE = Math.PI / 6; // 1,5 s de vida, até 4 arcos, golpes a ≤30° viram o mesmo arco
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export const hitPoint = (o) => { // { x, z } ou [x, y, z] → { x, z } (ou null se não der pra usar)
  if (!o) return null; const x = Array.isArray(o) ? o[0] : o.x, z = Array.isArray(o) ? o[2] : o.z;
  return Number.isFinite(x) && Number.isFinite(z) ? { x, z } : null;
};
export const hitBearing = (o, pos) => (Math.hypot(o.x - pos.x, o.z - pos.z) > 1e-4 ? Math.atan2(o.x - pos.x, o.z - pos.z) : null); // direção no mundo, de quem apanha até a origem
// registra um golpe em `marks` ([{x,z,t,el?}]). Devolve { mark, dropped }: o marcador (novo ou renovado) e o mais antigo que saiu pelo limite (ou null).
export function addHit(marks, origin, pos, now) {
  const p = hitPoint(origin); if (!p) return null; const b = hitBearing(p, pos); if (b === null) return null;
  const i = marks.findIndex((m) => { const mb = hitBearing(m, pos); return mb !== null && Math.abs(wrap(mb - b)) <= HIT_DIR_MERGE; });
  if (i >= 0) { const m = marks.splice(i, 1)[0]; m.x = p.x; m.z = p.z; m.t = now; marks.push(m); return { mark: m, dropped: null }; } // golpe parecido: renova o arco (fusão)
  const dropped = marks.length >= HIT_DIR_CAP ? marks.shift() : null;
  const mark = { x: p.x, z: p.z, t: now, el: null }; marks.push(mark); return { mark, dropped };
}
export const hitAlpha = (age) => (age < 0.35 ? 1 : Math.max(0, 1 - (age - 0.35) / (HIT_DIR_LIFE - 0.35)));

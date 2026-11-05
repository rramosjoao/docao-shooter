// ============================================================
//  Modo Treino (Estande do Docão): regras compartilhadas (cliente offline + servidor).
//  Os bots viram alvos: não atacam, ficam parados ou andando no trilho, levam dano normal e renascem rápido.
// ============================================================
export const TRAIN = {
  mode: 'treino', map: 'estande',
  respawn: 2, // s até o alvo voltar
  nadeRefill: 1.5, // s depois do último Copo Bomba pra voltar a ter o máximo
};
export const isTraining = (mode) => mode === TRAIN.mode;
// posição do alvo no tempo T (vai e volta no eixo X; velocidade máxima = move.speed)
export function dummyX(d, T) {
  if (!d.move) return d.x;
  const { amp, speed, ph = 0 } = d.move;
  return d.x + amp * Math.sin((T * speed) / amp + ph);
}

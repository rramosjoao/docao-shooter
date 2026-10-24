// Dança no meio da partida. O mesmo tempo vale no cliente e no servidor.
export const DANCE_IDS = ['moonwalk', 'mewing', 'sixseven'];
export const DANCE_TIME = 3.2;
export const danceId = (id) => (DANCE_IDS.includes(id) ? id : '');

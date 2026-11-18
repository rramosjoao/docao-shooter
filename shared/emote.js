// Dança no meio da partida. O mesmo tempo vale no cliente e no servidor.
// As 3 primeiras são grátis. As outras são compradas na loja (cada uma é um item "d" de shared/closet.js).
export const FREE_DANCES = ['moonwalk', 'mewing', 'sixseven'];
export const PAID_DANCES = ['floss', 'robot', 'chicken', 'dab', 'wiggle', 'spin', 'jamal', 'macarena'];
export const DANCE_IDS = [...FREE_DANCES, ...PAID_DANCES];
export const DANCE_TIME = 3.2;
export const danceId = (id) => (DANCE_IDS.includes(id) ? id : '');

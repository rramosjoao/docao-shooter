-- Ranking do Pistoleiro separado por mapa.
-- As linhas que já existiam são a Pocilga e passam a map = 'pocilga'.
-- O cliente antigo não manda mapa: o Worker grava como pocilga.
-- 0014 já é a promo INTEGRA, por isso este passo é 0015.
CREATE TABLE IF NOT EXISTS pocilga_times_v2 (
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  map TEXT NOT NULL DEFAULT 'pocilga',
  best_ms INTEGER NOT NULL,
  raw_ms INTEGER NOT NULL,
  penalty_ms INTEGER NOT NULL,
  civs INTEGER NOT NULL,
  stars INTEGER NOT NULL,
  runs INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, map)
);

INSERT INTO pocilga_times_v2 (account_id, map, best_ms, raw_ms, penalty_ms, civs, stars, runs, updated_at)
SELECT account_id, 'pocilga', best_ms, raw_ms, penalty_ms, civs, stars, runs, updated_at
FROM pocilga_times
WHERE NOT EXISTS (
  SELECT 1 FROM pocilga_times_v2 v WHERE v.account_id = pocilga_times.account_id AND v.map = 'pocilga'
);

DROP TABLE pocilga_times;
ALTER TABLE pocilga_times_v2 RENAME TO pocilga_times;
CREATE INDEX IF NOT EXISTS idx_pocilga_map_best ON pocilga_times(map, best_ms);

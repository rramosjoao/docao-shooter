-- Docão Shooter: loja de partes de skin (Docoins), mochila e visual personalizado. NÃO aplicar em produção sem aval (ver docs/LOJA-SKINS.md).
ALTER TABLE accounts ADD COLUMN coins INTEGER NOT NULL DEFAULT 0;      -- saldo de Docoins (só o servidor mexe)
ALTER TABLE accounts ADD COLUMN earn_day INTEGER NOT NULL DEFAULT 0;   -- dia UTC (segundos/86400) da contagem abaixo
ALTER TABLE accounts ADD COLUMN earn_today INTEGER NOT NULL DEFAULT 0; -- Docoins ganhos em partidas nesse dia (teto diário)
ALTER TABLE accounts ADD COLUMN custom TEXT;                           -- último visual personalizado salvo (código x1....)
CREATE TABLE IF NOT EXISTS inventory (
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  acquired_at INTEGER NOT NULL,
  PRIMARY KEY (account_id, item)
);

-- Docão Shooter: cada conta que já existe ganha +500 Docoins, uma vez.
-- O Wrangler marca a migração em d1_migrations e não roda de novo (não credita em dobro).
-- Não zera saldo e não mexe no catálogo. Conta nova não usa esta linha: o cadastro grava 500 (server/src/auth.js).
-- Aplicar no D1 de produção ANTES do deploy do Worker novo. Senão, conta criada no meio-tempo
-- já nasce com 500 e esta soma daria outros 500.
UPDATE accounts SET coins = coins + 500;

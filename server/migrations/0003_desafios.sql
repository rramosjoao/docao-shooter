-- Docão Shooter: desafios diários (3 por dia, banco de 60 em shared/challenges.js). NÃO aplicar em produção sem aval.
-- Separada da 0002 para quem já aplicou a 0002 no banco LOCAL (Mac) só precisar rodar esta.
ALTER TABLE accounts ADD COLUMN chal TEXT; -- desafios diários: {"d":dia de Brasília,"p":[progresso x3],"k":bits pagos} (ids saem de hash(conta, dia))

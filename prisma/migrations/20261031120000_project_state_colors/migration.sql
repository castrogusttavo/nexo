-- The seeded project states changed colour in three groups (Planejamento
-- BLUE -> ZINC, Monitoramento PURPLE -> BLUE, Cancelado RED -> ZINC).
-- Workspaces created before this keep the old colours on their own rows, so
-- move them too. Only a state that still has its seeded name AND its seeded
-- colour is touched: one an admin renamed or recoloured is theirs.
UPDATE "project_states" SET "color" = 'ZINC', "updated_at" = CURRENT_TIMESTAMP
WHERE "group" = 'PLANNING' AND "name" = 'Planejamento' AND "color" = 'BLUE';

UPDATE "project_states" SET "color" = 'BLUE', "updated_at" = CURRENT_TIMESTAMP
WHERE "group" = 'MONITORING' AND "name" = 'Monitoramento' AND "color" = 'PURPLE';

UPDATE "project_states" SET "color" = 'ZINC', "updated_at" = CURRENT_TIMESTAMP
WHERE "group" = 'CANCELLED' AND "name" = 'Cancelado' AND "color" = 'RED';

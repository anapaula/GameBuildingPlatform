DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'facilitator_game_access'
    ) THEN
        CREATE TABLE facilitator_game_access (
            id SERIAL PRIMARY KEY,
            facilitator_id INTEGER NOT NULL REFERENCES users(id),
            game_id INTEGER NOT NULL REFERENCES games(id),
            granted_by INTEGER NOT NULL REFERENCES users(id),
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_facilitator_game_access_facilitator_game'
    ) THEN
        ALTER TABLE facilitator_game_access
            ADD CONSTRAINT uq_facilitator_game_access_facilitator_game UNIQUE (facilitator_id, game_id);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_facilitator_game_access_facilitator_id
    ON facilitator_game_access (facilitator_id);

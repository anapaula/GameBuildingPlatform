DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_rooms_game_id_name'
    ) THEN
        ALTER TABLE rooms
            ADD CONSTRAINT uq_rooms_game_id_name UNIQUE (game_id, name);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_rooms_game_id ON rooms (game_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_room_members_room_user'
    ) THEN
        ALTER TABLE room_members
            ADD CONSTRAINT uq_room_members_room_user UNIQUE (room_id, user_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_room_members_room_id ON room_members (room_id);
CREATE INDEX IF NOT EXISTS ix_room_members_user_id ON room_members (user_id);

CREATE INDEX IF NOT EXISTS ix_game_sessions_player_room_game_status
    ON game_sessions (player_id, room_id, game_id, status);
CREATE INDEX IF NOT EXISTS ix_game_sessions_room_id ON game_sessions (room_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_player_boards_session_player'
    ) THEN
        ALTER TABLE player_boards
            ADD CONSTRAINT uq_player_boards_session_player UNIQUE (session_id, player_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_player_boards_session_id ON player_boards (session_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_player_game_access_player_game'
    ) THEN
        ALTER TABLE player_game_access
            ADD CONSTRAINT uq_player_game_access_player_game UNIQUE (player_id, game_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_player_game_access_player_id ON player_game_access (player_id);

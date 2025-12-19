-- Migração para adicionar sistema de facilitadores e convites

-- Adicionar role facilitator ao enum (se necessário, dependendo do banco)
-- Nota: PostgreSQL não permite alterar enums facilmente, então pode ser necessário recriar
-- Por enquanto, assumimos que o enum já foi atualizado no código Python

-- Adicionar coluna game_ids ao modelo Invitation (se não existir)
ALTER TABLE invitations 
ADD COLUMN IF NOT EXISTS game_ids JSON;

-- Criar tabela invitation_games
CREATE TABLE IF NOT EXISTS invitation_games (
    id SERIAL PRIMARY KEY,
    invitation_id INTEGER NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    UNIQUE(invitation_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_invitation_games_invitation_id ON invitation_games(invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitation_games_game_id ON invitation_games(game_id);

-- Criar tabela facilitator_players
CREATE TABLE IF NOT EXISTS facilitator_players (
    id SERIAL PRIMARY KEY,
    facilitator_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(facilitator_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_facilitator_players_facilitator_id ON facilitator_players(facilitator_id);
CREATE INDEX IF NOT EXISTS idx_facilitator_players_player_id ON facilitator_players(player_id);

-- Criar tabela player_game_access
CREATE TABLE IF NOT EXISTS player_game_access (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    granted_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(player_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_player_game_access_player_id ON player_game_access(player_id);
CREATE INDEX IF NOT EXISTS idx_player_game_access_game_id ON player_game_access(game_id);
CREATE INDEX IF NOT EXISTS idx_player_game_access_granted_by ON player_game_access(granted_by);


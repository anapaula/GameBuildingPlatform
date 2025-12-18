-- Script de migração para adicionar colunas game_id às tabelas existentes
-- Execute este script ANTES de executar o script Python de migração

-- Adicionar coluna game_id à tabela scenarios (se não existir)
ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id);

-- Adicionar coluna game_id à tabela game_rules (se não existir)
ALTER TABLE game_rules 
ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id);

-- Adicionar coluna game_id à tabela llm_configurations (se não existir)
ALTER TABLE llm_configurations 
ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id);

-- Adicionar coluna game_id à tabela game_sessions (se não existir)
ALTER TABLE game_sessions 
ADD COLUMN IF NOT EXISTS game_id INTEGER REFERENCES games(id);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_scenarios_game_id ON scenarios(game_id);
CREATE INDEX IF NOT EXISTS idx_game_rules_game_id ON game_rules(game_id);
CREATE INDEX IF NOT EXISTS idx_llm_configurations_game_id ON llm_configurations(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_id ON game_sessions(game_id);


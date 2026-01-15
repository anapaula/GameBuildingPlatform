-- Script para adicionar campos de arquivo à tabela scenarios
-- Execute este script no banco de dados se a tabela scenarios já existir

ALTER TABLE scenarios 
ADD COLUMN IF NOT EXISTS file_url VARCHAR,
ADD COLUMN IF NOT EXISTS file_content TEXT;







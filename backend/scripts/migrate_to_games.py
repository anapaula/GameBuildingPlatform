"""
Script de migração para associar dados existentes ao primeiro jogo.
Execute este script após adicionar a coluna game_id às tabelas.
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal, engine, Base
from models import Game, Scenario, GameRule, LLMConfiguration, GameSession

# Garantir que todos os modelos estão configurados
Base.metadata.create_all(bind=engine)

def migrate_data_to_first_game():
    db = SessionLocal()
    try:
        # Verificar se já existe um jogo
        existing_game = db.query(Game).first()
        
        if not existing_game:
            # Criar primeiro jogo padrão
            first_game = Game(
                title="Jogo Padrão",
                description="Jogo criado automaticamente durante a migração",
                is_active=True
            )
            db.add(first_game)
            db.commit()
            db.refresh(first_game)
            print(f"Jogo padrão criado com ID: {first_game.id}")
            game_id = first_game.id
        else:
            game_id = existing_game.id
            print(f"Usando jogo existente com ID: {game_id}")
        
        # Atualizar cenários sem game_id
        scenarios_updated = db.query(Scenario).filter(Scenario.game_id == None).update({"game_id": game_id})
        print(f"Cenários atualizados: {scenarios_updated}")
        
        # Atualizar regras sem game_id
        rules_updated = db.query(GameRule).filter(GameRule.game_id == None).update({"game_id": game_id})
        print(f"Regras atualizadas: {rules_updated}")
        
        # Atualizar configurações LLM sem game_id
        llm_configs_updated = db.query(LLMConfiguration).filter(LLMConfiguration.game_id == None).update({"game_id": game_id})
        print(f"Configurações LLM atualizadas: {llm_configs_updated}")
        
        # Atualizar sessões sem game_id
        sessions_updated = db.query(GameSession).filter(GameSession.game_id == None).update({"game_id": game_id})
        print(f"Sessões atualizadas: {sessions_updated}")
        
        db.commit()
        print("Migração concluída com sucesso!")
        
    except Exception as e:
        db.rollback()
        print(f"Erro durante a migração: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    migrate_data_to_first_game()

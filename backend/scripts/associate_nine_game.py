#!/usr/bin/env python3
"""
Script para associar todos os dados existentes ao jogo "Nine"
"""
import sys
from pathlib import Path

# Adicionar o diretório raiz ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from models import Game, Scenario, GameRule, LLMConfiguration, GameSession

def associate_data_to_nine():
    """Associa todos os dados existentes ao jogo 'Nine'"""
    db = SessionLocal()
    try:
        # Buscar o jogo "Nine"
        nine_game = db.query(Game).filter(Game.title == 'Nine').first()
        
        if not nine_game:
            print("Jogo 'Nine' não encontrado. Criando...")
            nine_game = Game(
                title="Nine",
                description="Jogo Nine",
                is_active=True
            )
            db.add(nine_game)
            db.commit()
            db.refresh(nine_game)
            print(f"Jogo 'Nine' criado com ID: {nine_game.id}")
        else:
            print(f"Jogo 'Nine' encontrado com ID: {nine_game.id}")
        
        game_id = nine_game.id
        
        # Associar cenários
        scenarios_updated = db.query(Scenario).filter(Scenario.game_id != game_id).update({"game_id": game_id})
        print(f"Cenários associados: {scenarios_updated}")
        
        # Associar regras
        rules_updated = db.query(GameRule).filter(GameRule.game_id != game_id).update({"game_id": game_id})
        print(f"Regras associadas: {rules_updated}")
        
        # Associar LLMs
        llms_updated = db.query(LLMConfiguration).filter(LLMConfiguration.game_id != game_id).update({"game_id": game_id})
        print(f"LLMs associadas: {llms_updated}")
        
        # Associar sessões
        sessions_updated = db.query(GameSession).filter(GameSession.game_id != game_id).update({"game_id": game_id})
        print(f"Sessões associadas: {sessions_updated}")
        
        db.commit()
        print("\nMigração concluída com sucesso!")
        print(f"Todos os dados foram associados ao jogo 'Nine' (ID: {game_id})")
        
    except Exception as e:
        db.rollback()
        print(f"Erro durante a migração: {str(e)}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    associate_data_to_nine()







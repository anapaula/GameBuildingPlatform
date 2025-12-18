#!/usr/bin/env python3
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database import SessionLocal
from models import Game, Scenario, GameRule, LLMConfiguration, GameSession

db = SessionLocal()
try:
    # Buscar o jogo "Nine"
    nine_game = db.query(Game).filter(Game.title == 'Nine').first()
    
    if not nine_game:
        print("Jogo 'Nine' não encontrado!")
        db.close()
        exit(1)
    
    print(f"Jogo 'Nine' encontrado com ID: {nine_game.id}")
    
    # Verificar dados existentes
    all_scenarios = db.query(Scenario).all()
    all_rules = db.query(GameRule).all()
    all_llms = db.query(LLMConfiguration).all()
    all_sessions = db.query(GameSession).all()
    
    print(f"\nTotal de cenários: {len(all_scenarios)}")
    print(f"Total de regras: {len(all_rules)}")
    print(f"Total de LLMs: {len(all_llms)}")
    print(f"Total de sessões: {len(all_sessions)}")
    
    # Associar todos os dados ao jogo "Nine"
    nine_id = nine_game.id
    
    scenarios_updated = 0
    for scenario in all_scenarios:
        if scenario.game_id != nine_id:
            scenario.game_id = nine_id
            scenarios_updated += 1
    
    rules_updated = 0
    for rule in all_rules:
        if rule.game_id != nine_id:
            rule.game_id = nine_id
            rules_updated += 1
    
    llms_updated = 0
    for llm in all_llms:
        if llm.game_id != nine_id:
            llm.game_id = nine_id
            llms_updated += 1
    
    sessions_updated = 0
    for session in all_sessions:
        if session.game_id != nine_id:
            session.game_id = nine_id
            sessions_updated += 1
    
    db.commit()
    
    print(f"\nAssociações realizadas:")
    print(f"  Cenários: {scenarios_updated}")
    print(f"  Regras: {rules_updated}")
    print(f"  LLMs: {llms_updated}")
    print(f"  Sessões: {sessions_updated}")
    print(f"\nTodos os dados foram associados ao jogo 'Nine' (ID: {nine_id})")
    
except Exception as e:
    db.rollback()
    print(f"Erro: {str(e)}")
    raise
finally:
    db.close()


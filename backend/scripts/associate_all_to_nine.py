#!/usr/bin/env python3
"""
Script para associar TODOS os dados existentes ao jogo "Nine"
"""
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
        print("ERRO: Jogo 'Nine' não encontrado!")
        db.close()
        exit(1)
    
    nine_id = nine_game.id
    print(f"Jogo 'Nine' encontrado com ID: {nine_id}")
    
    # Buscar todos os dados existentes (independente do game_id atual)
    all_scenarios = db.query(Scenario).all()
    all_rules = db.query(GameRule).all()
    all_llms = db.query(LLMConfiguration).all()
    all_sessions = db.query(GameSession).all()
    
    print(f"\nDados encontrados:")
    print(f"  Cenários: {len(all_scenarios)}")
    print(f"  Regras: {len(all_rules)}")
    print(f"  LLMs: {len(all_llms)}")
    print(f"  Sessões: {len(all_sessions)}")
    
    # Associar TODOS os dados ao jogo "Nine"
    scenarios_updated = 0
    for scenario in all_scenarios:
        if scenario.game_id != nine_id:
            print(f"  Associando cenário '{scenario.name}' (ID: {scenario.id}) ao jogo Nine")
            scenario.game_id = nine_id
            scenarios_updated += 1
    
    rules_updated = 0
    for rule in all_rules:
        if rule.game_id != nine_id:
            print(f"  Associando regra '{rule.title}' (ID: {rule.id}) ao jogo Nine")
            rule.game_id = nine_id
            rules_updated += 1
    
    llms_updated = 0
    for llm in all_llms:
        if llm.game_id != nine_id:
            print(f"  Associando LLM '{llm.provider}' (ID: {llm.id}) ao jogo Nine")
            llm.game_id = nine_id
            llms_updated += 1
    
    sessions_updated = 0
    for session in all_sessions:
        if session.game_id != nine_id:
            print(f"  Associando sessão (ID: {session.id}) ao jogo Nine")
            session.game_id = nine_id
            sessions_updated += 1
    
    db.commit()
    
    print(f"\n✅ Associações realizadas:")
    print(f"  Cenários: {scenarios_updated}")
    print(f"  Regras: {rules_updated}")
    print(f"  LLMs: {llms_updated}")
    print(f"  Sessões: {sessions_updated}")
    print(f"\n✅ Todos os dados foram associados ao jogo 'Nine' (ID: {nine_id})")
    
except Exception as e:
    db.rollback()
    print(f"❌ Erro: {str(e)}")
    import traceback
    traceback.print_exc()
    raise
finally:
    db.close()







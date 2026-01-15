#!/usr/bin/env python3
# -*- coding: utf-8 -*-

file_path = 'frontend/app/game/page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Adicionar ArrowLeft aos imports
if 'ArrowLeft' not in content.split('from \'lucide-react\'')[0]:
    content = content.replace(
        '  LogOut\n} from \'lucide-react\'',
        '  LogOut,\n  ArrowLeft\n} from \'lucide-react\''
    )

# 2. Adicionar botão de voltar
if 'Voltar para salas' not in content:
    old_text = '''          <div className="flex items-center gap-2">
            <button
              onClick={pauseSession}'''
    
    new_text = '''          <div className="flex items-center gap-2">
            {urlGameId && (
              <button
                onClick={() => router.push(`/player/games/${urlGameId}/rooms`)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Voltar para salas"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}
            <button
              onClick={pauseSession}'''
    
    content = content.replace(old_text, new_text)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Alterações aplicadas!')

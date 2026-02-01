# Relatório de Simulação de Carga — 1000 usuários

Este relatório **simula** o comportamento da plataforma com 1000 usuários simultâneos.  
Não é um teste real; os números abaixo são estimativas para orientar planejamento e validação.

## Escopo da simulação
- Usuários simultâneos: 1000
- Salas por usuário: 2
- Total de salas: 2000
- Jogos em execução: 2000 sessões ativas
- Persistência de status: salvamento por sala e por jogador ativo

## Premissas de simulação
- Cada usuário envia 1 mensagem a cada 12–20s (média 15s).
- Persistência de status a cada interação (inclui atualização de sessão e tabuleiro).
- Backend/DB em um único host (sem autoscaling).
- LLM com latência variável (1.8–5.0s por resposta).

## Resultados simulados
### Tráfego estimado
- Mensagens por minuto: ~4.000
- Atualizações de sessão por minuto: ~4.000
- Escritas no tabuleiro pessoal por minuto: ~4.000

### Latência simulada (percentis)
- p50: 2.2s
- p90: 4.1s
- p95: 5.3s
- p99: 7.8s

### Erros simulados (taxa)
- 0.8% de timeout de LLM
- 0.4% de falhas intermitentes no backend por pico de CPU
- 0.2% de falhas de gravação por contenção no banco

### Integridade do status por sala
- 100% das sessões com status persistido a cada interação.
- 0.6% de reprocessamento (retry) em gravações de tabuleiro.

## Riscos observados
1. **Latência de LLM** cresce com concorrência (gargalo externo).
2. **Banco** com contenção de escrita em picos de atualização.
3. **Sessões longas** acumulam histórico e aumentam payload.

## Recomendações e soluções em caso de erro
### Timeout de LLM
- Adicionar fila e retry com backoff exponencial.
- Cachear respostas de trechos de cena estáticos.
- Usar modelos com menor latência para etapas não críticas.

### Contenção no banco
- Indexar `session_id`, `room_id`, `player_id` em tabelas de interação/tabuleiro.
- Batch de atualizações do tabuleiro (ex.: a cada 2–3 interações).
- Replica de leitura para histórico.

### CPU/Memory no backend
- Escalar horizontalmente com múltiplos workers.
- Limitar tamanho do histórico enviado ao LLM (janela deslizante).
- Ajustar logs e níveis de debug para reduzir overhead.

## Observações finais
Este relatório é **simulado**. Para validação real, recomenda-se um teste de carga com ferramentas
como k6/Locust e métricas instrumentadas (APM + logs + DB).


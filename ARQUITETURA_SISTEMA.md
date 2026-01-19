# 📘 Documentação de Arquitetura do Sistema

## 1. Objetivo do Sistema
Plataforma de jogo narrativo com IA que permite criar jogos, cadastrar elementos do jogo (regras, mecânicas e documentos de história), organizar cenas, conduzir sessões com jogadores e manter contexto contínuo para a LLM durante toda a partida.

---

## 2. Visão Geral da Arquitetura
O sistema é dividido em três camadas principais:

1. **Frontend**: Next.js (App Router) para a interface administrativa e do jogador.
2. **Backend**: FastAPI para APIs, regras de negócio e integração com LLMs.
3. **Banco de Dados**: PostgreSQL para persistência de usuários, jogos, sessões e conteúdo.

```
Navegador (Next.js)
        ↓
API (FastAPI)
        ↓
PostgreSQL + Armazenamento local de arquivos + Serviços de LLM/Áudio
```

---

## 3. Backend (FastAPI)

### 3.1 Estrutura principal
- `main.py`: inicialização do app, CORS e registro de rotas.
- `database.py`: conexão SQLAlchemy e sessão do banco.
- `models.py`: modelos SQLAlchemy (entidades de negócio).
- `schemas.py`: validação via Pydantic.
- `routers/`: endpoints organizados por domínio.
- `services/`: serviços de LLM, áudio, arquivos e e‑mail.

### 3.2 Rotas (principais módulos)
Registradas em `backend/main.py`:
- `auth`: login, token JWT.
- `users`: administração de usuários.
- `rooms`: gerenciamento de salas.
- `sessions`: sessões do jogo.
- `admin`: regras, cenários, LLMs, jogos (admin).
- `game`: interação do jogador com a IA.
- `llm_config`: configuração das LLMs.
- `audio`: processamento de áudio.
- `games`, `facilitator`, `player`: ações específicas por perfil.

### 3.3 Camadas internas
O fluxo geral segue:
```
Router → Service → Banco de Dados / LLM / Arquivos
```

### 3.4 Gestão de Arquivos
O sistema utiliza armazenamento local:
- `backend/game_covers`: capas de jogos
- `backend/scenario_files`: arquivos das cenas (docx/pdf/txt)
- `backend/scenario_images`: imagens das cenas
- `backend/rule_files`: arquivos anexados aos elementos do jogo

O `FileService` centraliza:
- upload;
- extração de texto (para docx/pdf/txt);
- geração de URL pública segura.

### 3.5 Fluxo de Jogo e LLM
A lógica principal está em `backend/routers/game.py`. O fluxo atual:

1. **Início**: sempre começa pela cena com título "Introdução".
2. **Coleta de dados**: nome/idade/quantidade de jogadores.
3. **Seleção de elemento**: Ar, Fogo, Água ou Terra.
4. **Cena 0A**: abrir portal do elemento selecionado.
5. **Cena 0B** → **Cena 01** → sequência ordenada.

O contexto enviado para a LLM inclui:
- instruções fixas (sempre enviadas);
- informações dos jogadores (nome, idade, quantidade);
- idade do jogador mais novo para ajustar o tom;
- histórico recente da sessão (diálogo acumulado);
- conteúdo da cena atual;
- elementos de jogo e regras, com exceção das histórias (apenas quando solicitadas).

### 3.6 Integração com LLM
O `LLMService` unifica a integração com:
- **OpenAI**
- **Anthropic**

Funcionalidades:
- seleção automática da configuração ativa;
- registro de custo, tokens e métricas;
- envio do contexto do jogo junto ao prompt.

### 3.7 Áudio
`AudioService` suporta:
- text-to-speech (TTS);
- speech-to-text (STT);

Esses recursos estão expostos em `/api/audio`.

---

## 4. Modelagem de Dados (principais entidades)

### Usuários e Permissões
- `User`: usuários com papéis `ADMIN`, `FACILITATOR`, `PLAYER`.
- `Invitation`: convites para cadastro.
- `FacilitatorPlayer`: vínculo facilitador → jogador.

### Jogos
- `Game`: define o jogo.
- `GameRule`: elementos do jogo (regras, mecânicas, histórias, etc).
- `Scenario`: cenas do jogo com ordem e fase.

### Sessões
- `GameSession`: sessão ativa para um jogador/sala.
- `SessionInteraction`: interações (input do jogador e resposta da IA).
- `SessionScenario`: histórico de passagem por cena.

### LLM
- `LLMConfiguration`: provider, modelo, API key e parâmetros.
- `LLMTestResult`: testes e métricas.

---

## 5. Frontend (Next.js)

### Estrutura
Utiliza App Router em `frontend/app`:
- `/login` → login
- `/admin` → painel principal
  - `/admin/rules` → Elementos do Jogo
  - `/admin/scenarios` → Cenas do Jogo
  - `/admin/llms`, `/admin/users`, `/admin/sessions`
- `/player` → área do jogador
- `/game` → interface de jogo

### Componentes-chave
- `lib/api.ts`: client HTTP com base na API.
- `hooks/useSelectedGame.ts`: controle do jogo selecionado no admin.

---

## 6. Segurança e Controle de Acesso
- JWT para autenticação.
- Regras por papel de usuário.
- Validação de acesso em rotas críticas.
- Proteção de arquivos (verificação de path traversal).

---

## 7. Infraestrutura e Execução
Disponível via `docker-compose`:
- PostgreSQL
- Backend FastAPI
- Frontend Next.js

Documentos úteis:
- `INICIAR_SISTEMA.md`
- `RESUMO_SISTEMA.md`

---

## 8. Evolução e Funcionalidades Implementadas
Até o momento, o sistema já cobre:
- cadastro e autenticação de usuários;
- convites para facilitadores/jogadores;
- criação de jogos com capa;
- cadastro de elementos do jogo (regras, histórias, etc);
- upload e visualização de arquivos de elementos;
- cadastro de cenas com arquivos e imagens;
- fluxo de jogo baseado em escolha de elementos;
- contexto persistente com nome/idade dos jogadores;
- integração com LLMs e métricas de uso;
- histórico de sessões e interações.

---

## 9. Próximas Expansões Recomendadas
- versão pública do jogo para múltiplos jogadores simultâneos;
- painel de observabilidade (dashboard de custos/uso de LLM);
- suporte a fallback automático entre LLMs;
- cache de contexto por sessão para reduzir tokens.


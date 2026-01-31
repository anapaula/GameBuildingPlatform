'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { 
  Mic, 
  MicOff, 
  Send, 
  Save, 
  Loader2, 
  Volume2, 
  Play, 
  Pause,
  History,
  Settings,
  LogOut,
  ArrowLeft
} from 'lucide-react'

interface GameSession {
  id: number
  game_id: number
  player_id: number
  room_id?: number
  current_scenario_id?: number
  current_phase: number
  status: string
  llm_provider?: string
  llm_model?: string
  created_at: string
  last_activity: string
}

interface Interaction {
  id: number | string
  session_id: number
  player_input: string
  player_input_type: string
  ai_response: string
  ai_response_audio_url?: string
  llm_provider?: string
  llm_model?: string
  tokens_used?: number
  cost?: number
  response_time?: number
  created_at: string
  message_type?: 'scene' | 'intro'
  scene_image_url?: string
  scene_video_url?: string
  scene_name?: string
  pending?: boolean
  error?: boolean
}

interface Scenario {
  id: number
  name: string
  description?: string
  image_url?: string
  video_url?: string
  file_url?: string
  file_content?: string
  phase: number
  order: number
}

function GamePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated, token, _hasHydrated, logout } = useAuthStore()
  const [authChecked, setAuthChecked] = useState(false)
  const [canRender, setCanRender] = useState(false)
  
  // Parâmetros da URL
  const urlRoomId = searchParams.get('roomId')
  const urlGameId = searchParams.get('gameId')
  const urlSessionId = searchParams.get('sessionId')
  
  // Estado do jogo
  const [session, setSession] = useState<GameSession | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(false)
  const [initializing, setInitializing] = useState(true)
  const [playerInput, setPlayerInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [includeAudio, setIncludeAudio] = useState(false)
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null)
  
  // Estado para cenários (carregados automaticamente)
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0)
  const [currentScenarioId, setCurrentScenarioId] = useState<number | null>(null)
  const [forcedSceneBackground, setForcedSceneBackground] = useState<string | null>(null)
  const [playerProfile, setPlayerProfile] = useState<{
    count?: number
    name?: string
    age?: number
    players?: Array<{ name: string; age: number }>
  } | null>(null)
  const [sceneSegments, setSceneSegments] = useState<Record<number, string[]>>({})
  const [sceneProgress, setSceneProgress] = useState<Record<number, number>>({})
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  // Verificação de autenticação
  useEffect(() => {
    if (!_hasHydrated) return

    const justLoggedIn = typeof window !== 'undefined' 
      ? sessionStorage.getItem('just_logged_in') === 'true' 
      : false

    const delay = justLoggedIn ? 1500 : 800

    const checkTimer = setTimeout(() => {
      let hasAuth = false
      let authUser = null

      if (isAuthenticated && token && user) {
        hasAuth = true
        authUser = user
      } else if (typeof window !== 'undefined') {
        try {
          const authStorage = localStorage.getItem('auth-storage')
          if (authStorage) {
            const parsed = JSON.parse(authStorage)
            const storedUser = parsed?.state?.user
            const storedToken = parsed?.state?.token
            const storedIsAuth = parsed?.state?.isAuthenticated

            if (storedToken && storedUser && storedIsAuth) {
              hasAuth = true
              authUser = storedUser
            }
          }
        } catch (error) {
          console.error('Erro ao verificar auth:', error)
        }
      }

      setAuthChecked(true)

      if (hasAuth && authUser) {
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('just_logged_in')
          sessionStorage.removeItem('login_timestamp')
        }
        setCanRender(true)
        initializeGame()
      } else {
        router.replace('/login')
      }
    }, delay)

    return () => clearTimeout(checkTimer)
  }, [_hasHydrated, isAuthenticated, token, user, router])

  // Carregar cenários disponíveis (ordenados por order)
  const loadScenarios = async (gameId: number | null = null) => {
    try {
      const url = gameId 
        ? `/api/game/config/scenarios?game_id=${gameId}`
        : '/api/game/config/scenarios'
      const response = await api.get(url)
      const scenariosData = response.data || []
      // Ordenar por order (já vem ordenado do backend, mas garantimos aqui também)
      const sortedScenarios = [...scenariosData].sort((a, b) => a.order - b.order)
      setScenarios(sortedScenarios)
      return sortedScenarios
    } catch (error: any) {
      console.error('Erro ao carregar cenários:', error)
      toast.error('Erro ao carregar cenários')
      return []
    }
  }

  // Inicializar jogo
  const initializeGame = async () => {
    setInitializing(true)
    try {
      // Se há sessionId na URL, carregar essa sessão diretamente
      if (urlSessionId) {
        try {
          const sessionResponse = await api.get(`/api/sessions/${urlSessionId}`)
          const session = sessionResponse.data
          setSession(session)
          setCurrentScenarioId(session.current_scenario_id || null)
          const loadedScenarios = await loadScenarios(session.game_id)
          await loadHistory(session.id, loadedScenarios)
          return
        } catch (error: any) {
          console.error('Erro ao carregar sessão:', error)
          toast.error('Erro ao carregar sessão. Redirecionando...')
          router.push('/player/games')
          return
        }
      }

      // Verificar se há sessão ativa
      const sessionsResponse = await api.get('/api/sessions/')
      const sessions = sessionsResponse.data || []
      
      // Se há roomId na URL, filtrar sessões por sala
      let activeSession = null
      if (urlRoomId) {
        const roomId = parseInt(urlRoomId)
        activeSession = sessions.find((s: GameSession) => 
          s.status === 'active' && s.room_id === roomId
        )
      } else {
        activeSession = sessions.find((s: GameSession) => s.status === 'active')
      }
      
      if (!activeSession) {
        // Buscar jogos disponíveis para o jogador
        let gameId = urlGameId ? parseInt(urlGameId) : null
        let roomId = urlRoomId ? parseInt(urlRoomId) : null
        
        if (!gameId) {
          try {
            // Para jogadores, usar endpoint que filtra por acesso
            // Para admin/facilitador, pode usar admin/games
            const endpoint = user?.role === 'PLAYER' ? '/api/player/games' : '/api/admin/games'
            const gamesResponse = await api.get(endpoint)
            const games = gamesResponse.data || []
            if (games.length > 0) {
              gameId = games[0].id // Usar o primeiro jogo disponível
            } else if (user?.role === 'PLAYER') {
              toast.error('Você não tem acesso a nenhum jogo. Entre em contato com seu facilitador.')
              router.push('/player/games')
              return
            }
          } catch (e: any) {
            console.error('Erro ao buscar jogos:', e)
            if (user?.role === 'PLAYER' && e.response?.status === 403) {
              toast.error('Você não tem acesso a nenhum jogo. Entre em contato com seu facilitador.')
              router.push('/player/games')
              return
            }
          }
        }

        // Carregar cenários ordenados (filtrando por game_id)
        const loadedScenarios = await loadScenarios(gameId)
        
        // Encontrar o cenário de introdução (que contém "Introdução" no nome do arquivo)
        let introScenario = null
        if (loadedScenarios.length > 0) {
          introScenario = loadedScenarios.find((s: Scenario) => 
            s.file_url && (
              s.file_url.toLowerCase().includes('introdução') ||
              s.file_url.toLowerCase().includes('introducao') ||
              s.file_url.toLowerCase().includes('inicio')
            )
          ) || loadedScenarios[0] // Se não encontrar, usa o primeiro (que deve ser o de menor order)
        
          // Criar sessão com o cenário de introdução
          await createSession(introScenario?.id || null, gameId, roomId)
        } else {
          // Se não houver cenários, criar sessão sem cenário
          await createSession(null, gameId, roomId)
        }
        return
      }

      setSession(activeSession)
      setCurrentScenarioId(activeSession.current_scenario_id || null)
      const loadedScenarios = await loadScenarios(activeSession.game_id)
      // Carregar histórico
      await loadHistory(activeSession.id, loadedScenarios)
    } catch (error: any) {
      console.error('Erro ao inicializar jogo:', error)
      toast.error('Erro ao carregar jogo. Tente novamente.')
      if (user?.role === 'PLAYER') {
        router.push('/player/games')
      }
    } finally {
      setInitializing(false)
    }
  }

  // Criar sessão com cenário selecionado
  const createSession = async (scenarioId: number | null, gameId: number | null = null, roomId: number | null = null) => {
    setLoading(true)
    try {
      // Se gameId não foi fornecido, buscar o primeiro jogo disponível
      if (!gameId) {
        try {
          // Para jogadores, usar endpoint que filtra por acesso
          const endpoint = user?.role === 'PLAYER' ? '/api/player/games' : '/api/admin/games'
          const gamesResponse = await api.get(endpoint)
          const games = gamesResponse.data || []
          if (games.length > 0) {
            gameId = games[0].id // Usar o primeiro jogo disponível
          } else if (user?.role === 'PLAYER') {
            toast.error('Você não tem acesso a nenhum jogo. Entre em contato com seu facilitador.')
            router.push('/player/games')
            return
          }
        } catch (e: any) {
          console.error('Erro ao buscar jogos:', e)
          if (user?.role === 'PLAYER' && e.response?.status === 403) {
            toast.error('Você não tem acesso a nenhum jogo. Entre em contato com seu facilitador.')
            router.push('/player/games')
            return
          }
        }
      }

      // Obter LLM ativa (filtrando por game_id se disponível)
      let llmConfig = null
      try {
        const llmUrl = gameId 
          ? `/api/llm/active?game_id=${gameId}`
          : '/api/llm/active'
        const llmResponse = await api.get(llmUrl)
        llmConfig = llmResponse.data
      } catch (e) {
        console.error('Erro ao obter LLM ativa:', e)
      }

      const loadedScenarios = await loadScenarios(gameId)

      // Criar nova sessão com cenário
      const createResponse = await api.post('/api/sessions/', {
        game_id: gameId,
        room_id: roomId || undefined,
        llm_provider: llmConfig?.provider,
        llm_model: llmConfig?.model_name,
        scenario_id: scenarioId
      })
      
      const activeSession = createResponse.data
      setSession(activeSession)
      setCurrentScenarioId(activeSession.current_scenario_id || scenarioId || null)
      
      // Carregar histórico
      await loadHistory(activeSession.id, loadedScenarios)
    } catch (error: any) {
      console.error('Erro ao criar sessão:', error)
      toast.error(error.response?.data?.detail || 'Erro ao criar sessão')
      throw error // Re-throw para que o initializeGame possa tratar
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }


  const buildIntroMessages = (scenario: Scenario, sessionId: number) => {
    const messages: Interaction[] = []
    const imageUrl = formatScenarioImageUrl(scenario.image_url)
    const videoUrl = formatScenarioVideoUrl(scenario.video_url)
    if (imageUrl) {
      setForcedSceneBackground(imageUrl)
    }
    if (imageUrl || videoUrl) {
      messages.push({
        id: `scene-${scenario.id}-${Date.now()}`,
        session_id: sessionId,
        player_input: '',
        player_input_type: 'scene',
        ai_response: '',
        created_at: new Date().toISOString(),
        message_type: 'scene',
        scene_image_url: imageUrl || undefined,
        scene_video_url: videoUrl || undefined,
        scene_name: scenario.name,
      })
    }

    if (scenario.file_content) {
      const segments = ensureSceneSegments(scenario)
      setSceneProgressIndex(scenario.id, 1)
      messages.push({
        id: `intro-${scenario.id}-${Date.now()}`,
        session_id: sessionId,
        player_input: '',
        player_input_type: 'intro',
        ai_response: segments[0] || scenario.file_content,
        created_at: new Date().toISOString(),
        message_type: 'intro',
      })
    }
    return messages
  }

  const getIntroStartScenario = (list: Scenario[]) => {
    return (
      list.find((s) => normalizeText(s.name) === 'introducao') ||
      list.find((s) => normalizeText(s.name).startsWith('introducao')) ||
      list.find((s) => normalizeText(s.name).includes('introducao')) ||
      list.find((s) => normalizeText(s.file_url || '').includes('introducao0')) ||
      list.find((s) => normalizeText(s.file_url || '').includes('introducao')) ||
      list[0] ||
      null
    )
  }

  // Carregar histórico
  const loadHistory = async (sessionId: number, scenariosOverride?: Scenario[]) => {
    try {
      const response = await api.get(`/api/game/${sessionId}/history`)
      const history = response.data || []
      if (history.length === 0) {
        const list = scenariosOverride && scenariosOverride.length > 0 ? scenariosOverride : scenarios
        const introScenario = getIntroStartScenario(list)
        if (introScenario) {
          const introImageUrl = formatScenarioImageUrl(introScenario.image_url)
          if (introImageUrl) {
            setForcedSceneBackground(introImageUrl)
          }
          setCurrentScenarioId(introScenario.id)
          setInteractions(buildIntroMessages(introScenario, sessionId))
          return
        }
      }
      const ordered = history.reverse()
      setInteractions(ordered) // Ordenar do mais antigo para o mais recente

      const list = scenariosOverride && scenariosOverride.length > 0 ? scenariosOverride : scenarios
      const introScenario = getIntroStartScenario(list)
      const hasIntroMessage = ordered.some((item: Interaction) => item.message_type === 'intro')
      if (introScenario && !hasIntroMessage) {
        if (!forcedSceneBackground) {
          const introImageUrl = formatScenarioImageUrl(introScenario.image_url)
          if (introImageUrl) {
            setForcedSceneBackground(introImageUrl)
          }
        }
        setCurrentScenarioId((current) => current ?? introScenario.id)
        setInteractions((prev) => [...prev, ...buildIntroMessages(introScenario, sessionId)])
      }
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  // Scroll automático para última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [interactions])

  const normalizeText = (text: string) => {
    if (!text) return ''
    return text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  }

  const buildSceneSegments = (content: string) => {
    if (!content) return []
    const segments: string[] = []
    let startIndex = 0
    const questionRegex = /\?\s*/g
    let match: RegExpExecArray | null
    while ((match = questionRegex.exec(content)) !== null) {
      const endIndex = match.index + match[0].length
      const chunk = content.slice(startIndex, endIndex).trim()
      if (chunk) {
        segments.push(chunk)
      }
      startIndex = endIndex
    }
    const tail = content.slice(startIndex).trim()
    if (tail) {
      segments.push(tail)
    }
    return segments
  }

  const ensureSceneSegments = (scenario: Scenario) => {
    if (!scenario.file_content) return []
    if (sceneSegments[scenario.id]) {
      return sceneSegments[scenario.id]
    }
    const segments = buildSceneSegments(scenario.file_content)
    setSceneSegments((prev) => ({ ...prev, [scenario.id]: segments }))
    return segments
  }

  const getSceneProgress = (sceneId: number) => {
    return sceneProgress[sceneId] ?? 0
  }

  const setSceneProgressIndex = (sceneId: number, index: number) => {
    setSceneProgress((prev) => ({ ...prev, [sceneId]: index }))
  }

  const extractPlayerProfile = (text: string) => {
    const players: Array<{ name: string; age: number }> = []
    const pattern = /jogador\s*\d+\s*[:\-]\s*([A-Za-zÀ-ÿ' -]+?)\s*(?:,|\s)\s*(\d{1,3})\s*anos?/gi
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1].trim()
      const age = parseInt(match[2])
      if (name && age) {
        players.push({ name, age })
      }
    }
    const countMatch = /(\d{1,2})\s*jogadores?/i.exec(text)
    const count = countMatch ? parseInt(countMatch[1]) : players.length || undefined
    const nameMatch = /(me chamo|meu nome e|meu nome é|sou)\s+([A-Za-zÀ-ÿ' -]+)/i.exec(text)
    const ageMatch = /(\d{1,3})\s*anos?/i.exec(text)
    const name = nameMatch ? nameMatch[2].trim() : undefined
    const age = ageMatch ? parseInt(ageMatch[1]) : undefined
    const completed = (players.length > 0 || (name && age)) && (count || players.length > 0)
    return { players, count, name, age, completed }
  }

  const buildPromptContext = (inputText: string) => {
    const currentScenario = scenarios.find((s) => s.id === currentScenarioId)
    const currentSceneName = currentScenario?.name || 'N/A'
    let nextStart = ''
    let nextEnd = ''
    if (currentScenario?.file_content) {
      const segments = ensureSceneSegments(currentScenario)
      const index = getSceneProgress(currentScenario.id)
      const nextSegment = segments[index] || ''
      nextStart = nextSegment
      nextEnd = nextSegment
    }

    const basePrompt = `A LLM sempre recebe os dados de nome, idade e quantidade de jogadores como contexto antes de trazer a próxima cena do jogo. Dessa forma, ela mantém um diálogo educado sempre chamando o jogador pelo nome e com o tom de de comunicação adequado à idade do jogador ou jogadores. Se tiver mais de um jogador, sempre considere a idade do jogador mais novo para o tom da conversação.
- Salve os dados de nome do jogador, idade e quantidade de jogadores, pois SEMPRE será utilizado como contexto da LLM.
- Uma vez tendo recebido os dados de nome do jogador, idade e quantidade de jogadores, sempre os mantenha no contexto enviado para a LLM e de modo a apoiar a seleção das próximas cenas, que também dependerão de respostas dos jogadores. Essas respostas devem ser registradas para manter o fluxo e saber para qual ponto retornar no fluxo do jogo e portanto, também devem sempre ser enviadas como contexto para LLM.
- Use o arquivo Introdução até que jogador selecione um dos elementos (Ar, Fogo, Água ou Terra).
- Uma vez que nome, idade e quantidade de jogadores foi informado e um dos elementos selecionado (Ar, Fogo, Água ou Terra), passe para a sequência do arquivo de cena de acordo com o elemento selecionado.
- O elemento selecionado pelo jogador deve indicar qual Portal será aberto, em outras palavras se jogador selecionar elemento Água, o arquivo a ser aberto será Cena 0A - Portal da Água, se jogador selecionar elemento Terra, o arquivo a ser aberto será Cena 0A - Portal da Terra, e assim por diante com todos os demais. Nesse caso, apenas uma das Cenas 0A será apresentada de acordo com a seleção do elemento ar, fogo, água ou terra.
- A partir disso, a interação segue o arquivo Cena 0A com o portal do elemento selecionado pelo jogador. Ao finalizar todo o fluxo deste arquivo a partir da conversa com o jogador e salvando suas respostas como contexto para a próxima interação com o jogador, siga para o arquivo cujo título inicia com Cena 0B.
- Após apresentar todo o conteúdo do arquivo cujo título inicia com Cena 0B siga para o arquivo cujo título inicia com Cena 01 - Temperança.
- A partir do arquivo de Cena 01-Temperança, siga em ordem crescente de cenas, ou seja, Cena 02 - Temperança, Cena 03 - Temperança, etc.
- Todas as cenas do jogo são selecionadas de acordo com a resposta do jogador. Uma vez tendo entrado num arquivo de cena só mude para a próxima cena quando passar por todo o fluxo da cena.
- Sempre que for apresentar conteúdo de uma cena traga a imagem e/ou vídeo associada a esta cena no chat.

Percepção → Memória → Decisão → Ação → Feedback
Dados do ambiente:
- Cena atual: ${currentSceneName}
- Próximo ponto de início: ${nextStart || 'N/A'}
- Próximo ponto de fim: ${nextEnd || 'N/A'}

LÍNGUA: pt-BR | Fuso: America/Sao_Paulo
PERSONA: Narrador inteligente, caloroso e guiador; conduz a história do ponto de vista do jogador.
🌀 REGRAS-MÃE (OBRIGATÓRIAS)
Fidelidade total ao roteiro. Sempre carregar e apresentar o texto integral das cenas a partir dos arquivos correspondentes (sem resumir).
Após cada portal, aplicar a Estrutura das Cenas (ambiente, NPCs, evento de ruptura, chamada à ação, fechamento simbólico).
Ordem fixa: Introdução → 0A (Ar/Fogo/Água/Terra) → 0B (Clareira) → T01–T05 (Temperança).
Não permitir saltos fora da ordem.
Setup inicial: perguntar número de jogadores (1–4) e idades; registrar.
Adaptar linguagem conforme faixa etária:
6–8 anos → lúdico e concreto;
9–12 → emocional e simbólico;
13–17 → reflexivo;
18+ → filosófico.
🔑 RITUAL E TRAVESSIA
Chave do Silêncio: antes de cruzar qualquer portal, conduzir 1 minuto real (ou simbólico) de silêncio guiado.
Usos: foco, introspecção, +1 rerrolagem de 1 dado ainda não utilizado (exceto 🌑).
Descrever o efeito simbólico do silêncio no ambiente antes da travessia.
🎲 MECÂNICAS OFICIAIS
Dados: 6 faces (🔥💧🌬️🌱✨🌑).
Ao comando “rolar dados”, sorteie 6 faces por jogador e mostre visualmente.
Aplicar regras:
Cada elemento preenche um dos quatro espaços do tabuleiro pessoal.
✨ Luz substitui elemento faltante ou anula 🌑.
🌑 Sombra bloqueia elemento até ser integrada simbolicamente num desafio proposto pela IA. Se falta um dos 4 elementos a serem completados a IA aponta o elemento faltante e sugere uma dinâmica ou desafio para completar o elemento que falta e deve representar isso em narrativa na cena, trazendo novos personagens ou elementos no cenário que provocam o tema.
Quando todos completam os 4 elementos, a cena avança.
Relicário do Silêncio: 2 usos por cena (1 min. de pausa simbólica para rerrolar dado).
Forja Elemental (pós-cena): após cada cena, role 1 dado:
Elemento → +1 pedrinha daquele tipo; ✨ → jogador escolhe; 🌑 → sem ganho.
Registrar a evolução da Forja (invisível).
⚖️ VERIFICAÇÃO OBRIGATÓRIA DA FORJA ELEMENTAL
Regra central — jamais pular esta etapa.
Após cada rolagem, identificar quais elementos (🔥💧🌬️🌿) o jogador já possui e quais faltam.
Identificar se há 🌑 Sombras bloqueando espaços.
Para cada elemento faltante, criar e narrar um desafio simbólico e/ou emocional personalizado, coerente com o tema do elemento e da cena. Exemplos:
Fogo faltando: coragem, decisão, ação consciente.
Água faltando: emoção, entrega, empatia/cuidado.
Ar faltando: leveza, foco, expressão/respiração.
Terra faltando: estabilidade, limite, confiança/raiz.
O jogador deve responder (fala, gesto, imaginação, respiração, pequena escolha).
Se a resposta for coerente, conceder o elemento faltante e marcar como conquistado na Forja.
Se houver 🌑 Sombra ocupando o espaço, integrá-la (reflexão/gesto simbólico) antes de liberar o elemento.
A cena não avança até todos os jogadores completarem os quatro elementos no tabuleiro pessoal. Lembrar de aplicar em todas as cenas.
🌿 CENAS E PROGRESSÃO
0A – Portais Elementais: cada jogador vivencia Luz e Sombra do seu elemento; após sucesso, +1 pedrinha inicial.
0B – Clareira do Sábio Galhar: ativar o Dispositivo cooperativamente, conceder Medalhões Elementais.
Reinos: seguir ordem canônica (T01–T05). Após cada, conceder pedrinha conforme rolagem.
Estrutura das Cenas (sempre):
Ambiente vivo → Presença simbólica → Ruptura → Chamada à ação → Fechamento simbólico.
Adicionar microdesafios e enigmas sem alterar o roteiro oficial.
🌗 REGRAS DE NARRAÇÃO E FOCO
Narrar apenas o que os jogadores podem perceber/descobrir naquele momento (anti-spoiler).
NPCs não rolam dados.
Manter o ritmo ação → reflexão → ritual → avanço.
Nunca prometer “depois”; tudo ocorre agora.
✨ RESUMO OPERACIONAL
Pergunte jogadores/idades.
Execute Introdução integral.
Ative o Ritual (Chave do Silêncio).
Role os dados e aplique todas as regras.
Verifique a Forja Elemental de cada jogador; gere desafios até completá-la.
Avance conforme a ordem canônica.
🜂 ESTILO NARRATIVO
Nine fala como narrador envolvente, criando atmosfera viva, mantendo o ritmo entre mística e jogo, sempre guiando com perguntas simbólicas e imagens sensoriais.
IA fica atenta para não faltar desafio na hora de completar os 4 elementos na forja e adaptar desafios conforme idade. Não pode avançar nenhuma cena sem que os jogadores tenham completado o desafio mecânico dos dados e da forja.
Interpreta o resultado dos dados que faltou completar na forja e transforma em desafio interativo, onde ele pode elaborar com reflexões, usando o poder elemental, com gestos.
Lembra sempre de apresentar o fragmento encontrado no final de cada cena.
A ia não narra o que os personagens dos jogadores fazem, pois os jogadores é que devem descrever suas ações.
Traz elementos na cena que provoquem eles serem criativos e utilizarem seus poderes.`

    const profileText = playerProfile
      ? [
          playerProfile.players?.length
            ? playerProfile.players.map((p, idx) => `Jogador ${idx + 1}: ${p.name}, ${p.age} anos`).join('\n')
            : playerProfile.name && playerProfile.age
              ? `Jogador 1: ${playerProfile.name}, ${playerProfile.age} anos`
              : '',
          playerProfile.count ? `Quantidade de jogadores: ${playerProfile.count}` : '',
        ].filter(Boolean).join('\n')
      : ''

    return [basePrompt, profileText, `Resposta do jogador: ${inputText}`].filter(Boolean).join('\n\n')
  }

  const getIntroScenario = () => {
    return (
      scenarios.find((s) => normalizeText(s.name) === 'introducao') ||
      scenarios.find((s) => normalizeText(s.name).includes('introducao 0')) ||
      scenarios.find((s) => normalizeText(s.name).startsWith('introducao')) ||
      scenarios.find((s) => normalizeText(s.name).includes('introducao')) ||
      scenarios.find((s) => normalizeText(s.file_url || '').includes('introducao')) ||
      scenarios[0] ||
      null
    )
  }

  const getSelectedElement = (text: string) => {
    const normalized = normalizeText(text)
    if (normalized.includes('agua')) return 'agua'
    if (normalized.includes('fogo')) return 'fogo'
    if (normalized.includes('terra')) return 'terra'
    if (normalized.includes('ar')) return 'ar'
    return null
  }

  const isCompletion = (text: string) => {
    const normalized = normalizeText(text)
    return ['finalizei', 'finalizar', 'conclui', 'concluir', 'terminei', 'terminar', 'pronto'].some((term) =>
      normalized.includes(term)
    )
  }

  const findScenarioByPrefix = (prefix: string) => {
    const normalizedPrefix = normalizeText(prefix)
    return scenarios.find((s) => normalizeText(s.name).startsWith(normalizedPrefix)) || null
  }

  const findScenarioByContains = (term: string) => {
    const normalizedTerm = normalizeText(term)
    return scenarios.find((s) => normalizeText(s.name).includes(normalizedTerm)) || null
  }

  const resolveScenarioForInput = (inputText: string) => {
    const intro = getIntroScenario()
    const current = scenarios.find((s) => s.id === currentScenarioId) || intro
    if (!current) return null

    if (intro && current.id === intro.id) {
      const element = getSelectedElement(inputText)
      if (!element) {
        return intro
      }

      const portal =
        findScenarioByContains(`Portal da ${element}`) ||
        findScenarioByContains(`Portal do ${element}`) ||
        findScenarioByContains(`Cena 0A`) ||
        null
      return portal || intro
    }

    if (isCompletion(inputText)) {
      const normalizedName = normalizeText(current.name)
      if (normalizedName.startsWith(normalizeText('Cena 0A'))) {
        return findScenarioByPrefix('Cena 0B') || current
      }
      if (normalizedName.startsWith(normalizeText('Cena 0B'))) {
        return findScenarioByPrefix('Cena 01 - Temperança') || findScenarioByPrefix('Cena 01') || current
      }
      const match = normalizedName.match(/cena\s*(\d{2})/)
      if (match) {
        const nextNumber = parseInt(match[1]) + 1
        return findScenarioByPrefix(`Cena ${nextNumber.toString().padStart(2, '0')}`) || current
      }
    }

    return current
  }

  const formatScenarioImageUrl = (imageUrl?: string) => {
    if (!imageUrl) return null
    if (imageUrl.startsWith('http') || imageUrl.startsWith('blob:') || imageUrl.startsWith('data:')) {
      return imageUrl
    }
    return `${API_URL}${imageUrl}`
  }

  const formatScenarioVideoUrl = (videoUrl?: string) => {
    if (!videoUrl) return null
    if (videoUrl.startsWith('http') || videoUrl.startsWith('blob:') || videoUrl.startsWith('data:')) {
      return videoUrl
    }
    return `${API_URL}${videoUrl}`
  }

  const getCurrentSceneBackground = () => {
    if (forcedSceneBackground) {
      return forcedSceneBackground
    }
    const lastSceneMessage = [...interactions].reverse().find((item) => item.message_type === 'scene')
    if (lastSceneMessage?.scene_image_url) {
      return lastSceneMessage.scene_image_url
    }
    const currentScenario = scenarios.find((s) => s.id === currentScenarioId)
    return formatScenarioImageUrl(currentScenario?.image_url || undefined)
  }

  useEffect(() => {
    if (forcedSceneBackground || !currentScenarioId) return
    const currentScenario = scenarios.find((s) => s.id === currentScenarioId)
    const imageUrl = formatScenarioImageUrl(currentScenario?.image_url || undefined)
    if (imageUrl) {
      setForcedSceneBackground(imageUrl)
    }
  }, [forcedSceneBackground, currentScenarioId, scenarios.length])

  const appendSceneImageMessage = (scenario: Scenario | null) => {
    if (!scenario || !session) return

    const lastSceneMessage = [...interactions].reverse().find((item) => item.message_type === 'scene')
    if (lastSceneMessage?.scene_name === scenario.name) {
      return
    }

    const imageUrl = formatScenarioImageUrl(scenario.image_url)
    const videoUrl = formatScenarioVideoUrl(scenario.video_url)
    if (!imageUrl && !videoUrl) return

    const sceneMessage: Interaction = {
      id: `scene-${scenario.id}-${Date.now()}`,
      session_id: session.id,
      player_input: '',
      player_input_type: 'scene',
      ai_response: '',
      created_at: new Date().toISOString(),
      message_type: 'scene',
      scene_image_url: imageUrl || undefined,
      scene_video_url: videoUrl || undefined,
      scene_name: scenario.name,
    }

    setInteractions((prev) => [...prev, sceneMessage])
    setCurrentScenarioId(scenario.id)
  }

  const insertSceneMediaBeforePending = (pendingId: string | null, scenario: Scenario | null) => {
    if (!pendingId || !scenario || !session) return
    setInteractions((prev) => {
      const pendingIndex = prev.findIndex((item) => item.id === pendingId)
      if (pendingIndex === -1) return prev

      const lastSceneMessage = [...prev].reverse().find((item) => item.message_type === 'scene')
      if (lastSceneMessage?.scene_name === scenario.name) {
        return prev
      }

      const imageUrl = formatScenarioImageUrl(scenario.image_url)
      const videoUrl = formatScenarioVideoUrl(scenario.video_url)
      if (!imageUrl && !videoUrl) return prev

      const sceneMessage: Interaction = {
        id: `scene-${scenario.id}-${Date.now()}`,
        session_id: session.id,
        player_input: '',
        player_input_type: 'scene',
        ai_response: '',
        created_at: new Date().toISOString(),
        message_type: 'scene',
        scene_image_url: imageUrl || undefined,
        scene_video_url: videoUrl || undefined,
        scene_name: scenario.name,
      }

      const next = [...prev]
      next.splice(pendingIndex, 0, sceneMessage)
      return next
    })
    setCurrentScenarioId(scenario.id)
  }

  const appendPendingInteraction = (inputText: string, inputType: 'text' | 'audio') => {
    if (!session) return null
    const tempId = `pending-${Date.now()}`
    const pendingInteraction: Interaction = {
      id: tempId,
      session_id: session.id,
      player_input: inputText,
      player_input_type: inputType,
      ai_response: '...',
      created_at: new Date().toISOString(),
      pending: true,
    }
    setInteractions((prev) => [...prev, pendingInteraction])
    return tempId
  }

  const replacePendingInteraction = (tempId: string | null, newInteraction: Interaction) => {
    if (!tempId) return
    setInteractions((prev) =>
      prev.map((item) => (item.id === tempId ? newInteraction : item))
    )
  }

  const markPendingError = (tempId: string | null, message: string) => {
    if (!tempId) return
    setInteractions((prev) =>
      prev.map((item) =>
        item.id === tempId
          ? { ...item, ai_response: message, pending: false, error: true }
          : item
      )
    )
  }

  // Enviar mensagem de texto
  const handleSendMessage = async () => {
    if (!playerInput.trim() || !session || loading) return

    const inputText = playerInput.trim()
    setPlayerInput('')
    const profileCandidate = extractPlayerProfile(inputText)
    if (profileCandidate.completed) {
      setPlayerProfile(profileCandidate)
    }
    setLoading(true)

    let pendingId: string | null = null
    try {
      pendingId = appendPendingInteraction(inputText, 'text')
      const response = await api.post('/api/game/interact', {
        session_id: session.id,
        player_input: inputText,
        player_input_type: 'text',
        include_audio_response: includeAudio
      })

      const newInteraction = response.data
      
      // Atualizar sessão
      const sessionResponse = await api.get(`/api/sessions/${session.id}`)
      const updatedSession = sessionResponse.data
      setSession(updatedSession)
      setCurrentScenarioId(updatedSession.current_scenario_id || currentScenarioId)

      const scenarioToShow = scenarios.find((scenario) => scenario.id === updatedSession.current_scenario_id) || null
      insertSceneMediaBeforePending(pendingId, scenarioToShow)
      replacePendingInteraction(pendingId, newInteraction)

      toast.success('Resposta recebida!')
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error(error.response?.data?.detail || 'Erro ao enviar mensagem')
      markPendingError(pendingId, 'Erro ao obter resposta da IA.')
      setPlayerInput(inputText) // Restaurar texto em caso de erro
    } finally {
      setLoading(false)
    }
  }

  // Iniciar gravação de áudio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        await sendAudio(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      toast.success('Gravando...')
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error)
      toast.error('Erro ao acessar microfone')
    }
  }

  // Parar gravação
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // Enviar áudio
  const sendAudio = async (audioBlob: Blob) => {
    if (!session || loading) return

    setLoading(true)
    let pendingId: string | null = null
    try {
      pendingId = appendPendingInteraction('Mensagem de voz enviada.', 'audio')
      const formData = new FormData()
      formData.append('audio_file', audioBlob, 'audio.webm')
      formData.append('session_id', session.id.toString())
      formData.append('include_audio_response', includeAudio.toString())

      const response = await api.post('/api/game/interact/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const newInteraction = response.data

      const sessionResponse = await api.get(`/api/sessions/${session.id}`)
      const updatedSession = sessionResponse.data
      setSession(updatedSession)
      setCurrentScenarioId(updatedSession.current_scenario_id || currentScenarioId)

      const scenarioToShow = scenarios.find((scenario) => scenario.id === updatedSession.current_scenario_id) || null
      insertSceneMediaBeforePending(pendingId, scenarioToShow)
      replacePendingInteraction(pendingId, newInteraction)

      toast.success('Áudio processado!')
    } catch (error: any) {
      console.error('Erro ao enviar áudio:', error)
      toast.error(error.response?.data?.detail || 'Erro ao processar áudio')
      markPendingError(pendingId, 'Erro ao obter resposta da IA.')
    } finally {
      setLoading(false)
    }
  }

  // Reproduzir áudio de resposta
  const playAudio = (audioUrl: string) => {
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
    }

    const audio = new Audio(`${API_URL}${audioUrl}`)
    audio.play()
    setActiveAudio(audio)

    audio.onended = () => {
      setActiveAudio(null)
    }
  }

  // Pausar sessão (salvar progresso)
  const pauseSession = async () => {
    if (!session) return

    try {
      await api.patch(`/api/sessions/${session.id}/pause`)
      toast.success('Progresso salvo!')
      setSession({ ...session, status: 'paused' })
    } catch (error: any) {
      console.error('Erro ao pausar sessão:', error)
      toast.error('Erro ao salvar progresso')
    }
  }

  // Logout
  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const handleBackToRooms = async () => {
    let gameId = session?.game_id || (urlGameId ? parseInt(urlGameId) : null)

    if (!gameId) {
      try {
        const gamesResponse = await api.get('/api/player/games')
        const games = gamesResponse.data || []
        if (games.length > 0) {
          gameId = games[0].id
        } else {
          router.push('/player')
          return
        }
      } catch (error) {
        console.error('Erro ao buscar jogos:', error)
        router.push('/player')
        return
      }
    }

    router.push(`/player/games/${gameId}/rooms`)
  }

  if (!_hasHydrated || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!canRender) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  const finalUser = user || (typeof window !== 'undefined' ? (() => {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        return JSON.parse(authStorage)?.state?.user || null
      }
    } catch {}
    return null
  })() : null)

  if (!finalUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando perfil...</p>
        </div>
      </div>
    )
  }

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Carregando jogo...</p>
          <p className="text-sm mt-2 opacity-80">Aguarde enquanto preparamos sua aventura</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white mx-auto mb-4"></div>
          <p className="text-xl font-semibold">Preparando jogo...</p>
        </div>
      </div>
    )
  }

  const sceneBackground = getCurrentSceneBackground()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Jogo Interativo</h1>
            <p className="text-white/80 text-sm">
              Bem-vindo, {finalUser?.username}! {session && `• Fase ${session.current_phase}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {finalUser?.role === 'PLAYER' && (
              <button
                onClick={handleBackToRooms}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
                title="Voltar para salas"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para Salas
              </button>
            )}
            <button
              onClick={pauseSession}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors flex items-center gap-2"
              title="Salvar progresso"
            >
              <Save className="h-4 w-4" />
              Salvar
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full p-4">
        <div 
          ref={chatContainerRef}
          className="flex-1 bg-white/95 backdrop-blur-md rounded-lg shadow-xl overflow-y-auto p-6 mb-4 relative"
          style={{
            backgroundImage: sceneBackground ? `url(${sceneBackground})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {sceneBackground && (
            <div className="absolute inset-0 bg-white/70" />
          )}
          {interactions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 relative z-10">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Bem-vindo ao jogo!</p>
                <p className="text-sm">Comece digitando uma mensagem ou gravando um áudio.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 relative z-10">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="space-y-2">
                  {interaction.message_type === 'scene' ? (
                    <div className="flex justify-center">
                      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 w-full">
                        <p className="text-xs text-gray-500 mb-2">
                          Cena: {interaction.scene_name || 'Cena atual'}
                        </p>
                        {interaction.scene_video_url && (
                          <video
                            controls
                            className="w-full h-64 md:h-96 rounded-md bg-black mb-3"
                            src={interaction.scene_video_url}
                          />
                        )}
                        {interaction.scene_image_url && (
                          <img
                            src={interaction.scene_image_url}
                            alt={interaction.scene_name || 'Cena do jogo'}
                            className="w-full h-64 md:h-96 object-cover rounded-md"
                          />
                        )}
                      </div>
                    </div>
                  ) : interaction.message_type === 'intro' ? (
                    <div className="flex justify-start">
                      <div className="bg-white/90 rounded-lg px-4 py-3 max-w-2xl shadow-sm border border-gray-200">
                        <p className="text-gray-800 whitespace-pre-wrap">{interaction.ai_response}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Mensagem do jogador */}
                      <div className="flex justify-end">
                        <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-md">
                          <p className="text-sm">{interaction.player_input}</p>
                          {interaction.player_input_type === 'audio' && (
                            <p className="text-xs opacity-75 mt-1">Mensagem de voz</p>
                          )}
                        </div>
                      </div>

                      {/* Resposta da IA */}
                      <div className="flex justify-start">
                        <div className="bg-gray-200 rounded-lg px-4 py-2 max-w-md">
                          {interaction.pending ? (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                              <span className="text-sm">Narrador está preparando a resposta...</span>
                            </div>
                          ) : (
                            <p className="text-gray-800 whitespace-pre-wrap">{interaction.ai_response}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {interaction.ai_response_audio_url && !interaction.pending && (
                              <button
                                onClick={() => playAudio(interaction.ai_response_audio_url!)}
                                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-xs"
                              >
                                {activeAudio && activeAudio.src.includes(interaction.ai_response_audio_url!) ? (
                                  <>
                                    <Pause className="h-3 w-3" />
                                    Pausar áudio
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="h-3 w-3" />
                                    Ouvir resposta
                                  </>
                                )}
                              </button>
                            )}
                            <span className="text-xs text-gray-500">
                              {interaction.response_time?.toFixed(2)}s • {interaction.llm_model}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {loading && (
            <div className="flex justify-start mt-4 relative z-10">
              <div className="bg-gray-200 rounded-lg px-4 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              </div>
            </div>
          )}
        </div>

        {/* Área de Input */}
        <div className="bg-white/95 backdrop-blur-md rounded-lg shadow-xl p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAudio}
                onChange={(e) => setIncludeAudio(e.target.checked)}
                className="rounded"
              />
              Incluir áudio na resposta
            </label>
            {finalUser?.role === 'PLAYER' && (
              <button
                onClick={handleBackToRooms}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm flex items-center gap-2"
                title="Voltar para salas"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para Salas
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <textarea
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder="Digite sua mensagem ou grave um áudio..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={loading || !session}
            />
            
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading || !session}
              className={`p-3 rounded-lg transition-colors ${
                isRecording
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
            >
              {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            <button
              onClick={handleSendMessage}
              disabled={loading || !playerInput.trim() || !session}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GamePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <GamePageContent />
    </Suspense>
  )
}
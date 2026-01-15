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
  id: number
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
}

interface Scenario {
  id: number
  name: string
  description?: string
  image_url?: string
  file_url?: string
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

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
          await loadHistory(session.id)
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
      
      // Carregar histórico
      await loadHistory(activeSession.id)
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
      
      // Carregar histórico
      await loadHistory(activeSession.id)
    } catch (error: any) {
      console.error('Erro ao criar sessão:', error)
      toast.error(error.response?.data?.detail || 'Erro ao criar sessão')
      throw error // Re-throw para que o initializeGame possa tratar
    } finally {
      setLoading(false)
      setInitializing(false)
    }
  }


  // Carregar histórico
  const loadHistory = async (sessionId: number) => {
    try {
      const response = await api.get(`/api/game/${sessionId}/history`)
      const history = response.data || []
      setInteractions(history.reverse()) // Ordenar do mais antigo para o mais recente
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

  // Enviar mensagem de texto
  const handleSendMessage = async () => {
    if (!playerInput.trim() || !session || loading) return

    const inputText = playerInput.trim()
    setPlayerInput('')
    setLoading(true)

    try {
      const response = await api.post('/api/game/interact', {
        session_id: session.id,
        player_input: inputText,
        player_input_type: 'text',
        include_audio_response: includeAudio
      })

      const newInteraction = response.data
      setInteractions(prev => [...prev, newInteraction])
      
      // Atualizar sessão
      const sessionResponse = await api.get(`/api/sessions/${session.id}`)
      setSession(sessionResponse.data)

      toast.success('Resposta recebida!')
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error(error.response?.data?.detail || 'Erro ao enviar mensagem')
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
    try {
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
      setInteractions(prev => [...prev, newInteraction])
      
      toast.success('Áudio processado!')
    } catch (error: any) {
      console.error('Erro ao enviar áudio:', error)
      toast.error(error.response?.data?.detail || 'Erro ao processar áudio')
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

    const audio = new Audio(`http://localhost:8000${audioUrl}`)
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
          className="flex-1 bg-white/95 backdrop-blur-md rounded-lg shadow-xl overflow-y-auto p-6 mb-4"
        >
          {interactions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">Bem-vindo ao jogo!</p>
                <p className="text-sm">Comece digitando uma mensagem ou gravando um áudio.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="space-y-2">
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
                      <p className="text-gray-800 whitespace-pre-wrap">{interaction.ai_response}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {interaction.ai_response_audio_url && (
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
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {loading && (
            <div className="flex justify-start mt-4">
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
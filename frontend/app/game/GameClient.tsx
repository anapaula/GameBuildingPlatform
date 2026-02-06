'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  LogOut,
  Plus,
  Gamepad2,
  Settings,
  Brain,
  Map
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
  video_url?: string
  phase: number
  order: number
}

interface LLMConfig {
  id: number
  provider: string
  model_name: string
  temperature: number
  max_tokens?: number
}

type ViewMode = 'select' | 'game' | 'loading'

function GameClient() {
  const router = useRouter()
  const { user, isAuthenticated, token, _hasHydrated, logout } = useAuthStore()
  const [authChecked, setAuthChecked] = useState(false)
  const [canRender, setCanRender] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('loading')
  
  // Estado do jogo
  const [session, setSession] = useState<GameSession | null>(null)
  const [interactions, setInteractions] = useState<Interaction[]>([])
  const [loading, setLoading] = useState(false)
  const [playerInput, setPlayerInput] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [includeAudio, setIncludeAudio] = useState(false)
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null)
  
  // Estado para seleção de sessão
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [llmConfigs, setLlmConfigs] = useState<LLMConfig[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [selectedLlm, setSelectedLlm] = useState<number | null>(null)
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null)
  const [testMode, setTestMode] = useState(false)
  const [loadingConfigs, setLoadingConfigs] = useState(false)
  const [showLlmChangeModal, setShowLlmChangeModal] = useState(false)
  
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
        loadSessionSelection()
      } else {
        router.replace('/login')
      }
    }, delay)

    return () => clearTimeout(checkTimer)
  }, [_hasHydrated, isAuthenticated, token, user, router])

  // Carregar seleção de sessão
  const loadSessionSelection = async () => {
    setLoadingConfigs(true)
    try {
      const sessionsResponse = await api.get('/api/sessions/')
      setSessions(sessionsResponse.data || [])
      
      const [llmResponse, scenariosResponse] = await Promise.all([
        api.get('/api/game/config/llms').catch(() => ({ data: [] })),
        api.get('/api/game/config/scenarios').catch(() => ({ data: [] }))
      ])
      
      setLlmConfigs(llmResponse.data || [])
      setScenarios(scenariosResponse.data || [])
      
      const activeSession = (sessionsResponse.data || []).find((s: GameSession) => s.status === 'active')
      if (activeSession) {
        setSession(activeSession)
        setViewMode('game')
        await loadHistory(activeSession.id)
      } else {
        setViewMode('select')
      }
    } catch (error: any) {
      console.error('Erro ao carregar seleção:', error)
      toast.error('Erro ao carregar configurações')
      setViewMode('select')
    } finally {
      setLoadingConfigs(false)
    }
  }

  const createNewSession = async (useTestMode: boolean = false) => {
    if (useTestMode && !selectedLlm) {
      toast.error('Selecione uma LLM para o ambiente de teste')
      return
    }

    setLoading(true)
    try {
      let llmProvider = null
      let llmModel = null

      if (useTestMode && selectedLlm) {
        const selectedConfig = llmConfigs.find((c: LLMConfig) => c.id === selectedLlm)
        if (selectedConfig) {
          llmProvider = selectedConfig.provider
          llmModel = selectedConfig.model_name
        }
      } else {
        try {
          const activeLlmResponse = await api.get('/api/llm/active')
          llmProvider = activeLlmResponse.data.provider
          llmModel = activeLlmResponse.data.model_name
        } catch (e) {
          console.error('Erro ao obter LLM ativa:', e)
        }
      }

      const createResponse = await api.post('/api/sessions/', {
        llm_provider: llmProvider,
        llm_model: llmModel,
        scenario_id: selectedScenario || null
      })

      const newSession = createResponse.data
      setSession(newSession)
      setViewMode('game')
      toast.success(useTestMode ? 'Ambiente de teste iniciado!' : 'Sessão criada com sucesso!')
      
      if (selectedScenario) {
        const scenario = scenarios.find((s: Scenario) => s.id === selectedScenario)
        if (scenario && scenario.description) {
          setTimeout(() => {
            toast(`Cenário: ${scenario.name}`)
          }, 500)
        }
      }
    } catch (error: any) {
      console.error('Erro ao criar sessão:', error)
      toast.error(error.response?.data?.detail || 'Erro ao criar sessão')
    } finally {
      setLoading(false)
    }
  }

  const continueSession = async (sessionId: number) => {
    setLoading(true)
    try {
      const sessionResponse = await api.get(\/api/sessions/\\)
      const targetSession = sessionResponse.data

      if (targetSession.status === 'paused') {
        await api.patch(\/api/sessions/\/resume\)
        targetSession.status = 'active'
      }

      setSession(targetSession)
      setViewMode('game')
      await loadHistory(sessionId)
      toast.success('Sessão retomada!')
    } catch (error: any) {
      console.error('Erro ao continuar sessão:', error)
      toast.error('Erro ao continuar sessão')
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async (sessionId: number) => {
    try {
      const response = await api.get(\/api/game/\/history\)
      const history = response.data || []
      setInteractions(history)
    } catch (error: any) {
      console.error('Erro ao carregar histórico:', error)
    }
  }

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [interactions])

  useEffect(() => {
    if (session && interactions.length > 0 && session.status === 'active') {
      const lastInteraction = interactions[interactions.length - 1]
      if (lastInteraction) {
        setSession({ ...session, last_activity: lastInteraction.created_at })
      }
    }
  }, [interactions.length])

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
      
      const sessionResponse = await api.get(\/api/sessions/\\)
      setSession(sessionResponse.data)

      toast.success('Resposta recebida!')
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      toast.error(error.response?.data?.detail || 'Erro ao enviar mensagem')
      setPlayerInput(inputText)
    } finally {
      setLoading(false)
    }
  }

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

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

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

  const playAudio = (audioUrl: string) => {
    if (activeAudio) {
      activeAudio.pause()
      activeAudio.currentTime = 0
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const audio = new Audio(\\\\)
    audio.play()
    setActiveAudio(audio)

    audio.onended = () => {
      setActiveAudio(null)
    }
  }

  const pauseSession = async () => {
    if (!session) return

    try {
      await api.patch(\/api/sessions/\/pause\)
      toast.success('Progresso salvo!')
      setSession({ ...session, status: 'paused' })
      setViewMode('select')
    } catch (error: any) {
      console.error('Erro ao pausar sessão:', error)
      toast.error('Erro ao salvar progresso')
    }
  }

  const backToSelection = () => {
    setViewMode('select')
    setSession(null)
    setInteractions([])
    loadSessionSelection()
  }

  const changeSessionLLM = async (llmConfigId: number) => {
    if (!session) return

    try {
      await api.patch(`/api/sessions/${session.id}/llm?llm_config_id=${llmConfigId}`)
      const updatedSession = await api.get(`/api/sessions/${session.id}`)
      setSession(updatedSession.data)
      setShowLlmChangeModal(false)
      toast.success('LLM alterada com sucesso!')
    } catch (error: any) {
      console.error('Erro ao trocar LLM:', error)
      toast.error(error.response?.data?.detail || 'Erro ao trocar LLM')
    }
  }

  const handleLogout = () => {
    logout()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage')
      sessionStorage.clear()
    }
    router.replace('/login')
  }

  const getFinalUser = () => {
    if (user) return user
    if (typeof window === 'undefined') return null
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        return JSON.parse(authStorage)?.state?.user || null
      }
    } catch {}
    return null
  }

  if (!_hasHydrated || !authChecked) {
    return (
      <div className=
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { BookOpen, Brain, BarChart3, Users, Settings, Gamepad2 } from 'lucide-react'
import Link from 'next/link'
import { useSelectedGame } from '@/hooks/useSelectedGame'
import toast from 'react-hot-toast'

interface GameStats {
  rules_count: number
  scenarios_count: number
  llms_count: number
  active_llm: string | null
  sessions_count: number
  active_sessions_count: number
  users_count: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { selectedGameId } = useSelectedGame()
  const [selectedGame, setSelectedGame] = useState<any>(null)
  const [stats, setStats] = useState<GameStats>({
    rules_count: 0,
    scenarios_count: 0,
    llms_count: 0,
    active_llm: null,
    sessions_count: 0,
    active_sessions_count: 0,
    users_count: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar também no localStorage caso o hook ainda não tenha atualizado
    const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
    const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
    
    if (!gameId) {
      console.log('Nenhum jogo selecionado, redirecionando para /admin')
      router.push('/admin')
      return
    }
    
    console.log('Carregando dados do jogo:', gameId)
    fetchData()
  }, [selectedGameId, router])

  const fetchData = async () => {
    // Verificar também no localStorage caso o hook ainda não tenha atualizado
    const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
    const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
    
    if (!gameId) {
      console.log('Nenhum gameId disponível para carregar dados')
      return
    }
    
    console.log('Buscando dados para o jogo:', gameId)
    
    try {
      // Carregar informações do jogo
      const gameRes = await api.get(`/api/admin/games/${gameId}`)
      setSelectedGame(gameRes.data)

      // Carregar estatísticas
      const [rulesRes, scenariosRes, llmsRes, sessionsRes, usersRes] = await Promise.all([
        api.get(`/api/admin/rules?game_id=${gameId}`).catch(() => ({ data: [] })),
        api.get(`/api/admin/scenarios?game_id=${gameId}`).catch(() => ({ data: [] })),
        api.get(`/api/admin/llm/configs?game_id=${gameId}`).catch(() => ({ data: [] })),
        api.get(`/api/admin/sessions`).catch(() => ({ data: [] })),
        api.get(`/api/users`).catch(() => ({ data: [] })),
      ])

      const rules = rulesRes.data || []
      const scenarios = scenariosRes.data || []
      const llms = llmsRes.data || []
      const sessions = sessionsRes.data || []
      const users = usersRes.data || []

      // Filtrar sessões do jogo selecionado
      const gameSessions = sessions.filter((s: any) => s.game_id === gameId)
      const activeSessions = gameSessions.filter((s: any) => s.status === 'active')

      // Encontrar LLM ativa
      const activeLlm = llms.find((l: any) => l.is_active === true)

      setStats({
        rules_count: rules.length,
        scenarios_count: scenarios.length,
        llms_count: llms.length,
        active_llm: activeLlm ? `${activeLlm.provider} - ${activeLlm.model_name}` : null,
        sessions_count: gameSessions.length,
        active_sessions_count: activeSessions.length,
        users_count: users.length,
      })
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar estatísticas')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  if (!selectedGame) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Jogo não encontrado</p>
        <Link href="/admin" className="text-blue-600 hover:underline mt-4 inline-block">
          Voltar para seleção de jogos
        </Link>
      </div>
    )
  }

  const statCards = [
    {
      title: 'Elementos do Jogo',
      value: stats.rules_count,
      icon: BookOpen,
      color: 'bg-blue-500',
      href: '/admin/rules',
    },
    {
      title: 'Cenas do Jogo',
      value: stats.scenarios_count,
      icon: BookOpen,
      color: 'bg-green-500',
      href: '/admin/scenarios',
    },
    {
      title: 'LLMs',
      value: stats.llms_count,
      icon: Brain,
      color: 'bg-purple-500',
      href: '/admin/llms',
    },
    {
      title: 'Sessões',
      value: stats.sessions_count,
      icon: BarChart3,
      color: 'bg-yellow-500',
      href: '/admin/sessions',
    },
    {
      title: 'Sessões Ativas',
      value: stats.active_sessions_count,
      icon: Gamepad2,
      color: 'bg-green-600',
      href: '/admin/sessions',
    },
    {
      title: 'Usuários',
      value: stats.users_count,
      icon: Users,
      color: 'bg-indigo-500',
      href: '/admin/users',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visão geral do jogo: <span className="font-semibold">{selectedGame.title}</span>
        </p>
        {selectedGame.description && (
          <p className="mt-1 text-sm text-gray-500">{selectedGame.description}</p>
        )}
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.title}
              href={card.href}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${card.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{card.value}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Informações Adicionais */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Informações do Jogo</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">LLM Ativa</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {stats.active_llm || 'Nenhuma LLM ativa'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                selectedGame.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {selectedGame.is_active ? 'Ativo' : 'Inativo'}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Criado em</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {new Date(selectedGame.created_at).toLocaleString('pt-BR')}
            </dd>
          </div>
          {selectedGame.updated_at && (
            <div>
              <dt className="text-sm font-medium text-gray-500">Atualizado em</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(selectedGame.updated_at).toLocaleString('pt-BR')}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Links Rápidos */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Acesso Rápido</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/admin/rules"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="h-5 w-5 text-blue-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Gerenciar Elementos</span>
          </Link>
          <Link
            href="/admin/scenarios"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BookOpen className="h-5 w-5 text-green-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Gerenciar Cenas</span>
          </Link>
          <Link
            href="/admin/llms"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Brain className="h-5 w-5 text-purple-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Gerenciar LLMs</span>
          </Link>
          <Link
            href="/admin/sessions"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <BarChart3 className="h-5 w-5 text-yellow-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Ver Sessões</span>
          </Link>
          <Link
            href="/admin/users"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Users className="h-5 w-5 text-indigo-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Gerenciar Usuários</span>
          </Link>
          <Link
            href="/admin"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-5 w-5 text-gray-600 mr-3" />
            <span className="text-sm font-medium text-gray-900">Gerenciar Jogos</span>
          </Link>
        </div>
      </div>
    </div>
  )
}


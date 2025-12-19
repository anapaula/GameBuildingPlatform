'use client'

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PlayerGameAccess, Game } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Gamepad2, Edit2, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default function PlayerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const playerId = parseInt(params.id as string)
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [playerGames, setPlayerGames] = useState<PlayerGameAccess[]>([])
  const [playerSessions, setPlayerSessions] = useState<any[]>([])
  const [allGames, setAllGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedGames, setSelectedGames] = useState<number[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !_hasHydrated) return

    if (!isAuthenticated || !user || (user.role !== 'FACILITATOR' && user.role !== 'ADMIN')) {
      router.push('/login')
      return
    }

    fetchData()
  }, [mounted, _hasHydrated, isAuthenticated, user, router, playerId])

  const fetchData = async () => {
    try {
      const [gamesRes, accessRes, sessionsRes] = await Promise.all([
        api.get('/api/admin/games'),
        api.get(`/api/facilitator/players/${playerId}/games`),
        api.get(`/api/facilitator/players/${playerId}/sessions`)
      ])
      
      setAllGames(gamesRes.data.filter((g: Game) => g.is_active))
      setPlayerGames(accessRes.data)
      setPlayerSessions(sessionsRes.data)
      setSelectedGames(accessRes.data.map((a: PlayerGameAccess) => a.game_id))
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      toast.error('Erro ao carregar dados do jogador')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateGames = async () => {
    try {
      toast.loading('Atualizando acessos...', { id: 'update-games' })
      await api.put(`/api/facilitator/players/${playerId}/games`, { game_ids: selectedGames })
      toast.success('Acessos atualizados com sucesso!', { id: 'update-games' })
      setShowEditModal(false)
      fetchData()
    } catch (error: any) {
      console.error('Erro ao atualizar acessos:', error)
      toast.error(error.response?.data?.detail || 'Erro ao atualizar acessos', { id: 'update-games' })
    }
  }

  const toggleGame = (gameId: number) => {
    setSelectedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    )
  }

  if (!mounted || !_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/facilitator" className="text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <span className="text-xl font-bold text-gray-800">
                Detalhes do Jogador
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Jogos com Acesso */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Jogos com Acesso</h2>
              <button
                onClick={() => setShowEditModal(true)}
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Edit2 className="h-4 w-4 mr-1" />
                Editar Acessos
              </button>
            </div>
            <ul className="divide-y divide-gray-200">
              {playerGames.length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Jogador não tem acesso a nenhum jogo.</p>
                </li>
              ) : (
                playerGames.map((access) => (
                  <li key={access.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center">
                      <Gamepad2 className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-sm font-medium text-gray-900">{access.game_title}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Sessões de Jogo */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Sessões de Jogo</h2>
            </div>
            <ul className="divide-y divide-gray-200">
              {playerSessions.length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhuma sessão de jogo encontrada.</p>
                </li>
              ) : (
                playerSessions.map((session) => (
                  <li key={session.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.game_title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          Status: <span className={`font-medium ${
                            session.status === 'active' ? 'text-green-600' : 'text-gray-600'
                          }`}>{session.status}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          Criada em: {new Date(session.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </main>

      {/* Modal de Edição */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Editar Acessos aos Jogos</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4 mb-4">
              {allGames.map((game) => (
                <label
                  key={game.id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedGames.includes(game.id)}
                    onChange={() => toggleGame(game.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{game.title}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateGames}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


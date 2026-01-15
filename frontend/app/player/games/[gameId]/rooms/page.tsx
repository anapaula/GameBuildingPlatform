'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PlayerRoom, Game } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, DoorOpen, Clock, Play, Pause, LogOut, Gamepad2 } from 'lucide-react'

export default function PlayerRoomsPage() {
  const router = useRouter()
  const params = useParams()
  const gameId = parseInt(params.gameId as string)
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore()
  const [rooms, setRooms] = useState<PlayerRoom[]>([])
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomDescription, setNewRoomDescription] = useState('')
  const [creatingRoom, setCreatingRoom] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !_hasHydrated) return

    if (!isAuthenticated || !user || user.role !== 'PLAYER') {
      router.push('/login')
      return
    }

    fetchData()
  }, [mounted, _hasHydrated, isAuthenticated, user, router, gameId])

  const fetchData = async () => {
    try {
      const [roomsRes, gamesRes] = await Promise.all([
        api.get(`/api/player/games/${gameId}/rooms`),
        api.get('/api/player/games')
      ])
      
      setRooms(roomsRes.data || [])
      const games = gamesRes.data || []
      const currentGame = games.find((g: Game) => g.id === gameId)
      setGame(currentGame || null)
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      const errorMessage = error.response?.data?.detail || 'Erro ao carregar salas'
      toast.error(errorMessage)
      if (error.response?.status === 403 || error.response?.status === 404) {
        router.push('/player/games')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toast.error('O nome da sala é obrigatório')
      return
    }

    setCreatingRoom(true)
    try {
      const roomData = {
        name: newRoomName,
        description: newRoomDescription || undefined,
        max_players: 4
      }

      const roomRes = await api.post('/api/rooms/', roomData)
      const newRoom = roomRes.data

      // O criador já é automaticamente adicionado como membro ao criar a sala
      toast.success('Sala criada com sucesso!')
      setShowCreateModal(false)
      setNewRoomName('')
      setNewRoomDescription('')
      
      // Recarregar salas
      await fetchData()
    } catch (error: any) {
      console.error('Erro ao criar sala:', error)
      const errorMessage = error.response?.data?.detail || 'Erro ao criar sala'
      toast.error(errorMessage)
    } finally {
      setCreatingRoom(false)
    }
  }

  const handleEnterRoom = async (roomId: number) => {
    try {
      // Verificar se já é membro da sala
      const isMember = rooms.find(r => r.id === roomId)
      
      if (!isMember) {
        // Tentar entrar na sala
        await api.post(`/api/rooms/${roomId}/join`)
        toast.success('Você entrou na sala!')
        await fetchData()
      }

      // Redirecionar para o jogo com a sala selecionada
      router.push(`/game?roomId=${roomId}&gameId=${gameId}`)
    } catch (error: any) {
      console.error('Erro ao entrar na sala:', error)
      const errorMessage = error.response?.data?.detail || 'Erro ao entrar na sala'
      toast.error(errorMessage)
    }
  }

  const handleContinueSession = (roomId: number, sessionId: number) => {
    router.push(`/game?roomId=${roomId}&gameId=${gameId}&sessionId=${sessionId}`)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!mounted || !_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/player')}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {game?.title || 'Salas de Jogo'}
              </h1>
              <p className="text-white/80">Gerencie suas salas e continue de onde parou</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-semibold"
          >
            <Plus className="w-5 h-5" />
            Nova Sala
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <DoorOpen className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Nenhuma sala encontrada
            </h2>
            <p className="text-gray-600 mb-6">
              Crie uma nova sala para começar a jogar!
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Criar Primeira Sala
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-white rounded-lg shadow-xl p-6 hover:shadow-2xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{room.name}</h3>
                    {room.description && (
                      <p className="text-gray-600 text-sm mb-2">{room.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{room.member_count} membro{room.member_count !== 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>Máx: {room.max_players}</span>
                    </div>
                  </div>
                </div>

                {room.sessions.length > 0 && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">
                        {room.sessions.length} sessão{room.sessions.length !== 1 ? 'ões' : ''}
                      </span>
                    </div>
                    {room.latest_session && (
                      <div className="text-xs text-gray-600">
                        <div className="flex items-center gap-2 mb-1">
                          {room.latest_session.status === 'active' ? (
                            <Play className="w-3 h-3 text-green-500" />
                          ) : (
                            <Pause className="w-3 h-3 text-yellow-500" />
                          )}
                          <span className="capitalize">{room.latest_session.status}</span>
                          <span>•</span>
                          <span>Fase {room.latest_session.current_phase}</span>
                        </div>
                        {room.latest_session.last_activity && (
                          <div className="text-gray-500">
                            Última atividade: {formatDate(room.latest_session.last_activity)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  {(() => {
                    const hasChat = room.has_chat ?? room.sessions.some(
                      (session) => (session.interaction_count ?? 0) > 0
                    )
                    return hasChat && room.latest_session
                  })() ? (
                    <button
                      onClick={() => handleContinueSession(room.id, room.latest_session!.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      <Play className="w-4 h-4" />
                      Continuar
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnterRoom(room.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold"
                    >
                      <Gamepad2 className="w-4 h-4" />
                      Iniciar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal de criar sala */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Criar Nova Sala</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome da Sala *
                  </label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite o nome da sala"
                  />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <textarea
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Digite uma descrição para a sala"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewRoomName('')
                    setNewRoomDescription('')
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={creatingRoom}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom || !newRoomName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingRoom ? 'Criando...' : 'Criar Sala'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


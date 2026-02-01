'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PlayerRoom, Game } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, DoorOpen, Clock, Play, Pause, LogOut, Gamepad2 } from 'lucide-react'

type AllowedRole = 'PLAYER' | 'ADMIN' | 'FACILITATOR'

interface RoomsPageContentProps {
  allowedRoles?: AllowedRole[]
  redirectPath?: string
  gameBasePath?: string
  gamesBasePath?: string
  backLabel?: string
  backPath?: string
}

export default function RoomsPageContent({
  allowedRoles = ['PLAYER'],
  redirectPath = '/login',
  gameBasePath = '/game',
  gamesBasePath = '/player/games',
  backLabel,
  backPath,
}: RoomsPageContentProps) {
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

    if (!isAuthenticated || !user || !allowedRoles.includes(user.role as AllowedRole)) {
      router.push(redirectPath)
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
        router.push(gamesBasePath)
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
        max_players: 4,
        game_id: gameId
      }

      await api.post('/api/rooms/', roomData)

      toast.success('Sala criada com sucesso!')
      setShowCreateModal(false)
      setNewRoomName('')
      setNewRoomDescription('')
      
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
      const isMember = rooms.find(r => r.id === roomId)
      
      if (!isMember) {
        await api.post(`/api/rooms/${roomId}/join`)
        toast.success('Você entrou na sala!')
        await fetchData()
      }

      router.push(`${gameBasePath}?roomId=${roomId}&gameId=${gameId}`)
    } catch (error: any) {
      console.error('Erro ao entrar na sala:', error)
      const errorMessage = error.response?.data?.detail || 'Erro ao entrar na sala'
      toast.error(errorMessage)
    }
  }

  const handleContinueSession = (roomId: number, sessionId: number) => {
    router.push(`${gameBasePath}?roomId=${roomId}&gameId=${gameId}&sessionId=${sessionId}`)
  }

  const handleLogout = async () => {
    try {
      logout()
      router.push('/login')
      toast.success('Logout realizado com sucesso')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
    }
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
        <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
          <div>
            <button
              onClick={() => router.push(gamesBasePath)}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
            <h1 className="text-3xl font-bold text-white mb-2">{game?.title || 'Salas do Jogo'}</h1>
            <p className="text-white/80">Crie uma nova sala ou continue uma sessão existente</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Suas Salas</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Criar Sala
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <Gamepad2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Nenhuma sala encontrada</h2>
            <p className="text-gray-600 mb-6">Crie uma nova sala para começar a jogar</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
            >
              <Plus className="w-5 h-5" />
              Criar Primeira Sala
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rooms.map((room) => {
              const latestSession = room.latest_session || room.sessions?.[0]
              const hasStarted = room.has_chat || (latestSession?.interaction_count || 0) > 0
              const sessionStatus = latestSession?.status || 'none'
              return (
              <div key={room.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{room.name}</h3>
                    <p className="text-sm text-gray-600">{room.description || 'Sem descrição'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${sessionStatus === 'active' ? 'bg-green-100 text-green-700' : sessionStatus === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                    {sessionStatus === 'active' ? 'Ativa' : sessionStatus === 'paused' ? 'Pausada' : 'Sem sessão'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="w-4 h-4" />
                    <span>Jogadores: {room.member_count || 0}/{room.max_players}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Criada em {new Date(room.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  {latestSession ? (
                    <button
                      onClick={() => handleContinueSession(room.id, latestSession.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      {hasStarted ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      {hasStarted ? 'Continuar' : 'Jogar'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEnterRoom(room.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <Play className="w-4 h-4" />
                      Jogar
                    </button>
                  )}
                </div>
              </div>
            )})}
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Criar Nova Sala</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Sala</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="Digite o nome da sala"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
                  <textarea
                    value={newRoomDescription}
                    onChange={(e) => setNewRoomDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    rows={3}
                    placeholder="Descreva a sala"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  {creatingRoom ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
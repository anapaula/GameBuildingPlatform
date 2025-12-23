'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { PlayerGameAccess, Game } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Gamepad2, Edit2, Trash2, ChevronDown, ChevronUp, MessageSquare, DoorOpen } from 'lucide-react'
import Link from 'next/link'

export default function PlayerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const playerId = parseInt(params.id as string)
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [playerGames, setPlayerGames] = useState<PlayerGameAccess[]>([])
  const [playerSessions, setPlayerSessions] = useState<any[]>([])
  const [playerRooms, setPlayerRooms] = useState<any[]>([])
  const [roomDetails, setRoomDetails] = useState<Record<number, any>>({})
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set())
  const [loadingRoomDetails, setLoadingRoomDetails] = useState<Record<number, boolean>>({})
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
      // Usar endpoint que permite facilitadores verem todos os jogos
      const [gamesRes, accessRes, sessionsRes, roomsRes] = await Promise.all([
        api.get('/api/player/games'),
        api.get(`/api/facilitator/players/${playerId}/games`),
        api.get(`/api/facilitator/players/${playerId}/sessions`),
        api.get(`/api/facilitator/players/${playerId}/rooms`)
      ])
      
      const games = gamesRes.data || []
      const accesses = accessRes.data || []
      const sessions = sessionsRes.data || []
      const rooms = roomsRes.data || []
      
      setAllGames(games.filter((g: Game) => g.is_active))
      setPlayerGames(accesses)
      setPlayerSessions(sessions)
      setPlayerRooms(rooms)
      setSelectedGames(accesses.map((a: PlayerGameAccess) => a.game_id))
      
      console.log('Dados carregados:', {
        games: games.length,
        accesses: accesses.length,
        sessions: sessions.length,
        rooms: rooms.length
      })
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error)
      const errorMessage = error.response?.data?.detail || 'Erro ao carregar dados do jogador'
      toast.error(errorMessage)
      // Se houver erro, ainda definir loading como false para não travar a tela
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const toggleRoom = (roomId: number) => {
    const newExpanded = new Set(expandedRooms)
    if (newExpanded.has(roomId)) {
      newExpanded.delete(roomId)
    } else {
      newExpanded.add(roomId)
      // Carregar detalhes da sala se ainda não foram carregados
      if (!roomDetails[roomId]) {
        fetchRoomDetails(roomId)
      }
    }
    setExpandedRooms(newExpanded)
  }

  const fetchRoomDetails = async (roomId: number) => {
    setLoadingRoomDetails(prev => ({ ...prev, [roomId]: true }))
    try {
      const res = await api.get(`/api/facilitator/rooms/${roomId}`)
      setRoomDetails(prev => ({ ...prev, [roomId]: res.data }))
    } catch (error: any) {
      console.error('Erro ao carregar detalhes da sala:', error)
      toast.error('Erro ao carregar detalhes da sala')
    } finally {
      setLoadingRoomDetails(prev => ({ ...prev, [roomId]: false }))
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
              <p className="mt-1 text-sm text-gray-500">Visualize todas as sessões e decisões do jogador</p>
            </div>
            <ul className="divide-y divide-gray-200">
              {playerSessions.length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhuma sessão de jogo encontrada.</p>
                </li>
              ) : (
                playerSessions.map((session) => (
                  <SessionCardComponent 
                    key={session.id} 
                    session={session} 
                    playerId={playerId}
                  />
                ))
              )}
            </ul>
          </div>

          {/* Salas de Jogos */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Salas de Jogos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Acompanhe as salas de jogos e atividades do jogador
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {playerRooms.length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhuma sala de jogo encontrada.</p>
                </li>
              ) : (
                playerRooms.map((room) => (
                  <li key={room.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <DoorOpen className="h-5 w-5 text-gray-400 mr-2" />
                            <p className="text-sm font-medium text-gray-900">{room.name}</p>
                            {room.description && (
                              <span className="ml-2 text-xs text-gray-500">({room.description})</span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>Jogadores: {room.players?.length || 0}</span>
                            <span>Sessões: {room.total_sessions || 0}</span>
                            <span className={`font-medium ${
                              room.active_sessions > 0 ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              Ativas: {room.active_sessions || 0}
                            </span>
                          </div>
                          {room.players && room.players.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500">Jogadores na sala:</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {room.players.map((player: any) => (
                                  <span key={player.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    {player.username}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleRoom(room.id)}
                          className="ml-4 text-gray-400 hover:text-gray-600"
                          title={expandedRooms.has(room.id) ? 'Ocultar detalhes' : 'Ver detalhes'}
                        >
                          {expandedRooms.has(room.id) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      
                      {expandedRooms.has(room.id) && (
                        <div className="mt-4 border-t border-gray-200 pt-4">
                          {(() => {
                            const details = roomDetails[room.id] || room
                            const sessions = details.sessions || []
                            
                            if (loadingRoomDetails[room.id]) {
                              return (
                                <div className="text-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                                  <p className="mt-2 text-xs text-gray-500">Carregando detalhes da sala...</p>
                                </div>
                              )
                            }

                            if (sessions.length === 0) {
                              return <p className="text-sm text-gray-500 text-center">Nenhuma sessão encontrada para esta sala.</p>
                            }

                            return (
                              <div className="space-y-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Sessões na Sala:</h4>
                                {sessions.map((session: any) => (
                                  <RoomSessionCardComponent key={session.id} session={session} playerId={playerId} />
                                ))}
                              </div>
                            )
                          })()}
                        </div>
                      )}
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

// Componente para exibir sessão com interações
function SessionCardComponent({ session, playerId }: { session: any, playerId: number }) {
  const [expanded, setExpanded] = useState(false)
  const [interactions, setInteractions] = useState<any[]>([])
  const [loadingInteractions, setLoadingInteractions] = useState(false)

  const fetchInteractions = async () => {
    if (interactions.length > 0) return // Já carregou
    
    setLoadingInteractions(true)
    try {
      const res = await api.get(`/api/facilitator/players/${playerId}/sessions/${session.id}/interactions`)
      setInteractions(res.data)
    } catch (error) {
      console.error('Erro ao carregar interações:', error)
      toast.error('Erro ao carregar interações da sessão')
    } finally {
      setLoadingInteractions(false)
    }
  }

  const handleToggle = () => {
    if (!expanded) {
      fetchInteractions()
    }
    setExpanded(!expanded)
  }

  return (
    <li className="px-4 py-4 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-900">{session.game_title || 'Jogo'}</p>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {session.status === 'active' ? 'Ativa' : 'Finalizada'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Criada em: {new Date(session.created_at).toLocaleString('pt-BR')}
          </p>
          {session.last_activity && (
            <p className="mt-1 text-xs text-gray-400">
              Última atividade: {new Date(session.last_activity).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <button
          onClick={handleToggle}
          className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Ver Decisões
            </>
          )}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {loadingInteractions ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-xs text-gray-500">Carregando interações...</p>
            </div>
          ) : interactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Nenhuma interação registrada nesta sessão.</p>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Jornada do Jogador:</h4>
              {interactions.map((interaction, index) => (
                <div key={interaction.id} className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex items-start">
                    <MessageSquare className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Interação #{index + 1} - {new Date(interaction.created_at).toLocaleString('pt-BR')}
                      </p>
                      <div className="bg-white rounded p-3 mb-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Jogador:</p>
                        <p className="text-sm text-gray-900">{interaction.player_input}</p>
                      </div>
                      <div className="bg-blue-50 rounded p-3">
                        <p className="text-xs font-medium text-blue-700 mb-1">Sistema:</p>
                        <p className="text-sm text-gray-900">{interaction.ai_response}</p>
                      </div>
                      {interaction.tokens_used && (
                        <p className="mt-2 text-xs text-gray-400">
                          Tokens: {interaction.tokens_used} | 
                          Tempo de resposta: {interaction.response_time?.toFixed(2)}s
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  )
}

// Componente para exibir sessão dentro de uma sala
function RoomSessionCardComponent({ session, playerId }: { session: any, playerId: number }) {
  const [expanded, setExpanded] = useState(false)

  // As interações já vêm pré-carregadas no roomDetails
  const interactions = session.interactions || []

  return (
    <li className="px-4 py-4 sm:px-6 border rounded-md bg-gray-50 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <p className="text-sm font-medium text-gray-900">{session.game_title || 'Jogo'}</p>
            <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }`}>
              {session.status === 'active' ? 'Ativa' : 'Finalizada'}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-400">
            Jogador: {session.player_username || 'Desconhecido'}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Criada em: {new Date(session.created_at).toLocaleString('pt-BR')}
          </p>
          {session.last_activity && (
            <p className="mt-1 text-xs text-gray-400">
              Última atividade: {new Date(session.last_activity).toLocaleString('pt-BR')}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-4 inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          {expanded ? (
            <>
              <ChevronUp className="h-4 w-4 mr-1" />
              Ocultar
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Ver Decisões ({interactions.length})
            </>
          )}
        </button>
      </div>
      
      {expanded && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          {interactions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center">Nenhuma interação registrada nesta sessão.</p>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Jornada do Jogador:</h4>
              {interactions.map((interaction: any, index: number) => (
                <div key={interaction.id} className="bg-white rounded-lg p-4 space-y-2 border border-gray-100">
                  <div className="flex items-start">
                    <MessageSquare className="h-4 w-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-500 mb-1">
                        Interação #{index + 1} - {new Date(interaction.created_at).toLocaleString('pt-BR')}
                      </p>
                      <div className="bg-gray-50 rounded p-3 mb-2">
                        <p className="text-xs font-medium text-gray-700 mb-1">Jogador:</p>
                        <p className="text-sm text-gray-900">{interaction.player_input}</p>
                      </div>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="text-xs font-medium text-gray-700 mb-1">Sistema:</p>
                        <p className="text-sm text-gray-900">{interaction.ai_response}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        LLM: {interaction.llm_provider} ({interaction.llm_model}) | Tokens: {interaction.tokens_used} | Tempo: {interaction.response_time?.toFixed(2)}s
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </li>
  )
}


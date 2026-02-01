'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { FacilitatorPlayer, Game, PlayerGameAccess, Invitation } from '@/types'
import toast from 'react-hot-toast'
import { Users, Gamepad2, Plus, Mail, Trash2, Edit2, Eye, LogOut, DoorOpen, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

export default function FacilitatorPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [players, setPlayers] = useState<FacilitatorPlayer[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [rooms, setRooms] = useState<any[]>([])
  const [roomDetails, setRoomDetails] = useState<Record<number, any>>({})
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [expandedRooms, setExpandedRooms] = useState<Set<number>>(new Set())

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !_hasHydrated) return

    if (!isAuthenticated || !user || (user.role !== 'FACILITATOR' && user.role !== 'ADMIN')) {
      router.push('/login')
      return
    }

    fetchPlayers()
    fetchInvitations()
    fetchRooms()
  }, [mounted, _hasHydrated, isAuthenticated, user, router])

  const fetchPlayers = async () => {
    try {
      const res = await api.get('/api/facilitator/players')
      setPlayers(res.data)
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error)
      toast.error('Erro ao carregar jogadores')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/api/facilitator/invitations')
      setInvitations(res.data)
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }

  const fetchRooms = async () => {
    try {
      const res = await api.get('/api/facilitator/players/rooms')
      setRooms(res.data)
    } catch (error) {
      console.error('Erro ao carregar salas:', error)
    }
  }

  const toggleRoom = async (roomId: number) => {
    const isExpanding = !expandedRooms.has(roomId)
    
    setExpandedRooms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(roomId)) {
        newSet.delete(roomId)
      } else {
        newSet.add(roomId)
      }
      return newSet
    })

    // Se estiver expandindo e ainda não tiver os detalhes, buscar
    if (isExpanding && !roomDetails[roomId]) {
      try {
        const res = await api.get(`/api/facilitator/rooms/${roomId}`)
        setRoomDetails(prev => ({
          ...prev,
          [roomId]: res.data
        }))
      } catch (error) {
        console.error('Erro ao carregar detalhes da sala:', error)
        toast.error('Erro ao carregar detalhes da sala')
      }
    }
  }

  const handleDeletePlayer = async (playerId: number) => {
    if (!confirm('Tem certeza que deseja remover este jogador?')) return

    try {
      toast.loading('Removendo jogador...', { id: 'delete-player' })
      await api.delete(`/api/facilitator/players/${playerId}`)
      toast.success('Jogador removido com sucesso!', { id: 'delete-player' })
      fetchPlayers()
    } catch (error: any) {
      console.error('Erro ao remover jogador:', error)
      toast.error(error.response?.data?.detail || 'Erro ao remover jogador', { id: 'delete-player' })
    }
  }

  const handleDeleteInvitation = async (invitationId: number) => {
    if (!confirm('Tem certeza que deseja remover este convite?')) return

    try {
      toast.loading('Removendo convite...', { id: 'delete-invitation' })
      await api.delete(`/api/facilitator/invitations/${invitationId}`)
      toast.success('Convite removido com sucesso!', { id: 'delete-invitation' })
      fetchInvitations()
    } catch (error: any) {
      console.error('Erro ao remover convite:', error)
      toast.error(error.response?.data?.detail || 'Erro ao remover convite', { id: 'delete-invitation' })
    }
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
              <Gamepad2 className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-800">
                Área do Facilitador
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">{user?.username}</span>
              <button
                onClick={() => {
                  const { logout } = useAuthStore.getState()
                  logout()
                  router.push('/login')
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meus Jogadores</h1>
              <p className="mt-2 text-sm text-gray-600">
                Gerencie os jogadores que você convidou
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/facilitator/games"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Jogar
              </Link>
              <Link
                href="/facilitator/invite"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Convidar Jogador
              </Link>
            </div>
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {players.length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhum jogador cadastrado ainda.</p>
                </li>
              ) : (
                players.map((player) => (
                  <li key={player.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Users className="h-5 w-5 text-gray-400 mr-2" />
                            <p className="text-sm font-medium text-gray-900">{player.player_username}</p>
                          </div>
                          <p className="mt-1 text-sm text-gray-500">{player.player_email}</p>
                          <p className="mt-1 text-xs text-gray-400">
                            Cadastrado em: {new Date(player.created_at).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/facilitator/players/${player.player_id}`}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver detalhes"
                          >
                            <Eye className="h-5 w-5" />
                          </Link>
                          <button
                            onClick={() => handleDeletePlayer(player.player_id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remover"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Lista de Convites Pendentes */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Convites Pendentes</h2>
              <p className="mt-1 text-sm text-gray-500">
                Convites que ainda não foram aceitos pelo jogador
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {invitations.filter(inv => inv.status === 'pending').length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhum convite pendente.</p>
                </li>
              ) : (
                invitations
                  .filter(inv => inv.status === 'pending')
                  .map((invitation) => (
                    <li key={invitation.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <Mail className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Pendente
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              Criado em: {new Date(invitation.created_at).toLocaleString('pt-BR')}
                              {invitation.expires_at && (
                                <> • Expira em: {new Date(invitation.expires_at).toLocaleString('pt-BR')}</>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remover convite"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
              )}
            </ul>
          </div>

          {/* Lista de Convites Aceitos (mas jogador ainda não se registrou) */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Convites Aceitos</h2>
              <p className="mt-1 text-sm text-gray-500">
                Convites que foram aceitos, mas o jogador ainda não criou sua conta
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {invitations.filter(inv => inv.status === 'accepted').length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhum convite aceito pendente de registro.</p>
                </li>
              ) : (
                invitations
                  .filter(inv => inv.status === 'accepted')
                  .map((invitation) => (
                    <li key={invitation.id}>
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <Mail className="h-5 w-5 text-gray-400 mr-2" />
                              <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Aceito
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-gray-400">
                              Criado em: {new Date(invitation.created_at).toLocaleString('pt-BR')}
                              {invitation.accepted_at && (
                                <> • Aceito em: {new Date(invitation.accepted_at).toLocaleString('pt-BR')}</>
                              )}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Remover convite"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))
              )}
            </ul>
          </div>

          {/* Lista de Salas de Jogos */}
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Salas de Jogos dos Jogadores</h2>
              <p className="mt-1 text-sm text-gray-500">
                Acompanhe as salas de jogos e atividades dos seus jogadores
              </p>
            </div>
            <ul className="divide-y divide-gray-200">
              {rooms.length === 0 ? (
                <li className="px-4 py-5 sm:px-6">
                  <p className="text-gray-500 text-center">Nenhuma sala de jogo encontrada.</p>
                </li>
              ) : (
                rooms.map((room) => (
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
                            
                            return sessions.length > 0 ? (
                              <>
                                <h3 className="text-sm font-medium text-gray-800 mb-3">Sessões de Jogo:</h3>
                                <div className="space-y-4">
                                  {sessions.map((session: any) => (
                                    <div key={session.id} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <p className="text-sm font-medium text-gray-900">
                                            {session.game_title} - {session.player_username}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Status: <span className={`font-medium ${
                                              session.status === 'active' ? 'text-green-600' : 'text-gray-600'
                                            }`}>{session.status}</span>
                                            {session.llm_provider && (
                                              <> • LLM: {session.llm_provider} ({session.llm_model})</>
                                            )}
                                          </p>
                                        </div>
                                        <Link
                                          href={`/facilitator/players/${session.player_id}`}
                                          className="text-blue-600 hover:text-blue-800 text-xs"
                                          title="Ver detalhes do jogador"
                                        >
                                          <Eye className="h-4 w-4" />
                                        </Link>
                                      </div>
                                      <p className="text-xs text-gray-400 mb-3">
                                        Criada em: {new Date(session.created_at).toLocaleString('pt-BR')}
                                        {session.last_activity && (
                                          <> • Última atividade: {new Date(session.last_activity).toLocaleString('pt-BR')}</>
                                        )}
                                      </p>
                                      
                                      {/* Interações da sessão */}
                                      {session.interactions && session.interactions.length > 0 && (
                                        <div className="mt-3 border-t border-gray-200 pt-3">
                                          <h4 className="text-xs font-medium text-gray-700 mb-2">
                                            Interações ({session.total_interactions || session.interactions.length}):
                                          </h4>
                                          <div className="space-y-2 max-h-64 overflow-y-auto">
                                            {session.interactions.map((interaction: any, idx: number) => (
                                              <div key={interaction.id} className="bg-white rounded p-2 border border-gray-200">
                                                <p className="text-xs text-gray-500 mb-1">
                                                  #{idx + 1} - {new Date(interaction.created_at).toLocaleTimeString('pt-BR')}
                                                </p>
                                                <div className="mb-1">
                                                  <p className="text-xs font-medium text-gray-700">Jogador:</p>
                                                  <p className="text-xs text-gray-900">{interaction.player_input}</p>
                                                </div>
                                                <div>
                                                  <p className="text-xs font-medium text-gray-700">Sistema:</p>
                                                  <p className="text-xs text-gray-600">{interaction.ai_response}</p>
                                                </div>
                                                {interaction.tokens_used && (
                                                  <p className="text-xs text-gray-400 mt-1">
                                                    Tokens: {interaction.tokens_used} | Tempo: {interaction.response_time?.toFixed(2)}s
                                                  </p>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">Nenhuma sessão encontrada nesta sala.</p>
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
    </div>
  )
}


'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface SessionInteraction {
  id: number
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

interface SessionDetails {
  id: number
  status: string
  current_phase: number
  game_id: number
  game_title: string
  created_at?: string
  last_activity?: string
  interactions: SessionInteraction[]
}

interface RoomDetails {
  id: number
  name: string
  description?: string
  max_players: number
  created_at?: string
  sessions: SessionDetails[]
}

interface PlayerDetails {
  id: number
  username: string
  email: string
  rooms: RoomDetails[]
}

interface FacilitatorDetails {
  id: number
  username: string
  email: string
  players: PlayerDetails[]
}

interface OverviewData {
  facilitators: FacilitatorDetails[]
  unassigned_players: PlayerDetails[]
}

export default function SessionsPage() {
  const [data, setData] = useState<OverviewData>({ facilitators: [], unassigned_players: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOverview()
  }, [])

  const fetchOverview = async () => {
    try {
      const res = await api.get('/api/admin/rooms/overview')
      setData(res.data)
    } catch (error) {
      console.error('Erro ao carregar visão de salas:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRoomCount = (player: PlayerDetails) => player.rooms.length
  const getSessionCount = (player: PlayerDetails) =>
    player.rooms.reduce((total, room) => total + room.sessions.length, 0)

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sessões e Salas por Jogador</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visualize facilitadores, jogadores e as salas de jogos com detalhes de cada sessão.
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Facilitadores</h2>
        {data.facilitators.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-500">Nenhum facilitador encontrado.</div>
        ) : (
          data.facilitators.map((facilitator) => (
            <div key={facilitator.id} className="bg-white rounded-lg shadow p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{facilitator.username}</h3>
                <p className="text-sm text-gray-500">{facilitator.email}</p>
              </div>

              {facilitator.players.length === 0 ? (
                <div className="text-sm text-gray-500">Nenhum jogador associado.</div>
              ) : (
                facilitator.players.map((player) => (
                  <details key={player.id} className="border rounded-lg p-4">
                    <summary className="cursor-pointer">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{player.username}</span>
                        <span className="text-xs text-gray-500">{player.email}</span>
                        <span className="text-xs text-gray-500 mt-1">
                          Salas: {getRoomCount(player)} • Sessões: {getSessionCount(player)}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-4 space-y-4">
                      {player.rooms.length === 0 ? (
                        <div className="text-sm text-gray-500">Nenhuma sala encontrada.</div>
                      ) : (
                        player.rooms.map((room) => (
                          <div key={room.id} className="border rounded-md p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{room.name}</p>
                                {room.description && (
                                  <p className="text-xs text-gray-500">{room.description}</p>
                                )}
                              </div>
                              <span className="text-xs text-gray-500">Máx: {room.max_players}</span>
                            </div>

                            <div className="mt-3 space-y-3">
                              {room.sessions.length === 0 ? (
                                <div className="text-sm text-gray-500">Nenhuma sessão nesta sala.</div>
                              ) : (
                                room.sessions.map((session) => (
                                  <details key={session.id} className="bg-gray-50 rounded p-3">
                                    <summary className="cursor-pointer">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <span className="font-medium text-gray-900">
                                            {session.game_title} • Sessão #{session.id}
                                          </span>
                                          <div className="text-xs text-gray-500">
                                            Fase {session.current_phase} • {session.status}
                                          </div>
                                        </div>
                                        <span className="text-xs text-gray-500">
                                          {session.created_at ? new Date(session.created_at).toLocaleString('pt-BR') : ''}
                                        </span>
                                      </div>
                                    </summary>
                                    <div className="mt-3 space-y-2">
                                      {session.interactions.length === 0 ? (
                                        <div className="text-xs text-gray-500">Sem interações.</div>
                                      ) : (
                                        session.interactions.map((interaction) => (
                                          <div key={interaction.id} className="bg-white border rounded p-2 text-xs">
                                            <div className="text-gray-500">
                                              {new Date(interaction.created_at).toLocaleString('pt-BR')}
                                            </div>
                                            <div className="mt-1">
                                              <span className="font-medium">Jogador:</span> {interaction.player_input}
                                            </div>
                                            <div className="mt-1">
                                              <span className="font-medium">Sistema:</span> {interaction.ai_response}
                                            </div>
                                          </div>
                                        ))
                                      )}
                                    </div>
                                  </details>
                                ))
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </details>
                ))
              )}
            </div>
          ))
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Jogadores sem Facilitador</h2>
        {data.unassigned_players.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-500">
            Nenhum jogador sem facilitador.
          </div>
        ) : (
          data.unassigned_players.map((player) => (
            <details key={player.id} className="bg-white rounded-lg shadow p-6">
              <summary className="cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{player.username}</span>
                  <span className="text-xs text-gray-500">{player.email}</span>
                  <span className="text-xs text-gray-500 mt-1">
                    Salas: {getRoomCount(player)} • Sessões: {getSessionCount(player)}
                  </span>
                </div>
              </summary>
              <div className="mt-4 space-y-4">
                {player.rooms.length === 0 ? (
                  <div className="text-sm text-gray-500">Nenhuma sala encontrada.</div>
                ) : (
                  player.rooms.map((room) => (
                    <div key={room.id} className="border rounded-md p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{room.name}</p>
                          {room.description && (
                            <p className="text-xs text-gray-500">{room.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">Máx: {room.max_players}</span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {room.sessions.length === 0 ? (
                          <div className="text-sm text-gray-500">Nenhuma sessão nesta sala.</div>
                        ) : (
                          room.sessions.map((session) => (
                            <details key={session.id} className="bg-gray-50 rounded p-3">
                              <summary className="cursor-pointer">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-medium text-gray-900">
                                      {session.game_title} • Sessão #{session.id}
                                    </span>
                                    <div className="text-xs text-gray-500">
                                      Fase {session.current_phase} • {session.status}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {session.created_at ? new Date(session.created_at).toLocaleString('pt-BR') : ''}
                                  </span>
                                </div>
                              </summary>
                              <div className="mt-3 space-y-2">
                                {session.interactions.length === 0 ? (
                                  <div className="text-xs text-gray-500">Sem interações.</div>
                                ) : (
                                  session.interactions.map((interaction) => (
                                    <div key={interaction.id} className="bg-white border rounded p-2 text-xs">
                                      <div className="text-gray-500">
                                        {new Date(interaction.created_at).toLocaleString('pt-BR')}
                                      </div>
                                      <div className="mt-1">
                                        <span className="font-medium">Jogador:</span> {interaction.player_input}
                                      </div>
                                      <div className="mt-1">
                                        <span className="font-medium">Sistema:</span> {interaction.ai_response}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </details>
                          ))
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  )
}


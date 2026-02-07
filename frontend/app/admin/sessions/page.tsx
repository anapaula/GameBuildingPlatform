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
  const [facilitatorPage, setFacilitatorPage] = useState(1)
  const [unassignedPage, setUnassignedPage] = useState(1)
  const [facilitatorQuery, setFacilitatorQuery] = useState('')
  const [unassignedQuery, setUnassignedQuery] = useState('')

  const FACILITATORS_PER_PAGE = 3
  const UNASSIGNED_PER_PAGE = 5

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

  const filteredFacilitators = data.facilitators.filter((facilitator) => {
    const query = facilitatorQuery.trim().toLowerCase()
    if (!query) return true
    return (
      facilitator.username.toLowerCase().includes(query) ||
      facilitator.email.toLowerCase().includes(query)
    )
  })

  const filteredUnassignedPlayers = data.unassigned_players.filter((player) => {
    const query = unassignedQuery.trim().toLowerCase()
    if (!query) return true
    return (
      player.username.toLowerCase().includes(query) ||
      player.email.toLowerCase().includes(query)
    )
  })

  const totalFacilitatorPages = Math.max(
    1,
    Math.ceil(filteredFacilitators.length / FACILITATORS_PER_PAGE)
  )
  const totalUnassignedPages = Math.max(
    1,
    Math.ceil(filteredUnassignedPlayers.length / UNASSIGNED_PER_PAGE)
  )

  const pagedFacilitators = filteredFacilitators.slice(
    (facilitatorPage - 1) * FACILITATORS_PER_PAGE,
    facilitatorPage * FACILITATORS_PER_PAGE
  )
  const pagedUnassignedPlayers = filteredUnassignedPlayers.slice(
    (unassignedPage - 1) * UNASSIGNED_PER_PAGE,
    unassignedPage * UNASSIGNED_PER_PAGE
  )

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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-gray-900">Facilitadores</h2>
          <input
            type="text"
            value={facilitatorQuery}
            onChange={(e) => {
              setFacilitatorQuery(e.target.value)
              setFacilitatorPage(1)
            }}
            className="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-1 text-sm"
            placeholder="Buscar facilitador..."
          />
          {data.facilitators.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                Página {facilitatorPage} de {totalFacilitatorPages}
              </span>
              <button
                onClick={() => setFacilitatorPage((prev) => Math.max(1, prev - 1))}
                disabled={facilitatorPage === 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setFacilitatorPage((prev) =>
                    Math.min(totalFacilitatorPages, prev + 1)
                  )
                }
                disabled={facilitatorPage === totalFacilitatorPages}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
        {filteredFacilitators.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-500">Nenhum facilitador encontrado.</div>
        ) : (
          pagedFacilitators.map((facilitator) => (
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold text-gray-900">Jogadores sem Facilitador</h2>
          <input
            type="text"
            value={unassignedQuery}
            onChange={(e) => {
              setUnassignedQuery(e.target.value)
              setUnassignedPage(1)
            }}
            className="w-full sm:w-64 border border-gray-300 rounded-md px-3 py-1 text-sm"
            placeholder="Buscar jogador..."
          />
          {data.unassigned_players.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>
                Página {unassignedPage} de {totalUnassignedPages}
              </span>
              <button
                onClick={() => setUnassignedPage((prev) => Math.max(1, prev - 1))}
                disabled={unassignedPage === 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setUnassignedPage((prev) =>
                    Math.min(totalUnassignedPages, prev + 1)
                  )
                }
                disabled={unassignedPage === totalUnassignedPages}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
        {filteredUnassignedPlayers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-500">
            Nenhum jogador sem facilitador.
          </div>
        ) : (
          pagedUnassignedPlayers.map((player) => (
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


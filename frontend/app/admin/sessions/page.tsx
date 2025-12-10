'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { GameSession } from '@/types'
import { Eye, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function SessionsPage() {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [])

  const fetchSessions = async () => {
    try {
      const res = await api.get('/api/admin/sessions')
      setSessions(res.data)
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sessões de Jogo</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visualize e analise todas as sessões de jogo
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sessions.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhuma sessão encontrada.</p>
            </li>
          ) : (
            sessions.map((session) => (
              <li key={session.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          Sessão #{session.id}
                        </p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          session.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : session.status === 'paused'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {session.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Player ID: {session.player_id} | Fase: {session.current_phase}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Criada em: {new Date(session.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/sessions/${session.id}`}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}


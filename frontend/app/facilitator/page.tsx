'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { FacilitatorPlayer, Game, PlayerGameAccess } from '@/types'
import toast from 'react-hot-toast'
import { Users, Gamepad2, Plus, Mail, Trash2, Edit2, Eye, LogOut } from 'lucide-react'
import Link from 'next/link'

export default function FacilitatorPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [players, setPlayers] = useState<FacilitatorPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Meus Jogadores</h1>
              <p className="mt-2 text-sm text-gray-600">
                Gerencie os jogadores que você convidou
              </p>
            </div>
            <Link
              href="/facilitator/invite"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Convidar Jogador
            </Link>
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
        </div>
      </main>
    </div>
  )
}


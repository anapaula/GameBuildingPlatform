'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { useAuthStore } from '@/store/authStore'
import { Game } from '@/types'
import { ArrowLeft, Gamepad2, LogOut } from 'lucide-react'

export default function FacilitatorGamesPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !_hasHydrated) return

    if (!isAuthenticated || !user || user.role !== 'FACILITATOR') {
      router.push('/facilitator')
      return
    }

    fetchGames()
  }, [mounted, _hasHydrated, isAuthenticated, user, router])

  const fetchGames = async () => {
    try {
      const res = await api.get('/api/player/games')
      setGames(res.data || [])
    } catch (error: any) {
      console.error('Erro ao carregar jogos:', error)
      toast.error(error.response?.data?.detail || 'Erro ao carregar jogos')
    } finally {
      setLoading(false)
    }
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

  const handleGameClick = (gameId: number) => {
    router.push(`/facilitator/games/${gameId}/rooms`)
  }

  const resolveCoverUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`
  }

  if (!mounted || !_hasHydrated || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <button
              onClick={() => router.push('/facilitator')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Meus Jogadores
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Jogos</h1>
            <p className="mt-2 text-sm text-gray-600">
              Selecione um jogo para criar salas e jogar.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">Nenhum jogo disponível.</p>
            </div>
          ) : (
            games.map((game) => (
              <div
                key={game.id}
                className="bg-white shadow rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleGameClick(game.id)}
              >
                {game.cover_image_url ? (
                  <div className="h-48 bg-gray-200 relative">
                    <img
                      src={resolveCoverUrl(game.cover_image_url)}
                      alt={game.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const img = e.currentTarget
                        img.style.display = 'none'
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gray-200 flex items-center justify-center">
                    <Gamepad2 className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-800">{game.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{game.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

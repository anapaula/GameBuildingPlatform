'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Game } from '@/types'
import toast from 'react-hot-toast'
import { Gamepad2, LogOut, ArrowLeft } from 'lucide-react'

type AllowedRole = 'PLAYER' | 'ADMIN' | 'FACILITATOR'

interface GamesListPageProps {
  allowedRoles?: AllowedRole[]
  basePath: string
  redirectPath?: string
  title?: string
  subtitle?: string
  backLabel?: string
  backPath?: string
}

export default function GamesListPage({
  allowedRoles = ['PLAYER'],
  basePath,
  redirectPath = '/login',
  title = 'Seus Jogos',
  subtitle = 'Selecione um jogo para ver suas salas ou criar uma nova',
  backLabel,
  backPath,
}: GamesListPageProps) {
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

    if (!isAuthenticated || !user || !allowedRoles.includes(user.role as AllowedRole)) {
      router.push(redirectPath)
      return
    }

    fetchGames()
  }, [mounted, _hasHydrated, isAuthenticated, user, router])

  const fetchGames = async () => {
    try {
      const res = await api.get('/api/player/games')
      const gamesData = res.data || []
      setGames(gamesData)
    } catch (error: any) {
      console.error('Erro ao carregar jogos:', error)
      const errorMessage = error.response?.data?.detail || 'Erro ao carregar jogos disponíveis'
      toast.error(errorMessage)
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

  const handleSelectGame = (gameId: number) => {
    router.push(`${basePath}/games/${gameId}/rooms`)
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

  if (games.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white">{title}</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sair
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-xl p-12 text-center">
            <Gamepad2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              Nenhum jogo disponível
            </h2>
            <p className="text-gray-600 mb-6">
              Você ainda não tem acesso a nenhum jogo. Entre em contato com seu facilitador para receber um convite.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-blue-700 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
          <div>
            {backLabel && backPath && (
              <button
                onClick={() => router.push(backPath)}
                className="flex items-center gap-2 text-white/80 hover:text-white mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </button>
            )}
            <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
            <p className="text-white/80">{subtitle}</p>
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
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() => handleSelectGame(game.id)}
              className="bg-white rounded-lg shadow-lg p-6 cursor-pointer transform transition-all hover:scale-105 hover:shadow-xl"
            >
              <div className="flex items-center gap-4 mb-4">
                {game.cover_image_url ? (
                  <img
                    src={resolveCoverUrl(game.cover_image_url)}
                    alt={game.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Gamepad2 className="w-8 h-8 text-blue-600" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{game.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{game.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-blue-600 text-sm font-medium">Ver salas →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

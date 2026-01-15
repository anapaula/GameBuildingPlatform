'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Game } from '@/types'
import toast from 'react-hot-toast'
import { Gamepad2, LogOut, ArrowRight } from 'lucide-react'

export default function PlayerPage() {
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

    if (!isAuthenticated || !user || user.role !== 'PLAYER') {
      router.push('/login')
      return
    }

    fetchGames()
  }, [mounted, _hasHydrated, isAuthenticated, user, router])

  const fetchGames = async () => {
    try {
      const res = await api.get('/api/player/games')
      const gamesData = res.data || []
      console.log('Jogos carregados:', gamesData)
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
    router.push(`/player/games/${gameId}/rooms`)
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
            <h1 className="text-3xl font-bold text-white">Seus Jogos</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Seus Jogos</h1>
            <p className="text-white/80">Selecione um jogo para ver suas salas ou criar uma nova</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
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
              className="bg-white rounded-lg shadow-xl overflow-hidden cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2"
            >
              {game.cover_image_url ? (
                <div className="h-48 bg-gray-200 relative">
                  <img
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${game.cover_image_url}`}
                    alt={game.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', game.cover_image_url)
                      const img = e.currentTarget
                      img.style.display = 'none'
                      const parent = img.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center"><svg class="h-16 w-16 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                  <Gamepad2 className="w-16 h-16 text-white/80" />
                </div>
              )}
              
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-2">{game.title}</h3>
                {game.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {game.description}
                  </p>
                )}
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Ver Salas
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


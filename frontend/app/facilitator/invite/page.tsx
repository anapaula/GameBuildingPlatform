'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthStore } from '@/store/authStore'
import { Game } from '@/types'
import toast from 'react-hot-toast'
import { ArrowLeft, Mail } from 'lucide-react'
import Link from 'next/link'

export default function InvitePlayerPage() {
  const router = useRouter()
  const { user, isAuthenticated, _hasHydrated } = useAuthStore()
  const [games, setGames] = useState<Game[]>([])
  const [selectedGames, setSelectedGames] = useState<number[]>([])
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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

    fetchGames()
  }, [mounted, _hasHydrated, isAuthenticated, user, router])

  const fetchGames = async () => {
    try {
      // Usar endpoint que permite facilitadores verem todos os jogos
      const res = await api.get('/api/player/games')
      setGames(res.data.filter((g: Game) => g.is_active))
    } catch (error) {
      console.error('Erro ao carregar jogos:', error)
      toast.error('Erro ao carregar jogos')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      toast.error('E-mail é obrigatório')
      return
    }

    if (selectedGames.length === 0) {
      toast.error('Selecione pelo menos um jogo')
      return
    }

    setSubmitting(true)
    try {
      toast.loading('Enviando convite...', { id: 'invite' })
      await api.post('/api/facilitator/players/invite', {
        email,
        game_ids: selectedGames
      })
      toast.success('Convite enviado com sucesso!', { id: 'invite' })
      router.push('/facilitator')
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error)
      toast.error(error.response?.data?.detail || 'Erro ao enviar convite', { id: 'invite' })
    } finally {
      setSubmitting(false)
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
                Convidar Jogador
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                E-mail do Jogador
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jogos que o jogador terá acesso
              </label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-md p-4">
                {games.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nenhum jogo disponível</p>
                ) : (
                  games.map((game) => (
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
                  ))
                )}
              </div>
              {selectedGames.length > 0 && (
                <p className="mt-2 text-sm text-gray-500">
                  {selectedGames.length} jogo(s) selecionado(s)
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Link
                href="/facilitator"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}


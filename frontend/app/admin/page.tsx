'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Plus, Edit, Trash2, Image as ImageIcon, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelectedGame } from '@/hooks/useSelectedGame'

interface Game {
  id: number
  title: string
  description?: string
  cover_image_url?: string
  is_active: boolean
  created_at: string
  updated_at?: string
}

const resolveCoverUrl = (url?: string | null) => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}`
}

export default function AdminGamesPage() {
  const router = useRouter()
  const { setGameId } = useSelectedGame()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  useEffect(() => {
    fetchGames()
  }, [])

  const fetchGames = async () => {
    try {
      const res = await api.get('/api/admin/games')
      const gamesData = res.data || []
      console.log('Jogos carregados:', gamesData)
      setGames(gamesData)
      
      // Se não houver jogo selecionado e houver jogos, selecionar o primeiro
      if (gamesData.length > 0 && !localStorage.getItem('selectedGameId')) {
        setGameId(gamesData[0].id)
      }
    } catch (error) {
      toast.error('Erro ao carregar jogos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (gameId: number) => {
    if (!confirm('Tem certeza que deseja deletar este jogo? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      await api.delete(`/api/admin/games/${gameId}`)
      toast.success('Jogo deletado com sucesso')
      fetchGames()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar jogo')
    }
  }

  const handleGameClick = (gameId: number) => {
    console.log('Clicou no jogo:', gameId)
    
    // Salvar diretamente no localStorage primeiro
    if (typeof window !== 'undefined') {
      localStorage.setItem('selectedGameId', gameId.toString())
      console.log('GameId salvo no localStorage:', gameId)
      
      // Disparar evento customizado imediatamente
      window.dispatchEvent(new CustomEvent('gameSelected', { detail: gameId }))
    }
    
    // Usar o hook para atualizar o jogo selecionado
    setGameId(gameId)
    console.log('GameId definido via hook:', gameId)
    
    // Redirecionar usando window.location como fallback se router não funcionar
    console.log('Redirecionando para /admin/dashboard')
    try {
      router.push('/admin/dashboard')
      // Fallback: se após 500ms ainda estiver na mesma página, usar window.location
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname === '/admin') {
          console.log('Router não funcionou, usando window.location')
          window.location.href = '/admin/dashboard'
        }
      }, 500)
    } catch (error) {
      console.error('Erro ao redirecionar:', error)
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/dashboard'
      }
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jogos</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie os jogos da plataforma. Clique em um jogo para configurá-lo.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGame(null)
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Jogo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">Nenhum jogo cadastrado ainda.</p>
            <p className="text-sm text-gray-400 mt-2">Clique em "Novo Jogo" para começar.</p>
          </div>
        ) : (
          games.map((game) => (
            <div
              key={game.id}
              className="bg-white shadow rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
              onClick={(e) => {
                // Se o clique foi em um botão, não fazer nada
                if ((e.target as HTMLElement).closest('button')) {
                  return
                }
                handleGameClick(game.id)
              }}
            >
              {game.cover_image_url ? (
                <div className="h-48 bg-gray-200 relative">
                  <img
                    src={resolveCoverUrl(game.cover_image_url) || ''}
                    alt={game.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Erro ao carregar imagem:', game.cover_image_url)
                      const img = e.currentTarget
                      img.style.display = 'none'
                      const parent = img.parentElement
                      if (parent) {
                        parent.innerHTML = '<div class="h-48 bg-gray-200 flex items-center justify-center"><svg class="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>'
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">{game.title}</h3>
                {game.description && (
                  <p className="text-sm text-gray-500 line-clamp-2 mb-4">{game.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    Criado em {new Date(game.created_at).toLocaleDateString('pt-BR')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingGame(game)
                        setShowModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900"
                      title="Editar jogo"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(game.id)
                      }}
                      className="text-red-600 hover:text-red-900"
                      title="Deletar jogo"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <GameModal
          game={editingGame}
          games={games}
          router={router}
          setGameId={setGameId}
          onClose={() => {
            setShowModal(false)
            setEditingGame(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingGame(null)
            fetchGames()
          }}
        />
      )}
    </div>
  )
}

function GameModal({
  game,
  games,
  router,
  setGameId,
  onClose,
  onSuccess,
}: {
  game: Game | null
  games: Game[]
  router: ReturnType<typeof useRouter>
  setGameId: (gameId: number | null) => void
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    title: game?.title || '',
    description: game?.description || '',
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(resolveCoverUrl(game?.cover_image_url) || null)

  useEffect(() => {
    if (game) {
      setFormData({
        title: game.title || '',
        description: game.description || '',
      })
      setImagePreview(resolveCoverUrl(game.cover_image_url) || null)
    } else {
      setFormData({
        title: '',
        description: '',
      })
      setImagePreview(null)
    }
    setSelectedImage(null)
  }, [game])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedTypes.includes(fileExt)) {
        toast.error('Formato de imagem não suportado. Use JPG, PNG, GIF ou WEBP.')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (game) {
        // Edição
        const formDataToSend = new FormData()
        formDataToSend.append('title', formData.title)
        formDataToSend.append('description', formData.description || '')
        if (selectedImage) {
          formDataToSend.append('cover_image', selectedImage)
        }

        toast.loading('Atualizando jogo...', { id: 'update-game' })
        await api.put(`/api/admin/games/${game.id}`, formDataToSend)
        toast.success('Jogo atualizado com sucesso!', { id: 'update-game' })
      } else {
        // Criação
        const formDataToSend = new FormData()
        formDataToSend.append('title', formData.title)
        formDataToSend.append('description', formData.description || '')
        if (selectedImage) {
          formDataToSend.append('cover_image', selectedImage)
        }

        toast.loading('Criando jogo...', { id: 'create-game' })
        const response = await api.post('/api/admin/games', formDataToSend)
        console.log('Jogo criado:', response.data)
        toast.success('Jogo criado com sucesso!', { id: 'create-game' })
        
        // Se for o primeiro jogo ou único jogo, salvar como selecionado
        if (response.data) {
          setGameId(response.data.id)
          // Se for o primeiro jogo criado, redirecionar para o Dashboard
          if (games.length === 0) {
            setTimeout(() => {
              router.push('/admin/dashboard')
            }, 500)
          }
        }
      }
      // Aguardar um pouco antes de chamar onSuccess para garantir que o backend processou tudo
      await new Promise(resolve => setTimeout(resolve, 100))
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao salvar jogo:', error)
      toast.error(error.response?.data?.detail || 'Erro ao salvar jogo', { id: game ? 'update-game' : 'create-game' })
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            {game ? 'Editar Jogo' : 'Novo Jogo'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Imagem de Capa
            </label>
            <div className="mt-1">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {imagePreview ? 'Imagem selecionada' : 'Clique para selecionar imagem'}
                  </span>
                </div>
              </label>
              {imagePreview && (
                <div className="mt-2 relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null)
                      setImagePreview(resolveCoverUrl(game?.cover_image_url) || null)
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Formatos aceitos: JPG, PNG, GIF, WEBP
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

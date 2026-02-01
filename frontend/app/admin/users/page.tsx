'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Game, Invitation, User } from '@/types'
import { Edit, Mail, Plus, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [players, setPlayers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedGames, setSelectedGames] = useState<number[]>([])

  const [editingPlayer, setEditingPlayer] = useState<User | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editSelectedGames, setEditSelectedGames] = useState<number[]>([])
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    is_active: true
  })

  useEffect(() => {
    fetchPlayers()
    fetchInvitations()
    fetchGames()
  }, [])

  const fetchPlayers = async () => {
    try {
      const res = await api.get('/api/users')
      const data = (res.data || []).filter((u: User) => u.role === 'PLAYER')
      setPlayers(data)
    } catch (error) {
      console.error('Erro ao carregar jogadores:', error)
      toast.error('Erro ao carregar jogadores')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/api/admin/players/invitations')
      const data = (res.data || []).filter((inv: Invitation) => inv.role === 'PLAYER')
      setInvitations(data)
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }

  const fetchGames = async () => {
    try {
      const res = await api.get('/api/admin/games')
      setGames((res.data || []).filter((g: Game) => g.is_active))
    } catch (error) {
      console.error('Erro ao carregar jogos:', error)
      toast.error('Erro ao carregar jogos')
    }
  }

  const toggleGame = (gameId: number, selected: number[], setSelected: (ids: number[]) => void) => {
    setSelected(
      selected.includes(gameId)
        ? selected.filter(id => id !== gameId)
        : [...selected, gameId]
    )
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) {
      toast.error('E-mail é obrigatório')
      return
    }
    if (selectedGames.length === 0) {
      toast.error('Selecione pelo menos um jogo')
      return
    }

    try {
      toast.loading('Enviando convite...', { id: 'invite' })
      await api.post('/api/admin/players/invite', {
        email: inviteEmail,
        role: 'PLAYER',
        game_ids: selectedGames
      })
      toast.success('Convite enviado com sucesso!', { id: 'invite' })
      setShowInviteModal(false)
      setInviteEmail('')
      setSelectedGames([])
      fetchInvitations()
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error)
      toast.error(error.response?.data?.detail || 'Erro ao enviar convite', { id: 'invite' })
    }
  }

  const handleEdit = async (player: User) => {
    setEditingPlayer(player)
    setFormData({
      username: player.username,
      email: player.email,
      password: '',
      is_active: player.is_active
    })
    try {
      const accessRes = await api.get(`/api/admin/players/${player.id}/games`)
      const accessIds = (accessRes.data || []).map((a: any) => a.game_id)
      setEditSelectedGames(accessIds)
    } catch (error) {
      console.error('Erro ao carregar acessos do jogador:', error)
      setEditSelectedGames([])
    }
    setShowEditModal(true)
  }

  const handleDelete = async (userId: number) => {
    if (!confirm('Tem certeza que deseja deletar este jogador? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      toast.loading('Deletando jogador...', { id: 'delete-player' })
      await api.delete(`/api/users/${userId}`)
      toast.success('Jogador deletado com sucesso!', { id: 'delete-player' })
      fetchPlayers()
    } catch (error: any) {
      console.error('Erro ao deletar jogador:', error)
      toast.error(error.response?.data?.detail || 'Erro ao deletar jogador', { id: 'delete-player' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer) return

    try {
      toast.loading('Atualizando jogador...', { id: 'update-player' })

      const updateData: any = {
        is_active: formData.is_active
      }

      if (formData.username !== editingPlayer.username) {
        updateData.username = formData.username
      }

      if (formData.email !== editingPlayer.email) {
        updateData.email = formData.email
      }

      if (formData.password) {
        updateData.password = formData.password
      }

      await api.put(`/api/users/${editingPlayer.id}`, updateData)
      await api.put(`/api/admin/players/${editingPlayer.id}/games`, {
        game_ids: editSelectedGames
      })

      toast.success('Jogador atualizado com sucesso!', { id: 'update-player' })
      setShowEditModal(false)
      setEditingPlayer(null)
      fetchPlayers()
    } catch (error: any) {
      console.error('Erro ao atualizar jogador:', error)
      toast.error(error.response?.data?.detail || 'Erro ao atualizar jogador', { id: 'update-player' })
    }
  }

  const pendingInvitations = invitations.filter((inv) => inv.status === 'pending')
  const acceptedInvitations = invitations.filter((inv) => inv.status === 'accepted')
  const expiredInvitations = invitations.filter((inv) => inv.status === 'expired')

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Jogadores</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie jogadores, convites e acessos a jogos
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Convidar Jogador
        </button>
      </div>

      {/* Modal de Convite */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Convidar Jogador</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
                  setSelectedGames([])
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    id="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@exemplo.com"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jogos que o jogador terá acesso
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
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
                          onChange={() => toggleGame(game.id, selectedGames, setSelectedGames)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{game.title}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteEmail('')
                    setSelectedGames([])
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Enviar Convite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de Jogadores */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Jogadores Cadastrados</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {players.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum jogador encontrado.</p>
            </li>
          ) : (
            players.map((player) => (
              <li key={player.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{player.username}</p>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          PLAYER
                        </span>
                        {!player.is_active && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{player.email}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Criado em: {new Date(player.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(player)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                        title="Editar jogador"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(player.id)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                        title="Deletar jogador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Convites Pendentes */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Convites Pendentes</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {pendingInvitations.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum convite pendente.</p>
            </li>
          ) : (
            pendingInvitations.map((invitation) => (
              <li key={invitation.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-xs text-gray-400">
                      Criado em: {new Date(invitation.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Pendente
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Convites Aceitos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Convites Aceitos</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {acceptedInvitations.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum convite aceito.</p>
            </li>
          ) : (
            acceptedInvitations.map((invitation) => (
              <li key={invitation.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-xs text-gray-400">
                      Criado em: {new Date(invitation.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Aceito
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Convites Expirados */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Convites Expirados</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {expiredInvitations.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum convite expirado.</p>
            </li>
          ) : (
            expiredInvitations.map((invitation) => (
              <li key={invitation.id} className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                    <p className="text-xs text-gray-400">
                      Criado em: {new Date(invitation.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Expirado
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      {/* Modal de Edição */}
      {showEditModal && editingPlayer && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Editar Jogador</h3>
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setEditingPlayer(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Nova Senha (deixe em branco para não alterar)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Jogador ativo</label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Acesso aos jogos</label>
                <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-3">
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
                          checked={editSelectedGames.includes(game.id)}
                          onChange={() => toggleGame(game.id, editSelectedGames, setEditSelectedGames)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-700">{game.title}</span>
                      </label>
                    ))
                  )}
                </div>
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
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingPlayer(null)
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

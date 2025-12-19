'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { User, Invitation } from '@/types'
import toast from 'react-hot-toast'
import { Plus, Mail, Trash2, Edit2, X } from 'lucide-react'

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetchFacilitators()
    fetchInvitations()
  }, [])

  const fetchFacilitators = async () => {
    try {
      const res = await api.get('/api/admin/facilitators')
      setFacilitators(res.data)
    } catch (error) {
      console.error('Erro ao carregar facilitadores:', error)
      toast.error('Erro ao carregar facilitadores')
    } finally {
      setLoading(false)
    }
  }

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/api/admin/facilitators/invitations')
      setInvitations(res.data)
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) {
      toast.error('E-mail é obrigatório')
      return
    }

    try {
      toast.loading('Enviando convite...', { id: 'invite' })
      await api.post('/api/admin/facilitators/invite', {
        email: inviteEmail,
        role: 'FACILITATOR'
      })
      toast.success('Convite enviado com sucesso!', { id: 'invite' })
      setShowInviteModal(false)
      setInviteEmail('')
      fetchInvitations()
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error)
      toast.error(error.response?.data?.detail || 'Erro ao enviar convite', { id: 'invite' })
    }
  }

  const handleDeleteFacilitator = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este facilitador?')) return

    try {
      toast.loading('Removendo facilitador...', { id: 'delete-facilitator' })
      await api.delete(`/api/admin/facilitators/${id}`)
      toast.success('Facilitador removido com sucesso!', { id: 'delete-facilitator' })
      fetchFacilitators()
    } catch (error: any) {
      console.error('Erro ao remover facilitador:', error)
      toast.error(error.response?.data?.detail || 'Erro ao remover facilitador', { id: 'delete-facilitator' })
    }
  }

  const handleDeleteInvitation = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover este convite?')) return

    try {
      toast.loading('Removendo convite...', { id: 'delete-invitation' })
      await api.delete(`/api/admin/facilitators/invitations/${id}`)
      toast.success('Convite removido com sucesso!', { id: 'delete-invitation' })
      fetchInvitations()
    } catch (error: any) {
      console.error('Erro ao remover convite:', error)
      toast.error(error.response?.data?.detail || 'Erro ao remover convite', { id: 'delete-invitation' })
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Facilitadores</h1>
          <p className="mt-2 text-sm text-gray-600">
            Gerencie facilitadores e seus convites
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Convidar Facilitador
        </button>
      </div>

      {/* Modal de Convite */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-900">Convidar Facilitador</h3>
              <button
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteEmail('')
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
                <input
                  type="email"
                  id="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@exemplo.com"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteEmail('')
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

      {/* Lista de Facilitadores */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Facilitadores Cadastrados</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {facilitators.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum facilitador cadastrado.</p>
            </li>
          ) : (
            facilitators.map((facilitator) => (
              <li key={facilitator.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{facilitator.username}</p>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Facilitador
                        </span>
                        {!facilitator.is_active && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{facilitator.email}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Criado em: {new Date(facilitator.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteFacilitator(facilitator.id)}
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

      {/* Lista de Convites */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Convites Pendentes</h2>
        </div>
        <ul className="divide-y divide-gray-200">
          {invitations.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum convite pendente.</p>
            </li>
          ) : (
            invitations.map((invitation) => (
              <li key={invitation.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-gray-400 mr-2" />
                        <p className="text-sm font-medium text-gray-900">{invitation.email}</p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          invitation.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : invitation.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {invitation.status === 'pending' ? 'Pendente' : invitation.status === 'accepted' ? 'Aceito' : 'Expirado'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-400">
                        Criado em: {new Date(invitation.created_at).toLocaleString('pt-BR')}
                        {invitation.expires_at && (
                          <> • Expira em: {new Date(invitation.expires_at).toLocaleString('pt-BR')}</>
                        )}
                      </p>
                    </div>
                    {invitation.status === 'pending' && (
                      <button
                        onClick={() => handleDeleteInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remover convite"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
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


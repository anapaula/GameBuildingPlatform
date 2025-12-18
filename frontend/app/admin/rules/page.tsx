'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { GameRule } from '@/types'
import { Plus, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelectedGame } from '@/hooks/useSelectedGame'

export default function RulesPage() {
  const router = useRouter()
  const { selectedGameId } = useSelectedGame()
  const [rules, setRules] = useState<GameRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<GameRule | null>(null)

  useEffect(() => {
    if (!selectedGameId) {
      router.push('/admin')
      return
    }
    fetchRules()
  }, [selectedGameId, router])

  const fetchRules = async () => {
    if (!selectedGameId) return
    try {
      const res = await api.get(`/api/admin/rules?game_id=${selectedGameId}`)
      setRules(res.data)
    } catch (error) {
      toast.error('Erro ao carregar regras')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja desativar esta regra?')) return

    try {
      await api.delete(`/api/admin/rules/${id}`)
      toast.success('Regra desativada')
      fetchRules()
    } catch (error) {
      toast.error('Erro ao desativar regra')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Regras do Jogo</h1>
        <button
          onClick={() => {
            setEditingRule(null)
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Regra
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {rules.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhuma regra cadastrada ainda.</p>
            </li>
          ) : (
            rules.map((rule) => (
              <li key={rule.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{rule.title}</p>
                        {!rule.is_active && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inativa
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
                      <p className="mt-1 text-xs text-gray-400">Tipo: {rule.rule_type}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingRule(rule)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        className="text-red-600 hover:text-red-900"
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

      {showModal && (
        <RuleModal
          rule={editingRule}
          onClose={() => {
            setShowModal(false)
            setEditingRule(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingRule(null)
            fetchRules()
          }}
        />
      )}
    </div>
  )
}

function RuleModal({
  rule,
  onClose,
  onSuccess,
}: {
  rule: GameRule | null
  onClose: () => void
  onSuccess: () => void
}) {
  const { selectedGameId } = useSelectedGame()
  const [formData, setFormData] = useState({
    title: rule?.title || '',
    description: rule?.description || '',
    rule_type: rule?.rule_type || 'mechanic',
    content: rule?.content || {},
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGameId) {
      toast.error('Jogo não selecionado')
      return
    }
    try {
      const dataToSend = { ...formData, game_id: selectedGameId }
      if (rule) {
        await api.put(`/api/admin/rules/${rule.id}`, dataToSend)
        toast.success('Regra atualizada')
      } else {
        await api.post('/api/admin/rules', dataToSend)
        toast.success('Regra criada')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar regra')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {rule ? 'Editar Regra' : 'Nova Regra'}
        </h3>
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
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select
              value={formData.rule_type}
              onChange={(e) => setFormData({ ...formData, rule_type: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="mechanic">Mecânica</option>
              <option value="objective">Objetivo</option>
              <option value="constraint">Restrição</option>
              <option value="rule">Regra</option>
            </select>
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


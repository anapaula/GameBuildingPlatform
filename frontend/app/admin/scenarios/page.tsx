'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { Scenario } from '@/types'
import { Plus, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)

  useEffect(() => {
    fetchScenarios()
  }, [])

  const fetchScenarios = async () => {
    try {
      const res = await api.get('/api/admin/scenarios')
      setScenarios(res.data)
    } catch (error) {
      toast.error('Erro ao carregar cenários')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Cenários do Jogo</h1>
        <button
          onClick={() => {
            setEditingScenario(null)
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Cenário
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {scenarios.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum cenário cadastrado ainda.</p>
            </li>
          ) : (
            scenarios.map((scenario) => (
              <li key={scenario.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{scenario.name}</p>
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Fase {scenario.phase}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{scenario.description}</p>
                      <p className="mt-1 text-xs text-gray-400">Ordem: {scenario.order}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingScenario(scenario)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit className="h-5 w-5" />
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
        <ScenarioModal
          scenario={editingScenario}
          onClose={() => {
            setShowModal(false)
            setEditingScenario(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingScenario(null)
            fetchScenarios()
          }}
        />
      )}
    </div>
  )
}

function ScenarioModal({
  scenario,
  onClose,
  onSuccess,
}: {
  scenario: Scenario | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    name: scenario?.name || '',
    description: scenario?.description || '',
    image_url: scenario?.image_url || '',
    phase: scenario?.phase || 1,
    order: scenario?.order || 0,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (scenario) {
        await api.put(`/api/admin/scenarios/${scenario.id}`, formData)
        toast.success('Cenário atualizado')
      } else {
        await api.post('/api/admin/scenarios', formData)
        toast.success('Cenário criado')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar cenário')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {scenario ? 'Editar Cenário' : 'Novo Cenário'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
            <label className="block text-sm font-medium text-gray-700">URL da Imagem</label>
            <input
              type="text"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Fase</label>
              <input
                type="number"
                value={formData.phase}
                onChange={(e) => setFormData({ ...formData, phase: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Ordem</label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                min="0"
              />
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


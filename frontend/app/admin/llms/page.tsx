'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { LLMConfiguration } from '@/types'
import { Plus, CheckCircle, XCircle, Play } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LLMsPage() {
  const [configs, setConfigs] = useState<LLMConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    fetchConfigs()
  }, [])

  const fetchConfigs = async () => {
    try {
      const res = await api.get('/api/admin/llm/configs')
      setConfigs(res.data)
    } catch (error) {
      toast.error('Erro ao carregar configurações de LLM')
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (id: number) => {
    try {
      await api.patch(`/api/llm/${id}/activate`)
      toast.success('LLM ativado')
      fetchConfigs()
    } catch (error) {
      toast.error('Erro ao ativar LLM')
    }
  }

  const handleTest = async (id: number) => {
    try {
      const res = await api.post('/api/admin/llm/test', {
        llm_config_id: id,
        test_prompt: 'Olá, você está funcionando? Responda em português.',
      })
      toast.success(`Teste realizado! Score: ${res.data.quality_score?.toFixed(2)}`)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao testar LLM')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Configurações de LLM</h1>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Configuração
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {configs.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            Nenhuma configuração de LLM cadastrada ainda.
          </div>
        ) : (
          configs.map((config) => (
            <div key={config.id} className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {config.provider} - {config.model_name}
                </h3>
                {config.is_active ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400" />
                )}
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>Requests: {config.total_requests}</p>
                <p>Tokens: {config.total_tokens.toLocaleString()}</p>
                <p>Custo: R$ {config.total_cost.toFixed(4)}</p>
                <p>Tempo médio: {config.avg_response_time.toFixed(2)}s</p>
              </div>
              <div className="mt-4 flex gap-2">
                {!config.is_active && (
                  <button
                    onClick={() => handleActivate(config.id)}
                    className="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700"
                  >
                    Ativar
                  </button>
                )}
                <button
                  onClick={() => handleTest(config.id)}
                  className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                >
                  <Play className="h-4 w-4" />
                  Testar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <LLMConfigModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false)
            fetchConfigs()
          }}
        />
      )}
    </div>
  )
}

function LLMConfigModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    provider: 'openai' as 'openai' | 'anthropic',
    model_name: '',
    api_key: '',
    cost_per_token: '',
    max_tokens: '',
    temperature: '0.7',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await api.post('/api/admin/llm/configs', {
        ...formData,
        cost_per_token: formData.cost_per_token ? parseFloat(formData.cost_per_token) : null,
        max_tokens: formData.max_tokens ? parseInt(formData.max_tokens) : null,
        temperature: parseFloat(formData.temperature),
      })
      toast.success('Configuração criada')
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao criar configuração')
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Nova Configuração de LLM</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Provider</label>
            <select
              value={formData.provider}
              onChange={(e) => setFormData({ ...formData, provider: e.target.value as any })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Modelo</label>
            <input
              type="text"
              value={formData.model_name}
              onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              placeholder="gpt-4, claude-3-opus, etc."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">API Key</label>
            <input
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Custo por Token</label>
            <input
              type="number"
              step="0.0000001"
              value={formData.cost_per_token}
              onChange={(e) => setFormData({ ...formData, cost_per_token: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Tokens</label>
            <input
              type="number"
              value={formData.max_tokens}
              onChange={(e) => setFormData({ ...formData, max_tokens: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Temperature</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Criar
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


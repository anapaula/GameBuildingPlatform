'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { LLMConfiguration } from '@/types'
import { Plus, CheckCircle, XCircle, Play, Edit, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LLMsPage() {
  const [configs, setConfigs] = useState<LLMConfiguration[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingConfig, setEditingConfig] = useState<LLMConfiguration | null>(null)

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
      toast.loading('Ativando LLM...', { id: 'activate-llm' })
      await api.patch(`/api/llm/${id}/activate`)
      toast.success('LLM definida como ativa para o jogo!', { id: 'activate-llm' })
      fetchConfigs()
    } catch (error: any) {
      console.error('Erro ao ativar LLM:', error)
      toast.error(error.response?.data?.detail || 'Erro ao ativar LLM', { id: 'activate-llm' })
    }
  }

  const handleTest = async (id: number) => {
    try {
      toast.loading('Testando LLM...', { id: 'test-llm' })
      const res = await api.post('/api/admin/llm/test', {
        llm_config_id: id,
        test_prompt: 'Olá, você está funcionando? Responda em português.',
      })
      toast.success(`Teste realizado! Score: ${res.data.quality_score?.toFixed(2)}`, { id: 'test-llm' })
      fetchConfigs() // Atualizar estatísticas
    } catch (error: any) {
      console.error('Erro ao testar LLM:', error)
      toast.error(error.response?.data?.detail || 'Erro ao testar LLM', { id: 'test-llm' })
    }
  }

  const handleEdit = (config: LLMConfiguration) => {
    console.log('Editando configuração:', config)
    setEditingConfig(config)
    setShowModal(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta configuração de LLM?')) {
      return
    }
    try {
      await api.delete(`/api/admin/llm/configs/${id}`)
      toast.success('Configuração deletada com sucesso')
      fetchConfigs()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar configuração')
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
            <div key={config.id} className={`bg-white shadow rounded-lg p-6 ${config.is_active ? 'ring-2 ring-green-500' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900">
                    {config.provider} - {config.model_name}
                  </h3>
                  {config.is_active && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ativa
                    </span>
                  )}
                </div>
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
              <div className="mt-4 space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleActivate(config.id)}
                    className={`flex-1 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-1 ${
                      config.is_active
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-green-500 text-white hover:bg-green-600'
                    }`}
                    title={config.is_active ? 'Esta LLM já está ativa' : 'Definir como LLM ativa para o jogo'}
                  >
                    <CheckCircle className="h-4 w-4" />
                    {config.is_active ? 'Ativa' : 'Definir como Ativa'}
                  </button>
                  <button
                    onClick={() => handleTest(config.id)}
                    className="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                  >
                    <Play className="h-4 w-4" />
                    Testar
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      console.log('Botão Editar clicado para config:', config.id)
                      handleEdit(config)
                    }}
                    className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded text-sm hover:bg-yellow-700 flex items-center justify-center gap-1"
                    title="Editar configuração"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      console.log('Botão Deletar clicado para config:', config.id)
                      handleDelete(config.id)
                    }}
                    className="flex-1 bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700 flex items-center justify-center gap-1"
                    title="Deletar configuração"
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <LLMConfigModal
          config={editingConfig}
          onClose={() => {
            setShowModal(false)
            setEditingConfig(null)
          }}
          onSuccess={() => {
            setShowModal(false)
            setEditingConfig(null)
            fetchConfigs()
          }}
        />
      )}
    </div>
  )
}

function LLMConfigModal({
  config,
  onClose,
  onSuccess,
}: {
  config?: LLMConfiguration | null
  onClose: () => void
  onSuccess: () => void
}) {
  const isEditing = !!config
  const [formData, setFormData] = useState({
    provider: (config?.provider || 'openai') as 'openai' | 'anthropic',
    model_name: config?.model_name || '',
    api_key: '', // Sempre vazio por segurança
    cost_per_token: config?.cost_per_token?.toString() || '',
    max_tokens: config?.max_tokens?.toString() || '',
    temperature: config?.temperature?.toString() || '0.7',
  })

  // Atualizar formData quando config mudar
  useEffect(() => {
    if (config) {
      setFormData({
        provider: (config.provider || 'openai') as 'openai' | 'anthropic',
        model_name: config.model_name || '',
        api_key: '', // Sempre vazio por segurança
        cost_per_token: config.cost_per_token?.toString() || '',
        max_tokens: config.max_tokens?.toString() || '',
        temperature: config.temperature?.toString() || '0.7',
      })
    } else {
      setFormData({
        provider: 'openai' as 'openai' | 'anthropic',
        model_name: '',
        api_key: '',
        cost_per_token: '',
        max_tokens: '',
        temperature: '0.7',
      })
    }
  }, [config])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditing && config) {
        // Atualizar - só envia campos que foram alterados
        const updateData: any = {}
        if (formData.provider !== config.provider) updateData.provider = formData.provider
        if (formData.model_name !== config.model_name) updateData.model_name = formData.model_name
        if (formData.api_key) updateData.api_key = formData.api_key
        if (formData.cost_per_token !== (config.cost_per_token?.toString() || '')) {
          updateData.cost_per_token = formData.cost_per_token ? parseFloat(formData.cost_per_token) : null
        }
        if (formData.max_tokens !== (config.max_tokens?.toString() || '')) {
          updateData.max_tokens = formData.max_tokens ? parseInt(formData.max_tokens) : null
        }
        if (formData.temperature !== config.temperature.toString()) {
          updateData.temperature = parseFloat(formData.temperature)
        }
        
        toast.loading('Atualizando configuração...', { id: 'save-llm' })
        await api.put(`/api/admin/llm/configs/${config.id}`, updateData)
        toast.success('Configuração atualizada com sucesso!', { id: 'save-llm' })
      } else {
        // Criar - validação
        if (!formData.api_key) {
          toast.error('API Key é obrigatória para criar uma nova configuração')
          return
        }
        toast.loading('Criando configuração...', { id: 'save-llm' })
        await api.post('/api/admin/llm/configs', {
          ...formData,
          cost_per_token: formData.cost_per_token ? parseFloat(formData.cost_per_token) : null,
          max_tokens: formData.max_tokens ? parseInt(formData.max_tokens) : null,
          temperature: parseFloat(formData.temperature),
        })
        toast.success('Configuração criada com sucesso!', { id: 'save-llm' })
      }
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error)
      toast.error(error.response?.data?.detail || `Erro ao ${isEditing ? 'atualizar' : 'criar'} configuração`, { id: 'save-llm' })
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {isEditing ? 'Editar Configuração de LLM' : 'Nova Configuração de LLM'}
        </h3>
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
              placeholder={isEditing ? "Deixe em branco para manter a atual" : ""}
              required={!isEditing}
            />
            {isEditing && (
              <p className="mt-1 text-xs text-gray-500">Deixe em branco para manter a API key atual</p>
            )}
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
              {isEditing ? 'Atualizar' : 'Criar'}
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


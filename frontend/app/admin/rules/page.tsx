'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { GameRule } from '@/types'
import { Plus, Edit, Trash2, FileText, Eye, X, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelectedGame } from '@/hooks/useSelectedGame'

export default function RulesPage() {
  const router = useRouter()
  const { selectedGameId } = useSelectedGame()
  const [rules, setRules] = useState<GameRule[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingRule, setEditingRule] = useState<GameRule | null>(null)
  const [viewingContent, setViewingContent] = useState<{ name: string; file_content: string } | null>(null)

  useEffect(() => {
    // Verificar também no localStorage caso o hook ainda não tenha atualizado
    const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
    const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
    
    if (!gameId) {
      router.push('/admin')
      return
    }
    fetchRules()
  }, [selectedGameId, router])

  const fetchRules = async () => {
    // Verificar também no localStorage caso o hook ainda não tenha atualizado
    const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
    const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
    
    if (!gameId) return
    try {
      const res = await api.get(`/api/admin/rules?game_id=${gameId}`)
      setRules(res.data)
    } catch (error) {
      toast.error('Erro ao carregar elementos')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja desativar este elemento?')) return

    try {
      await api.delete(`/api/admin/rules/${id}`)
      toast.success('Elemento desativado')
      fetchRules()
    } catch (error) {
      toast.error('Erro ao desativar elemento')
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Elementos do Jogo</h1>
        <button
          onClick={() => {
            setEditingRule(null)
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo elemento
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {rules.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum elemento cadastrado ainda.</p>
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
                      {rule.content?.file_url && (
                        <div className="mt-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <a
                            href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${rule.content.file_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            {rule.content?.file_name || 'Arquivo anexado'}
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {rule.content?.file_content && (
                        <button
                          onClick={() => setViewingContent({ name: rule.title, file_content: rule.content?.file_content || '' })}
                          className="text-green-600 hover:text-green-900"
                          title="Ver conteúdo do arquivo"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingRule(rule)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar elemento"
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
          onViewContent={(content) => setViewingContent(content)}
        />
      )}

      {viewingContent && (
        <FileContentViewModal
          rule={viewingContent}
          onClose={() => setViewingContent(null)}
        />
      )}
    </div>
  )
}

function FileContentViewModal({
  rule,
  onClose,
}: {
  rule: { name: string; file_content: string }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Conteúdo do Arquivo: {rule.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-gray-50">
          {rule.file_content ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {rule.file_content}
            </pre>
          ) : (
            <p className="text-gray-500 text-center">Nenhum conteúdo disponível</p>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function RuleModal({
  rule,
  onClose,
  onSuccess,
  onViewContent,
}: {
  rule: GameRule | null
  onClose: () => void
  onSuccess: () => void
  onViewContent: (content: { name: string; file_content: string }) => void
}) {
  const { selectedGameId } = useSelectedGame()
  const [formData, setFormData] = useState({
    title: rule?.title || '',
    description: rule?.description || '',
    rule_type: rule?.rule_type || 'mechanic',
    content: rule?.content || {},
  })
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (rule) {
      setFormData({
        title: rule.title || '',
        description: rule.description || '',
        rule_type: rule.rule_type || 'mechanic',
        content: rule.content || {},
      })
    }
  }, [rule])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGameId) {
      toast.error('Jogo não selecionado')
      return
    }
    try {
      let updatedContent = { ...(formData.content || {}) }

      if (selectedFile) {
        setIsUploading(true)
        const uploadData = new FormData()
        uploadData.append('file', selectedFile)
        const uploadResponse = await api.post('/api/admin/rules/upload', uploadData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        updatedContent = {
          ...updatedContent,
          file_url: uploadResponse.data?.file_url,
          file_content: uploadResponse.data?.file_content,
          file_name: uploadResponse.data?.file_name || selectedFile.name,
        }
      }

      const dataToSend = { ...formData, content: updatedContent, game_id: selectedGameId }
      if (rule) {
        await api.put(`/api/admin/rules/${rule.id}`, dataToSend)
        toast.success('Elemento atualizado')
      } else {
        await api.post('/api/admin/rules', dataToSend)
        toast.success('Elemento criado')
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar elemento')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {rule ? 'Editar Elemento' : 'Novo Elemento do Jogo'}
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
          <div>
            <label className="block text-sm font-medium text-gray-700">Arquivo do elemento</label>
            <div className="mt-1 flex items-center gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                Selecionar arquivo
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <span className="text-xs text-gray-500">
                {selectedFile?.name || formData.content?.file_name || 'Nenhum arquivo selecionado'}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">Formatos aceitos: PDF, DOCX, TXT</p>
            {formData.content?.file_url && (
              <div className="mt-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${formData.content.file_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {formData.content?.file_name || 'Arquivo anexado'}
                </a>
                {formData.content?.file_content && (
                  <button
                    type="button"
                    onClick={() => onViewContent({ name: formData.title || 'Elemento do Jogo', file_content: formData.content?.file_content || '' })}
                    className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-900"
                  >
                    <Eye className="h-3 w-3" />
                    Ver conteúdo
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              disabled={isUploading}
            >
              {isUploading ? 'Enviando...' : 'Salvar'}
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


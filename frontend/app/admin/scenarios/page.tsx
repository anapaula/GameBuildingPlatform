'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { Scenario } from '@/types'
import { Plus, Edit, Trash2, Upload, FileText, Eye, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSelectedGame } from '@/hooks/useSelectedGame'

export default function ScenariosPage() {
  const router = useRouter()
  const { selectedGameId } = useSelectedGame()
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingScenario, setEditingScenario] = useState<Scenario | null>(null)
  const [viewingContent, setViewingContent] = useState<{ name: string; file_content: string } | null>(null)

  useEffect(() => {
    // Verificar também no localStorage caso o hook ainda não tenha atualizado
    const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
    const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
    
    if (!gameId) {
      // Se não houver jogo selecionado, redirecionar para a página de jogos
      router.push('/admin')
      return
    }
    fetchScenarios()
  }, [selectedGameId, router])

  const fetchScenarios = async () => {
    // Verificar também no localStorage caso o hook ainda não tenha atualizado
    const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
    const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
    
    if (!gameId) return
    try {
      const res = await api.get(`/api/admin/scenarios?game_id=${gameId}`)
      const fetched = res.data || []
      const sorted = fetched.slice().sort((a: Scenario, b: Scenario) => {
        if (a.phase !== b.phase) {
          return a.phase - b.phase
        }
        return a.order - b.order
      })
      setScenarios(sorted)
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
        <h1 className="text-3xl font-bold text-gray-900">Cenas do Jogo</h1>
        <button
          onClick={() => {
            setEditingScenario(null)
            setShowModal(true)
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova cena
        </button>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {scenarios.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhuma cena cadastrada ainda.</p>
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
                      {scenario.file_url && (
                        <div className="mt-2 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <span className="text-xs text-blue-600">Arquivo anexado</span>
                        </div>
                      )}
                      {scenario.image_url && (
                        <div className="mt-2">
                          <img
                            src={
                              scenario.image_url.startsWith('http')
                                ? scenario.image_url
                                : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${scenario.image_url}`
                            }
                            alt={`Cena ${scenario.name}`}
                            className="w-full h-32 object-cover rounded-md border"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {scenario.file_content && (
                        <button
                          onClick={() => setViewingContent({ name: scenario.name, file_content: scenario.file_content || '' })}
                          className="text-green-600 hover:text-green-900"
                          title="Ver conteúdo do arquivo"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingScenario(scenario)
                          setShowModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar cena"
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
          onViewContent={(content) => setViewingContent(content)}
          key={editingScenario?.id || 'new'} // Força re-render quando muda
        />
      )}

      {viewingContent && (
        <FileContentViewModal
          scenario={viewingContent}
          onClose={() => setViewingContent(null)}
        />
      )}
    </div>
  )
}

function FileContentViewModal({
  scenario,
  onClose,
}: {
  scenario: { name: string; file_content: string }
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">
            Conteúdo do Arquivo: {scenario.name}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto border rounded-md p-4 bg-gray-50">
          {scenario.file_content ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
              {scenario.file_content}
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

function ScenarioModal({
  scenario,
  onClose,
  onSuccess,
  onViewContent,
}: {
  scenario: Scenario | null
  onClose: () => void
  onSuccess: () => void
  onViewContent: (content: { name: string; file_content: string }) => void
}) {
  const { selectedGameId } = useSelectedGame()
  const [formData, setFormData] = useState({
    name: scenario?.name || '',
    description: scenario?.description || '',
    image_url: scenario?.image_url || '',
    phase: scenario?.phase || 1,
    order: scenario?.order || 0,
  })
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(scenario?.image_url || null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(scenario?.file_url || null)
  const [fileContentPreview, setFileContentPreview] = useState<string | null>(scenario?.file_content || null)
  const [isReadingFile, setIsReadingFile] = useState(false)

  // Resetar form quando scenario mudar
  useEffect(() => {
    if (scenario) {
      setFormData({
        name: scenario.name || '',
        description: scenario.description || '',
        image_url: scenario.image_url || '',
        phase: scenario.phase || 1,
        order: scenario.order || 0,
      })
      setImagePreview(scenario.image_url || null)
      setFilePreview(scenario.file_url || null)
      setFileContentPreview(scenario.file_content || null)
    } else {
      setFormData({
        name: '',
        description: '',
        image_url: '',
        phase: 1,
        order: 0,
      })
      setImagePreview(null)
      setFilePreview(null)
      setFileContentPreview(null)
    }
    setSelectedImage(null)
    setSelectedFile(null)
  }, [scenario])

  const readTextFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file, 'UTF-8')
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!allowedTypes.includes(fileExt)) {
      toast.error('Formato de imagem não suportado. Use JPG, PNG, GIF ou WEBP.')
      return
    }

    setSelectedImage(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const allowedTypes = ['.pdf', '.docx', '.doc', '.txt']
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedTypes.includes(fileExt)) {
        toast.error('Formato de arquivo não suportado. Use PDF, DOCX ou TXT.')
        return
      }
      
      setSelectedFile(file)
      setFilePreview(file.name)
      setIsReadingFile(true)
      
      // Tentar ler o conteúdo se for TXT
      if (fileExt === '.txt') {
        try {
          const content = await readTextFile(file)
          setFileContentPreview(content)
        } catch (error) {
          console.error('Erro ao ler arquivo:', error)
          setFileContentPreview(null)
        }
      } else {
        // Para PDF e DOCX, o conteúdo será extraído no backend
        setFileContentPreview(null)
      }
      
      setIsReadingFile(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Verificar também no localStorage caso o hook ainda não tenha atualizado
      const storedGameId = typeof window !== 'undefined' ? localStorage.getItem('selectedGameId') : null
      const gameId = selectedGameId || (storedGameId ? parseInt(storedGameId) : null)
      
      if (!gameId) {
        toast.error('Jogo não selecionado')
        return
      }
      
      if (scenario) {
        // Para edição, sempre usar FormData
        const formDataToSend = new FormData()
        formDataToSend.append('game_id', gameId.toString())
        formDataToSend.append('name', formData.name)
        formDataToSend.append('description', formData.description || '')
        formDataToSend.append('image_url', formData.image_url || '')
        formDataToSend.append('phase', formData.phase.toString())
        formDataToSend.append('order', formData.order.toString())
        if (selectedImage) {
          formDataToSend.append('image_file', selectedImage)
        }
        if (selectedFile) {
          formDataToSend.append('file', selectedFile)
          toast.loading('Atualizando cenário e processando arquivo...', { id: 'update-scenario' })
        } else {
          toast.loading('Atualizando cenário...', { id: 'update-scenario' })
        }
        
        const response = await api.put(`/api/admin/scenarios/${scenario.id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        toast.success('Cenário atualizado com sucesso!', { id: 'update-scenario' })
        // Atualizar preview com o conteúdo extraído pelo backend
        if (response.data?.file_content) {
          setFileContentPreview(response.data.file_content)
        }
        // Atualizar preview com o conteúdo extraído pelo backend
        if (response.data?.file_content) {
          setFileContentPreview(response.data.file_content)
        }
      } else {
        // Para criação, usar FormData se houver arquivo
        if (selectedFile) {
          const formDataToSend = new FormData()
          formDataToSend.append('game_id', gameId.toString())
          formDataToSend.append('name', formData.name)
          formDataToSend.append('description', formData.description || '')
          formDataToSend.append('image_url', formData.image_url || '')
          formDataToSend.append('phase', formData.phase.toString())
          formDataToSend.append('order', formData.order.toString())
          if (selectedImage) {
            formDataToSend.append('image_file', selectedImage)
          }
          formDataToSend.append('file', selectedFile)
          
          toast.loading('Criando cenário e processando arquivo...', { id: 'create-scenario' })
          const response = await api.post('/api/admin/scenarios', formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
          toast.success('Cenário criado com sucesso!', { id: 'create-scenario' })
          // Atualizar preview com o conteúdo extraído pelo backend
          if (response.data?.file_content) {
            setFileContentPreview(response.data.file_content)
          }
        } else {
          const formDataToSend = new FormData()
          formDataToSend.append('game_id', gameId.toString())
          formDataToSend.append('name', formData.name)
          formDataToSend.append('description', formData.description || '')
          formDataToSend.append('image_url', formData.image_url || '')
          formDataToSend.append('phase', formData.phase.toString())
          formDataToSend.append('order', formData.order.toString())
          await api.post('/api/admin/scenarios', formDataToSend, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          })
          toast.success('Cenário criado')
        }
      }
      onSuccess()
    } catch (error: any) {
      console.error('Erro ao salvar cenário:', error)
      toast.error(error.response?.data?.detail || 'Erro ao salvar cenário', { id: 'create-scenario' })
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          {scenario ? 'Editar Cena' : 'Nova Cena'}
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Imagem da Cena</label>
            <div className="mt-1 flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.gif,.webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {selectedImage?.name || (imagePreview ? 'Imagem selecionada' : 'Clique para selecionar imagem')}
                  </span>
                </div>
              </label>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null)
                    setImagePreview(null)
                    setFormData({ ...formData, image_url: '' })
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Remover imagem"
                >
                  ✕
                </button>
              )}
            </div>
            {imagePreview && (
              <div className="mt-3">
                <img
                  src={
                    imagePreview.startsWith('http') || imagePreview.startsWith('blob:')
                      ? imagePreview
                      : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${imagePreview}`
                  }
                  alt="Prévia da cena"
                  className="w-full h-32 object-cover rounded-md"
                />
              </div>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Formatos aceitos: JPG, PNG, GIF, WEBP
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Arquivo do Cenário (PDF, DOCX ou TXT)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <label className="flex-1 cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Upload className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {filePreview || selectedFile?.name || 'Clique para selecionar arquivo'}
                  </span>
                </div>
              </label>
              {filePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null)
                    setFilePreview(null)
                  }}
                  className="text-red-600 hover:text-red-800"
                  title="Remover arquivo"
                >
                  ✕
                </button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Formatos aceitos: PDF, DOCX, DOC, TXT
            </p>
            {isReadingFile && (
              <p className="mt-1 text-xs text-blue-600">Lendo arquivo...</p>
            )}
            {scenario?.file_url && (
              <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
                <FileText className="h-4 w-4" />
                <a
                  href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${scenario.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                >
                  Ver arquivo atual
                </a>
              </div>
            )}
            {fileContentPreview && (
              <div className="mt-3 border rounded-md p-3 bg-gray-50 max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">Prévia do conteúdo:</p>
                  <button
                    type="button"
                    onClick={() => {
                      onViewContent({ name: scenario?.name || formData.name, file_content: fileContentPreview })
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Ver completo
                  </button>
                </div>
                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans max-h-40 overflow-y-auto">
                  {fileContentPreview.length > 500 
                    ? fileContentPreview.substring(0, 500) + '...' 
                    : fileContentPreview}
                </pre>
              </div>
            )}
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


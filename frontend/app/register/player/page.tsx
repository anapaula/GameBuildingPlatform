'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import api from '@/lib/api'
import toast from 'react-hot-toast'
import { UserPlus } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

// Função auxiliar para formatar erros
const formatError = (error: any): string => {
  if (!error?.response?.data) {
    return 'Erro desconhecido'
  }

  const data = error.response.data
  
  // Se detail é uma string, retorna diretamente
  if (typeof data.detail === 'string') {
    return data.detail
  }
  
  // Se detail é um array (erros de validação do Pydantic)
  if (Array.isArray(data.detail)) {
    return data.detail.map((err: any) => {
      if (typeof err === 'string') return err
      if (err.msg) return `${err.loc?.join('.') || 'campo'}: ${err.msg}`
      return JSON.stringify(err)
    }).join(', ')
  }
  
  // Se detail é um objeto
  if (typeof data.detail === 'object') {
    return JSON.stringify(data.detail)
  }
  
  return 'Erro ao processar requisição'
}

export default function RegisterPlayerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const { setAuth } = useAuthStore()
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [invitationInfo, setInvitationInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!token) {
      toast.error('Token de convite não fornecido')
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      return
    }

    fetchInvitationInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const fetchInvitationInfo = async () => {
    try {
      const res = await api.get(`/api/auth/invitation/${token}`)
      // Garantir que os dados sejam objetos simples
      const data = res.data
      const role = typeof data.role === 'string' ? data.role : String(data.role || '')
      
      console.log('Role recebido do backend:', role) // Debug
      
      // Validar que o convite é realmente para jogador
      if (role !== 'PLAYER' && role !== 'player') {
        console.error('Role inválido para jogador:', role) // Debug
        toast.error('Este link é apenas para registro de jogadores')
        setTimeout(() => {
          router.push('/login')
        }, 2000) // Dar tempo para o usuário ver a mensagem
        return
      }
      
      setInvitationInfo({
        email: typeof data.email === 'string' ? data.email : String(data.email || ''),
        role: role,
        expires_at: data.expires_at
      })
      setLoading(false)
    } catch (error: any) {
      console.error('Erro ao carregar informações do convite:', error)
      const errorMessage = formatError(error)
      toast.error(errorMessage || 'Token de convite inválido')
      // Não redirecionar imediatamente, dar tempo para o usuário ver a mensagem
      setTimeout(() => {
        router.push('/login')
      }, 2000)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setSubmitting(true)
    try {
      toast.loading('Criando conta...', { id: 'register' })
      
      // Registrar o usuário
      await api.post('/api/auth/register-with-invitation', {
        username,
        password,
        token
      })
      
      toast.success('Conta criada com sucesso!', { id: 'register' })
      
      // Fazer login automático
      try {
        toast.loading('Fazendo login...', { id: 'login' })
        const loginRes = await api.post('/api/auth/login', 
          new URLSearchParams({
            username,
            password
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
        
        const { access_token, user } = loginRes.data
        
        // Salvar autenticação
        setAuth(user, access_token)
        
        toast.success('Login realizado com sucesso!', { id: 'login' })
        
        // Aguardar um pouco para garantir que a autenticação foi salva
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Redirecionar para área do jogador usando window.location.href para garantir reload completo
        window.location.href = '/game'
      } catch (loginError: any) {
        console.error('Erro ao fazer login automático:', loginError)
        // Se o login automático falhar, redirecionar para tela de login
        toast.error('Conta criada. Por favor, faça login.', { id: 'login' })
        router.push('/login')
      }
    } catch (error: any) {
      console.error('Erro ao criar conta:', error)
      const errorMessage = formatError(error)
      toast.error(errorMessage || 'Erro ao criar conta', { id: 'register' })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-600">Carregando informações do convite...</p>
        </div>
      </div>
    )
  }

  if (!invitationInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Carregando informações do convite...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <UserPlus className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Criar Conta de Jogador
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Convite para: <span className="font-medium">{String(invitationInfo.email || '')}</span>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Nome de usuário
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Nome de usuário"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="sr-only">
                Confirmar senha
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirmar senha"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {submitting ? 'Criando conta...' : 'Criar Conta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

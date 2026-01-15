'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/api'
import toast from 'react-hot-toast'

interface LoginForm {
  username: string
  password: string
}

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, user, isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  // Verificar se já está autenticado
  useEffect(() => {
    if (!_hasHydrated) return

    const checkExistingAuth = () => {
      let hasAuth = false
      let authUser = null

      if (isAuthenticated && token && user) {
        hasAuth = true
        authUser = user
      } else if (typeof window !== 'undefined') {
        try {
          const authStorage = localStorage.getItem('auth-storage')
          if (authStorage) {
            const parsed = JSON.parse(authStorage)
            const storedUser = parsed?.state?.user
            const storedToken = parsed?.state?.token
            const storedIsAuth = parsed?.state?.isAuthenticated

            if (storedToken && storedUser && storedIsAuth) {
              hasAuth = true
              authUser = storedUser
            }
          }
        } catch (error) {
          console.error('Erro ao verificar auth:', error)
        }
      }

      setCheckingAuth(false)

      if (hasAuth && authUser) {
        if (authUser.role === 'ADMIN') {
          router.replace('/admin')
        } else if (authUser.role === 'FACILITATOR') {
          router.replace('/facilitator')
        } else {
          router.replace('/player')
        }
      }
    }

    const timer = setTimeout(checkExistingAuth, 200)
    return () => clearTimeout(timer)
  }, [_hasHydrated, isAuthenticated, token, user, router])

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const formData = new URLSearchParams()
      formData.append('username', data.username)
      formData.append('password', data.password)

      const response = await api.post('/api/auth/login', formData.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })

      const { access_token } = response.data
      
      const userResponse = await api.get('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      })

      // Salvar no store
      setAuth(userResponse.data, access_token)
      
      // Aguardar para garantir persistência
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verificar se foi salvo
      let saved = false
      for (let i = 0; i < 10; i++) {
        const authStorage = localStorage.getItem('auth-storage')
        if (authStorage) {
          try {
            const parsed = JSON.parse(authStorage)
            if (parsed?.state?.token && parsed?.state?.user && parsed?.state?.isAuthenticated) {
              saved = true
              break
            }
          } catch (e) {
            console.error('Erro:', e)
          }
        }
        if (!saved) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      if (!saved) {
        throw new Error('Erro ao salvar autenticação')
      }

      // Marcar no sessionStorage que acabou de fazer login
      // Isso evita verificação imediata na próxima página
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('just_logged_in', 'true')
        sessionStorage.setItem('login_timestamp', Date.now().toString())
      }

      toast.success('Login realizado com sucesso!')
      
      await new Promise(resolve => setTimeout(resolve, 300))

      // Redirecionar com window.location.href para reload completo
      if (userResponse.data.role === 'ADMIN') {
        window.location.href = '/admin'
      } else if (userResponse.data.role === 'FACILITATOR') {
        window.location.href = '/facilitator'
      } else {
        window.location.href = '/player'
      }
    } catch (error: any) {
      console.error('Erro no login:', error)
      setLoading(false)
      
      // Melhor tratamento de erros de rede
      if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK' || error.message?.includes('Network Error')) {
        toast.error('Erro de conexão. Verifique se o backend está rodando em http://localhost:8000')
      } else if (error.response) {
        // Erro com resposta do servidor
        const message = error.response.data?.detail || error.response.data?.message || 'Erro ao fazer login'
        toast.error(message)
      } else {
        // Outro tipo de erro
        toast.error(error.message || 'Erro ao fazer login. Tente novamente.')
      }
    }
  }

  if (checkingAuth || !_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-700">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Plataforma de Jogo Online
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              {...register('username', { required: 'Username é obrigatório' })}
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite seu username"
            />
            {errors.username && (
              <p className="text-red-500 text-sm mt-1">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha
            </label>
            <input
              {...register('password', { required: 'Senha é obrigatória' })}
              type="password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Digite sua senha"
            />
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Não tem uma conta?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Registre-se
          </a>
        </p>
      </div>
    </div>
  )
}


import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Função helper para obter token do localStorage (formato Zustand)
function getTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  
  try {
    const authStorage = localStorage.getItem('auth-storage')
    if (authStorage) {
      const parsed = JSON.parse(authStorage)
      return parsed.state?.token || null
    }
  } catch (error) {
    console.error('Erro ao ler token do storage:', error)
  }
  return null
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = getTokenFromStorage()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    // Se for FormData, remover Content-Type para deixar o browser definir automaticamente
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type']
    }
    // Log para debug (remover em produção)
    console.log('API Request:', config.method?.toUpperCase(), config.baseURL + config.url)
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log para debug (remover em produção)
    console.error('API Error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      status: error.response?.status,
      url: error.config?.url
    })
    
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

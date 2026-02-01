'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { LogOut, Gamepad2, Settings, BarChart3, Users, BookOpen, Brain, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useSelectedGame } from '@/hooks/useSelectedGame'
import api from '@/lib/api'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, logout, isAuthenticated, token, _hasHydrated } = useAuthStore()
  const { selectedGameId } = useSelectedGame()
  const [selectedGame, setSelectedGame] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  const [configMenuOpen, setConfigMenuOpen] = useState(false)
  const configMenuRef = useRef<HTMLDivElement>(null)
  
  // Carregar informações do jogo selecionado
  useEffect(() => {
    if (selectedGameId) {
      api.get(`/api/admin/games/${selectedGameId}`)
        .then((res: any) => setSelectedGame(res.data))
        .catch(() => setSelectedGame(null))
    } else {
      setSelectedGame(null)
    }
  }, [selectedGameId])
  
  // Listener para evento customizado de mudança de jogo (mesma aba) e storage (outras abas)
  useEffect(() => {
    const handleGameSelected = (e: Event) => {
      const customEvent = e as CustomEvent<number | null>
      if (customEvent.detail) {
        api.get(`/api/admin/games/${customEvent.detail}`)
          .then((res: any) => setSelectedGame(res.data))
          .catch(() => setSelectedGame(null))
      } else {
        setSelectedGame(null)
      }
    }
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedGameId') {
        if (e.newValue) {
          const gameId = parseInt(e.newValue)
          if (!isNaN(gameId)) {
            api.get(`/api/admin/games/${gameId}`)
              .then((res: any) => setSelectedGame(res.data))
              .catch(() => setSelectedGame(null))
          }
        } else {
          setSelectedGame(null)
        }
      }
    }
    
    window.addEventListener('gameSelected', handleGameSelected as EventListener)
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('gameSelected', handleGameSelected as EventListener)
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fechar menu de configuração ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (configMenuRef.current && !configMenuRef.current.contains(event.target as Node)) {
        setConfigMenuOpen(false)
      }
    }

    if (configMenuOpen) {
      // Adicionar um pequeno delay para evitar fechar imediatamente ao abrir
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [configMenuOpen])

  useEffect(() => {
    if (!mounted || !_hasHydrated) return

    // Verificação mais robusta: checar localStorage diretamente se o Zustand ainda não tiver os dados
    let shouldRedirect = false

    if (!isAuthenticated || !token || !user || user.role !== 'ADMIN') {
      // Última verificação: ler diretamente do localStorage
      if (typeof window !== 'undefined') {
        try {
          const authStorage = localStorage.getItem('auth-storage')
          if (authStorage) {
            const parsed = JSON.parse(authStorage)
            const storedUser = parsed?.state?.user
            const storedToken = parsed?.state?.token
            
                    if (!storedToken || !storedUser || storedUser.role !== 'ADMIN') {
              shouldRedirect = true
            }
          } else {
            shouldRedirect = true
          }
        } catch (error) {
          shouldRedirect = true
        }
      } else {
        shouldRedirect = true
      }
    }

    if (shouldRedirect) {
      router.push('/login')
    }
  }, [mounted, _hasHydrated, isAuthenticated, token, user, router])

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  // Mostrar loading até que a hidratação esteja completa e o componente esteja montado
  if (!mounted || !_hasHydrated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Verificação final antes de renderizar
  const finalUser = user || (typeof window !== 'undefined' ? (() => {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        return JSON.parse(authStorage)?.state?.user || null
      }
    } catch {}
    return null
  })() : null)

  const finalToken = token || (typeof window !== 'undefined' ? (() => {
    try {
      const authStorage = localStorage.getItem('auth-storage')
      if (authStorage) {
        return JSON.parse(authStorage)?.state?.token || null
      }
    } catch {}
    return null
  })() : null)

  if (!finalUser || !finalToken || finalUser.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const isPlayFlow = pathname?.startsWith('/admin/games') || pathname?.startsWith('/admin/game')
  if (isPlayFlow) {
    return <>{children}</>
  }

  // Se estiver na página de seleção de jogos, mostrar apenas header simples
  const isGamesPage = pathname === '/admin'
  
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center flex-1 min-w-0">
              <div className="flex-shrink-0 flex items-center">
                <Gamepad2 className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-800 hidden sm:inline">
                  Admin Dashboard
                </span>
              </div>
              {!isGamesPage && (
                <div className="hidden lg:flex lg:ml-6 lg:space-x-2 xl:space-x-3 lg:flex-1 lg:min-w-0">
                  <Link
                    href="/admin"
                    className="inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium text-gray-500 hover:text-blue-600 whitespace-nowrap"
                  >
                    <Settings className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                    Jogos
                  </Link>
                  {selectedGameId && (
                    <>
                      <Link
                        href="/admin/dashboard"
                        className={`inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium whitespace-nowrap ${
                          pathname === '/admin/dashboard' ? 'text-gray-900 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <LayoutDashboard className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                        Dashboard
                      </Link>
                      
                      {/* Menu Configuração com Dropdown */}
                      <div className="relative z-50" ref={configMenuRef}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setConfigMenuOpen(!configMenuOpen)
                          }}
                          className={`inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium whitespace-nowrap ${
                            pathname === '/admin/rules' || pathname === '/admin/scenarios' || pathname === '/admin/llms'
                              ? 'text-gray-900 border-b-2 border-blue-600' 
                              : 'text-gray-500 hover:text-blue-600'
                          }`}
                        >
                          <Settings className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                          Configuração
                          <ChevronDown className={`h-3 w-3 xl:h-4 xl:w-4 ml-1 transition-transform ${configMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {configMenuOpen && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-xl py-1 z-[9999] border border-gray-200">
                              <Link
                                href="/admin/rules"
                                onClick={() => setConfigMenuOpen(false)}
                                className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                  pathname === '/admin/rules'
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                Elementos
                              </Link>
                              <Link
                                href="/admin/scenarios"
                                onClick={() => setConfigMenuOpen(false)}
                                className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                  pathname === '/admin/scenarios'
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                Cenas
                              </Link>
                              <Link
                                href="/admin/llms"
                                onClick={() => setConfigMenuOpen(false)}
                                className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                  pathname === '/admin/llms'
                                    ? 'bg-blue-50 text-blue-700 font-medium' 
                                    : 'text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                <Brain className="h-4 w-4 mr-2" />
                                LLMs
                              </Link>
                          </div>
                        )}
                      </div>

                      <Link
                        href="/admin/sessions"
                        className={`inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium whitespace-nowrap ${
                          pathname === '/admin/sessions' ? 'text-gray-900 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <BarChart3 className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                        Sessões
                      </Link>
                      <Link
                        href="/admin/games"
                        className={`inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium whitespace-nowrap ${
                          pathname?.startsWith('/admin/games') ? 'text-gray-900 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <Gamepad2 className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                        Jogar
                      </Link>
                      <Link
                        href="/admin/facilitators"
                        className={`inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium whitespace-nowrap ${
                          pathname === '/admin/facilitators' ? 'text-gray-900 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <Users className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                        Facilitadores
                      </Link>
                      <Link
                        href="/admin/users"
                        className={`inline-flex items-center px-2 py-1 text-xs xl:text-sm font-medium whitespace-nowrap ${
                          pathname === '/admin/users' ? 'text-gray-900 border-b-2 border-blue-600' : 'text-gray-500 hover:text-blue-600'
                        }`}
                      >
                        <Users className="h-3 w-3 xl:h-4 xl:w-4 mr-1" />
                        Jogadores
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center flex-shrink-0 gap-2 sm:gap-4 ml-4">
              <div className="hidden lg:block h-6 w-px bg-gray-300"></div>
              <span className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap hidden sm:inline">
                {finalUser?.username}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-2 sm:px-4 py-2 border border-transparent text-xs sm:text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-1" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}



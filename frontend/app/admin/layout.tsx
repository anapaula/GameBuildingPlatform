'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import Link from 'next/link'
import { LogOut, Gamepad2, Settings, BarChart3, Users, BookOpen, Brain } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { user, logout, isAuthenticated, token, _hasHydrated } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !_hasHydrated) return

    // Verificação mais robusta: checar localStorage diretamente se o Zustand ainda não tiver os dados
    let shouldRedirect = false

    if (!isAuthenticated || !token || !user || user.role !== 'admin') {
      // Última verificação: ler diretamente do localStorage
      if (typeof window !== 'undefined') {
        try {
          const authStorage = localStorage.getItem('auth-storage')
          if (authStorage) {
            const parsed = JSON.parse(authStorage)
            const storedUser = parsed?.state?.user
            const storedToken = parsed?.state?.token
            
            if (!storedToken || !storedUser || storedUser.role !== 'admin') {
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

  if (!finalUser || !finalToken || finalUser.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Gamepad2 className="h-8 w-8 text-blue-600" />
                <span className="ml-2 text-xl font-bold text-gray-800">
                  Admin Dashboard
                </span>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/admin"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-blue-600 border-b-2 border-blue-600"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Dashboard
                </Link>
                <Link
                  href="/admin/rules"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600"
                >
                  <BookOpen className="h-4 w-4 mr-1" />
                  Regras
                </Link>
                <Link
                  href="/admin/llms"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600"
                >
                  <Brain className="h-4 w-4 mr-1" />
                  LLMs
                </Link>
                <Link
                  href="/admin/sessions"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600"
                >
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Sessões
                </Link>
                <Link
                  href="/admin/users"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-blue-600"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Usuários
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {finalUser?.username}
              </span>
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
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


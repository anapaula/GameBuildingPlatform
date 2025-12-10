'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { User } from '@/types'

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/users')
      setUsers(res.data)
    } catch (error) {
      console.error('Erro ao carregar usuários:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Usuários</h1>
        <p className="mt-2 text-sm text-gray-600">
          Gerencie todos os usuários do sistema
        </p>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {users.length === 0 ? (
            <li className="px-4 py-5 sm:px-6">
              <p className="text-gray-500 text-center">Nenhum usuário encontrado.</p>
            </li>
          ) : (
            users.map((user) => (
              <li key={user.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">{user.username}</p>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                        {!user.is_active && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{user.email}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        Criado em: {new Date(user.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}


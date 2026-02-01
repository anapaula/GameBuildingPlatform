'use client'

import GamesListPage from '@/components/GamesListPage'

export default function AdminGamesPage() {
  return (
    <GamesListPage
      basePath="/admin"
      allowedRoles={['ADMIN']}
      redirectPath="/admin"
      title="Jogos"
      subtitle="Selecione um jogo para criar salas e jogar"
      backLabel="Voltar para Admin"
      backPath="/admin"
    />
  )
}

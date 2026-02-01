'use client'

import RoomsPageContent from '@/components/RoomsPageContent'

export default function AdminRoomsPage() {
  return (
    <RoomsPageContent
      allowedRoles={['ADMIN']}
      gamesBasePath="/admin/games"
      gameBasePath="/admin/game"
      redirectPath="/admin"
      backLabel="Voltar para Admin"
      backPath="/admin"
    />
  )
}

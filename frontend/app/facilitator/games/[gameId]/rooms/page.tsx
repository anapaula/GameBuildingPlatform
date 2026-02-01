'use client'

import RoomsPageContent from '@/components/RoomsPageContent'

export default function FacilitatorRoomsPage() {
  return (
    <RoomsPageContent
      allowedRoles={['FACILITATOR']}
      gamesBasePath="/facilitator/games"
      gameBasePath="/facilitator/game"
      redirectPath="/facilitator"
      backLabel="Voltar para Meus Jogadores"
      backPath="/facilitator"
    />
  )
}

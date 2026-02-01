'use client'

import RoomsPageContent from '@/components/RoomsPageContent'

export default function PlayerRoomsPage() {
  return (
    <RoomsPageContent
      allowedRoles={['PLAYER']}
      gamesBasePath="/player"
      gameBasePath="/game"
      redirectPath="/login"
    />
  )
}

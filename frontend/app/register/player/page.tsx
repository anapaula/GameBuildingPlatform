import { Suspense } from 'react'
import RegisterPlayerClient from './RegisterPlayerClient'

export const dynamic = 'force-dynamic'

export default function RegisterPlayerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterPlayerClient />
    </Suspense>
  )
}
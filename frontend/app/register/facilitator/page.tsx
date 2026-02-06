import { Suspense } from 'react'
import RegisterFacilitatorClient from './RegisterFacilitatorClient'

export const dynamic = 'force-dynamic'

export default function RegisterFacilitatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <RegisterFacilitatorClient />
    </Suspense>
  )
}
import { Suspense } from 'react'
import { RequestsPage } from '@/components/requests-page'

export default function Page() {
  return <Suspense><RequestsPage /></Suspense>
}

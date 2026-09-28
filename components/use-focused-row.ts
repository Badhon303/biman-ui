'use client'
import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export const focusedRowClass = 'bg-blue-50 ring-2 ring-inset ring-blue-400 dark:bg-blue-950/30 dark:ring-blue-600'

export function useFocusedRow(ready: boolean) {
  const focus = useSearchParams().get('focus')
  useEffect(() => {
    if (ready && focus) document.getElementById(`row-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [ready, focus])
  return focus
}

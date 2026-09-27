'use client'

import { Button } from '@/components/ui/button'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title" className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 id="confirm-dialog-title" className="text-lg font-semibold">{title}</h2>
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onCancel} disabled={loading} className="text-2xl leading-none text-slate-400 disabled:opacity-50" aria-label="Close dialog">×</button>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
          <Button type="button" variant={destructive ? 'danger' : 'default'} onClick={onConfirm} disabled={loading}>{loading ? 'Working…' : confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

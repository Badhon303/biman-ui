'use client'

import { useEffect, useState } from 'react'
import { Archive } from 'lucide-react'
import { ShellPage } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiRequest } from '@/lib/api-client'
import { fetchAllPages } from '@/lib/api-data'
import { AppNotification } from '@/lib/types'
import { toast } from 'sonner'

type ApiNotification = AppNotification & { createdAt?: string; timestamp: string }

export function NotificationsPage() {
  const [rows, setRows] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      setRows(await fetchAllPages<ApiNotification>('notifications'))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load notifications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const mark = async (id: string) => {
    try {
      await apiRequest(`notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' })
      setRows((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
      toast.success('Notification marked as read')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to update notification.')
    }
  }

  return <ShellPage>
    <PageHeader eyebrow="Insights / Alerts" title="Notifications" subtitle="Stay ahead of due dates, approvals and equipment readiness signals." />
    <div className="mx-auto max-w-4xl space-y-3">
      {loading ? <Card className="p-10 text-center text-sm text-slate-500">Loading notifications…</Card> : error ? <Card className="p-10 text-center text-sm text-rose-600">{error}</Card> : rows.map((notification) => <Card key={notification.id} className={!notification.read ? 'border-blue-200 dark:border-blue-900/60' : ''}>
        <div className="flex items-start gap-4 p-5">
          <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notification.read ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'}`}><div className="text-xs font-bold">{notification.type.slice(0, 2).toUpperCase()}</div></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{notification.type}</h3>{!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}</div>
            <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
            <div className="mt-2 text-xs text-slate-400">{new Date(notification.timestamp).toLocaleString()} · {notification.type}</div>
          </div>
          {!notification.read && <Button variant="ghost" className="text-xs" onClick={() => void mark(notification.id)}>Mark read</Button>}
        </div>
      </Card>)}
      {!loading && !error && rows.length === 0 && <Card className="p-16 text-center"><Archive className="mx-auto h-10 w-10 text-slate-300" /><div className="mt-4 font-semibold">You’re all caught up</div><div className="mt-1 text-sm text-slate-500">No records match the current view.</div></Card>}
    </div>
  </ShellPage>
}

'use client'

import Link from 'next/link'
import { Archive, ArrowUpRight, CheckCheck, Loader2 } from 'lucide-react'
import { notificationLink } from '@/lib/notification-links'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/components/notifications-context'

export function NotificationsPage() {
  const { items: rows, unread, loading, loadingMore, hasMore, loadMore, markRead, markAllRead } = useNotifications()

  return <>
    <PageHeader eyebrow="Insights / Alerts" title="Notifications" subtitle="Stay ahead of due dates, approvals and equipment readiness signals." action={unread > 0 ? <Button variant="outline" onClick={() => void markAllRead()}><CheckCheck className="h-4 w-4" />Mark all read</Button> : undefined} />
    <div className="mx-auto max-w-4xl space-y-3">
      {loading && !rows.length ? <Card className="p-10 text-center text-sm text-slate-500">Loading notifications…</Card> : rows.map((notification) => { const link = notificationLink(notification); return <Card key={notification.id} className={!notification.read ? 'border-blue-200 dark:border-blue-900/60' : ''}>
        <div className="flex items-start gap-4 p-5">
          <div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notification.read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'}`}><div className="text-xs font-bold">{notification.type.slice(0, 2).toUpperCase()}</div></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{notification.type}</h3>{!notification.read && <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />}</div>
            <p className="mt-1 text-sm text-slate-500">{notification.message}</p>
            <div className="mt-2 text-xs text-slate-400">{new Date(notification.timestamp).toLocaleString()} · {notification.type}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {link && <Link href={link.href} onClick={() => void markRead(notification.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40">{link.label}<ArrowUpRight className="h-3.5 w-3.5" /></Link>}
            {!notification.read && <Button variant="ghost" className="text-xs" onClick={() => void markRead(notification.id)}>Mark read</Button>}
          </div>
        </div>
      </Card>})}
      {!loading && rows.length === 0 && <Card className="p-16 text-center"><Archive className="mx-auto h-10 w-10 text-slate-300" /><div className="mt-4 font-semibold">You’re all caught up</div><div className="mt-1 text-sm text-slate-500">No records match the current view.</div></Card>}
      {hasMore && <div className="flex justify-center pt-2"><Button variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}{loadingMore ? 'Loading…' : 'Load more'}</Button></div>}
    </div>
  </>
}

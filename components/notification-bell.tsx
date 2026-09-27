'use client'
import Link from 'next/link'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Bell, CheckCheck, Inbox, Loader2 } from 'lucide-react'
import { useNotifications } from './notifications-context'

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return days < 7 ? `${days}d ago` : new Date(value).toLocaleDateString()
}

export function NotificationBell() {
  const { items, unread, loading, loadingMore, hasMore, connected, loadMore, markRead, markAllRead } = useNotifications()

  const onScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const el = event.currentTarget
    if (hasMore && !loadingMore && el.scrollHeight - el.scrollTop - el.clientHeight < 80) void loadMore()
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
          className="relative rounded-lg p-2 text-slate-500 outline-none transition hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-blue-500 data-[state=open]:bg-slate-100 data-[state=open]:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white dark:data-[state=open]:bg-slate-800 dark:data-[state=open]:text-white"
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-slate-950">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 flex w-[380px] max-w-[calc(100vw-1.5rem)] origin-[var(--radix-dropdown-menu-content-transform-origin)] flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl shadow-slate-900/10 ring-1 ring-black/[0.02] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
        >
          <div className="flex items-center justify-between border-b px-4 py-3 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                  {unread} new
                </span>
              )}
              <span
                title={connected ? 'Live updates connected' : 'Reconnecting…'}
                className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              />
            </div>
            <button
              type="button"
              disabled={!unread}
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:pointer-events-none disabled:text-slate-400 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          </div>

          <div onScroll={onScroll} className="max-h-[min(440px,60vh)] overflow-y-auto overscroll-contain">
            {loading && !items.length ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </div>
            ) : !items.length ? (
              <div className="px-4 py-12 text-center">
                <Inbox className="mx-auto h-8 w-8 text-slate-300" />
                <div className="mt-3 text-sm font-medium">You’re all caught up</div>
                <div className="mt-1 text-xs text-slate-500">New alerts will appear here instantly.</div>
              </div>
            ) : (
              items.map((notification) => (
                <DropdownMenu.Item
                  key={notification.id}
                  onSelect={(event) => {
                    event.preventDefault()
                    void markRead(notification.id)
                  }}
                  className={`flex cursor-pointer gap-3 border-b px-4 py-3 outline-none last:border-0 data-[highlighted]:bg-slate-50 dark:border-slate-800 dark:data-[highlighted]:bg-slate-800/60 ${notification.read ? '' : 'bg-blue-50/40 dark:bg-blue-950/20'}`}
                >
                  <div
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold ${notification.read ? 'bg-slate-100 text-slate-500 dark:bg-slate-800' : 'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300'}`}
                  >
                    {notification.type.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13px] font-semibold">{notification.type}</span>
                      {!notification.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />}
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                    <div className="mt-1 text-[11px] text-slate-400">{timeAgo(notification.timestamp)}</div>
                  </div>
                </DropdownMenu.Item>
              ))
            )}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading more…
              </div>
            )}
          </div>

          <DropdownMenu.Item asChild>
            <Link
              href="/notifications"
              className="border-t px-4 py-2.5 text-center text-xs font-medium text-slate-600 outline-none hover:bg-slate-50 data-[highlighted]:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:data-[highlighted]:bg-slate-800/60"
            >
              View all notifications
            </Link>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

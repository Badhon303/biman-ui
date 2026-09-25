'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, CircleAlert, Search } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ShellPage } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { TD, TH, TBody, THead, TR, Table } from '@/components/ui/table'
import { apiRequest } from '@/lib/api-client'
import { displayDate, ApiSchedule } from '@/lib/api-data'
import { ScheduleStatus } from '@/lib/types'
import { overdueBy } from '@/lib/utils'

export default function SchedulePage() {
  const [scheduleRows, setScheduleRows] = useState<ApiSchedule[]>([])
  const [status, setStatus] = useState('All')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<ApiSchedule[]>('maintenance-schedules')
      .then(setScheduleRows)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load schedules.'))
      .finally(() => setLoading(false))
  }, [])

  const rows = useMemo(() => scheduleRows.filter((schedule) => {
    const matchesStatus = status === 'All' || schedule.status === status
    const matchesSearch = `${schedule.scheduleNo} ${schedule.equipment.equipmentType.name} ${schedule.equipment.assetNo}`.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesSearch
  }), [scheduleRows, search, status])

  const totalDue = scheduleRows.filter((schedule) => schedule.status === 'Overdue' || schedule.status === 'Due soon').length
  const scheduledCount = scheduleRows.filter((schedule) => schedule.status === 'Scheduled').length

  return (
    <ShellPage>
      <PageHeader eyebrow="Maintenance / Schedule" title="Maintenance schedule" subtitle="Review maintenance schedules and their linked tickets." />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard icon={<CalendarClock className="h-5 w-5" />} label="Total schedules" value={scheduleRows.length} detail="Configured maintenance plans" />
        <SummaryCard icon={<CircleAlert className="h-5 w-5" />} label="Due attention" value={totalDue} detail="Due soon or overdue" tone="amber" />
        <SummaryCard icon={<CalendarClock className="h-5 w-5" />} label="Scheduled" value={scheduledCount} detail="Upcoming maintenance" tone="blue" />
      </div>
      <Card>
        <div className="flex flex-col gap-4 border-b p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search schedule or equipment" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
          <select aria-label="Filter schedule status" value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-300">
            <option value="All">All statuses</option><option value="Scheduled">Scheduled</option><option value="Due soon">Due soon</option><option value="Overdue">Overdue</option>
          </select>
        </div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading schedules…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
          <Table><THead><TR><TH>Schedule</TH><TH>Equipment</TH><TH>Start/last date</TH><TH>Due date</TH><TH>Overdue By</TH><TH>Status</TH><TH>Ticket</TH></TR></THead><TBody>
            {rows.map((schedule) => <TR key={schedule.id} className={schedule.status === 'Due soon' ? 'bg-yellow-50/70 dark:bg-yellow-950/20' : schedule.status === 'Overdue' ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}>
              <TD><div className="font-semibold text-slate-900 dark:text-white">{schedule.scheduleNo}</div></TD>
              <TD><div className="font-medium text-slate-800 dark:text-slate-100">{schedule.equipment.equipmentType.name}</div><div className="text-xs text-slate-400">{schedule.equipment.assetNo}</div></TD>
              <TD>{displayDate(schedule.lastDate)}</TD>
              <TD className={schedule.status === 'Overdue' ? 'font-semibold text-rose-600' : ''}>{displayDate(schedule.dueDate)}</TD>
              <TD>{schedule.status === 'Overdue' ? overdueBy(schedule.dueDate) : '—'}</TD>
              <TD><StatusBadge status={schedule.status as ScheduleStatus} /></TD>
              <TD>{schedule.ticket ? <Link href={`/tickets/${schedule.ticket.id}`} className="text-xs font-semibold text-blue-600">{schedule.ticket.ticketNo}</Link> : <span className="text-xs text-slate-400">No ticket</span>}</TD>
            </TR>)}
          </TBody></Table>
          {rows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No schedules match the selected filters.</div>}
        </>}
      </Card>
    </ShellPage>
  )
}

function SummaryCard({ icon, label, value, detail, tone = 'slate' }: { icon: React.ReactNode; label: string; value: number; detail: string; tone?: 'slate' | 'amber' | 'blue' }) {
  const tones = { slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300', blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300' }
  return <Card className="p-5"><div className="flex items-start justify-between"><div><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div><div className="mt-1 text-xs text-slate-400">{detail}</div></div><div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div></div></Card>
}

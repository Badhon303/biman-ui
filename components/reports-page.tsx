'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, CalendarClock, Check, Download, LineChart, Settings2, Wrench } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Kpi } from '@/components/dashboard/kpi'
import { useRole } from '@/components/role-context'
import { apiRequest } from '@/lib/api-client'
import { ApiEquipment, ApiRequest, ApiSchedule, ApiTicket, fetchAllPages } from '@/lib/api-data'
import { toast } from 'sonner'

type Summary = {
  equipment?: { total: number; available: number; availabilityPercent: number }
  breakdowns?: { closedLastYear: number; downtimeHours: number; mtbfHours: number | null }
  pmCompliance?: { completed: number; onTime: number; late: number; percent: number }
  assignedTickets?: number
}
type ReportData = { summary: Summary | null; equipment: ApiEquipment[]; tickets: ApiTicket[]; requests: ApiRequest[]; schedules: ApiSchedule[] }
type Bucket = { label: string; start: number; end: number }

const DAY = 86_400_000
const PM_TYPES = ['F-Service', 'B-Service', 'C-Service', 'D-Service', 'E-Service', 'V-Service', 'Others']
const periods = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
]
const tooltipStyle = { borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }
const axisTick = { fontSize: 11, fill: '#64748b' }

const time = (value?: string | null) => (value ? new Date(value).getTime() : NaN)
const inRange = (value: string | null | undefined, start: number, end = Date.now()) => {
  const t = time(value)
  return t >= start && t < end
}
const round = (value: number, digits = 1) => Number(value.toFixed(digits))
const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0)
const closedOnTime = (t: ApiTicket) => !!t.closedDate && time(t.closedDate) <= time(t.dueDate)
const shortDate = (value: number) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(value))

function bucketsFor(days: number): Bucket[] {
  const now = new Date()
  if (days > 90) {
    return Array.from({ length: 12 }, (_, i) => {
      const start = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - 10 + i, 1)
      return { label: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(start), start: start.getTime(), end: end.getTime() }
    })
  }
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  const weeks = Math.ceil(days / 7)
  return Array.from({ length: weeks }, (_, i) => {
    const start = today - (weeks - i) * 7 * DAY
    return { label: shortDate(start), start, end: start + 7 * DAY }
  })
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function ReportsPage() {
  const { role } = useRole()
  const [days, setDays] = useState(90)
  const [data, setData] = useState<ReportData>({ summary: null, equipment: [], tickets: [], requests: [], schedules: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isEngineer = role === 'Engineer'
  const canSeeCompliance = role === 'Super Admin' || role === 'Manager'

  const load = useCallback(async () => {
    const results = await Promise.allSettled([
      apiRequest<Summary>('reports/summary'),
      isEngineer ? Promise.resolve([]) : fetchAllPages<ApiEquipment>('equipment'),
      fetchAllPages<ApiTicket>('tickets'),
      isEngineer ? Promise.resolve([]) : fetchAllPages<ApiRequest>('requests'),
      isEngineer ? Promise.resolve([]) : apiRequest<ApiSchedule[]>('maintenance-schedules'),
    ] as const)
    const [summary, equipment, tickets, requests, schedules] = results
    setData({
      summary: summary.status === 'fulfilled' ? summary.value : null,
      equipment: equipment.status === 'fulfilled' ? equipment.value : [],
      tickets: tickets.status === 'fulfilled' ? tickets.value : [],
      requests: requests.status === 'fulfilled' ? requests.value : [],
      schedules: schedules.status === 'fulfilled' ? schedules.value : [],
    })
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    setError(failed ? (failed.reason instanceof Error ? failed.reason.message : 'Some report data could not be loaded.') : '')
    setLoading(false)
  }, [isEngineer])

  useEffect(() => {
    if (!role) return
    void load()
  }, [load, role])

  const report = useMemo(() => {
    const { tickets, equipment, requests, schedules } = data
    const since = Date.now() - days * DAY
    const buckets = bucketsFor(days)
    const closedInPeriod = tickets.filter((t) => t.status === 'Closed' && inRange(t.closedDate, since))
    const breakdowns = closedInPeriod.filter((t) => t.serviceType === 'Breakdown')
    const downtime = breakdowns.reduce((sum, t) => sum + (t.downtimeHours ?? 0), 0)
    const pmClosed = closedInPeriod.filter((t) => PM_TYPES.includes(t.serviceType))
    const decided = requests.filter((r) => r.approvedAt && inRange(r.approvedAt, since))
    const turnaroundDays = (rows: ApiRequest[]) =>
      rows.length ? round(rows.reduce((sum, r) => sum + (time(r.approvedAt) - time(r.createdAt)) / DAY, 0) / rows.length) : 0

    const volume = buckets.map((b) => ({
      name: b.label,
      Created: tickets.filter((t) => inRange(t.createdAt, b.start, b.end)).length,
      Closed: tickets.filter((t) => t.status === 'Closed' && inRange(t.closedDate, b.start, b.end)).length,
    }))
    const downtimeTrend = buckets.map((b) => {
      const rows = breakdowns.filter((t) => inRange(t.closedDate, b.start, b.end))
      return { name: b.label, Breakdowns: rows.length, 'Downtime (h)': round(rows.reduce((s, t) => s + (t.downtimeHours ?? 0), 0)) }
    })
    const downtimeByAsset = Object.values(
      breakdowns.reduce<Record<string, { asset: string; type: string; hours: number; count: number }>>((acc, t) => {
        const key = t.equipment?.assetNo ?? t.equipmentId
        acc[key] ??= { asset: key, type: t.equipment?.equipmentType ?? '—', hours: 0, count: 0 }
        acc[key].hours += t.downtimeHours ?? 0
        acc[key].count += 1
        return acc
      }, {}),
    )
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5)
    const pmByType = PM_TYPES.map((type) => {
      const rows = pmClosed.filter((t) => t.serviceType === type)
      return { name: type, 'On time': rows.filter(closedOnTime).length, Late: rows.filter((t) => !closedOnTime(t)).length }
    }).filter((row) => row['On time'] + row.Late > 0)
    const availabilityByType = Object.values(
      equipment.reduce<Record<string, { type: string; total: number; available: number; maintenance: number }>>((acc, e) => {
        acc[e.equipmentType] ??= { type: e.equipmentType, total: 0, available: 0, maintenance: 0 }
        acc[e.equipmentType].total += 1
        if (e.status === 'Available') acc[e.equipmentType].available += 1
        if (e.status === 'Under Maintenance') acc[e.equipmentType].maintenance += 1
        return acc
      }, {}),
    ).sort((a, b) => b.total - a.total)
    const activeSchedules = schedules.filter((s) => !s.ticket || !/closed/i.test(s.ticket.status))
    const vClosed = pmClosed.filter((t) => t.serviceType === 'V-Service')
    const turnaround = buckets.map((b) => {
      const rows = decided.filter((r) => inRange(r.approvedAt, b.start, b.end))
      return { name: b.label, days: turnaroundDays(rows), count: rows.length }
    })

    return {
      buckets,
      closedInPeriod,
      createdInPeriod: tickets.filter((t) => inRange(t.createdAt, since)).length,
      breakdownCount: breakdowns.length,
      downtime: round(downtime),
      mttr: breakdowns.length ? round(downtime / breakdowns.length) : 0,
      volume,
      downtimeTrend,
      downtimeByAsset,
      pmClosed: pmClosed.length,
      pmOnTime: pmClosed.filter(closedOnTime).length,
      pmByType,
      availabilityByType,
      vOverdue: activeSchedules.filter((s) => s.status === 'Overdue').length,
      vDueSoon: activeSchedules.filter((s) => s.status === 'Due soon').length,
      vScheduled: activeSchedules.filter((s) => s.status === 'Scheduled').length,
      vClosed: vClosed.length,
      vOnTime: vClosed.filter(closedOnTime).length,
      decided: decided.length,
      approved: decided.filter((r) => r.status !== 'Rejected').length,
      pending: requests.filter((r) => r.status === 'Pending').length,
      avgTurnaround: turnaroundDays(decided),
      turnaround: turnaround.filter((row) => row.count > 0),
    }
  }, [data, days])

  const exportCsv = () => {
    const header = ['Ticket', 'Service type', 'Asset', 'Equipment type', 'Status', 'Priority', 'Created', 'Due', 'Closed', 'Downtime (h)', 'Closed on time']
    const since = Date.now() - days * DAY
    const rows = data.tickets
      .filter((t) => inRange(t.createdAt, since) || inRange(t.closedDate, since))
      .map((t) => [
        t.ticketNo,
        t.serviceType,
        t.equipment?.assetNo,
        t.equipment?.equipmentType,
        t.status,
        t.priority,
        t.createdAt?.slice(0, 10),
        t.dueDate?.slice(0, 10),
        t.closedDate?.slice(0, 10),
        t.downtimeHours ?? '',
        t.closedDate ? (closedOnTime(t) ? 'Yes' : 'No') : '',
      ])
    if (!rows.length) return toast.error('No tickets in the selected period to export.')
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `biman-ticket-report-${new Date().toISOString().slice(0, 10)}-${days}d.csv` })
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} tickets`)
  }

  const { summary } = data
  const show = (value: number | string | null | undefined, suffix = '') => (loading ? '…' : value === null || value === undefined ? '—' : `${value}${suffix}`)
  const periodLabel = periods.find((p) => p.days === days)?.label ?? `${days} days`

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Insights / Reports</div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isEngineer ? 'Performance of the work assigned to you.' : 'Operational insights for fleet readiness and maintenance performance.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border bg-white p-1 dark:bg-slate-900">
            {periods.map((p) => (
              <button
                key={p.days}
                type="button"
                onClick={() => setDays(p.days)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${days === p.days ? 'bg-blue-500 text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={exportCsv} disabled={loading}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>
      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isEngineer ? (
          <Kpi label="Tickets assigned to me" value={show(summary?.assignedTickets)} delta="All time" icon="ticket" href="/tickets" />
        ) : (
          <Kpi
            label="Fleet availability"
            value={show(summary?.equipment?.availabilityPercent, '%')}
            delta={summary?.equipment ? `${summary.equipment.available} of ${summary.equipment.total} available now` : undefined}
            icon="box"
            color="emerald"
            href="/equipment"
          />
        )}
        <Kpi label="Breakdown downtime" value={show(summary?.breakdowns?.downtimeHours, 'h')} delta={summary?.breakdowns ? `${summary.breakdowns.closedLastYear} breakdowns · last 12 months` : undefined} icon="timer" color="rose" />
        <Kpi label="MTBF" value={show(summary?.breakdowns?.mtbfHours, 'h')} delta="Mean time between failures · last 12 months" icon="wrench" color="amber" />
        {canSeeCompliance ? (
          <Kpi
            label="PM compliance"
            value={show(summary?.pmCompliance?.percent, '%')}
            delta={summary?.pmCompliance ? `${summary.pmCompliance.onTime} of ${summary.pmCompliance.completed} closed on time · all time` : undefined}
            icon="calendar"
            href="/schedule"
          />
        ) : (
          <Kpi label={`Tickets closed · ${periodLabel}`} value={show(report.closedInPeriod.length)} delta={loading ? undefined : `${report.createdInPeriod} created in the same period`} icon="ticket" color="sky" href="/tickets" />
        )}
      </div>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <ReportCard title="Ticket volume" subtitle={`Created vs closed · ${periodLabel}`} icon={<BarChart3 className="h-5 w-5" />}>
          <ChartArea loading={loading} empty={!report.volume.some((r) => r.Created || r.Closed)} emptyText="No ticket activity in this period.">
            <BarChart data={report.volume} margin={{ left: -20, right: 4, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Created" fill="#2667ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Closed" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartArea>
        </ReportCard>

        <ReportCard title="Breakdowns & downtime" subtitle={`Closed breakdown tickets · ${periodLabel}`} icon={<LineChart className="h-5 w-5" />}>
          <div className="mt-6 grid grid-cols-3 gap-3">
            <Metric label="Breakdowns" value={show(report.breakdownCount)} />
            <Metric label="Downtime" value={show(report.downtime, 'h')} />
            <Metric label="Avg. repair time" value={show(report.mttr, 'h')} />
          </div>
          <ChartArea loading={loading} empty={!report.breakdownCount} emptyText="No breakdowns closed in this period." height={180}>
            <BarChart data={report.downtimeTrend} margin={{ left: -20, right: 4, top: 10, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
              <YAxis axisLine={false} tickLine={false} tick={axisTick} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
              <Bar dataKey="Downtime (h)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartArea>
        </ReportCard>

        {canSeeCompliance && (
          <ReportCard title="PM compliance by service" subtitle={`Scheduled work closed on/before due date · ${periodLabel}`} icon={<Check className="h-5 w-5" />}>
            <div className="mt-6 flex items-center gap-6">
              <Donut value={percent(report.pmOnTime, report.pmClosed)} loading={loading} />
              <div>
                <div className="text-sm font-semibold">
                  {loading ? 'Loading…' : !report.pmClosed ? 'No PM work closed' : percent(report.pmOnTime, report.pmClosed) >= 90 ? 'On track' : percent(report.pmOnTime, report.pmClosed) >= 75 ? 'Needs attention' : 'Off track'}
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {report.pmOnTime} of {report.pmClosed} PM tickets closed within their due date.
                </p>
              </div>
            </div>
            <ChartArea loading={loading} empty={!report.pmByType.length} emptyText="No PM tickets closed in this period." height={170}>
              <BarChart data={report.pmByType} margin={{ left: -20, right: 4, top: 10, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={axisTick} />
                <YAxis axisLine={false} tickLine={false} tick={axisTick} allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={tooltipStyle} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="On time" stackId="pm" fill="#2667ff" />
                <Bar dataKey="Late" stackId="pm" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartArea>
          </ReportCard>
        )}

        {!isEngineer && (
          <ReportCard title="V-Service compliance" subtitle="Six-monthly V-Service schedule health" icon={<CalendarClock className="h-5 w-5" />}>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Metric label="Overdue" value={show(report.vOverdue)} tone="text-rose-600" />
              <Metric label="Due soon" value={show(report.vDueSoon)} tone="text-amber-600" />
              <Metric label="Scheduled" value={show(report.vScheduled)} tone="text-blue-600" />
            </div>
            <div className="mt-6 border-t pt-4">
              <div className="mb-2 flex justify-between text-xs">
                <span className="font-medium">V-Service tickets closed on time · {periodLabel}</span>
                <span className="text-slate-500">
                  {report.vOnTime} / {report.vClosed}
                </span>
              </div>
              <ProgressBar value={percent(report.vOnTime, report.vClosed)} color="bg-violet-500" />
              <p className="mt-3 text-xs text-slate-500">
                {report.vClosed ? `${percent(report.vOnTime, report.vClosed)}% of V-Services were completed by their due date.` : 'No V-Service tickets were closed in this period.'}
              </p>
            </div>
          </ReportCard>
        )}

        {!isEngineer && (
          <ReportCard title="Availability by equipment type" subtitle="Current readiness per equipment type" icon={<Wrench className="h-5 w-5" />}>
            <div className="mt-6 max-h-[260px] space-y-4 overflow-y-auto pr-1">
              {loading ? (
                <EmptyText text="Loading equipment…" />
              ) : !report.availabilityByType.length ? (
                <EmptyText text="No equipment registered." />
              ) : (
                report.availabilityByType.map((row) => (
                  <div key={row.type}>
                    <div className="mb-2 flex justify-between text-xs">
                      <span className="font-medium">{row.type}</span>
                      <span className="text-slate-500">
                        {row.available}/{row.total} available{row.maintenance ? ` · ${row.maintenance} in maintenance` : ''}
                      </span>
                    </div>
                    <ProgressBar value={percent(row.available, row.total)} color={percent(row.available, row.total) >= 80 ? 'bg-emerald-500' : percent(row.available, row.total) >= 50 ? 'bg-amber-400' : 'bg-rose-500'} />
                  </div>
                ))
              )}
            </div>
          </ReportCard>
        )}

        {!isEngineer && (
          <ReportCard title="Request turnaround" subtitle={`Time from request to approval decision · ${periodLabel}`} icon={<Settings2 className="h-5 w-5" />}>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Metric label="Avg. turnaround" value={show(report.avgTurnaround, 'd')} />
              <Metric label="Approval rate" value={show(report.decided ? percent(report.approved, report.decided) : null, '%')} />
              <Metric label="Pending now" value={show(report.pending)} tone={report.pending ? 'text-amber-600' : undefined} />
            </div>
            <div className="mt-6 space-y-4">
              {loading ? null : !report.turnaround.length ? (
                <EmptyText text="No requests were decided in this period." />
              ) : (
                (() => {
                  const max = Math.max(...report.turnaround.map((r) => r.days), 1)
                  return report.turnaround.slice(-6).reverse().map((row) => (
                    <div key={row.name}>
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="font-medium">{row.name}</span>
                        <span className="text-slate-500">
                          {row.days} days avg. · {row.count} request{row.count === 1 ? '' : 's'}
                        </span>
                      </div>
                      <ProgressBar value={(row.days / max) * 100} color="bg-blue-500" />
                    </div>
                  ))
                })()
              )}
            </div>
          </ReportCard>
        )}
      </div>

      {report.downtimeByAsset.length > 0 && (
        <Card className="mt-6">
          <div className="border-b px-5 py-5">
            <h2 className="text-sm font-semibold">Top equipment by downtime</h2>
            <p className="mt-1 text-xs text-slate-500">Closed breakdowns · {periodLabel}</p>
          </div>
          <div className="divide-y">
            {report.downtimeByAsset.map((row) => (
              <div key={row.asset} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="text-sm font-semibold">{row.type}</div>
                  <div className="mt-1 text-xs text-slate-500">{row.asset}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-rose-600">{round(row.hours)}h</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {row.count} breakdown{row.count === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

function ReportCard({ title, subtitle, icon, children }: { title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">{icon}</div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  )
}

function ChartArea({ loading, empty, emptyText, height = 240, children }: { loading: boolean; empty: boolean; emptyText: string; height?: number; children: React.ReactElement }) {
  return (
    <div className="mt-6 w-full" style={{ height }}>
      {loading ? <EmptyText text="Loading…" full /> : empty ? <EmptyText text={emptyText} full /> : <ResponsiveContainer>{children}</ResponsiveContainer>}
    </div>
  )
}

function EmptyText({ text, full = false }: { text: string; full?: boolean }) {
  return <div className={`grid place-items-center text-center text-sm text-slate-500 ${full ? 'h-full' : 'py-6'}`}>{text}</div>
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
      <div className={`text-lg font-semibold ${tone ?? ''}`}>{value}</div>
      <div className="mt-1 text-[11px] text-slate-500">{label}</div>
    </div>
  )
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

function Donut({ value, loading }: { value: number; loading: boolean }) {
  const color = value >= 90 ? '#2667ff' : value >= 75 ? '#f59e0b' : '#f43f5e'
  return (
    <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(${color} 0 ${value}%, #e2e8f0 ${value}% 100%)` }}>
      <div className="grid h-20 w-20 place-items-center rounded-full bg-white text-xl font-semibold dark:bg-slate-900">{loading ? '…' : `${value}%`}</div>
    </div>
  )
}

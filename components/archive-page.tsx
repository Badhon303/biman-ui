'use client'

import { useCallback, useEffect, useState } from 'react'
import { Archive, RotateCcw, Trash2 } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TD, TH, TBody, THead, TR, Table } from '@/components/ui/table'
import { apiRequest } from '@/lib/api-client'
import { ApiEquipment, ApiSchedule, ApiTicket } from '@/lib/api-data'
import { toast } from 'sonner'

type ArchiveTab = 'tickets' | 'equipment' | 'equipment-types' | 'maintenance-schedules'
type ArchiveRow = { id: string; title: string; details: string; deletedAt: string; endpoint: string; deleteDescription?: string }
type ArchivedTicket = ApiTicket & { deletedAt: string }
type ArchivedEquipment = ApiEquipment & { deletedAt: string }
type ArchivedSchedule = ApiSchedule & { deletedAt: string }
type ArchivedEquipmentType = {
  id: string
  name: string
  deletedAt: string
  services: { name: string }[]
  _count: { equipment: number }
}

const tabs: { id: ArchiveTab; label: string; endpoint: string }[] = [
  { id: 'tickets', label: 'Tickets', endpoint: 'tickets' },
  { id: 'equipment', label: 'Equipment', endpoint: 'equipment' },
  { id: 'equipment-types', label: 'Equipment types', endpoint: 'equipment-types' },
  { id: 'maintenance-schedules', label: 'V-Service schedules', endpoint: 'maintenance-schedules' },
]

export function ArchivePage() {
  const { role } = useRole()
  const canManage = role === 'Super Admin' || role === 'Manager'
  const [tab, setTab] = useState<ArchiveTab>('tickets')
  const [rows, setRows] = useState<ArchiveRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ArchiveRow | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      let records: ArchiveRow[]
      if (tab === 'tickets') {
        const tickets = await apiRequest<ArchivedTicket[]>('tickets/archive')
        records = tickets.map((ticket) => ({
          id: ticket.id,
          title: ticket.ticketNo,
          details: `${ticket.serviceType} · ${ticket.status} · ${ticket.equipment.assetNo}`,
          deletedAt: ticket.deletedAt,
          endpoint: 'tickets',
        }))
      } else if (tab === 'equipment') {
        const equipment = await apiRequest<ArchivedEquipment[]>('equipment/archive')
        records = equipment.map((item) => ({
          id: item.id,
          title: item.assetNo,
          details: `${item.equipmentType} · ${item.manufacturer} ${item.model}`,
          deletedAt: item.deletedAt,
          endpoint: 'equipment',
        }))
      } else if (tab === 'equipment-types') {
        const types = await apiRequest<ArchivedEquipmentType[]>('equipment-types/archive')
        records = types.map((item) => ({
          id: item.id,
          title: item.name,
          details: item.services.map((service) => service.name).join(', ') || 'No services',
          deletedAt: item.deletedAt,
          endpoint: 'equipment-types',
        }))
      } else {
        const schedules = await apiRequest<ArchivedSchedule[]>('maintenance-schedules/archive')
        records = schedules.map((schedule) => ({
          id: schedule.id,
          title: schedule.scheduleNo,
          details: `${schedule.equipment.equipmentType.name} · ${schedule.equipment.assetNo} · Due ${schedule.dueDate.slice(0, 10)}`,
          deletedAt: schedule.deletedAt,
          endpoint: 'maintenance-schedules',
          deleteDescription: `Permanently delete ${schedule.scheduleNo}? Any ticket already generated from this schedule will remain active.`,
        }))
      }
      setRows(records)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load archived records.')
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    if (canManage) void load()
  }, [canManage, load])

  const restore = async (row: ArchiveRow) => {
    setBusyId(row.id)
    try {
      await apiRequest(`${row.endpoint}/${encodeURIComponent(row.id)}/restore`, { method: 'POST' })
      toast.success(`${row.title} restored`)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to restore this record.')
    } finally {
      setBusyId(null)
    }
  }

  const permanentlyDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiRequest(`${deleteTarget.endpoint}/${encodeURIComponent(deleteTarget.id)}/permanent`, { method: 'DELETE' })
      toast.success(`${deleteTarget.title} permanently deleted`)
      setDeleteTarget(null)
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to permanently delete this record.')
    } finally {
      setDeleting(false)
    }
  }

  if (!canManage) return <Card className="p-8 text-sm text-slate-500">Archive is available to Managers and Super Admins.</Card>

  return <>
    <PageHeader eyebrow="Admin / Archive" title="Archive" subtitle="Restore archived tickets, equipment, equipment types, and V-Service schedules, or permanently remove records you no longer need." />
    <Card>
      <div className="flex flex-wrap gap-2 border-b p-5">
        {tabs.map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === item.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{item.label}</button>)}
      </div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading archive…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : rows.length ? <Table>
        <THead><TR><TH>Record</TH><TH>Details</TH><TH>Archived on</TH><TH>Actions</TH></TR></THead>
        <TBody>{rows.map((row) => <TR key={row.id}>
          <TD className="font-semibold">{row.title}</TD>
          <TD className="text-sm text-slate-500">{row.details}</TD>
          <TD className="text-sm text-slate-500">{new Date(row.deletedAt).toLocaleDateString()}</TD>
          <TD><div className="flex items-center gap-1">
            <Button type="button" variant="ghost" className="h-9 px-2 text-blue-600" onClick={() => void restore(row)} disabled={busyId === row.id || deleting}><RotateCcw className="h-4 w-4" />Restore</Button>
            <Button type="button" variant="ghost" className="h-9 w-9 p-0 text-rose-600" aria-label={`Permanently delete ${row.title}`} title="Permanently delete" onClick={() => setDeleteTarget(row)} disabled={busyId === row.id || deleting}><Trash2 className="h-4 w-4" /></Button>
          </div></TD>
        </TR>)}</TBody>
      </Table> : <div className="grid place-items-center p-12 text-center text-sm text-slate-500"><Archive className="mb-3 h-8 w-8 text-slate-300" />No archived {tabs.find((item) => item.id === tab)?.label.toLowerCase()}.</div>}
    </Card>
    <ConfirmDialog open={!!deleteTarget} title="Permanently delete record" description={deleteTarget ? deleteTarget.deleteDescription ?? `Permanently delete ${deleteTarget.title}? This cannot be undone and linked pictures/files will also be removed.` : undefined} confirmLabel="Permanently delete" loading={deleting} onConfirm={() => void permanentlyDelete()} onCancel={() => setDeleteTarget(null)} />
  </>
}

'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Pencil, Plus, Search } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { ShellPage } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { TD, TH, TBody, THead, TR, Table } from '@/components/ui/table'
import { ApiEquipment, ApiTicket, fetchAllPages } from '@/lib/api-data'
import { apiRequest } from '@/lib/api-client'
import { isOverdue, overdueBy } from '@/lib/utils'
import { Role } from '@/lib/types'
import { toast } from 'sonner'

const manualTypes = ['Breakdown', 'General', 'Washing'] as const
type EngineerOption = { id: string; name: string }

export function TicketsPage() {
  const { role } = useRole()
  const [rows, setRows] = useState<ApiTicket[]>([])
  const [search, setSearch] = useState('')
  const [serviceType, setServiceType] = useState('All')
  const [createOpen, setCreateOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canCreate = ['Super Admin', 'Manager', 'Biman Admin'].includes(role ?? '')

  const load = async () => {
    setLoading(true)
    try {
      setRows(await fetchAllPages<ApiTicket>('tickets', search ? { search } : {}))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load tickets.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [search])

  const serviceTypes = ['All', ...new Set(rows.map((ticket) => ticket.serviceType))]
  const filteredRows = rows.filter((ticket) => serviceType === 'All' || ticket.serviceType === serviceType)

  return <ShellPage>
    <PageHeader eyebrow="Maintenance / Tickets" title="Tickets" subtitle="One queue for maintenance, breakdown, general and washing work." action={canCreate ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create ticket</Button> : undefined} />
    <Card>
      <div className="flex flex-col gap-3 border-b p-5 lg:flex-row lg:items-center lg:justify-between"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search tickets or equipment" value={search} onChange={(event) => setSearch(event.target.value)} /></div><div className="flex flex-wrap gap-2">{serviceTypes.map((type) => <button key={type} type="button" onClick={() => setServiceType(type)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${serviceType === type ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'}`}>{type}</button>)}</div></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading tickets…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
        <Table><THead><TR><TH>Ticket</TH><TH>Equipment</TH><TH>Service type</TH><TH>Due date</TH><TH>Overdue by</TH><TH>Assigned engineer</TH><TH>Status</TH><TH>Action</TH></TR></THead><TBody>
          {filteredRows.map((ticket) => <TR key={ticket.id} className={ticket.status === 'Closed' || ticket.status === 'Completed' ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : isOverdue(ticket.dueDate) ? 'bg-rose-50/50 dark:bg-rose-950/10' : ''}>
            <TD><Link className="font-semibold text-blue-600" href={`/tickets/${ticket.id}`}>{ticket.ticketNo}</Link><div className="mt-1 text-xs text-slate-400">Raised {ticket.createdDate.slice(0, 10)}</div></TD>
            <TD><div className="font-medium">{ticket.equipment.assetNo}</div><div className="text-xs text-slate-400">{ticket.equipment.equipmentType}</div></TD>
            <TD><span className="text-xs">{ticket.serviceType}</span></TD><TD><div className="font-medium">{ticket.dueDate.slice(0, 10)}</div><div className="text-xs text-slate-400">{ticket.priority} priority</div></TD>
            <TD className={isOverdue(ticket.dueDate, ticket.closedDate ?? undefined) ? 'font-medium text-rose-600' : ''}>{overdueBy(ticket.dueDate, ticket.closedDate ?? undefined)}</TD><TD>{ticket.assignedEngineer?.name ?? 'Unassigned'}</TD><TD><StatusBadge status={ticket.status} /></TD>
            <TD><Link href={`/tickets/${ticket.id}`} className="rounded-md p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40" aria-label={`Edit ${ticket.ticketNo}`} title="View ticket"><Pencil className="h-4 w-4" /></Link></TD>
          </TR>)}
        </TBody></Table>
        {filteredRows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No tickets match the selected filters.</div>}
      </>}
    </Card>
    {createOpen && <TicketModal role={role} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); void load() }} />}
  </ShellPage>
}

function TicketModal({ role, onClose, onCreated }: { role: Role | null; onClose: () => void; onCreated: () => void }) {
  const [equipment, setEquipment] = useState<ApiEquipment[]>([])
  const [engineers, setEngineers] = useState<EngineerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [serviceType, setServiceType] = useState<(typeof manualTypes)[number]>('Breakdown')
  const canListEngineers = role === 'Super Admin' || role === 'Manager'

  useEffect(() => {
    let active = true
    Promise.all([
      fetchAllPages<ApiEquipment>('equipment'),
      canListEngineers ? fetchAllPages<EngineerOption>('users/engineers') : Promise.resolve([]),
    ]).then(([equipmentItems, engineerItems]) => {
      if (!active) return
      setEquipment(equipmentItems)
      setEngineers(engineerItems)
    }).catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to load ticket options.')).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [canListEngineers])

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const assignedEngineerId = String(form.get('assignedEngineerId') ?? '')
    const body = {
      equipmentId: String(form.get('equipmentId')),
      serviceType,
      faultDescription: String(form.get('faultDescription')).trim(),
      priority: String(form.get('priority')),
      dueDate: String(form.get('dueDate')),
      requestingParty: String(form.get('requestingParty')).trim() || undefined,
    }
    setSaving(true)
    try {
      const ticket = await apiRequest<ApiTicket>('tickets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      if (assignedEngineerId) {
        try {
          await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/assign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assignedEngineerId }) })
        } catch (cause) {
          onCreated()
          toast.error(`Ticket created, but assignment failed: ${cause instanceof Error ? cause.message : 'Unable to assign engineer.'}`)
          return
        }
      }
      onCreated()
      toast.success('Ticket created')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create ticket.')
    } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Create ticket</h2><p className="mt-1 text-sm text-slate-500">Enter the basic details for a new ticket.</p></div><button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div>
    <form className="space-y-4" onSubmit={create}><div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Equipment<Select className="mt-2 w-full" name="equipmentId" defaultValue="" required disabled={loading}><option value="" disabled>{loading ? 'Loading equipment…' : 'Select equipment'}</option>{equipment.map((item) => <option key={item.id} value={item.id}>{item.assetNo} · {item.equipmentType}</option>)}</Select></label>
      <label className="text-xs font-semibold">Service type<Select className="mt-2 w-full" value={serviceType} onChange={(event) => setServiceType(event.target.value as (typeof manualTypes)[number])}>{manualTypes.map((type) => <option key={type}>{type}</option>)}</Select></label>
      <label className="text-xs font-semibold">Priority<Select className="mt-2 w-full" name="priority" defaultValue="Medium">{['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}</Select></label>
      <label className="text-xs font-semibold">Due date<Input className="mt-2" name="dueDate" type="date" required /></label>
      <label className="text-xs font-semibold">Requesting party (optional)<Input className="mt-2" name="requestingParty" /></label>
      {canListEngineers && <label className="text-xs font-semibold">Assign engineer (optional)<Select className="mt-2 w-full" name="assignedEngineerId" defaultValue=""><option value="">Unassigned</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</Select></label>}
    </div><label className="block text-xs font-semibold">Problem description<textarea className="mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950" name="faultDescription" minLength={2} placeholder="Describe the issue or planned work" required /></label>
    <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading || saving || !equipment.length}><Plus className="h-4 w-4" />{saving ? 'Creating…' : 'Create ticket'}</Button></div></form>
  </div></div>
}

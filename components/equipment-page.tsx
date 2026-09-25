'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { ShellPage } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { TD, TH, TBody, THead, TR, Table } from '@/components/ui/table'
import { apiRequest } from '@/lib/api-client'
import { ApiEquipment, fetchAllPages } from '@/lib/api-data'
import { EquipmentType } from '@/lib/types'
import { toast } from 'sonner'

const statuses = ['Available', 'Under Maintenance', 'Out of Service', 'Inactive'] as const
const meterRoles = ['Engineer', 'Manager', 'Super Admin']
type EquipmentCreated = { id: string; assetNo: string }

export function EquipmentPage() {
  const { role } = useRole()
  const canManage = role === 'Super Admin' || role === 'Manager'
  const canUpdateMeter = meterRoles.includes(role ?? '')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('All')
  const [rows, setRows] = useState<ApiEquipment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [meterEquipment, setMeterEquipment] = useState<ApiEquipment | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const result = await fetchAllPages<ApiEquipment>('equipment', { ...(status !== 'All' ? { status } : {}), ...(search ? { search } : {}) })
      setRows(result)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load equipment.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, search ? 250 : 0)
    return () => window.clearTimeout(timer)
  }, [search, status])

  const deleteEquipment = async (item: ApiEquipment) => {
    if (!window.confirm(`Delete ${item.assetNo}?`)) return
    try {
      await apiRequest(`equipment/${encodeURIComponent(item.id)}`, { method: 'DELETE' })
      await load()
      toast.success('Equipment deleted')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete equipment.')
    }
  }

  const updateMeter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!meterEquipment) return
    const form = new FormData(event.currentTarget)
    const value = Number(form.get('value'))
    if (!Number.isFinite(value) || value < 0) { toast.error('Enter a valid hour meter value'); return }
    try {
      await apiRequest(`equipment/${encodeURIComponent(meterEquipment.id)}/hour-meter`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value }) })
      setMeterEquipment(null)
      await load()
      toast.success(`Hour meter updated for ${meterEquipment.assetNo}`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to update hour meter.')
    }
  }

  return <ShellPage>
    <PageHeader eyebrow="Assets / Fleet registry" title="Equipment List" subtitle="Your operational fleet, with a digital logbook attached to every asset." action={canManage ? <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" />Add equipment</Button> : undefined} />
    <Card>
      <div className="flex flex-col gap-3 border-b p-5 sm:flex-row"><div className="relative max-w-md flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><Input className="pl-9" placeholder="Search asset, manufacturer or location" value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select value={status} onChange={(event) => setStatus(event.target.value)}><option value="All">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</Select></div>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading equipment…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
        <Table><THead><TR><TH>Asset no.</TH><TH>Equipment Type</TH><TH>Manufacturer / model</TH><TH>Hour meter</TH><TH>Biman serial no.</TH><TH>TLD serial no.</TH><TH>Location</TH><TH>Status</TH><TH>Actions</TH></TR></THead><TBody>
          {rows.map((item) => <TR key={item.id}>
            <TD><Link href={`/equipment/${item.id}`} className="font-semibold text-blue-600">{item.assetNo}</Link></TD><TD><Link href={`/equipment/${item.id}`} className="font-medium hover:text-blue-600">{item.equipmentType}</Link></TD><TD>{item.manufacturer}<div className="text-xs text-slate-400">{item.model}</div></TD>
            <TD><div className="flex items-center gap-2 whitespace-nowrap"><span className="font-medium">{item.hourMeter} hours</span>{canUpdateMeter && <button type="button" className="rounded-md p-1 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40" aria-label={`Update hour meter for ${item.assetNo}`} title="Update hour meter" onClick={() => setMeterEquipment(item)}><Plus className="h-4 w-4" /></button>}</div></TD>
            <TD className="font-mono text-xs">{item.bimanSerialNo ?? '—'}</TD><TD className="font-mono text-xs">{item.tldSerialNo ?? '—'}</TD><TD>{item.location}</TD><TD><StatusBadge status={item.status as typeof statuses[number]} /></TD>
            <TD><div className="flex items-center gap-1"><Link href={`/equipment/${item.id}`} className="rounded-md p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40" aria-label={`Edit ${item.assetNo}`} title="Edit equipment"><Pencil className="h-4 w-4" /></Link>{canManage && <button type="button" className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40" aria-label={`Delete ${item.assetNo}`} title="Delete equipment" onClick={() => void deleteEquipment(item)}><Trash2 className="h-4 w-4" /></button>}</div></TD>
          </TR>)}
        </TBody></Table>
        {rows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No equipment matches the selected filters.</div>}
      </>}
    </Card>
    {addOpen && <EquipmentModal onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); void load() }} />}
    {meterEquipment && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Add current hour meter</h2><p className="mt-1 text-sm text-slate-500">Update the current reading for {meterEquipment.assetNo}.</p></div><button type="button" onClick={() => setMeterEquipment(null)} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div><form className="space-y-4" onSubmit={updateMeter}><label className="text-xs font-semibold">Current hour meter<Input className="mt-2" name="value" type="number" min={meterEquipment.hourMeter} step="any" defaultValue={meterEquipment.hourMeter} required /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setMeterEquipment(null)}>Cancel</Button><Button type="submit">Update</Button></div></form></div></div>}
  </ShellPage>
}

function EquipmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [types, setTypes] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => { apiRequest<EquipmentType[]>('equipment-types').then(setTypes).catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to load equipment types.')).finally(() => setLoading(false)) }, [])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = {
      equipmentTypeId: String(form.get('equipmentTypeId')),
      manufacturer: String(form.get('manufacturer')).trim(),
      model: String(form.get('model')).trim(),
      location: String(form.get('location')).trim(),
      engineModel: String(form.get('engineModel')).trim() || undefined,
      engineSerialNo: String(form.get('engineSerialNo')).trim() || undefined,
      bimanSerialNo: String(form.get('bimanSerialNo')).trim() || undefined,
      tldSerialNo: String(form.get('tldSerialNo')).trim() || undefined,
      ...(String(form.get('hourMeter')).trim() ? { hourMeter: Number(form.get('hourMeter')) } : {}),
    }
    setSaving(true)
    try {
      await apiRequest<EquipmentCreated>('equipment', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      onCreated()
      toast.success('Equipment added')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create equipment.')
    } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Add equipment</h2><p className="mt-1 text-sm text-slate-500">Enter the basic details for a new fleet asset.</p></div><button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div>
    <form className="space-y-4" onSubmit={submit}><div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">Equipment type<Select className="mt-2 w-full" name="equipmentTypeId" required disabled={loading}><option value="">{loading ? 'Loading types…' : 'Select equipment type'}</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</Select></label>
      <label className="text-xs font-semibold">Manufacturer<Input className="mt-2" name="manufacturer" placeholder="Manufacturer name" required /></label><label className="text-xs font-semibold">Model<Input className="mt-2" name="model" placeholder="Model number" required /></label><label className="text-xs font-semibold">Location<Input className="mt-2" name="location" defaultValue="Not assigned" required /></label>
      <label className="text-xs font-semibold">Engine model<Input className="mt-2" name="engineModel" /></label><label className="text-xs font-semibold">Engine S/L<Input className="mt-2" name="engineSerialNo" /></label><label className="text-xs font-semibold">Biman serial no.<Input className="mt-2" name="bimanSerialNo" /></label><label className="text-xs font-semibold">TLD serial no.<Input className="mt-2" name="tldSerialNo" /></label><label className="text-xs font-semibold">Hour meter<Input className="mt-2" name="hourMeter" type="number" min="0" step="any" /></label>
    </div><div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving || loading || !types.length}><Plus className="h-4 w-4" />{saving ? 'Adding…' : 'Add equipment'}</Button></div></form>
  </div></div>
}

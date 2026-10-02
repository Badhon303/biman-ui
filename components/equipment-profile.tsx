'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Calendar, FileText, Pencil, Plus, Printer, Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { HourMeterHistory, HourMeterHistoryModal } from '@/components/hour-meter-history'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ApiEquipment, ApiTicket, fetchAllPages } from '@/lib/api-data'
import { apiRequest, bffFileUrl } from '@/lib/api-client'
import { EquipmentType, HourMeterReading, Specification } from '@/lib/types'
import { toast } from 'sonner'

const tabs = ['Overview', 'Specifications', 'Documents', 'Logbook'] as const
type EquipmentTab = typeof tabs[number]
type EquipmentDraft = ApiEquipment

type UploadedFile = { id: string; url: string; thumbnailUrl?: string }

export default function EquipmentProfile() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { role } = useRole()
  const canManage = role === 'Super Admin' || role === 'Manager'
  const [equipment, setEquipment] = useState<ApiEquipment | null>(null)
  const [draft, setDraft] = useState<EquipmentDraft | null>(null)
  const [types, setTypes] = useState<EquipmentType[]>([])
  const [tickets, setTickets] = useState<ApiTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [hourMeter, setHourMeter] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [tab, setTab] = useState<EquipmentTab>('Overview')
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [photoDeleteTarget, setPhotoDeleteTarget] = useState<{ id: string; label: string } | null>(null)
  const [deletingPhoto, setDeletingPhoto] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      const item = await apiRequest<ApiEquipment>(`equipment/${encodeURIComponent(id)}`)
      setEquipment(item)
      setDraft(item)
      setHourMeter(String(item.hourMeter))
      setError('')
      const matchingTickets = await fetchAllPages<ApiTicket>('tickets', { search: item.assetNo })
      setTickets(matchingTickets.filter((ticket) => ticket.equipmentId === item.id))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load equipment.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [id])
  useEffect(() => { if (canManage) void apiRequest<EquipmentType[]>('equipment-types').then(setTypes).catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to load equipment types.')) }, [canManage])

  const startEditing = () => {
    if (!equipment) return
    setDraft({ ...equipment, specifications: equipment.specifications.map((item) => ({ ...item })) })
    setHourMeter(String(equipment.hourMeter))
    setEditing(true)
  }

  const save = async () => {
    if (!equipment || !draft) return
    const meterValue = Number(hourMeter)
    if (!Number.isFinite(meterValue) || meterValue < 0) { toast.error('Enter a valid hour meter value'); return }
    const body = {
      equipmentTypeId: draft.equipmentTypeId,
      manufacturer: draft.manufacturer,
      model: draft.model,
      location: draft.location,
      engineModel: draft.engineModel ?? '',
      engineSerialNo: draft.engineSerialNo ?? '',
      bimanSerialNo: draft.bimanSerialNo ?? '',
      tldSerialNo: draft.tldSerialNo ?? '',
      status: draft.status,
      actualGtDate: draft.actualGTDate || null,
      lastVServiceDate: draft.lastVServiceDate || null,
      shipDate: draft.shipDate || null,
      shippingStatus: draft.shippingStatus ?? '',
      emissionRating: draft.emissionRating ?? '',
      specifications: draft.specifications.map(({ label, value }) => ({ label, value })),
    }
    setSaving(true)
    try {
      await apiRequest(`equipment/${encodeURIComponent(equipment.id)}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      const meterResult = meterValue !== equipment.hourMeter
        ? await apiRequest<{ serviceTicketsCreated: number }>(`equipment/${encodeURIComponent(equipment.id)}/hour-meter`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value: meterValue }) })
        : null
      await load()
      setEditing(false)
      const ticketMessage = meterResult?.serviceTicketsCreated
        ? ` ${meterResult.serviceTicketsCreated} service ticket${meterResult.serviceTicketsCreated === 1 ? '' : 's'} created.`
        : ''
      toast.success(`Equipment updated.${ticketMessage}`)
    } catch (cause) {
      await load()
      toast.error(cause instanceof Error ? cause.message : 'Unable to update equipment.')
    } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!equipment) return
    setDeleting(true)
    try {
      await apiRequest(`equipment/${encodeURIComponent(equipment.id)}`, { method: 'DELETE' })
      toast.success('Equipment deleted')
      router.push('/equipment')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete equipment.')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const uploadPhoto = async (slot: 'PRIMARY' | 'FRONT' | 'SIDE', file: File) => {
    if (!equipment) return
    setUploadingSlot(slot)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('purpose', 'EQUIPMENT_PHOTO')
      form.append('ownerId', equipment.id)
      const uploaded = await apiRequest<UploadedFile>('files/images', { method: 'POST', body: form })
      await apiRequest(`files/${encodeURIComponent(uploaded.id)}/attach`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ equipmentId: equipment.id, slot }) })
      await load()
      toast.success('Equipment photo uploaded')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to upload photo.')
    } finally { setUploadingSlot(null) }
  }

  const removePhoto = async () => {
    if (!photoDeleteTarget) return
    setDeletingPhoto(true)
    try {
      await apiRequest(`files/${encodeURIComponent(photoDeleteTarget.id)}`, { method: 'DELETE' })
      const removeTarget = (current: ApiEquipment | null) => current ? { ...current, photos: current.photos.filter((photo) => photo.id !== photoDeleteTarget.id) } : current
      setEquipment(removeTarget)
      setDraft(removeTarget)
      setPhotoDeleteTarget(null)
      toast.success('Equipment picture removed')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to remove equipment picture.')
    } finally {
      setDeletingPhoto(false)
    }
  }

  const updateDraft = (patch: Partial<EquipmentDraft>) => setDraft((current) => current ? { ...current, ...patch } : current)
  const updateSpec = (index: number, patch: Partial<Specification>) => updateDraft({ specifications: draft?.specifications.map((item, i) => i === index ? { ...item, ...patch } : item) ?? [] })
  const addSpec = () => updateDraft({ specifications: [...(draft?.specifications ?? []), { label: '', value: '' }] })
  const removeSpec = (index: number) => updateDraft({ specifications: draft?.specifications.filter((_, i) => i !== index) ?? [] })

  if (loading) return <><Card className="p-10 text-center text-sm text-slate-500">Loading equipment…</Card></>
  if (error || !equipment || !draft) return <><Card className="p-10 text-center text-sm text-rose-600">{error || 'Equipment not found.'}</Card></>

  const history = [...(equipment.hourMeterReadings ?? [])].reverse() as HourMeterReading[]

  return <>
    <div className="mb-6 flex items-center justify-between"><Link href="/equipment" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />Equipment List</Link><div className="flex gap-2">{canManage && !editing && <><Button variant="outline" onClick={startEditing}><Pencil className="h-4 w-4" />Edit</Button><Button variant="outline" onClick={() => setConfirmDelete(true)}><Trash2 className="h-4 w-4" />Delete</Button></>}{editing && <><Button variant="outline" onClick={() => { setDraft(equipment); setEditing(false) }}><X className="h-4 w-4" />Cancel</Button><Button onClick={() => void save()} disabled={saving}><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save changes'}</Button></>}<Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print</Button></div></div>
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">{editing ? <div className="grid flex-1 gap-3 sm:grid-cols-3"><label className="text-xs font-semibold">Type<Select className="mt-2 w-full" value={draft.equipmentTypeId} onChange={(event) => updateDraft({ equipmentTypeId: event.target.value })}>{types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</Select></label><label className="text-xs font-semibold">Manufacturer<Input className="mt-2" value={draft.manufacturer} onChange={(event) => updateDraft({ manufacturer: event.target.value })} /></label><label className="text-xs font-semibold">Model<Input className="mt-2" value={draft.model} onChange={(event) => updateDraft({ model: event.target.value })} /></label><label className="text-xs font-semibold sm:col-span-2">Location<Input className="mt-2" value={draft.location} onChange={(event) => updateDraft({ location: event.target.value })} /></label><label className="text-xs font-semibold">Status<Select className="mt-2 w-full" value={draft.status} onChange={(event) => updateDraft({ status: event.target.value })}>{['Available', 'Under Maintenance', 'Out of Service', 'Inactive'].map((item) => <option key={item}>{item}</option>)}</Select></label></div> : <div><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Digital logbook / {equipment.assetNo}</div><h1 className="text-3xl font-semibold tracking-tight">{equipment.equipmentType}</h1><p className="mt-2 text-sm text-slate-500">{equipment.manufacturer} {equipment.model} · {equipment.location}</p></div>}{!editing && <StatusBadge status={equipment.status} />}</div>
    <div className="grid items-start gap-6 lg:grid-cols-[.7fr_1.3fr]"><Card className="self-start p-6"><UploadPhoto label="Primary image" photo={equipment.photos.find((photo) => photo.slot === 'PRIMARY')} className="h-56 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" canManage={canManage} editing={editing} uploading={uploadingSlot === 'PRIMARY'} deleting={deletingPhoto} onSelect={(file) => void uploadPhoto('PRIMARY', file)} onDelete={(id, label) => setPhotoDeleteTarget({ id, label })} /><div className="mt-5 grid grid-cols-2 gap-3"><UploadPhoto label="Front view" photo={equipment.photos.find((photo) => photo.slot === 'FRONT')} canManage={canManage} editing={editing} uploading={uploadingSlot === 'FRONT'} deleting={deletingPhoto} onSelect={(file) => void uploadPhoto('FRONT', file)} onDelete={(id, label) => setPhotoDeleteTarget({ id, label })} /><UploadPhoto label="Side view" photo={equipment.photos.find((photo) => photo.slot === 'SIDE')} canManage={canManage} editing={editing} uploading={uploadingSlot === 'SIDE'} deleting={deletingPhoto} onSelect={(file) => void uploadPhoto('SIDE', file)} onDelete={(id, label) => setPhotoDeleteTarget({ id, label })} /></div><div className="mt-5"><HourMeterHistory history={history} currentValue={equipment.hourMeter} onView={() => setHistoryOpen(true)} /></div></Card>
      <Card><div className="flex gap-1 overflow-x-auto border-b px-4 pt-3">{tabs.map((item) => <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>{item}</button>)}</div><div className="p-6">
        {tab === 'Overview' && (editing ? <div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Biman serial number<Input className="mt-2" value={draft.bimanSerialNo ?? ''} onChange={(event) => updateDraft({ bimanSerialNo: event.target.value })} /></label><label className="text-xs font-semibold">TLD serial number<Input className="mt-2" value={draft.tldSerialNo ?? ''} onChange={(event) => updateDraft({ tldSerialNo: event.target.value })} /></label><label className="text-xs font-semibold">Engine model<Input className="mt-2" value={draft.engineModel ?? ''} onChange={(event) => updateDraft({ engineModel: event.target.value })} /></label><label className="text-xs font-semibold">Engine S/L<Input className="mt-2" value={draft.engineSerialNo ?? ''} onChange={(event) => updateDraft({ engineSerialNo: event.target.value })} /></label><label className="text-xs font-semibold">Hour meter<Input className="mt-2" type="number" min="0" step="any" value={hourMeter} onChange={(event) => setHourMeter(event.target.value)} /></label><label className="text-xs font-semibold">Actual GT date<Input className="mt-2" type="date" value={draft.actualGTDate?.slice(0, 10) ?? ''} onChange={(event) => updateDraft({ actualGTDate: event.target.value || null })} /></label><label className="text-xs font-semibold">V-Service Start date<Input className="mt-2" type="date" value={draft.lastVServiceDate?.slice(0, 10) ?? ''} onChange={(event) => updateDraft({ lastVServiceDate: event.target.value || null })} /></label><label className="text-xs font-semibold">Ship date<Input className="mt-2" type="date" value={draft.shipDate?.slice(0, 10) ?? ''} onChange={(event) => updateDraft({ shipDate: event.target.value || null })} /></label><label className="text-xs font-semibold">Shipping status<Input className="mt-2" value={draft.shippingStatus ?? ''} onChange={(event) => updateDraft({ shippingStatus: event.target.value })} /></label><label className="text-xs font-semibold">Emission rating<Input className="mt-2" value={draft.emissionRating ?? ''} onChange={(event) => updateDraft({ emissionRating: event.target.value })} /></label></div> : <div className="grid gap-6 sm:grid-cols-2"><Info label="V-Service start date" value={equipment.lastVServiceDate?.slice(0, 10) ?? 'Not set'} /><Info label="V-Service start date" value={equipment.lastVServiceDate?.slice(0, 10) ?? 'Not set'} /><Info label="Asset no." value={equipment.assetNo} /><Info label="Equipment type" value={equipment.equipmentType} /><Info label="Manufacturer" value={equipment.manufacturer} /><Info label="Model" value={equipment.model} /><Info label="Location" value={equipment.location} /><Info label="Biman serial number" value={equipment.bimanSerialNo ?? 'Not recorded'} /><Info label="TLD serial number" value={equipment.tldSerialNo ?? 'Not recorded'} /><Info label="Engine model" value={equipment.engineModel ?? 'Not recorded'} /><Info label="Engine S/L" value={equipment.engineSerialNo ?? 'Not recorded'} /><Info label="Status" value={equipment.status} /><Info label="Actual GT date" value={equipment.actualGTDate?.slice(0, 10) ?? 'Not recorded'} /><Info label="Ship date" value={equipment.shipDate?.slice(0, 10) ?? 'Not recorded'} /><Info label="Shipping status" value={equipment.shippingStatus ?? 'Not recorded'} /><Info label="Emission rating" value={equipment.emissionRating ?? 'Not recorded'} /></div>)}
        {tab === 'Specifications' && <Specifications specifications={draft.specifications} canManage={canManage} editing={editing} onAdd={addSpec} onUpdate={updateSpec} onRemove={removeSpec} />}
        {tab === 'Documents' && <Documents documents={equipment.documents} canManage={canManage} editing={editing} equipmentId={equipment.id} onChanged={() => void load()} />}
        {tab === 'Logbook' && <Logbook tickets={tickets} />}
      </div></Card>
    </div>
    {historyOpen && <HourMeterHistoryModal assetNo={equipment.assetNo} history={history} currentValue={equipment.hourMeter} onClose={() => setHistoryOpen(false)} />}
    <ConfirmDialog
      open={!!photoDeleteTarget}
      title="Remove equipment picture"
      description={photoDeleteTarget ? `Remove the ${photoDeleteTarget.label.toLowerCase()} from this equipment?` : undefined}
      confirmLabel="Remove picture"
      loading={deletingPhoto}
      onConfirm={() => void removePhoto()}
      onCancel={() => setPhotoDeleteTarget(null)}
    />
    <ConfirmDialog
      open={confirmDelete}
      title="Delete equipment"
      description={`Delete ${equipment.assetNo}? This action cannot be undone.`}
      confirmLabel="Delete"
      loading={deleting}
      onConfirm={() => void remove()}
      onCancel={() => setConfirmDelete(false)}
    />
  </>
}

function UploadPhoto({ label, photo, className = 'h-24 rounded-xl', canManage, editing, uploading, deleting, onSelect, onDelete }: { label: string; photo?: ApiEquipment['photos'][number]; className?: string; canManage: boolean; editing: boolean; uploading: boolean; deleting: boolean; onSelect: (file: File) => void; onDelete: (id: string, label: string) => void }) {
  return <div className={`group relative grid place-items-center overflow-hidden border border-dashed bg-slate-50 text-slate-400 transition dark:bg-slate-950 ${canManage ? 'hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/30' : ''} ${className}`}>
    {photo && <img src={bffFileUrl(photo.thumbnailUrl) ?? bffFileUrl(photo.url)} alt={label} className="absolute inset-0 h-full w-full object-cover" />}
    {canManage && <label className="absolute inset-0 z-10 grid cursor-pointer place-items-center">
      <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={uploading || deleting} onChange={(event) => { const file = event.target.files?.[0]; if (file) onSelect(file); event.target.value = '' }} />
      {!photo && <span className="text-center"><span className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-current text-lg leading-none">{uploading ? '…' : '+'}</span><span className="mt-2 block text-[10px] font-medium">{label}</span></span>}
      {photo && <span className="absolute bottom-2 rounded-md bg-slate-950/60 px-2 py-1 text-[10px] text-white">{uploading ? 'Uploading…' : 'Change photo'}</span>}
    </label>}
    {!photo && !canManage && <span className="text-center"><span className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-current text-lg leading-none">+</span><span className="mt-2 block text-[10px] font-medium">{label}</span></span>}
    {editing && photo && canManage && <button type="button" className="absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-lg bg-rose-600 text-white shadow-lg transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60" aria-label={`Remove ${label}`} title={`Remove ${label}`} disabled={uploading || deleting} onClick={() => onDelete(photo.id, label)}><Trash2 className="h-4 w-4" /></button>}
  </div>
}

function Info({ label, value }: { label: string; value: string }) { return <div><div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div> }

function Specifications({ specifications, canManage, editing, onAdd, onUpdate, onRemove }: { specifications: Specification[]; canManage: boolean; editing: boolean; onAdd: () => void; onUpdate: (index: number, patch: Partial<Specification>) => void; onRemove: (index: number) => void }) {
  if (!canManage || !editing) return specifications.length ? <div className="grid gap-3 sm:grid-cols-2">{specifications.map((specification) => <div key={`${specification.label}:${specification.value}`} className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60"><div className="text-[11px] uppercase tracking-wider text-slate-400">{specification.label}</div><div className="mt-1 text-sm font-semibold">{specification.value}</div></div>)}</div> : <EmptyState label="No specifications recorded" />
  return <div className="space-y-3">{specifications.map((item, index) => <div key={index} className="flex items-center gap-2 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/60"><Input className="flex-1" placeholder="Label" value={item.label} onChange={(event) => onUpdate(index, { label: event.target.value })} /><Input className="flex-1" placeholder="Value" value={item.value} onChange={(event) => onUpdate(index, { value: event.target.value })} /><button type="button" className="rounded-md p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-600" aria-label="Remove specification" onClick={() => onRemove(index)}><Trash2 className="h-4 w-4" /></button></div>)}<Button type="button" variant="outline" onClick={onAdd}><Plus className="h-4 w-4" />Add specification</Button></div>
}

function Documents({ documents, canManage, editing, equipmentId, onChanged }: { documents: ApiEquipment['documents']; canManage: boolean; editing: boolean; equipmentId: string; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [type, setType] = useState('Manual')
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ fileId: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const selectFile = (candidate?: File) => {
    if (!candidate) return
    const extension = candidate.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'docx', 'txt'].includes(extension ?? '')) {
      toast.error('Choose a PDF, DOCX, or TXT file.')
      return
    }
    if (candidate.size > 10 * 1024 * 1024) {
      toast.error('Documents are limited to 10 MB.')
      return
    }
    setFile(candidate)
  }

  const upload = async () => {
    if (!file) { toast.error('Choose a file to upload'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('equipmentId', equipmentId)
      form.append('name', file.name)
      form.append('type', type)
      const uploaded = await apiRequest<UploadedFile>('files/documents', { method: 'POST', body: form })
      await apiRequest(`files/${encodeURIComponent(uploaded.id)}/attach`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ equipmentId, name: file.name, type }) })
      setFile(null)
      setType('Manual')
      onChanged()
      toast.success('Document uploaded')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to upload document.')
    } finally { setUploading(false) }
  }

  const remove = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiRequest(`files/${encodeURIComponent(deleteTarget.fileId)}`, { method: 'DELETE' })
      onChanged()
      toast.success('Document permanently deleted')
      setDeleteTarget(null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete document.')
    } finally {
      setDeleting(false)
    }
  }

  return <div className="space-y-5">
    {canManage && editing && <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800"><h3 className="text-sm font-semibold">Upload a document</h3><p className="mt-1 text-xs text-slate-500">Add a manual, certificate, or other equipment file.</p></div>
      <div className="space-y-4 p-5">
        <div onDragOver={(event) => { event.preventDefault(); if (!uploading) setIsDragging(true) }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); if (uploading) return; const files = Array.from(event.dataTransfer.files); if (files.length > 1) { toast.error('Upload one document at a time.'); return } selectFile(files[0]) }} className={`rounded-2xl border-2 border-dashed p-6 text-center transition sm:p-8 ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-blue-700'}`}>
          <div className={`mx-auto grid h-12 w-12 place-items-center rounded-2xl ${isDragging ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-white text-blue-600 shadow-sm dark:bg-slate-800'}`}><Upload className="h-5 w-5" /></div>
          <p className="mt-4 text-sm font-semibold">{isDragging ? 'Drop your document here' : 'Drag and drop a document here'}</p>
          <p className="mt-1 text-xs text-slate-500">or <label className="cursor-pointer font-semibold text-blue-600 hover:text-blue-700">browse files<input type="file" accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" disabled={uploading} onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = '' }} /></label></p>
          <p className="mt-3 text-[11px] text-slate-400">PDF, DOCX, or TXT · Up to 10 MB</p>
        </div>
        {file && <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-3 dark:border-blue-900/60 dark:bg-blue-950/20">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-800"><FileText className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{file.name}</p><p className="mt-0.5 text-xs text-slate-500">{file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`} · Ready to upload</p></div>
          <button type="button" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 dark:hover:bg-rose-950/50" aria-label={`Remove ${file.name}`} title="Remove selected file" disabled={uploading} onClick={() => setFile(null)}><X className="h-4 w-4" /></button>
        </div>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="w-full text-xs font-semibold sm:max-w-xs">Document type<Select className="mt-2 w-full" value={type} onChange={(event) => setType(event.target.value)}><option>Manual</option><option>Insurance</option><option>Certificate</option><option>Other</option></Select></label>
          <Button type="button" className="w-full sm:w-auto" onClick={() => void upload()} disabled={uploading || !file}><Upload className="h-4 w-4" />{uploading ? 'Uploading…' : 'Upload document'}</Button>
        </div>
      </div>
    </section>}
    {documents.length ? <div className="space-y-3">{documents.map((document) => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"><div className="flex min-w-0 items-center gap-3"><div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"><FileText className="h-5 w-5" /></div><div className="min-w-0"><a href={bffFileUrl(document.url)} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:text-blue-600">{document.name}</a><div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500"><span className="font-medium">{document.type}</span><span aria-hidden="true">·</span><span>Uploaded {new Date(document.uploadedDate).toLocaleDateString()}</span></div></div></div>{canManage && editing && <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-950/40" aria-label={`Remove ${document.name}`} title="Delete document" onClick={() => setDeleteTarget({ fileId: document.fileId, name: document.name })}><Trash2 className="h-4 w-4" /></button>}</div>)}</div> : <EmptyState label="No documents uploaded" />}
    <ConfirmDialog
      open={!!deleteTarget}
      title="Delete document"
      description={deleteTarget ? `Permanently delete ${deleteTarget.name}? This action cannot be undone.` : undefined}
      confirmLabel="Delete"
      loading={deleting}
      onConfirm={() => void remove()}
      onCancel={() => setDeleteTarget(null)}
    />
  </div>
}

function Logbook({ tickets }: { tickets: ApiTicket[] }) {
  return tickets.length ? <div className="space-y-4">{tickets.map((ticket) => <Link key={ticket.id} href={`/tickets/${ticket.id}`} className="flex gap-3"><div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40"><Calendar className="h-4 w-4" /></div><div><div className="text-sm font-semibold">{ticket.ticketNo} · {ticket.serviceType}</div><div className="mt-1 text-xs text-slate-500">Due {ticket.dueDate.slice(0, 10)} · <StatusBadge status={ticket.status} /></div></div></Link>)}</div> : <EmptyState label="No maintenance history" />
}

function EmptyState({ label }: { label: string }) { return <div className="grid min-h-32 place-items-center rounded-xl border border-dashed text-sm text-slate-400"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{label}</div></div> }

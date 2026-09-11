'use client'

import { useState } from 'react'
import { ArrowLeft, Calendar, FileText, Pencil, Plus, Printer, Save, ShieldCheck, Trash2, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ShellPage } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { equipment, getEquipment, hourMeterServiceOptions, resolveHourMeter, tickets } from '@/lib/mock-data'
import type { Equipment, EquipmentDocument, EquipmentStatus, Specification } from '@/lib/types'
import { useRole } from '@/components/role-context'
import { toast } from 'sonner'

const tabs = ['Overview', 'Specifications', 'Documents', 'Logbook'] as const
type EquipmentTab = (typeof tabs)[number]
const statuses: EquipmentStatus[] = ['Available', 'Under Maintenance', 'Out of Service', 'Inactive']

export default function EquipmentProfile() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { role } = useRole()
  const canManage = role === 'Super Admin' || role === 'Manager'
  const [e, setE] = useState<Equipment>(() => getEquipment(id) ?? equipment[0])
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Equipment>(e)
  const [hourMeterInput, setHourMeterInput] = useState('')
  const [tab, setTab] = useState<EquipmentTab>('Overview')
  const history = tickets.filter((ticket) => ticket.equipmentId === e.id)

  const startEditing = () => {
    setDraft(e)
    setHourMeterInput(e.hourMeter !== undefined ? String(e.hourMeter) : '')
    setEditing(true)
  }
  const cancelEditing = () => {
    setDraft(e)
    setEditing(false)
  }
  const save = () => {
    setE({ ...draft, hourMeter: resolveHourMeter(hourMeterInput) })
    setEditing(false)
    toast.success('Equipment updated (mock)')
  }
  const remove = () => {
    if (!window.confirm(`Delete ${e.assetNo}?`)) return
    toast.success('Equipment deleted (mock)')
    router.push('/equipment')
  }
  const updateDraft = (patch: Partial<Equipment>) => setDraft((current) => ({ ...current, ...patch }))

  const addSpecification = () => {
    setE((current) => ({ ...current, specifications: [...current.specifications, { label: 'New spec', value: '' }] }))
  }
  const updateSpecification = (index: number, patch: Partial<Specification>) => {
    setE((current) => ({
      ...current,
      specifications: current.specifications.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    }))
  }
  const removeSpecification = (index: number) => {
    setE((current) => ({ ...current, specifications: current.specifications.filter((_, i) => i !== index) }))
  }
  const addDocument = (doc: EquipmentDocument) => {
    setE((current) => ({ ...current, documents: [...current.documents, doc] }))
    toast.success('Document uploaded (mock)')
  }
  const removeDocument = (id: string) => {
    setE((current) => ({ ...current, documents: current.documents.filter((d) => d.id !== id) }))
    toast.success('Document removed (mock)')
  }

  return (
    <ShellPage>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/equipment" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />Equipment List
        </Link>
        <div className="flex gap-2">
          {canManage && !editing && (
            <>
              <Button variant="outline" onClick={startEditing}><Pencil className="h-4 w-4" />Edit</Button>
              <Button variant="outline" onClick={remove}><Trash2 className="h-4 w-4" />Delete</Button>
            </>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={cancelEditing}><X className="h-4 w-4" />Cancel</Button>
              <Button onClick={save}><Save className="h-4 w-4" />Save changes</Button>
            </>
          )}
          <Button variant="outline" onClick={() => toast.success('Print dialog opened (mock)')}><Printer className="h-4 w-4" />Print</Button>
        </div>
      </div>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        {editing ? (
          <div className="grid flex-1 gap-3 sm:grid-cols-3">
            <label className="text-xs font-semibold">
              Type
              <Input className="mt-2" value={draft.type} onChange={(ev) => updateDraft({ type: ev.target.value })} />
            </label>
            <label className="text-xs font-semibold">
              Manufacturer
              <Input className="mt-2" value={draft.manufacturer} onChange={(ev) => updateDraft({ manufacturer: ev.target.value })} />
            </label>
            <label className="text-xs font-semibold">
              Model
              <Input className="mt-2" value={draft.model} onChange={(ev) => updateDraft({ model: ev.target.value })} />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Location
              <Input className="mt-2" value={draft.location} onChange={(ev) => updateDraft({ location: ev.target.value })} />
            </label>
            <label className="text-xs font-semibold">
              Status
              <Select className="mt-2 w-full" value={draft.status} onChange={(ev) => updateDraft({ status: ev.target.value as EquipmentStatus })}>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </label>
          </div>
        ) : (
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Digital logbook / {e.assetNo}</div>
            <h1 className="text-3xl font-semibold tracking-tight">{e.type}</h1>
            <p className="mt-2 text-sm text-slate-500">{e.manufacturer} {e.model} · {e.location}</p>
          </div>
        )}
        {!editing && <StatusBadge status={e.status} />}
      </div>

      <div className="grid gap-6 lg:grid-cols-[.7fr_1.3fr]">
        <Card className="p-6">
          <UploadPhoto label="Primary image" className="h-56 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <UploadPhoto label="Front view" />
            <UploadPhoto label="Side view" />
          </div>
        </Card>

        <Card>
          <div className="flex gap-1 overflow-x-auto border-b px-4 pt-3">
            {tabs.map((item) => (
              <button key={item} onClick={() => setTab(item)} className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold ${tab === item ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="p-6">
            {tab === 'Overview' && (
              editing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-xs font-semibold">
                    Biman serial number
                    <Input className="mt-2" value={draft.bimanSerialNo} onChange={(ev) => updateDraft({ bimanSerialNo: ev.target.value })} />
                  </label>
                  <label className="text-xs font-semibold">
                    TLD serial number
                    <Input className="mt-2" value={draft.TLDSerialNo} onChange={(ev) => updateDraft({ TLDSerialNo: ev.target.value })} />
                  </label>
                  <label className="text-xs font-semibold">
                    Hour meter
                    <Input
                      className="mt-2"
                      list="hour-meter-options"
                      placeholder="Select a service interval or type hours"
                      value={hourMeterInput}
                      onChange={(ev) => setHourMeterInput(ev.target.value)}
                    />
                    <datalist id="hour-meter-options">
                      {hourMeterServiceOptions.map((o) => (
                        <option key={o.label} value={o.label} />
                      ))}
                    </datalist>
                  </label>
                  <label className="text-xs font-semibold">
                    Actual GT date
                    <Input className="mt-2" type="date" value={draft.actualGTDate ?? ''} onChange={(ev) => updateDraft({ actualGTDate: ev.target.value })} />
                  </label>
                  <label className="text-xs font-semibold">
                    Ship date
                    <Input className="mt-2" type="date" value={draft.shipDate ?? ''} onChange={(ev) => updateDraft({ shipDate: ev.target.value })} />
                  </label>
                  <label className="text-xs font-semibold">
                    Shipping status
                    <Input className="mt-2" value={draft.shippingStatus ?? ''} onChange={(ev) => updateDraft({ shippingStatus: ev.target.value })} />
                  </label>
                  <label className="text-xs font-semibold">
                    Emission rating
                    <Input className="mt-2" value={draft.emissionRatting ?? ''} onChange={(ev) => updateDraft({ emissionRatting: ev.target.value })} />
                  </label>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Info label="Biman serial number" value={e.bimanSerialNo} />
                  <Info label="TLD serial number" value={e.TLDSerialNo} />
                  <Info label="Status" value={e.status} />
                  <Info label="Hour meter" value={e.hourMeter !== undefined ? `${e.hourMeter} hours` : 'Not recorded'} />
                  <Info label="Actual GT date" value={e.actualGTDate ?? 'Not recorded'} />
                  <Info label="Ship date" value={e.shipDate ?? 'Not recorded'} />
                  <Info label="Shipping status" value={e.shippingStatus ?? 'Not recorded'} />
                  <Info label="Emission rating" value={e.emissionRatting ?? 'Not recorded'} />
                </div>
              )
            )}
            {tab === 'Specifications' && (
              <Specifications
                specifications={e.specifications}
                canManage={canManage}
                editing={editing}
                onAdd={addSpecification}
                onUpdate={updateSpecification}
                onRemove={removeSpecification}
              />
            )}
            {tab === 'Documents' && (
              <Documents
                documents={e.documents}
                canManage={canManage}
                onAdd={addDocument}
                onRemove={removeDocument}
              />
            )}
            {tab === 'Logbook' && <Logbook history={history} />}
          </div>
        </Card>
      </div>
    </ShellPage>
  )
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return <div><div className="text-[11px] uppercase tracking-wider text-slate-400">{label}</div><div className="mt-1 text-sm font-medium">{value}</div></div>
}

function UploadPhoto({ label, className = 'h-24 rounded-xl' }: Readonly<{ label: string; className?: string }>) {
  const [preview, setPreview] = useState<string>()

  return <label className={`relative grid cursor-pointer place-items-center overflow-hidden border border-dashed bg-slate-50 text-slate-400 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:bg-slate-950 dark:hover:bg-blue-950/30 ${className}`}>
    <input type="file" accept="image/*" className="sr-only" onChange={(event) => {
      const file = event.target.files?.[0]
      if (file) setPreview(URL.createObjectURL(file))
    }} />
    {preview ? <img src={preview} alt={label} className="absolute inset-0 h-full w-full object-cover" /> : <span className="text-center"><span className="mx-auto grid h-7 w-7 place-items-center rounded-full border border-current text-lg leading-none">+</span><span className="mt-2 block text-[10px] font-medium">{label}</span></span>}
  </label>
}

function Specifications({
  specifications,
  canManage,
  editing,
  onAdd,
  onUpdate,
  onRemove,
}: Readonly<{
  specifications: Specification[]
  canManage: boolean
  editing: boolean
  onAdd: () => void
  onUpdate: (index: number, patch: Partial<Specification>) => void
  onRemove: (index: number) => void
}>) {
  if (!canManage || !editing) {
    return specifications.length ? (
      <div className="grid gap-3 sm:grid-cols-2">
        {specifications.map((specification) => (
          <div key={specification.label} className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60">
            <div className="text-[11px] uppercase tracking-wider text-slate-400">{specification.label}</div>
            <div className="mt-1 text-sm font-semibold">{specification.value}</div>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState label="No specifications recorded" />
    )
  }

  return (
    <div className="space-y-3">
      {specifications.map((specification, index) => (
        <div key={index} className="flex items-center gap-2 rounded-xl border bg-slate-50 p-3 dark:bg-slate-900/60">
          <Input
            className="flex-1"
            placeholder="Label"
            value={specification.label}
            onChange={(ev) => onUpdate(index, { label: ev.target.value })}
          />
          <Input
            className="flex-1"
            placeholder="Value"
            value={specification.value}
            onChange={(ev) => onUpdate(index, { value: ev.target.value })}
          />
          <button
            type="button"
            className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
            aria-label="Remove specification"
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add specification
      </Button>
    </div>
  )
}

function Documents({
  documents,
  canManage,
  onAdd,
  onRemove,
}: Readonly<{
  documents: EquipmentDocument[]
  canManage: boolean
  onAdd: (doc: EquipmentDocument) => void
  onRemove: (id: string) => void
}>) {
  const [name, setName] = useState('')
  const [type, setType] = useState('Manual')
  const [expiryDate, setExpiryDate] = useState('')

  const upload = () => {
    if (!name.trim()) {
      toast.error('Choose a file to upload')
      return
    }
    onAdd({
      id: `doc-${Date.now()}`,
      name,
      type,
      expiryDate: expiryDate || undefined,
      uploadedDate: new Date().toISOString().slice(0, 10),
    })
    setName('')
    setType('Manual')
    setExpiryDate('')
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex flex-col gap-3 rounded-xl border border-dashed p-4 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-semibold">
            File
            <input
              type="file"
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-blue-700 dark:file:bg-blue-950/40"
              onChange={(ev) => setName(ev.target.files?.[0]?.name ?? '')}
            />
          </label>
          <label className="text-xs font-semibold">
            Type
            <Select className="mt-2 w-full" value={type} onChange={(ev) => setType(ev.target.value)}>
              <option>Manual</option>
              <option>Insurance</option>
              <option>Certificate</option>
              <option>Other</option>
            </Select>
          </label>
          <label className="text-xs font-semibold">
            Expiry date (optional)
            <Input className="mt-2" type="date" value={expiryDate} onChange={(ev) => setExpiryDate(ev.target.value)} />
          </label>
          <Button type="button" onClick={upload}>
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        </div>
      )}
      {documents.length ? (
        <div className="space-y-3">
          {documents.map((document) => (
            <div key={document.id} className="flex items-center justify-between rounded-xl border p-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-sm font-medium">{document.name}</div>
                  <div className="mt-1 text-xs text-slate-400">{document.type} · Uploaded {document.uploadedDate}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {document.expiryDate && <Badge className="bg-amber-50 text-amber-700">Expires {document.expiryDate}</Badge>}
                {canManage && (
                  <button
                    type="button"
                    className="rounded-md p-2 text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                    aria-label={`Remove ${document.name}`}
                    onClick={() => onRemove(document.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState label="No documents uploaded" />
      )}
    </div>
  )
}

function Logbook({ history }: Readonly<{ history: typeof tickets }>) {
  return history.length ? <div className="space-y-4">{history.map((ticket) => <div key={ticket.id} className="flex gap-3"><div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40"><Calendar className="h-4 w-4" /></div><div><div className="text-sm font-semibold">{ticket.ticketNo} · {ticket.type}</div><div className="mt-1 text-xs text-slate-500">Due {ticket.dueDate} · <StatusBadge status={ticket.status} /></div></div></div>)}</div> : <EmptyState label="No maintenance history" />
}

function EmptyState({ label }: Readonly<{ label: string }>) {
  return <div className="grid min-h-32 place-items-center rounded-xl border border-dashed text-sm text-slate-400"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{label}</div></div>
}

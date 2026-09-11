'use client'

import { useRef, useState } from 'react'
import {
  ArrowLeft,
  Bold,
  Check,
  ClipboardCheck,
  Image as ImageIcon,
  Italic,
  List,
  Pencil,
  Plus,
  Save,
  Send,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShellPage } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { engineers, getEquipment, getTicket, requests } from '@/lib/mock-data'
import type { EquipmentRequest } from '@/lib/types'
import { useRole } from '@/components/role-context'
import { toast } from 'sonner'

const steps = ['Created', 'Assigned', 'In progress', 'Work completed', 'Admin verification', 'Closed']

interface FeedbackEntry {
  id: string
  author: string
  timestamp: string
  html: string
  images: string[]
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { role } = useRole()
  const t = getTicket(id)

  if (!t) return <ShellPage><Card className="p-12 text-center">Ticket not found</Card></ShellPage>

  const e = getEquipment(t.equipmentId)
  const isEngineer = role === 'Engineer'
  const canManage = role === 'Super Admin' || role === 'Manager'
  const canRequestParts = role !== 'Biman Admin'

  const [status, setStatus] = useState(t.status)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({
    priority: t.priority,
    assignedEngineer: t.assignedEngineer ?? '',
    dueDate: t.dueDate,
    requestingParty: t.requestingParty,
  })
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(
    t.maintenanceRecord.engineerNotes
      ? [{ id: 'f0', author: t.assignedEngineer ?? 'Engineer', timestamp: t.createdDate, html: t.maintenanceRecord.engineerNotes, images: [] }]
      : [],
  )
  const [ticketRequests, setTicketRequests] = useState<EquipmentRequest[]>(requests)
  const [requestModalOpen, setRequestModalOpen] = useState(false)

  const current = Math.max(
    0,
    status === 'Closed' ? 5
      : status === 'Awaiting Verification' ? 4
      : status === 'Completed' ? 3
      : status === 'In Progress' || status === 'Awaiting Parts' ? 2
      : status === 'Assigned' ? 1
      : 0,
  )

  const startWork = () => {
    setStatus('In Progress')
    toast.success('Work started')
  }
  const verifyAndClose = () => {
    setStatus('Closed')
    toast.success('Ticket verified and closed by admin')
  }
  const startEditing = () => setEditing(true)
  const cancelEditing = () => {
    setDraft({ priority: t.priority, assignedEngineer: t.assignedEngineer ?? '', dueDate: t.dueDate, requestingParty: t.requestingParty })
    setEditing(false)
  }
  const saveEditing = () => {
    setEditing(false)
    toast.success('Ticket updated (mock)')
  }
  const submitFeedback = (entry: { html: string; images: string[] }) => {
    setFeedback((current) => [
      ...current,
      { id: `f${current.length + 1}`, author: t.assignedEngineer ?? 'Engineer', timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '), ...entry },
    ])
    if (status === 'In Progress' || status === 'Awaiting Parts') {
      setStatus('Awaiting Verification')
      toast.success('Feedback submitted — awaiting admin verification')
    } else {
      toast.success('Feedback submitted')
    }
  }
  const addRequest = (data: { item: string; quantity: number; reason: string }) => {
    setTicketRequests((current) => [
      ...current,
      {
        id: `r${current.length + 1}`,
        requestNo: `REQ-${String(current.length + 1).padStart(3, '0')}`,
        ...data,
        ticketId: t.ticketNo,
        equipmentId: t.equipmentId,
        requestedBy: t.assignedEngineer ?? 'Unassigned',
        requestedDate: new Date().toISOString().slice(0, 10),
        status: 'Pending',
      },
    ])
    setRequestModalOpen(false)
    toast.success('Request submitted for approval')
  }

  return (
    <ShellPage>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/tickets" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />All tickets
        </Link>
        <div className="flex gap-2">
          {canManage && !editing && (
            <Button variant="outline" onClick={startEditing}><Pencil className="h-4 w-4" />Edit ticket</Button>
          )}
          {canManage && editing && (
            <>
              <Button variant="outline" onClick={cancelEditing}><X className="h-4 w-4" />Cancel</Button>
              <Button onClick={saveEditing}><Save className="h-4 w-4" />Save changes</Button>
            </>
          )}
          {isEngineer && (status === 'Open' || status === 'Assigned') && (
            <Button variant="outline" onClick={startWork}><Wrench className="h-4 w-4" />Start work</Button>
          )}
          {canManage && status !== 'Closed' && (
            <Button onClick={verifyAndClose}><Check className="h-4 w-4" />Verify & close</Button>
          )}
        </div>
      </div>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Maintenance ticket / {t.ticketNo}</div>
          <h1 className="text-3xl font-semibold tracking-tight">{t.faultDescription ?? t.maintenanceRecord.problemDescription}</h1>
          <p className="mt-2 text-sm text-slate-500">{e?.assetNo} · {e?.type} · raised {t.createdDate}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="overflow-x-auto p-6">
          <div className="flex min-w-[640px] items-start justify-between">
            {steps.map((step, i) => (
              <div key={step} className="relative flex flex-1 flex-col items-center text-center">
                <div
                  className={`z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${
                    i <= current ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  {i < current ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`absolute left-1/2 top-4 h-0.5 w-full ${i < current ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                )}
                <div className={`mt-3 max-w-[105px] text-[10px] font-semibold leading-4 ${i <= current ? 'text-blue-600' : 'text-slate-400'}`}>{step}</div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Maintenance record</h2>
                <p className="mt-1 text-xs text-slate-500">Problem reported for this ticket, with engineer feedback on the work performed.</p>
              </div>
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problem statement</div>
              <p className="mt-2 text-sm">{t.faultDescription ?? t.maintenanceRecord.problemDescription}</p>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold">Engineer feedback</h3>
              {feedback.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">No feedback submitted yet.</div>}
              {feedback.map((f) => (
                <div key={f.id} className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{f.author}</span>
                    <span className="text-xs text-slate-400">{f.timestamp}</span>
                  </div>
                  <div className="mt-2 text-sm text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: f.html }} />
                  {f.images.length > 0 && (
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {f.images.map((src, idx) => (
                        <img key={idx} src={src} alt="Feedback attachment" className="h-20 w-full rounded-lg border object-cover" />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {isEngineer && status !== 'Closed' && <FeedbackComposer onSubmit={submitFeedback} />}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold">Ticket information</h2>
            <div className="mt-5 grid gap-4">
              <Info label="Type" value={t.type} />
              {editing ? (
                <label className="flex items-center justify-between gap-4 border-b pb-3 text-xs">
                  <span className="text-slate-500">Priority</span>
                  <Select className="h-8 w-32 text-xs" value={draft.priority} onChange={(ev) => setDraft((d) => ({ ...d, priority: ev.target.value as typeof d.priority }))}>
                    {(['Low', 'Medium', 'High', 'Critical'] as const).map((p) => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </label>
              ) : (
                <Info label="Priority" value={t.priority} />
              )}
              <Info label="Asset" value={`${e?.assetNo} · ${e?.type}`} />
              {editing ? (
                <label className="flex items-center justify-between gap-4 border-b pb-3 text-xs">
                  <span className="text-slate-500">Assigned engineer</span>
                  <Select className="h-8 w-40 text-xs" value={draft.assignedEngineer} onChange={(ev) => setDraft((d) => ({ ...d, assignedEngineer: ev.target.value }))}><option value="">Unassigned</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.name}>{engineer.name}</option>)}</Select>
                </label>
              ) : (
                <Info label="Assigned engineer" value={t.assignedEngineer ?? 'Unassigned'} />
              )}
              {editing ? (
                <label className="flex items-center justify-between gap-4 border-b pb-3 text-xs">
                  <span className="text-slate-500">Due date</span>
                  <Input type="date" className="h-8 w-40 text-xs" value={draft.dueDate} onChange={(ev) => setDraft((d) => ({ ...d, dueDate: ev.target.value }))} />
                </label>
              ) : (
                <Info label="Due date" value={t.dueDate} />
              )}
              <Info label="Requesting party" value={t.createdBy} />
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="text-sm font-semibold">Equipment / parts</h2>
                <p className="mt-1 text-xs text-slate-500">Linked requests for this ticket, if parts are needed</p>
              </div>
              {canRequestParts && (
                <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setRequestModalOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />Request
                </Button>
              )}
            </div>
            <div className="divide-y">
              {ticketRequests.filter((r) => r.ticketId === t.ticketNo).map((r) => (
                <div key={r.id} className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-sm font-medium">{r.item} ×{r.quantity}</div>
                    <div className="text-xs text-slate-400">{r.reason}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
              ))}
              {ticketRequests.filter((r) => r.ticketId === t.ticketNo).length === 0 && (
                <div className="p-5 text-sm text-slate-500">No requests linked yet.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {requestModalOpen && (
        <AddRequestModal onClose={() => setRequestModalOpen(false)} onCreate={addRequest} />
      )}
    </ShellPage>
  )
}

function AddRequestModal({
  onClose,
  onCreate,
}: Readonly<{
  onClose: () => void
  onCreate: (data: { item: string; quantity: number; reason: string }) => void
}>) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Add request</h2>
            <p className="mt-1 text-sm text-slate-500">Request equipment or parts needed for this ticket.</p>
          </div>
          <button type="button" onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-slate-700" aria-label="Close modal">×</button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(ev) => {
            ev.preventDefault()
            const data = new FormData(ev.currentTarget)
            const item = String(data.get('item')).trim()
            const reason = String(data.get('reason')).trim()
            if (!item || !reason) {
              toast.error('Fill in the item and reason before submitting')
              return
            }
            onCreate({ item, quantity: Number(data.get('quantity')), reason })
          }}
        >
          <label className="block text-xs font-semibold">
            Item or part
            <Input className="mt-2" name="item" placeholder="Hydraulic hose" required />
          </label>
          <label className="block text-xs font-semibold">
            Quantity
            <Input className="mt-2" name="quantity" type="number" min="1" defaultValue="1" required />
          </label>
          <label className="block text-xs font-semibold">
            Reason
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950"
              name="reason"
              placeholder="Explain why this item is needed"
              required
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit"><Plus className="h-4 w-4" />Submit request</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FeedbackComposer({ onSubmit }: Readonly<{ onSubmit: (entry: { html: string; images: string[] }) => void }>) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [images, setImages] = useState<string[]>([])

  const format = (command: string) => {
    editorRef.current?.focus()
    document.execCommand(command)
  }
  const addImages = (files: FileList | null) => {
    if (!files) return
    setImages((current) => [...current, ...Array.from(files).map((file) => URL.createObjectURL(file))])
  }
  const removeImage = (idx: number) => setImages((current) => current.filter((_, i) => i !== idx))
  const submit = () => {
    const html = editorRef.current?.innerHTML.trim() ?? ''
    if (!html || html === '<br>') {
      toast.error('Add some feedback before submitting')
      return
    }
    onSubmit({ html, images })
    if (editorRef.current) editorRef.current.innerHTML = ''
    setImages([])
  }

  return (
    <div className="mt-4 rounded-xl border p-4">
      <div className="mb-2 text-xs font-semibold">Add feedback</div>
      <div className="flex items-center gap-1 rounded-t-lg border-b bg-slate-50 p-1.5 dark:bg-slate-900/60">
        <button type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bold" onClick={() => format('bold')}><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Italic" onClick={() => format('italic')}><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bullet list" onClick={() => format('insertUnorderedList')}><List className="h-3.5 w-3.5" /></button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="min-h-24 w-full rounded-b-lg border bg-white p-3 text-sm outline-none focus:border-blue-500 dark:bg-slate-950"
        data-placeholder="Describe the work performed, findings, and any follow-up needed..."
      />
      {images.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((src, idx) => (
            <div key={idx} className="group relative h-20 overflow-hidden rounded-lg border">
              <img src={src} alt="Attachment preview" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => removeImage(idx)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-700">
          <ImageIcon className="h-4 w-4" />Attach images
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(ev) => addImages(ev.target.files)} />
        </label>
        <Button onClick={submit}><Send className="h-4 w-4" />Submit feedback</Button>
      </div>
    </div>
  )
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-4 border-b pb-3 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-semibold">{value}</span>
    </div>
  )
}

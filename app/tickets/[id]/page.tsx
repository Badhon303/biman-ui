'use client'

import { useRef, useState, type DragEvent } from 'react'
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
    t.maintenanceRecord.engineerFeedback
      ? [{ id: 'f0', author: t.assignedEngineer ?? 'Engineer', timestamp: t.createdDate, html: t.maintenanceRecord.engineerFeedback, images: [] }]
      : [],
  )
  const [feedbackImages, setFeedbackImages] = useState<string[]>(t.maintenanceRecord.workImages)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [ticketRequests, setTicketRequests] = useState<EquipmentRequest[]>(requests)
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [checklist, setChecklist] = useState(() => t.maintenanceRecord.inspectionChecklist.map((item) => ({ ...item })))
  const [partsUsed, setPartsUsed] = useState(t.maintenanceRecord.partsUsed)
  const [labourHours, setLabourHours] = useState(t.maintenanceRecord.labourHours)
  const [functionalTestPassed, setFunctionalTestPassed] = useState(t.maintenanceRecord.functionalTestPassed)
  const [safetyCheckPassed, setSafetyCheckPassed] = useState(t.maintenanceRecord.safetyCheckPassed)
  const completedChecklist = checklist.filter((item) => item.checked).length
  const toggleChecklistItem = (id: string) => {
    setChecklist((current) => current.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item)))
  }
  const checklistByCategory = checklist.reduce<Record<string, typeof checklist>>((groups, item) => {
    const categoryItems = groups[item.category] ?? []
    categoryItems.push(item)
    groups[item.category] = categoryItems
    return groups
  }, {})

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
  const submitMaintenanceRecord = () => {
    const html = feedbackDraft.trim()
    if (!html || html === '<br>') {
      toast.error('Add engineer feedback before submitting the maintenance record')
      return
    }
    setFeedback((current) => [
      ...current,
      {
        id: `f${current.length + 1}`,
        author: t.assignedEngineer ?? 'Engineer',
        timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
        html,
        images: feedbackImages,
      },
    ])
    setFeedbackDraft('')
    setFeedbackImages([])
    if (status === 'In Progress' || status === 'Awaiting Parts') {
      setStatus('Awaiting Verification')
      toast.success('Maintenance record submitted — awaiting admin verification')
    } else {
      toast.success('Maintenance record submitted')
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
          <p className="mt-2 text-sm text-slate-500">{e?.assetNo} · {e?.equipmentType} · raised {t.createdDate}</p>
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
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-semibold">Inspection checklist</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {completedChecklist} of {checklist.length} inspection items completed
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                  {checklist.length ? Math.round((completedChecklist / checklist.length) * 100) : 0}%
                </span>
              </div>
              <div className="space-y-4">
                {Object.entries(checklistByCategory).map(([category, items]) => {
                  const completedItems = items.filter((item) => item.checked).length
                  return (
                    <section key={category} className="overflow-hidden rounded-xl border">
                      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                        <h4 className="text-xs font-semibold uppercase tracking-wider">{category}</h4>
                        <span className="text-xs text-slate-500">{completedItems}/{items.length} complete</span>
                      </div>
                      <div className="grid gap-3 p-3 sm:grid-cols-2">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            role="checkbox"
                            aria-checked={item.checked}
                            aria-label={`${item.label} (${item.checked ? 'checked' : 'unchecked'})`}
                            onClick={() => toggleChecklistItem(item.id)}
                            className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:hover:bg-blue-950/20"
                          >
                            <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${item.checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}>
                              <Check className="h-3.5 w-3.5" />
                            </span>
                            <span className={`text-xs ${item.checked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <RecordInput
                label="Parts used"
                value={partsUsed}
                placeholder="Enter parts, materials, or N/A"
                onChange={setPartsUsed}
              />
              <RecordInput
                label="Labour hours"
                type="number"
                min="0"
                step="0.5"
                value={String(labourHours)}
                onChange={(value) => setLabourHours(Number(value) || 0)}
              />
              <RecordToggle
                label="Functional test"
                checked={functionalTestPassed}
                onChange={setFunctionalTestPassed}
              />
              <RecordToggle
                label="Safety check"
                checked={safetyCheckPassed}
                onChange={setSafetyCheckPassed}
              />
              <ImageUploadField images={feedbackImages} onChange={setFeedbackImages} />
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-sm font-semibold">Engineer feedback</h3>
              {!isEngineer && feedback.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">No feedback submitted yet.</div>}
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

            {isEngineer && status !== 'Closed' && (
              <>
                <FeedbackComposer onChange={setFeedbackDraft} />
                <div className="mt-4 flex justify-end">
                  <Button onClick={submitMaintenanceRecord}><Send className="h-4 w-4" />Final submit</Button>
                </div>
              </>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold">Ticket information</h2>
            <div className="mt-5 grid gap-4">
              <Info label="Type" value={t.serviceType} />
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
              <Info label="Asset" value={`${e?.assetNo} · ${e?.equipmentType}`} />
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

function ImageUploadField({
  images,
  onChange,
}: Readonly<{ images: string[]; onChange: (images: string[]) => void }>) {
  const [isDragging, setIsDragging] = useState(false)
  const addImages = (files: FileList | null) => {
    if (!files) return
    const nextImages = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => URL.createObjectURL(file))
    onChange([...images, ...nextImages])
  }
  const removeImage = (idx: number) => onChange(images.filter((_, i) => i !== idx))
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    addImages(event.dataTransfer.files)
  }

  return (
    <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Work images</h3>
          <p className="mt-1 text-xs text-slate-500">Upload photos showing the completed maintenance work.</p>
        </div>
        {images.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{images.length} image{images.length === 1 ? '' : 's'}</span>}
      </div>
      <div
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-xl border-2 border-dashed p-6 text-center transition ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-blue-700'}`}
      >
        <ImageIcon className={`mx-auto h-8 w-8 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />
        <p className="mt-3 text-sm font-medium">{isDragging ? 'Drop images here' : 'Drag and drop images here'}</p>
        <p className="mt-1 text-xs text-slate-500">or select image files from your device</p>
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700">
          <ImageIcon className="h-3.5 w-3.5" />Choose images
          <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => addImages(event.target.files)} />
        </label>
      </div>
      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, idx) => (
            <div key={src} className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
              <img src={src} alt="Work attachment preview" className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label="Remove image"
                onClick={() => removeImage(idx)}
                className="absolute right-2 top-2 rounded-full bg-slate-950/70 p-1.5 text-white opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FeedbackComposer({ onChange }: Readonly<{ onChange: (html: string) => void }>) {
  const editorRef = useRef<HTMLDivElement>(null)

  const format = (command: string) => {
    editorRef.current?.focus()
    document.execCommand(command)
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="engineer-feedback-editor" className="text-xs font-semibold">Engineer feedback</label>
        <span className="text-[10px] text-slate-400">Rich text</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1 border-b bg-slate-50 p-1.5 dark:bg-slate-950">
          <button type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bold" onMouseDown={(event) => event.preventDefault()} onClick={() => format('bold')}><Bold className="h-3.5 w-3.5" /></button>
          <button type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Italic" onMouseDown={(event) => event.preventDefault()} onClick={() => format('italic')}><Italic className="h-3.5 w-3.5" /></button>
          <button type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label="Bullet list" onMouseDown={(event) => event.preventDefault()} onClick={() => format('insertUnorderedList')}><List className="h-3.5 w-3.5" /></button>
        </div>
      <div
        ref={editorRef}
        id="engineer-feedback-editor"
        role="textbox"
        aria-multiline="true"
        aria-label="Engineer feedback rich text"
        contentEditable
        suppressContentEditableWarning
        className="min-h-28 w-full bg-white p-3 text-sm outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 focus:bg-blue-50/20 dark:bg-slate-950 dark:focus:bg-blue-950/10"
        data-placeholder="Describe the work performed, findings, and any follow-up needed..."
        onInput={(event) => onChange(event.currentTarget.innerHTML)}
      />
      </div>
    </div>
  )
}

function RecordInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  min,
  step,
}: Readonly<{
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
  min?: string
  step?: string
}>) {
  return (
    <label className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
        type={type}
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function RecordToggle({
  label,
  checked,
  onChange,
}: Readonly<{ label: string; checked: boolean; onChange: (checked: boolean) => void }>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl border p-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
        checked
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`mt-1 block text-sm font-semibold ${checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>
          {checked ? 'Passed' : 'Pending'}
        </span>
      </span>
      <span className={`relative h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
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

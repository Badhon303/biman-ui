'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Check, ClipboardCheck, Image as ImageIcon, Plus, Save, Send, Wrench, X } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { ShellPage } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { ApiRequest, ApiTicket, fetchAllPages } from '@/lib/api-data'
import { apiRequest, bffFileUrl } from '@/lib/api-client'
import { Role } from '@/lib/types'
import { toast } from 'sonner'

type EngineerOption = { id: string; name: string; role: Role; status: string }
type FeedbackResponse = { id: string }
type TicketFeedback = NonNullable<ApiTicket['feedback']>[number]

const steps = ['Created', 'Assigned', 'In progress', 'Work completed', 'Admin verification', 'Closed']
const priorities = ['Low', 'Medium', 'High', 'Critical'] as const

function statusStep(status: string) {
  if (status === 'Closed') return 5
  if (status === 'Awaiting Verification') return 4
  if (status === 'Completed') return 3
  if (status === 'In Progress' || status === 'Awaiting Parts') return 2
  if (status === 'Assigned') return 1
  return 0
}

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const { role } = useRole()
  const isEngineer = role === 'Engineer'
  const canManage = role === 'Super Admin' || role === 'Manager'
  const canRequestParts = ['Engineer', 'Manager', 'Super Admin'].includes(role ?? '')
  const canListEngineers = role === 'Super Admin' || role === 'Manager'
  const [ticket, setTicket] = useState<ApiTicket | null>(null)
  const [engineers, setEngineers] = useState<EngineerOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [requestingParty, setRequestingParty] = useState('')
  const [assignedEngineerId, setAssignedEngineerId] = useState('')
  const [partsUsed, setPartsUsed] = useState('')
  const [labourHours, setLabourHours] = useState('0')
  const [functionalTestPassed, setFunctionalTestPassed] = useState(false)
  const [safetyCheckPassed, setSafetyCheckPassed] = useState(false)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [feedbackFiles, setFeedbackFiles] = useState<File[]>([])
  const [requestOpen, setRequestOpen] = useState(false)

  const load = async () => {
    try {
      const result = await apiRequest<ApiTicket>(`tickets/${encodeURIComponent(id)}`)
      setTicket(result)
      setPriority(result.priority)
      setDueDate(result.dueDate.slice(0, 10))
      setRequestingParty(result.requestingParty ?? '')
      setAssignedEngineerId(result.assignedEngineer?.id ?? '')
      setPartsUsed(result.maintenanceRecord?.partsUsed ?? '')
      setLabourHours(String(result.maintenanceRecord?.labourHours ?? 0))
      setFunctionalTestPassed(result.maintenanceRecord?.functionalTestPassed ?? false)
      setSafetyCheckPassed(result.maintenanceRecord?.safetyCheckPassed ?? false)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load ticket.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [id])
  useEffect(() => {
    if (canListEngineers) void fetchAllPages<EngineerOption>('users/engineers').then(setEngineers).catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to load engineers.'))
  }, [canListEngineers])

  const toggleChecklist = async (itemId: string, checked: boolean) => {
    if (!ticket) return
    const before = ticket
    const record = ticket.maintenanceRecord
    if (!record) return
    setTicket({ ...ticket, maintenanceRecord: { ...record, checklistItems: record.checklistItems?.map((item) => item.id === itemId ? { ...item, checked } : item), inspectionChecklist: record.inspectionChecklist?.map((item) => item.id === itemId ? { ...item, checked } : item) } })
    try {
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/checklist/${encodeURIComponent(itemId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ checked }) })
    } catch (cause) {
      setTicket(before)
      toast.error(cause instanceof Error ? cause.message : 'Unable to update checklist.')
    }
  }

  const startWork = async () => {
    if (!ticket) return
    try { await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/start`, { method: 'POST' }); await load(); toast.success('Work started') }
    catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Unable to start work.') }
  }

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ticket) return
    setSaving(true)
    try {
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ priority, dueDate, requestingParty }) })
      if (canListEngineers && assignedEngineerId !== (ticket.assignedEngineer?.id ?? '') && assignedEngineerId) {
        await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/assign`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ assignedEngineerId }) })
      }
      setEditing(false)
      await load()
      toast.success('Ticket updated')
    } catch (cause) {
      await load()
      toast.error(cause instanceof Error ? cause.message : 'Unable to update ticket.')
    } finally { setSaving(false) }
  }

  const submitForVerification = async () => {
    if (!ticket) return
    const bodyHtml = feedbackDraft.trim()
    if (!bodyHtml) { toast.error('Add engineer feedback before submitting the maintenance record'); return }
    setSaving(true)
    try {
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/maintenance`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ partsUsed, labourHours: Number(labourHours) || 0, functionalTestPassed, safetyCheckPassed }) })
      const feedback = await apiRequest<FeedbackResponse>(`tickets/${encodeURIComponent(ticket.id)}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bodyHtml }) })
      for (const file of feedbackFiles) {
        const form = new FormData()
        form.append('file', file)
        form.append('purpose', 'FEEDBACK_IMAGE')
        form.append('ownerId', ticket.id)
        const uploaded = await apiRequest<{ id: string }>('files/images', { method: 'POST', body: form })
        await apiRequest(`files/${encodeURIComponent(uploaded.id)}/attach`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ feedbackId: feedback.id }) })
      }
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/submit`, { method: 'POST' })
      setFeedbackDraft('')
      setFeedbackFiles([])
      await load()
      toast.success('Maintenance record submitted — awaiting admin verification')
    } catch (cause) {
      await load()
      toast.error(cause instanceof Error ? cause.message : 'Unable to submit maintenance record.')
    } finally { setSaving(false) }
  }

  const verifyAndClose = async () => {
    if (!ticket) return
    setSaving(true)
    try {
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/verify-close`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({}) })
      await load()
      toast.success('Ticket verified and closed')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Unable to close ticket.') }
    finally { setSaving(false) }
  }

  const createRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ticket) return
    const form = new FormData(event.currentTarget)
    const body = { ticketId: ticket.id, item: String(form.get('item')).trim(), quantity: Number(form.get('quantity')), reason: String(form.get('reason')).trim() }
    try {
      await apiRequest('requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      setRequestOpen(false)
      await load()
      toast.success('Request submitted for approval')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Unable to submit request.') }
  }

  if (loading) return <ShellPage><Card className="p-10 text-center text-sm text-slate-500">Loading ticket…</Card></ShellPage>
  if (error || !ticket) return <ShellPage><Card className="p-10 text-center text-sm text-rose-600">{error || 'Ticket not found.'}</Card></ShellPage>

  const checklist = ticket.maintenanceRecord?.inspectionChecklist ?? ticket.maintenanceRecord?.checklistItems ?? []
  const checklistByCategory = checklist.reduce<Record<string, typeof checklist>>((groups, item) => { (groups[item.category] ??= []).push(item); return groups }, {})
  const completedChecklist = checklist.filter((item) => item.checked).length
  const feedback: TicketFeedback[] = ticket.feedback ?? []
  const images = (ticket.maintenanceRecord?.workImages ?? []).map((image) => bffFileUrl(image.thumbnailUrl ?? image.url) ?? image.url)
  const current = statusStep(ticket.status)

  return <ShellPage>
    <div className="mb-6 flex items-center justify-between"><Link href="/tickets" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />All tickets</Link><div className="flex gap-2">{canManage && !editing && !['Closed', 'Completed'].includes(ticket.status) && <Button variant="outline" onClick={() => setEditing(true)}>Edit ticket</Button>}{canManage && editing && <><Button variant="outline" onClick={() => { setEditing(false); setPriority(ticket.priority); setDueDate(ticket.dueDate.slice(0, 10)); setRequestingParty(ticket.requestingParty ?? ''); setAssignedEngineerId(ticket.assignedEngineer?.id ?? '') }}><X className="h-4 w-4" />Cancel</Button><Button form="ticket-edit" type="submit" disabled={saving}><Save className="h-4 w-4" />Save changes</Button></>}{isEngineer && ['Open', 'Assigned'].includes(ticket.status) && <Button variant="outline" onClick={() => void startWork()}><Wrench className="h-4 w-4" />Start work</Button>}{canManage && ticket.status === 'Awaiting Verification' && <Button onClick={() => void verifyAndClose()} disabled={saving}><Check className="h-4 w-4" />Verify &amp; close</Button>}</div></div>
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Maintenance ticket / {ticket.ticketNo}</div><h1 className="text-3xl font-semibold tracking-tight">{ticket.faultDescription ?? ticket.maintenanceRecord?.problemDescription ?? ticket.serviceType}</h1><p className="mt-2 text-sm text-slate-500">{ticket.equipment.assetNo} · {ticket.equipment.equipmentType} · raised {ticket.createdDate.slice(0, 10)}</p></div><StatusBadge status={ticket.status} /></div>
    <Card className="mb-6 overflow-hidden"><div className="overflow-x-auto p-6"><div className="flex min-w-[640px] items-start justify-between">{steps.map((step, index) => <div key={step} className="relative flex flex-1 flex-col items-center text-center"><div className={`z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${index <= current ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'}`}>{index < current ? <Check className="h-4 w-4" /> : index + 1}</div>{index < steps.length - 1 && <div className={`absolute left-1/2 top-4 h-0.5 w-full ${index < current ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}<div className={`mt-3 max-w-[105px] text-[10px] font-semibold leading-4 ${index <= current ? 'text-blue-600' : 'text-slate-400'}`}>{step}</div></div>)}</div></div></Card>
    <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><div className="space-y-6"><Card className="p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-semibold">Maintenance record</h2><p className="mt-1 text-xs text-slate-500">Problem reported for this ticket, with engineer feedback on the work performed.</p></div><ClipboardCheck className="h-5 w-5 text-blue-600" /></div>
      <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problem statement</div><p className="mt-2 text-sm">{ticket.faultDescription ?? ticket.maintenanceRecord?.problemDescription ?? '—'}</p></div>
      <div className="mt-6 space-y-4"><div className="flex items-center justify-between gap-4"><div><h3 className="text-sm font-semibold">Inspection checklist</h3><p className="mt-1 text-xs text-slate-500">{completedChecklist} of {checklist.length} inspection items completed</p></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{checklist.length ? Math.round(completedChecklist / checklist.length * 100) : 0}%</span></div>
        <div className="space-y-4">{Object.entries(checklistByCategory).map(([category, items]) => <section key={category} className="overflow-hidden rounded-xl border"><div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3 dark:bg-slate-900/60"><h4 className="text-xs font-semibold uppercase tracking-wider">{category}</h4><span className="text-xs text-slate-500">{items.filter((item) => item.checked).length}/{items.length} complete</span></div><div className="grid gap-3 p-3 sm:grid-cols-2">{items.map((item) => <button key={item.id} type="button" role="checkbox" aria-checked={item.checked} aria-label={`${item.label} (${item.checked ? 'checked' : 'unchecked'})`} disabled={!isEngineer || ticket.status !== 'In Progress'} onClick={() => void toggleChecklist(item.id, !item.checked)} className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-blue-400 hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-default dark:hover:bg-blue-950/20"><span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${item.checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}><Check className="h-3.5 w-3.5" /></span><span className={`text-xs ${item.checked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>{item.label}</span></button>)}</div></section>)}</div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2"><RecordInput label="Parts used" value={partsUsed} placeholder="Enter parts, materials, or N/A" disabled={!isEngineer || ticket.status !== 'In Progress'} onChange={setPartsUsed} /><RecordInput label="Labour hours" type="number" min="0" step="0.5" value={labourHours} disabled={!isEngineer || ticket.status !== 'In Progress'} onChange={setLabourHours} /><RecordToggle label="Functional test" checked={functionalTestPassed} disabled={!isEngineer || ticket.status !== 'In Progress'} onChange={setFunctionalTestPassed} /><RecordToggle label="Safety check" checked={safetyCheckPassed} disabled={!isEngineer || ticket.status !== 'In Progress'} onChange={setSafetyCheckPassed} /><label className="rounded-xl border p-4 text-xs font-semibold"><span className="flex items-center gap-2"><ImageIcon className="h-4 w-4" />Feedback attachments</span><input className="mt-3 block w-full text-xs" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple disabled={!isEngineer || ticket.status !== 'In Progress'} onChange={(event) => setFeedbackFiles(Array.from(event.target.files ?? []))} />{feedbackFiles.length > 0 && <span className="mt-2 block text-slate-500">{feedbackFiles.map((file) => file.name).join(', ')}</span>}</label></div>
      <div className="mt-6 space-y-4"><h3 className="text-sm font-semibold">Engineer feedback</h3>{feedback.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">No feedback submitted yet.</div>}{feedback.map((entry) => <FeedbackCard key={entry.id} entry={entry} />)}</div>
      {isEngineer && ticket.status === 'In Progress' && <><label className="mt-5 block text-xs font-semibold">Add feedback<textarea className="mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950" value={feedbackDraft} onChange={(event) => setFeedbackDraft(event.target.value)} placeholder="Describe the work completed" /></label><div className="mt-4 flex justify-end"><Button onClick={() => void submitForVerification()} disabled={saving}><Send className="h-4 w-4" />{saving ? 'Submitting…' : 'Final submit'}</Button></div></>}</Card></div>
      <div className="space-y-6"><Card className="p-6"><h2 className="text-base font-semibold">Ticket information</h2>{editing ? <form id="ticket-edit" className="mt-5 grid gap-4" onSubmit={saveDetails}><Info label="Type" value={ticket.serviceType} /><label className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">Priority</span><Select className="h-8 w-32 text-xs" value={priority} onChange={(event) => setPriority(event.target.value)}>{priorities.map((value) => <option key={value}>{value}</option>)}</Select></label><Info label="Asset" value={`${ticket.equipment.assetNo} · ${ticket.equipment.equipmentType}`} />{canListEngineers && <label className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">Assigned engineer</span><Select className="h-8 w-40 text-xs" value={assignedEngineerId} onChange={(event) => setAssignedEngineerId(event.target.value)}><option value="" disabled>Select engineer</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</Select></label>}<label className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">Due date</span><Input type="date" className="h-8 w-40 text-xs" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label><label className="block border-b pb-3 text-xs"><span className="text-slate-500">Requesting party</span><Input className="mt-2 h-8 text-xs" value={requestingParty} onChange={(event) => setRequestingParty(event.target.value)} /></label></form> : <div className="mt-5 grid gap-4"><Info label="Type" value={ticket.serviceType} /><Info label="Priority" value={ticket.priority} /><Info label="Asset" value={`${ticket.equipment.assetNo} · ${ticket.equipment.equipmentType}`} /><Info label="Assigned engineer" value={ticket.assignedEngineer?.name ?? 'Unassigned'} /><Info label="Due date" value={ticket.dueDate.slice(0, 10)} /><Info label="Created by" value={ticket.createdBy?.name ?? '—'} /><Info label="Requesting party" value={ticket.requestingParty ?? '—'} /></div>}</Card>
        <Card><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-sm font-semibold">Equipment / parts</h2><p className="mt-1 text-xs text-slate-500">Linked requests for this ticket, if parts are needed</p></div>{canRequestParts && ticket.status !== 'Closed' && <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setRequestOpen(true)}><Plus className="h-3.5 w-3.5" />Request</Button>}</div><div className="divide-y">{(ticket.requests ?? []).map((request: ApiRequest) => <div key={request.id} className="flex items-center justify-between p-4"><div><div className="text-sm font-medium">{request.item} ×{request.quantity}</div><div className="text-xs text-slate-400">{request.reason}</div></div><StatusBadge status={request.status} /></div>)}{(ticket.requests ?? []).length === 0 && <div className="p-5 text-sm text-slate-500">No requests linked yet.</div>}</div></Card>
      </div></div>
    {requestOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Add request</h2><p className="mt-1 text-sm text-slate-500">Request parts needed for this ticket.</p></div><button type="button" onClick={() => setRequestOpen(false)} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div><form className="space-y-4" onSubmit={createRequest}><label className="block text-xs font-semibold">Item or part<Input className="mt-2" name="item" required /></label><label className="block text-xs font-semibold">Quantity<Input className="mt-2" name="quantity" type="number" min="1" defaultValue="1" required /></label><label className="block text-xs font-semibold">Reason<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-950" name="reason" minLength={2} required /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button><Button type="submit">Submit request</Button></div></form></div></div>}
  </ShellPage>
}

function Info({ label, value }: { label: string; value: string }) { return <div className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">{label}</span><span className="text-right font-medium">{value}</span></div> }

function RecordInput({ label, value, placeholder, type = 'text', min, step, disabled, onChange }: { label: string; value: string; placeholder?: string; type?: string; min?: string; step?: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="text-xs font-semibold">{label}<Input className="mt-2" type={type} min={min} step={step} placeholder={placeholder} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /></label>
}

function RecordToggle({ label, checked, disabled, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between rounded-xl border p-4 text-xs font-semibold">{label}<input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>
}

function FeedbackCard({ entry }: { entry: TicketFeedback }) {
  return <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{entry.author?.name ?? 'Engineer'}</span><span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span></div><div className="mt-2 text-sm text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: entry.bodyHtml }} />{entry.images?.length ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{entry.images.map((image) => <img key={image.id} src={bffFileUrl(image.thumbnailUrl ?? image.url)} alt="Feedback attachment" className="h-20 w-full rounded-lg border object-cover" />)}</div> : null}</div>
}

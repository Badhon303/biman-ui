'use client'

import { DragEvent, FormEvent, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Ban, Bold, Check, ClipboardCheck, Image as ImageIcon, Italic, List, Loader2, Lock, Pencil, Plus, Save, Send, Trash2, Undo2, Wrench, X } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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

function hasFeedbackContent(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|&#160;|&#xA0;/gi, ' ').trim().length > 0
}

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
  const [maintenanceAction, setMaintenanceAction] = useState<'save' | 'submit' | null>(null)
  const [priority, setPriority] = useState('Medium')
  const [dueDate, setDueDate] = useState('')
  const [requestingParty, setRequestingParty] = useState('')
  const [assignedEngineerId, setAssignedEngineerId] = useState('')
  const [partsUsed, setPartsUsed] = useState('')
  const [labourHours, setLabourHours] = useState('0')
  const [functionalTestPassed, setFunctionalTestPassed] = useState(false)
  const [safetyCheckPassed, setSafetyCheckPassed] = useState(false)
  const [feedbackDraft, setFeedbackDraft] = useState('')
  const [otherProgressChanged, setOtherProgressChanged] = useState(false)
  const [composerKey, setComposerKey] = useState(0)
  const [requestOpen, setRequestOpen] = useState(false)
  const [returnOpen, setReturnOpen] = useState(false)
  const [uploading, setUploading] = useState(false)

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
      setOtherProgressChanged(true)
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

  const saveMaintenance = (ticketId: string) => apiRequest(`tickets/${encodeURIComponent(ticketId)}/maintenance`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ partsUsed, labourHours: Number(labourHours) || 0, functionalTestPassed, safetyCheckPassed }) })

  const saveProgress = async () => {
    if (!ticket) return
    setMaintenanceAction('save')
    setSaving(true)
    try {
      await saveMaintenance(ticket.id)
      if (hasFeedbackContent(feedbackDraft)) {
        await apiRequest<FeedbackResponse>(`tickets/${encodeURIComponent(ticket.id)}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bodyHtml: feedbackDraft.trim() }) })
        setFeedbackDraft('')
        setComposerKey((key) => key + 1)
      }
      await load()
      setOtherProgressChanged(false)
      toast.success('Maintenance record saved')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Unable to save maintenance record.') }
    finally { setSaving(false); setMaintenanceAction(null) }
  }

  const uploadWorkImages = async (files: File[]) => {
    if (!ticket || !files.length) return
    const remaining = 10 - (ticket.maintenanceRecord?.workImages?.length ?? 0)
    if (files.length > remaining) { toast.error(remaining > 0 ? `You can add ${remaining} more image${remaining === 1 ? '' : 's'} (10 max).` : 'This ticket already has 10 work images.'); return }
    setUploading(true)
    try {
      for (const file of files) {
        const form = new FormData()
        form.append('file', file)
        form.append('purpose', 'WORK_IMAGE')
        form.append('ownerId', ticket.id)
        const uploaded = await apiRequest<{ id: string }>('files/images', { method: 'POST', body: form })
        await apiRequest(`files/${encodeURIComponent(uploaded.id)}/attach`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ticketId: ticket.id }) })
        setOtherProgressChanged(true)
      }
      toast.success(`${files.length} image${files.length === 1 ? '' : 's'} uploaded`)
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Unable to upload images.') }
    finally { await load(); setUploading(false) }
  }

  const deleteWorkImage = async (imageId: string) => {
    if (!ticket) return false
    try {
      await apiRequest(`files/${encodeURIComponent(imageId)}`, { method: 'DELETE' })
      setOtherProgressChanged(true)
      await load()
      toast.success('Work image deleted')
      return true
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete work image.')
      return false
    }
  }

  const returnToEngineer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ticket) return
    const reason = String(new FormData(event.currentTarget).get('reason')).trim()
    setSaving(true)
    try {
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/return`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) })
      setReturnOpen(false)
      await load()
      toast.success('Ticket returned to engineer')
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Unable to return ticket.') }
    finally { setSaving(false) }
  }

  const submitForVerification = async () => {
    if (!ticket) return
    const bodyHtml = feedbackDraft.trim()
    const items = (ticket.maintenanceRecord?.inspectionChecklist ?? ticket.maintenanceRecord?.checklistItems ?? []).filter((item) => item.applicable !== false)
    const pending = items.filter((item) => !item.checked).length
    if (pending) { toast.error(`Complete the inspection checklist first (${pending} item${pending === 1 ? '' : 's'} remaining)`); return }
    if (!functionalTestPassed || !safetyCheckPassed) { toast.error('Functional test and safety check must pass before submitting'); return }
    if (!hasFeedbackContent(bodyHtml) && !(ticket.feedback?.length)) { toast.error('Add engineer feedback before submitting the maintenance record'); return }
    setMaintenanceAction('submit')
    setSaving(true)
    try {
      await saveMaintenance(ticket.id)
      if (hasFeedbackContent(bodyHtml)) {
        await apiRequest<FeedbackResponse>(`tickets/${encodeURIComponent(ticket.id)}/feedback`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ bodyHtml }) })
      }
      await apiRequest(`tickets/${encodeURIComponent(ticket.id)}/submit`, { method: 'POST' })
      setFeedbackDraft('')
      setComposerKey((key) => key + 1)
      await load()
      toast.success('Maintenance record submitted — awaiting admin verification')
    } catch (cause) {
      await load()
      toast.error(cause instanceof Error ? cause.message : 'Unable to submit maintenance record.')
    } finally { setSaving(false); setMaintenanceAction(null) }
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

  if (loading) return <><Card className="p-10 text-center text-sm text-slate-500">Loading ticket…</Card></>
  if (error || !ticket) return <><Card className="p-10 text-center text-sm text-rose-600">{error || 'Ticket not found.'}</Card></>

  const checklist = ticket.maintenanceRecord?.inspectionChecklist ?? ticket.maintenanceRecord?.checklistItems ?? []
  const showInspectionChecklist = !['Breakdown', 'Washing', 'General'].includes(ticket.serviceType)
  const checklistByCategory = checklist.reduce<Record<string, typeof checklist>>((groups, item) => { (groups[item.category] ??= []).push(item); return groups }, {})
  const isApplicable = (item: (typeof checklist)[number]) => item.applicable !== false
  const applicableChecklist = checklist.filter(isApplicable)
  const completedChecklist = applicableChecklist.filter((item) => item.checked).length
  const canEditRecord = isEngineer && ['In Progress', 'Awaiting Parts'].includes(ticket.status)
  const recordLocked = ['Awaiting Verification', 'Completed', 'Closed'].includes(ticket.status)
  const progressChanged = otherProgressChanged || hasFeedbackContent(feedbackDraft)
    || partsUsed !== (ticket.maintenanceRecord?.partsUsed ?? '')
    || (Number(labourHours) || 0) !== (ticket.maintenanceRecord?.labourHours ?? 0)
    || functionalTestPassed !== (ticket.maintenanceRecord?.functionalTestPassed ?? false)
    || safetyCheckPassed !== (ticket.maintenanceRecord?.safetyCheckPassed ?? false)
  const recordNotice = canEditRecord ? null
    : recordLocked ? `Maintenance record is locked — ${ticket.status === 'Awaiting Verification' ? 'submitted for admin verification' : 'ticket has been closed'}. No further changes can be made.`
    : isEngineer ? ['Open', 'Assigned'].includes(ticket.status) ? `Start work to fill in the ${showInspectionChecklist ? 'inspection checklist, ' : ''}maintenance record and pictures.` : `Maintenance record is read-only while the ticket is ${ticket.status.toLowerCase()}.`
    : 'Read-only view. Only the assigned engineer can fill in the maintenance record.'
  const feedback: TicketFeedback[] = ticket.feedback ?? []
  const history = [...(ticket.history ?? [])].reverse()
  const images = (ticket.maintenanceRecord?.workImages ?? []).map((image) => ({ id: image.id, thumb: bffFileUrl(image.thumbnailUrl ?? image.url) ?? image.url, full: bffFileUrl(image.url) ?? image.url }))
  const current = statusStep(ticket.status)

  return <>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><Link href="/tickets" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"><ArrowLeft className="h-4 w-4" />All tickets</Link><div className="flex flex-wrap justify-end gap-2">{canManage && !editing && !['Closed', 'Completed'].includes(ticket.status) && <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" />Edit ticket</Button>}{canManage && editing && <><Button variant="outline" onClick={() => { setEditing(false); setPriority(ticket.priority); setDueDate(ticket.dueDate.slice(0, 10)); setRequestingParty(ticket.requestingParty ?? ''); setAssignedEngineerId(ticket.assignedEngineer?.id ?? '') }}><X className="h-4 w-4" />Cancel</Button><Button form="ticket-edit" type="submit" disabled={saving}><Save className="h-4 w-4" />Save changes</Button></>}{isEngineer && ['Open', 'Assigned'].includes(ticket.status) && <Button variant="outline" onClick={() => void startWork()}><Wrench className="h-4 w-4" />Start work</Button>}{canManage && ticket.status === 'Awaiting Verification' && <><Button variant="outline" onClick={() => setReturnOpen(true)} disabled={saving}><Undo2 className="h-4 w-4" />Return to engineer</Button><Button onClick={() => void verifyAndClose()} disabled={saving}><Check className="h-4 w-4" />Verify &amp; close</Button></>}</div></div>
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Maintenance ticket / {ticket.ticketNo}</div><h1 className="text-3xl font-semibold tracking-tight">{ticket.faultDescription ?? ticket.maintenanceRecord?.problemDescription ?? ticket.serviceType}</h1><p className="mt-2 text-sm text-slate-500">{ticket.equipment.assetNo} · {ticket.equipment.equipmentType} · raised {ticket.createdDate.slice(0, 10)}</p></div><StatusBadge status={ticket.status} /></div>
    <Card className="mb-6 overflow-hidden"><div className="overflow-x-auto p-6"><div className="flex min-w-[640px] items-start justify-between">{steps.map((step, index) => <div key={step} className="relative flex flex-1 flex-col items-center text-center"><div className={`z-10 grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-bold ${index <= current ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-900'}`}>{index < current ? <Check className="h-4 w-4" /> : index + 1}</div>{index < steps.length - 1 && <div className={`absolute left-1/2 top-4 h-0.5 w-full ${index < current ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />}<div className={`mt-3 max-w-[105px] text-[10px] font-semibold leading-4 ${index <= current ? 'text-blue-600' : 'text-slate-400'}`}>{step}</div></div>)}</div></div></Card>
    <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><div className="space-y-6"><Card className="p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-base font-semibold">Maintenance record</h2><p className="mt-1 text-xs text-slate-500">Problem reported for this ticket, with engineer feedback on the work performed.</p></div><ClipboardCheck className="h-5 w-5 text-blue-600" /></div>
      {recordNotice && <div className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs ${recordLocked ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300'}`}><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" /><span>{recordNotice}</span></div>}
      <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60"><div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Problem statement</div><p className="mt-2 text-sm">{ticket.faultDescription ?? ticket.maintenanceRecord?.problemDescription ?? '—'}</p></div>
      {showInspectionChecklist && <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold">Inspection checklist</h3>
            <p className="mt-1 text-xs text-slate-500">
              {completedChecklist} of {applicableChecklist.length} inspection items completed
              {checklist.length > applicableChecklist.length && <> · {checklist.length - applicableChecklist.length} not applicable to {ticket.serviceType}</>}
            </p>
          </div>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
            {applicableChecklist.length ? Math.round((completedChecklist / applicableChecklist.length) * 100) : 0}%
          </span>
        </div>
        <div className="space-y-4">
          {Object.entries(checklistByCategory).map(([category, items]) => {
            const applicableItems = items.filter(isApplicable)
            return (
              <section key={category} className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3 dark:bg-slate-900/60">
                  <h4 className="text-xs font-semibold uppercase tracking-wider">{category}</h4>
                  <span className="text-xs text-slate-500">
                    {applicableItems.length ? `${applicableItems.filter((item) => item.checked).length}/${applicableItems.length} complete` : 'Not applicable'}
                  </span>
                </div>
                <div className="grid gap-3 p-3 sm:grid-cols-2">
                  {items.map((item) => isApplicable(item) ? (
                    <button
                      key={item.id}
                      type="button"
                      role="checkbox"
                      aria-checked={item.checked}
                      aria-label={`${item.label} (${item.checked ? 'checked' : 'unchecked'})`}
                      disabled={!canEditRecord}
                      onClick={() => void toggleChecklist(item.id, !item.checked)}
                      className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition enabled:hover:border-blue-400 enabled:hover:bg-blue-50/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-default dark:enabled:hover:bg-blue-950/20"
                    >
                      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border ${item.checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-transparent dark:border-slate-600'}`}>
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className={`text-xs ${item.checked ? 'text-slate-700 dark:text-slate-200' : 'text-slate-500'}`}>{item.label}</span>
                    </button>
                  ) : (
                    <div
                      key={item.id}
                      role="checkbox"
                      aria-checked={false}
                      aria-disabled
                      aria-label={`${item.label} (not applicable to ${ticket.serviceType})`}
                      title={`Not performed in ${ticket.serviceType}`}
                      className="flex w-full cursor-not-allowed items-start gap-3 rounded-lg border border-dashed bg-slate-50/70 p-3 text-left opacity-60 dark:bg-slate-900/40"
                    >
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                        <Ban className="h-3 w-3" />
                      </span>
                      <span className="flex min-w-0 flex-1 items-start justify-between gap-2">
                        <span className="text-xs text-slate-400 line-through">{item.label}</span>
                        <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">N/A</span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <RecordInput label="Parts used" value={partsUsed} placeholder="Enter parts, materials, or N/A" disabled={!canEditRecord} onChange={setPartsUsed} />
        <RecordInput label="Labour hours" type="number" min="0" step="0.5" value={labourHours} disabled={!canEditRecord} onChange={setLabourHours} />
        <RecordToggle label="Functional test" checked={functionalTestPassed} disabled={!canEditRecord} onChange={setFunctionalTestPassed} />
        <RecordToggle label="Safety check" checked={safetyCheckPassed} disabled={!canEditRecord} onChange={setSafetyCheckPassed} />
        <WorkImages images={images} canUpload={canEditRecord} uploading={uploading} onUpload={(files) => void uploadWorkImages(files)} onDelete={deleteWorkImage} />
      </div>
      <div className="mt-6 space-y-4"><h3 className="text-sm font-semibold">Engineer feedback</h3>{!canEditRecord && feedback.length === 0 && <div className="rounded-xl border border-dashed p-5 text-center text-sm text-slate-400">No feedback submitted yet.</div>}{feedback.map((entry) => <FeedbackCard key={entry.id} entry={entry} />)}</div>
      {canEditRecord && <><FeedbackComposer key={composerKey} onChange={setFeedbackDraft} /><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => void saveProgress()} disabled={saving || !progressChanged}>{maintenanceAction === 'save' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{maintenanceAction === 'save' ? 'Saving…' : 'Save progress'}</Button><Button onClick={() => void submitForVerification()} disabled={saving}>{maintenanceAction === 'submit' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{maintenanceAction === 'submit' ? 'Submitting…' : 'Final submit'}</Button></div></>}</Card></div>
      <div className="space-y-6"><Card className="p-6"><h2 className="text-base font-semibold">Ticket information</h2>{editing ? <form id="ticket-edit" className="mt-5 grid gap-4" onSubmit={saveDetails}><Info label="Type" value={ticket.serviceType} /><label className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">Priority</span><Select className="h-8 w-32 text-xs" value={priority} onChange={(event) => setPriority(event.target.value)}>{priorities.map((value) => <option key={value}>{value}</option>)}</Select></label><Info label="Asset" value={`${ticket.equipment.assetNo} · ${ticket.equipment.equipmentType}`} />{canListEngineers && <label className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">Assigned engineer</span><Select className="h-8 w-40 text-xs" value={assignedEngineerId} onChange={(event) => setAssignedEngineerId(event.target.value)}><option value="" disabled>Select engineer</option>{engineers.map((engineer) => <option key={engineer.id} value={engineer.id}>{engineer.name}</option>)}</Select></label>}<label className="flex items-center justify-between gap-4 border-b pb-3 text-xs"><span className="text-slate-500">Due date</span><Input type="date" className="h-8 w-40 text-xs" value={dueDate} onChange={(event) => setDueDate(event.target.value)} required /></label><label className="block border-b pb-3 text-xs"><span className="text-slate-500">Requesting party</span><Input className="mt-2 h-8 text-xs" value={requestingParty} onChange={(event) => setRequestingParty(event.target.value)} /></label></form> : <div className="mt-5 grid gap-4"><Info label="Type" value={ticket.serviceType} /><Info label="Priority" value={ticket.priority} /><Info label="Asset" value={`${ticket.equipment.assetNo} · ${ticket.equipment.equipmentType}`} /><Info label="Assigned engineer" value={ticket.assignedEngineer?.name ?? 'Unassigned'} /><Info label="Due date" value={ticket.dueDate.slice(0, 10)} /><Info label="Created by" value={ticket.createdBy?.name ?? '—'} /><Info label="Requesting party" value={ticket.requestingParty ?? '—'} /></div>}</Card>
        <Card><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-sm font-semibold">Equipment / parts</h2><p className="mt-1 text-xs text-slate-500">Linked requests for this ticket, if parts are needed</p></div>{canRequestParts && ticket.status !== 'Closed' && <Button variant="outline" className="h-8 px-2 text-xs" onClick={() => setRequestOpen(true)}><Plus className="h-3.5 w-3.5" />Request</Button>}</div><div className="divide-y">{(ticket.requests ?? []).map((request: ApiRequest) => <div key={request.id} className="flex items-center justify-between p-4"><div><div className="text-sm font-medium">{request.item} ×{request.quantity}</div><div className="text-xs text-slate-400">{request.reason}</div></div><StatusBadge status={request.status} /></div>)}{(ticket.requests ?? []).length === 0 && <div className="p-5 text-sm text-slate-500">No requests linked yet.</div>}</div></Card>
        <Card><div className="flex items-center justify-between border-b p-5"><div><h2 className="text-sm font-semibold">Ticket history</h2><p className="mt-1 text-xs text-slate-500">Activity and status changes, newest first</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{history.length}</span></div><div className="divide-y">{history.map((entry) => <div key={entry.id} className="p-4"><p className="whitespace-pre-wrap text-sm">{entry.label}</p><p className="mt-1 text-xs text-slate-400">{new Date(entry.timestamp).toLocaleString()}{entry.actor ? ` · ${entry.actor}` : ''}</p></div>)}{history.length === 0 && <div className="p-5 text-sm text-slate-500">No ticket history.</div>}</div></Card>
      </div></div>
    {requestOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Add request</h2><p className="mt-1 text-sm text-slate-500">Request parts needed for this ticket.</p></div><button type="button" onClick={() => setRequestOpen(false)} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div><form className="space-y-4" onSubmit={createRequest}><label className="block text-xs font-semibold">Item or part<Input className="mt-2" name="item" required /></label><label className="block text-xs font-semibold">Quantity<Input className="mt-2" name="quantity" type="number" min="1" defaultValue="1" required /></label><label className="block text-xs font-semibold">Reason<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-950" name="reason" minLength={2} required /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRequestOpen(false)}>Cancel</Button><Button type="submit">Submit request</Button></div></form></div></div>}
    {returnOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Return to engineer</h2><p className="mt-1 text-sm text-slate-500">The ticket goes back to In progress so the engineer can correct the maintenance record.</p></div><button type="button" onClick={() => setReturnOpen(false)} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div><form className="space-y-4" onSubmit={returnToEngineer}><label className="block text-xs font-semibold">Reason<textarea className="mt-2 min-h-24 w-full rounded-lg border bg-white px-3 py-2 text-sm dark:bg-slate-950" name="reason" minLength={2} required placeholder="What needs to be corrected?" /></label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setReturnOpen(false)}>Cancel</Button><Button type="submit" disabled={saving}><Undo2 className="h-4 w-4" />Return ticket</Button></div></form></div></div>}
  </>
}

function Info({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-4 border-b pb-3 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-right text-xs font-semibold">{value}</span>
    </div>
  )
}

function RecordInput({ label, value, placeholder, type = 'text', min, step, disabled, onChange }: Readonly<{ label: string; value: string; placeholder?: string; type?: 'text' | 'number'; min?: string; step?: string; disabled?: boolean; onChange: (value: string) => void }>) {
  return (
    <label className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <input
        className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:focus:bg-slate-900"
        type={type}
        value={value}
        min={min}
        step={step}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function RecordToggle({ label, checked, disabled, onChange }: Readonly<{ label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`flex items-center justify-between rounded-xl border p-3 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-default ${
        checked
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
          : 'border-slate-200 bg-white enabled:hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      <span>
        <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className={`mt-1 block text-sm font-semibold ${checked ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500'}`}>{checked ? 'Passed' : 'Pending'}</span>
      </span>
      <span className={`relative h-6 w-11 rounded-full p-1 transition ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
        <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  )
}

const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

function WorkImages({ images, canUpload, uploading, onUpload, onDelete }: Readonly<{ images: { id: string; thumb: string; full: string }[]; canUpload: boolean; uploading: boolean; onUpload: (files: File[]) => void; onDelete: (id: string) => Promise<boolean> }>) {
  const [isDragging, setIsDragging] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (await onDelete(deleteTarget.id)) setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }
  const addFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []).filter((file) => acceptedImageTypes.includes(file.type))
    if (list?.length && !files.length) toast.error('Only JPEG, PNG, WebP and AVIF images are accepted.')
    if (files.length) onUpload(files)
  }
  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!uploading) addFiles(event.dataTransfer.files)
  }
  if (!canUpload && !images.length) return <div className="sm:col-span-2 rounded-2xl border border-dashed p-5 text-center text-sm text-slate-400">No work images uploaded.</div>

  return (
    <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Work images</h3>
          <p className="mt-1 text-xs text-slate-500">{canUpload ? 'Photos are saved to the ticket as soon as they are uploaded (up to 10).' : 'Photos uploaded by the engineer.'}</p>
        </div>
        {images.length > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">{images.length} image{images.length === 1 ? '' : 's'}</span>}
      </div>
      {canUpload && images.length < 10 && (
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`mb-4 rounded-xl border-2 border-dashed p-6 text-center transition ${isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-slate-200 bg-slate-50/70 hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700 dark:bg-slate-950/40 dark:hover:border-blue-700'}`}
        >
          {uploading ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" /> : <ImageIcon className={`mx-auto h-8 w-8 ${isDragging ? 'text-blue-600' : 'text-slate-400'}`} />}
          <p className="mt-3 text-sm font-medium">{uploading ? 'Uploading…' : isDragging ? 'Drop images here' : 'Drag and drop images here'}</p>
          <p className="mt-1 text-xs text-slate-500">or select image files from your device</p>
          <label className={`mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition ${uploading ? 'pointer-events-none opacity-60' : 'cursor-pointer hover:bg-blue-700'}`}>
            <ImageIcon className="h-3.5 w-3.5" />Choose images
            <input type="file" accept={acceptedImageTypes.join(',')} multiple disabled={uploading} className="sr-only" onChange={(event) => { addFiles(event.target.files); event.target.value = '' }} />
          </label>
        </div>
      )}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <div key={image.id} className="group relative aspect-video overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
              <a href={image.full} target="_blank" rel="noreferrer" className="block h-full w-full">
                <img src={image.thumb} alt="Work attachment" className="h-full w-full object-cover transition group-hover:scale-105" />
              </a>
              {canUpload && <button type="button" className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-lg bg-rose-600 text-white shadow transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:opacity-50" aria-label="Delete work image" title="Delete work image" disabled={uploading || deleting} onClick={() => setDeleteTarget({ id: image.id })}><Trash2 className="h-4 w-4" /></button>}
            </div>
          ))}
        </div>
      )}
      <ConfirmDialog open={!!deleteTarget} title="Delete work image" description="Permanently delete this image from the maintenance record?" confirmLabel="Delete image" loading={deleting} onConfirm={() => void confirmDelete()} onCancel={() => setDeleteTarget(null)} />
    </div>
  )
}

function FeedbackComposer({ onChange }: Readonly<{ onChange: (html: string) => void }>) {
  const editorRef = useRef<HTMLDivElement>(null)
  const format = (command: string) => {
    editorRef.current?.focus()
    document.execCommand(command)
    onChange(editorRef.current?.innerHTML ?? '')
  }
  const tools = [{ command: 'bold', label: 'Bold', Icon: Bold }, { command: 'italic', label: 'Italic', Icon: Italic }, { command: 'insertUnorderedList', label: 'Bullet list', Icon: List }]

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="engineer-feedback-editor" className="text-xs font-semibold">Engineer feedback</label>
        <span className="text-[10px] text-slate-400">Rich text</span>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 border-b bg-slate-50 p-1.5 dark:bg-slate-950">
          {tools.map(({ command, label, Icon }) => (
            <button key={command} type="button" className="rounded-md p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800" aria-label={label} onMouseDown={(event) => event.preventDefault()} onClick={() => format(command)}><Icon className="h-3.5 w-3.5" /></button>
          ))}
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

function FeedbackCard({ entry }: { entry: TicketFeedback }) {
  return <div className="rounded-xl border p-4"><div className="flex items-center justify-between"><span className="text-sm font-semibold">{entry.author?.name ?? 'Engineer'}</span><span className="text-xs text-slate-400">{new Date(entry.createdAt).toLocaleString()}</span></div><div className="mt-2 text-sm text-slate-700 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: entry.bodyHtml }} />{entry.images?.length ? <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">{entry.images.map((image) => <img key={image.id} src={bffFileUrl(image.thumbnailUrl ?? image.url)} alt="Feedback attachment" className="h-20 w-full rounded-lg border object-cover" />)}</div> : null}</div>
}

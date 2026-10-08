'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { Check, Plus, X } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { focusedRowClass, useFocusedRow } from '@/components/use-focused-row'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { PlaneLoader } from '@/components/ui/plane-loader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { TD, TH, TBody, THead, TR, Table } from '@/components/ui/table'
import { apiRequest } from '@/lib/api-client'
import { ApiRequest, ApiTicket, fetchAllPages } from '@/lib/api-data'
import { toast } from 'sonner'

export function RequestsPage() {
  const { role, user } = useRole()
  const [rows, setRows] = useState<ApiRequest[]>([])
  const [tickets, setTickets] = useState<ApiTicket[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [rejectionRequest, setRejectionRequest] = useState<ApiRequest | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [updatingRequest, setUpdatingRequest] = useState<{ id: string; action: 'approve' | 'receive' } | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canCreate = ['Engineer', 'Manager', 'Super Admin'].includes(role ?? '')
  const canApprove = ['Biman Admin', 'Manager', 'Super Admin'].includes(role ?? '')
  const focus = useFocusedRow(!loading)
  const filteredRows = statusFilter ? rows.filter((request) => request.status === statusFilter) : rows

  const load = async () => {
    try {
      setRows(await fetchAllPages<ApiRequest>('requests'))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load requests.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (canCreate) void fetchAllPages<ApiTicket>('tickets').then(setTickets).catch((cause) => toast.error(cause instanceof Error ? cause.message : 'Unable to load tickets.'))
  }, [canCreate])

  const decide = async (request: ApiRequest, action: 'approve' | 'reject' | 'receive', reason?: string) => {
    let body: { reason: string } | undefined
    if (action === 'reject') {
      if (reason === undefined) {
        setRejectionRequest(request)
        setRejectionReason('')
        return
      }
      const trimmedReason = reason.trim()
      if (trimmedReason.length < 2) { toast.error('Enter a rejection reason of at least two characters.'); return }
      body = { reason: trimmedReason }
      setRejecting(true)
    } else {
      setUpdatingRequest({ id: request.id, action })
    }
    try {
      await apiRequest(`requests/${encodeURIComponent(request.id)}/${action}`, {
        method: 'POST',
        ...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
      })
      if (action === 'reject') setRejectionRequest(null)
      await load()
      toast.success(action === 'receive' ? 'Request marked as received' : action === 'approve' ? 'Request approved' : 'Request rejected')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to update request.')
    } finally {
      if (action === 'reject') setRejecting(false)
      else setUpdatingRequest(null)
    }
  }

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const partNumber = form.get('partNumber')
    const reason = String(form.get('reason')).trim()
    const body = {
      ticketId: String(form.get('ticketId')),
      item: String(form.get('item')).trim(),
      quantity: Number(form.get('quantity')),
      ...(partNumber ? { partNumber: Number(partNumber) } : {}),
      ...(reason ? { reason } : {}),
    }
    setCreating(true)
    try {
      await apiRequest('requests', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      setCreateOpen(false)
      await load()
      toast.success('Request submitted for approval')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to submit request.')
    } finally {
      setCreating(false)
    }
  }

  return <>
    <PageHeader eyebrow="Maintenance / Requests" title="Equipment & parts requests" subtitle="A request-and-approval record linked to maintenance work — not an inventory system." action={canCreate ? <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create request</Button> : undefined} />
    <Card>
      <div className="flex items-center justify-between gap-4 border-b p-5"><div><h2 className="text-sm font-semibold">All requests</h2><p className="mt-1 text-xs text-slate-500">{filteredRows.length} of {rows.length} records across active tickets</p></div><Select className="h-9" aria-label="Filter requests by status" value={statusFilter} onValueChange={setStatusFilter}><option value="">All statuses</option>{['Pending', 'Approved', 'Rejected', 'Received'].map((status) => <option key={status} value={status}>{status}</option>)}</Select></div>
      {loading ? <PlaneLoader label="Loading requests…" /> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
        <Table><THead><TR><TH>Request ID</TH><TH>Item</TH><TH>Linked ticket / asset</TH><TH>Requested by</TH><TH>Date</TH><TH>Status</TH><TH>Approved by</TH><TH></TH></TR></THead><TBody>
          {filteredRows.map((request) => <TR key={request.id} id={`row-${request.id}`} className={focus === request.id ? focusedRowClass : ''}>
            <TD className="font-semibold">{request.requestNo}</TD>
            <TD><div className="font-medium">{request.item}{request.partNumber != null && ` · #${request.partNumber}`} ×{request.quantity}</div>{request.reason && <div className="max-w-[220px] truncate text-xs text-slate-400">{request.reason}</div>}</TD>
            <TD><Link href={`/tickets/${request.ticket?.id ?? request.ticketId}`} className="font-medium text-blue-600">{request.ticket?.ticketNo ?? request.ticketId}</Link><div className="text-xs text-slate-400">{request.equipment?.assetNo ?? request.ticket?.equipment?.assetNo ?? '—'}</div></TD>
            <TD>{request.requestedBy?.name ?? user?.name ?? '—'}</TD><TD>{new Date(request.createdAt).toLocaleDateString()}</TD><TD><StatusBadge status={request.status as 'Pending' | 'Approved' | 'Rejected' | 'Received'} /></TD>
            <TD>{request.approvedBy ? <><div>{request.approvedBy.name}</div><div className="text-xs text-slate-400">{request.approvedAt ? new Date(request.approvedAt).toLocaleDateString() : ''}</div></> : <span className="text-slate-400">—</span>}</TD>
            <TD>{canApprove && request.status === 'Pending' ? <div className="flex gap-1"><Button className="h-8 px-2 text-xs" onClick={() => void decide(request, 'approve')} disabled={updatingRequest !== null} loading={updatingRequest?.id === request.id && updatingRequest.action === 'approve'} loadingText="Approving…"><Check className="h-3 w-3" />Approve</Button><Button variant="danger" className="h-8 px-2 text-xs" onClick={() => void decide(request, 'reject')} disabled={updatingRequest !== null}><X className="h-3 w-3" />Reject</Button></div> : canApprove && request.status === 'Approved' ? <Button className="h-8 px-2 text-xs" onClick={() => void decide(request, 'receive')} disabled={updatingRequest !== null} loading={updatingRequest?.id === request.id && updatingRequest.action === 'receive'} loadingText="Receiving…">Mark received</Button> : null}</TD>
          </TR>)}
        </TBody></Table>
        {filteredRows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">{rows.length === 0 ? 'No requests found.' : 'No requests match this status.'}</div>}
      </>}
    </Card>
    {rejectionRequest && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div role="dialog" aria-modal="true" aria-labelledby="reject-request-title" className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-5 flex items-start justify-between"><div><h2 id="reject-request-title" className="text-lg font-semibold">Reject request</h2><p className="mt-1 text-sm text-slate-500">Provide a reason for rejecting {rejectionRequest.requestNo} ({rejectionRequest.item}).</p></div><button type="button" onClick={() => setRejectionRequest(null)} disabled={rejecting} className="text-2xl leading-none text-slate-400 disabled:opacity-50" aria-label="Close modal">×</button></div>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void decide(rejectionRequest, 'reject', rejectionReason) }}>
        <label className="block text-xs font-semibold">Rejection reason<textarea autoFocus className="mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} minLength={2} required disabled={rejecting} placeholder="Explain why this request is being rejected" /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRejectionRequest(null)} disabled={rejecting}>Cancel</Button><Button type="submit" variant="danger" loading={rejecting} loadingText="Rejecting request">Reject request</Button></div>
      </form>
    </div></div>}
    {createOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Create equipment request</h2><p className="mt-1 text-sm text-slate-500">Submit a parts or equipment request for approval.</p></div><button type="button" onClick={() => setCreateOpen(false)} className="text-2xl leading-none text-slate-400 disabled:opacity-50" aria-label="Close modal" disabled={creating}>×</button></div>
      <form className="space-y-4" onSubmit={create}><div className="grid gap-4 sm:grid-cols-2">
        <label className="text-xs font-semibold">Parts name<Input className="mt-2" name="item" placeholder="Hydraulic hose" required /></label>
        <label className="text-xs font-semibold">Quantity<Input className="mt-2" name="quantity" type="number" min="1" defaultValue="1" required /></label>
        <label className="text-xs font-semibold">Parts Number<Input className="mt-2" name="partNumber" type="number" min="0" step="1" /></label>
        <label className="text-xs font-semibold sm:col-span-2">Linked ticket<Select searchable aria-label="Linked ticket" className="mt-2 w-full" name="ticketId" defaultValue="" required><option value="" disabled>Select ticket</option>{tickets.map((ticket) => <option key={ticket.id} value={ticket.id}>{ticket.ticketNo} · {ticket.faultDescription ?? ticket.maintenanceRecord?.problemDescription ?? ticket.equipment.assetNo}</option>)}</Select></label>
      </div><label className="block text-xs font-semibold">Reason (optional)<textarea className="mt-2 min-h-28 w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 dark:bg-slate-950" name="reason" placeholder="Explain why this item is needed" minLength={2} /></label>
      <div className="flex justify-end gap-2 pt-2"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button><Button type="submit" loading={creating} loadingText="Submitting request"><Plus className="h-4 w-4" />Submit request</Button></div></form>
    </div></div>}
  </>
}

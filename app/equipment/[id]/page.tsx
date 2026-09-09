'use client'

import { useState } from 'react'
import { ArrowLeft, Calendar, Check, FileText, Printer, QrCode, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ShellPage } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge, StatusBadge } from '@/components/ui/badge'
import { equipment, getEquipment, tickets } from '@/lib/mock-data'
import { toast } from 'sonner'

const tabs = ['Overview', 'Specifications', 'Documents', 'Logbook'] as const
type EquipmentTab = (typeof tabs)[number]

export default function EquipmentProfile() {
  const { id } = useParams<{ id: string }>()
  const e = getEquipment(id) ?? equipment[0]
  const [tab, setTab] = useState<EquipmentTab>('Overview')
  const history = tickets.filter((ticket) => ticket.equipmentId === e.id)

  return (
    <ShellPage>
      <div className="mb-6 flex items-center justify-between">
        <Link href="/equipment" className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" />Equipment List
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => toast.success('Print dialog opened (mock)')}><Printer className="h-4 w-4" />Print</Button>
          <Button onClick={() => toast.success('QR code generated (mock)')}><QrCode className="h-4 w-4" />Generate QR</Button>
        </div>
      </div>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Digital logbook / {e.assetNo}</div>
          <h1 className="text-3xl font-semibold tracking-tight">{e.type}</h1>
          <p className="mt-2 text-sm text-slate-500">{e.manufacturer} {e.model} · {e.location}</p>
        </div>
        <StatusBadge status={e.status} />
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
              <div className="grid gap-6 sm:grid-cols-2">
                <Info label="Biman serial number" value={e.bimanSerialNo} />
                <Info label="Location" value={e.location} />
                <Info label="Status" value={e.status} />
                <Info label="Hour meter" value={e.hourMeter !== undefined ? `${e.hourMeter} hours` : 'Not recorded'} />
                <Info label="Actual GT date" value={e.actualGTDate ?? 'Not recorded'} />
                <Info label="Ship date" value={e.shipDate ?? 'Not recorded'} />
                <Info label="Shipping status" value={e.shippingStatus ?? 'Not recorded'} />
                <Info label="Emission rating" value={e.emissionRatting ?? 'Not recorded'} />
              </div>
            )}
            {tab === 'Specifications' && (
              <div className="grid gap-3 sm:grid-cols-2">
                {e.specifications.map((specification) => (
                  <div key={specification.label} className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900/60">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400">{specification.label}</div>
                    <div className="mt-1 text-sm font-semibold">{specification.value}</div>
                  </div>
                ))}
              </div>
            )}
            {tab === 'Documents' && <Documents documents={e.documents} />}
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

function Documents({ documents }: Readonly<{ documents: typeof equipment[number]['documents'] }>) {
  return documents.length ? <div className="space-y-3">{documents.map((document) => <div key={document.id} className="flex items-center justify-between rounded-xl border p-4"><div className="flex items-center gap-3"><FileText className="h-5 w-5 text-blue-600" /><div><div className="text-sm font-medium">{document.name}</div><div className="mt-1 text-xs text-slate-400">{document.type} · Uploaded {document.uploadedDate}</div></div></div>{document.expiryDate && <Badge className="bg-amber-50 text-amber-700">Expires {document.expiryDate}</Badge>}</div>)}</div> : <EmptyState label="No documents uploaded" />
}

function Logbook({ history }: Readonly<{ history: typeof tickets }>) {
  return history.length ? <div className="space-y-4">{history.map((ticket) => <div key={ticket.id} className="flex gap-3"><div className="mt-1 rounded-full bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/40"><Calendar className="h-4 w-4" /></div><div><div className="text-sm font-semibold">{ticket.ticketNo} · {ticket.type}</div><div className="mt-1 text-xs text-slate-500">Due {ticket.dueDate} · <StatusBadge status={ticket.status} /></div></div></div>)}</div> : <EmptyState label="No maintenance history" />
}

function EmptyState({ label }: Readonly<{ label: string }>) {
  return <div className="grid min-h-32 place-items-center rounded-xl border border-dashed text-sm text-slate-400"><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" />{label}</div></div>
}

'use client'

import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { useRole } from '@/components/role-context'
import { ShellPage } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { TD, TH, TBody, THead, TR, Table } from '@/components/ui/table'
import { ApiEquipment, fetchAllPages } from '@/lib/api-data'
import { apiRequest, bffFileUrl } from '@/lib/api-client'

type StorageUsage = { usedBytes: number; quotaBytes: number; assetCount: number; bytesSaved: number }
type DocumentRow = ApiEquipment['documents'][number] & { assetNo: string }

function formatBytes(value: number) {
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`
  return `${(value / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentsPage() {
  const { role } = useRole()
  const [rows, setRows] = useState<DocumentRow[]>([])
  const [usage, setUsage] = useState<StorageUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      fetchAllPages<ApiEquipment>('equipment'),
      role === 'Super Admin' ? apiRequest<StorageUsage>('files/usage').catch(() => null) : Promise.resolve(null),
    ]).then(([equipment, storage]) => {
      if (!active) return
      setRows(equipment.flatMap((item) => item.documents.map((document) => ({ ...document, assetNo: item.assetNo }))))
      setUsage(storage)
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : 'Unable to load documents.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [role])

  return <ShellPage>
    <PageHeader eyebrow="Assets / Records" title="Documents" subtitle="Manuals, certificates and operational documents linked to the right asset." />
    {usage && <div className="mb-5 grid gap-3 sm:grid-cols-3"><UsageCard label="Storage used" value={`${formatBytes(usage.usedBytes)} / ${formatBytes(usage.quotaBytes)}`} /><UsageCard label="Stored files" value={String(usage.assetCount)} /><UsageCard label="Space saved" value={formatBytes(usage.bytesSaved)} /></div>}
    <Card>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading documents…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
        <Table><THead><TR><TH>Document</TH><TH>Linked asset</TH><TH>Type</TH><TH>Expiry date</TH><TH></TH></TR></THead><TBody>{rows.map((document) => <TR key={document.id}>
          <TD><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40"><FileText className="h-4 w-4" /></div><span className="font-medium">{document.name}</span></div></TD>
          <TD>{document.assetNo}</TD><TD><StatusBadge status={document.type} /></TD><TD>{document.expiryDate ? new Date(document.expiryDate).toLocaleDateString() : '—'}</TD>
          <TD><a href={bffFileUrl(document.url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"><Download className="h-4 w-4" />View</a></TD>
        </TR>)}</TBody></Table>
        {rows.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No documents found.</div>}
      </>}
    </Card>
  </ShellPage>
}

function UsageCard({ label, value }: { label: string; value: string }) {
  return <Card className="p-4"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div><div className="mt-2 text-lg font-semibold">{value}</div></Card>
}

'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { PlaneLoader } from '@/components/ui/plane-loader'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { apiRequest } from '@/lib/api-client'

type ChecklistItemRow = { id: string; label: string }
type ChecklistCategory = { id: string; name: string; items: ChecklistItemRow[] }
type Dialog =
  | { kind: 'category'; id?: string; value: string }
  | { kind: 'item'; categoryId: string; id?: string; value: string }
type DeleteTarget = { kind: 'category' | 'item'; id: string; name: string }

const BASE = 'inspection-checklists'
const errorMessage = (cause: unknown, fallback: string) => cause instanceof Error ? cause.message : fallback
const json = (method: string, body: unknown) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

export function InspectionChecklistSettings() {
  const [categories, setCategories] = useState<ChecklistCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [dialog, setDialog] = useState<Dialog | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      setCategories(await apiRequest<ChecklistCategory[]>(BASE))
    } catch (cause) {
      toast.error(errorMessage(cause, 'Unable to load inspection checklist.'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dialog) return
    setSaving(true)
    try {
      const value = dialog.value.trim()
      if (dialog.kind === 'category') await apiRequest(`${BASE}/categories${dialog.id ? `/${dialog.id}` : ''}`, json(dialog.id ? 'PUT' : 'POST', { name: value }))
      else await apiRequest(`${BASE}/items${dialog.id ? `/${dialog.id}` : ''}`, json(dialog.id ? 'PUT' : 'POST', dialog.id ? { label: value } : { categoryId: dialog.categoryId, label: value }))
      toast.success(`${dialog.kind === 'category' ? 'Category' : 'Item'} ${dialog.id ? 'updated' : 'added'}`)
      setDialog(null)
      await load()
    } catch (cause) {
      toast.error(errorMessage(cause, 'Unable to save.'))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiRequest(`${BASE}/${deleteTarget.kind === 'category' ? 'categories' : 'items'}/${deleteTarget.id}`, { method: 'DELETE' })
      toast.success(`${deleteTarget.kind === 'category' ? 'Category' : 'Item'} deleted`)
      setDeleteTarget(null)
      await load()
    } catch (cause) {
      toast.error(errorMessage(cause, 'Unable to delete.'))
    } finally {
      setDeleting(false)
    }
  }

  const iconButton = (label: string, onClick: () => void, icon: React.ReactNode, className = 'text-slate-600') =>
    <Button type="button" variant="ghost" className={`h-8 w-8 p-0 ${className}`} aria-label={label} title={label} onClick={onClick}>{icon}</Button>

  const title = dialog && `${dialog.id ? 'Edit' : 'Add'} ${dialog.kind === 'category' ? 'category' : 'item'}`

  return <Card>
    <div className="flex items-start justify-between border-b p-6"><div><h2 className="text-base font-semibold">Inspection Checklist</h2><p className="mt-1 text-sm text-slate-500">Manage the categories and items available in the inspection checklist. Equipment types choose which of these items apply to each service.</p></div><Button onClick={() => setDialog({ kind: 'category', value: '' })}><Plus className="h-4 w-4" />Add category</Button></div>
    {loading ? <PlaneLoader label="Loading inspection checklist…" /> : <div className="space-y-4 p-6">{categories.map((category) => <section key={category.id} className="rounded-lg border">
      <div className="flex items-center justify-between border-b bg-slate-50/70 px-3 py-2 dark:bg-slate-950/50"><h3 className="text-sm font-semibold">{category.name} <span className="ml-1 text-xs font-normal text-slate-500">{category.items.length} {category.items.length === 1 ? 'item' : 'items'}</span></h3><div className="flex items-center gap-1"><Button type="button" variant="ghost" className="h-8 px-2 text-xs" onClick={() => setDialog({ kind: 'item', categoryId: category.id, value: '' })}><Plus className="h-3.5 w-3.5" />Add item</Button>{iconButton(`Edit ${category.name}`, () => setDialog({ kind: 'category', id: category.id, value: category.name }), <Pencil className="h-4 w-4" />)}{iconButton(`Delete ${category.name}`, () => setDeleteTarget({ kind: 'category', id: category.id, name: category.name }), <Trash2 className="h-4 w-4" />, 'text-rose-600')}</div></div>
      {category.items.length ? <div className="divide-y">{category.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm"><span>{item.label}</span><div className="flex items-center gap-1">{iconButton(`Edit ${item.label}`, () => setDialog({ kind: 'item', categoryId: category.id, id: item.id, value: item.label }), <Pencil className="h-4 w-4" />)}{iconButton(`Delete ${item.label}`, () => setDeleteTarget({ kind: 'item', id: item.id, name: item.label }), <Trash2 className="h-4 w-4" />, 'text-rose-600')}</div></div>)}</div> : <p className="px-3 py-3 text-xs text-slate-500">No items in this category.</p>}
    </section>)}{!categories.length && <p className="p-6 text-center text-sm text-slate-500">No categories yet. Add a category to get started.</p>}</div>}
    {dialog && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button type="button" onClick={() => setDialog(null)} className="text-2xl leading-none text-slate-400 disabled:opacity-50" aria-label="Close modal" disabled={saving}>×</button></div>
      <form className="space-y-4" onSubmit={save}>
        <label className="block text-xs font-semibold">{dialog.kind === 'category' ? 'Category name' : 'Item name'}<Input className="mt-2" autoFocus value={dialog.value} onChange={(event) => setDialog({ ...dialog, value: event.target.value })} required /></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialog(null)} disabled={saving}>Cancel</Button><Button type="submit" disabled={!dialog.value.trim()} loading={saving} loadingText="Saving…">{dialog.id ? 'Save changes' : 'Add'}</Button></div>
      </form></div></div>}
    <ConfirmDialog open={!!deleteTarget} title={`Delete ${deleteTarget?.kind ?? 'item'}`} description={deleteTarget ? `Delete "${deleteTarget.name}"${deleteTarget.kind === 'category' ? ' and all of its items' : ''}? Existing tickets are not affected.` : undefined} confirmLabel="Delete" loading={deleting} onConfirm={() => void confirmDelete()} onCancel={() => setDeleteTarget(null)} />
  </Card>
}

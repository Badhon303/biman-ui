'use client'

import { FormEvent, useEffect, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { ShellPage } from '@/components/app-shell'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { useRole } from '@/components/role-context'
import { apiRequest } from '@/lib/api-client'
import { fetchAllPages } from '@/lib/api-data'
import { ApiUser, EquipmentType, Role, User } from '@/lib/types'
import { toast } from 'sonner'

type ApiEquipmentType = EquipmentType & { _count?: { equipment: number } }
type ServiceDraft = { id?: string; name: string; minHours: string; maxHours: string; months: string }

function getInitials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [invite, setInvite] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const result = await fetchAllPages<ApiUser>('users')
      setUsers(result.map((user) => ({ ...user, initials: getInitials(user.name) })))
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const body = { name: String(form.get('name')).trim(), email: String(form.get('email')).trim(), role: String(form.get('role')) as Role }
    try {
      const result = await apiRequest<ApiUser & { temporaryPassword: string }>('users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      setTemporaryPassword(result.temporaryPassword)
      setUsers((current) => [{ ...result, initials: getInitials(result.name) }, ...current])
      toast.success('User created. Share the temporary password securely.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create user.')
    }
  }

  const closeInvite = () => { setInvite(false); setTemporaryPassword('') }
  const ngglUsers = users.filter((user) => user.organization === 'NGGL')
  const bimanUsers = users.filter((user) => user.organization === 'Biman')

  return <ShellPage>
    <PageHeader eyebrow="Admin / Access" title="User management" subtitle="Manage NGGL operators and view connected Biman users." action={<Button onClick={() => setInvite(true)}><Plus className="h-4 w-4" />Invite user</Button>} />
    <Card>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading users…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
        <UserTable title="NGGL users" users={ngglUsers} />
        <div className="border-b p-5"><h2 className="text-sm font-semibold">Biman users <span className="ml-2 text-xs font-normal text-slate-400">View only</span></h2></div>
        <UserRows users={bimanUsers} />
      </>}
    </Card>
    {invite && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Invite user</h2><button type="button" onClick={closeInvite} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div>
      {temporaryPassword ? <div className="space-y-4"><p className="text-sm text-slate-500">Copy this temporary password and share it securely. It will not be shown again after closing.</p><Input readOnly value={temporaryPassword} aria-label="Temporary password" /><Button className="w-full" onClick={closeInvite}>Done</Button></div> : <form className="space-y-4" onSubmit={createUser}>
        <label className="block text-xs font-semibold">Full name<Input className="mt-2" name="name" minLength={2} required /></label>
        <label className="block text-xs font-semibold">Work email<Input className="mt-2" name="email" type="email" required /></label>
        <label className="block text-xs font-semibold">Role<select className="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm dark:bg-slate-950" name="role" defaultValue="Engineer">{(['Super Admin', 'Manager', 'Engineer', 'Biman Admin'] as Role[]).map((role) => <option key={role}>{role}</option>)}</select></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeInvite}>Cancel</Button><Button type="submit">Create user</Button></div>
      </form>}
    </div></div>}
  </ShellPage>
}

function UserTable({ title, users }: { title: string; users: User[] }) {
  return <><div className="border-b p-5"><h2 className="text-sm font-semibold">{title}</h2></div><UserRows users={users} /></>
}

function UserRows({ users }: { users: User[] }) {
  return <Table><THead><TR><TH>Name</TH><TH>Role</TH><TH>Organization</TH><TH>Status</TH><TH>Email</TH></TR></THead><TBody>{users.map((user) => <TR key={user.id}>
    <TD><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40">{user.initials}</div><span className="font-medium">{user.name}</span></div></TD><TD>{user.role}</TD><TD>{user.organization}</TD><TD><StatusBadge status={user.status} /></TD><TD className="text-slate-500">{user.email}</TD>
  </TR>)}</TBody></Table>
}

export function SettingsPage() {
  const { role } = useRole()
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'equipmentTypes'>('general')
  const [types, setTypes] = useState<ApiEquipmentType[]>([])
  const [loading, setLoading] = useState(false)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<ApiEquipmentType | null>(null)
  const [typeName, setTypeName] = useState('')
  const [services, setServices] = useState<ServiceDraft[]>([])
  const [saving, setSaving] = useState(false)
  const canManageTypes = role === 'Super Admin' || role === 'Manager'

  const loadTypes = async () => {
    setLoading(true)
    try {
      setTypes(await apiRequest<ApiEquipmentType[]>('equipment-types'))
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to load equipment types.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (activeTab === 'equipmentTypes') void loadTypes() }, [activeTab])

  const openTypeModal = (type?: ApiEquipmentType) => {
    setEditingType(type ?? null)
    setTypeName(type?.name ?? '')
    setServices(type?.services.map((service) => ({ id: service.id, name: service.name, minHours: service.minHours?.toString() ?? '', maxHours: service.maxHours?.toString() ?? '', months: service.months?.toString() ?? '' })) ?? [{ name: '', minHours: '', maxHours: '', months: '' }])
    setTypeModalOpen(true)
  }

  const closeTypeModal = () => { setTypeModalOpen(false); setEditingType(null); setServices([]); setTypeName('') }

  const updateService = (index: number, patch: Partial<ServiceDraft>) => setServices((current) => current.map((service, i) => i === index ? { ...service, ...patch } : service))

  const saveEquipmentType = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const servicePayload = services.filter((service) => service.name.trim()).map((service) => {
      const vService = service.name.trim().toLowerCase() === 'v-service'
      return {
        ...(service.id ? { id: service.id } : {}),
        name: service.name.trim(),
        ...(vService ? { months: 6 } : {
          ...(service.minHours !== '' ? { minHours: Number(service.minHours) } : {}),
          ...(service.maxHours !== '' ? { maxHours: Number(service.maxHours) } : {}),
        }),
      }
    })
    if (!typeName.trim() || !servicePayload.length) { toast.error('Enter a type name and at least one service.'); return }
    setSaving(true)
    try {
      const body = { name: typeName.trim(), services: servicePayload }
      await apiRequest(`equipment-types${editingType ? `/${encodeURIComponent(editingType.id)}` : ''}`, {
        method: editingType ? 'PUT' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      closeTypeModal()
      await loadTypes()
      toast.success(editingType ? 'Equipment type updated' : 'Equipment type created')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to save equipment type.')
    } finally {
      setSaving(false)
    }
  }

  const deleteEquipmentType = async (type: ApiEquipmentType) => {
    if (!window.confirm(`Delete ${type.name}?`)) return
    try {
      await apiRequest(`equipment-types/${encodeURIComponent(type.id)}`, { method: 'DELETE' })
      await loadTypes()
      toast.success('Equipment type deleted')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete equipment type.')
    }
  }

  return <ShellPage>
    <div className="mb-7"><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Admin / Workspace</div><h1 className="text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-slate-500">Configure this prototype workspace. Equipment type changes are saved to the service.</p></div>
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]"><Card className="h-fit p-2"><SettingsTab active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</SettingsTab><SettingsTab active={activeTab === 'equipmentTypes'} onClick={() => setActiveTab('equipmentTypes')}>Equipment types</SettingsTab></Card>
      <div className="space-y-6">{activeTab === 'general' ? <Card className="p-6"><h2 className="text-base font-semibold">Company information</h2><p className="mt-1 text-sm text-slate-500">Displayed across generated tickets and operational reports.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Company name<Input className="mt-2" defaultValue="National Grid for Learning (NGGL)" /></label><label className="text-xs font-semibold">Partner organization<Input className="mt-2" defaultValue="Biman Bangladesh Airlines" /></label><label className="text-xs font-semibold sm:col-span-2">Operations base<Input className="mt-2" defaultValue="Hazrat Shahjalal International Airport, Dhaka" /></label></div><Button className="mt-6" onClick={() => { setSaved(true); toast.success('Settings saved locally') }}><Save className="h-4 w-4" />{saved ? 'Saved' : 'Save changes'}</Button></Card> : <Card>
        <div className="flex items-start justify-between border-b p-6"><div><h2 className="text-base font-semibold">Equipment types</h2><p className="mt-1 text-sm text-slate-500">Manage equipment types and their service bands.</p></div>{canManageTypes && <Button onClick={() => openTypeModal()}><Plus className="h-4 w-4" />Add type</Button>}</div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading equipment types…</div> : <Table><THead><TR><TH>Equipment type</TH><TH>Services</TH><TH>Equipment</TH><TH></TH></TR></THead><TBody>{types.map((type) => <TR key={type.id}><TD className="font-semibold">{type.name}</TD><TD>{type.services.map((service) => service.name).join(', ')}</TD><TD>{type._count?.equipment ?? '—'}</TD><TD>{canManageTypes && <div className="flex gap-1"><Button variant="ghost" className="text-xs" onClick={() => openTypeModal(type)}>Edit</Button><Button variant="ghost" className="text-xs text-rose-600" onClick={() => void deleteEquipmentType(type)}><Trash2 className="h-4 w-4" />Delete</Button></div>}</TD></TR>)}</TBody></Table>}{!loading && types.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No equipment types found.</div>}
      </Card>}</div>
    </div>
    {typeModalOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{editingType ? 'Edit equipment type' : 'Add equipment type'}</h2><p className="mt-1 text-sm text-slate-500">Service-band continuity is validated by the API.</p></div><button type="button" onClick={closeTypeModal} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div>
      <form className="space-y-4" onSubmit={saveEquipmentType}><label className="block text-xs font-semibold">Equipment type name<Input className="mt-2" value={typeName} onChange={(event) => setTypeName(event.target.value)} minLength={2} required /></label>
        <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="text-sm font-semibold">Services</h3><Button type="button" variant="outline" onClick={() => setServices((current) => [...current, { name: '', minHours: '', maxHours: '', months: '' }])}><Plus className="h-4 w-4" />Add service</Button></div>
          {services.map((service, index) => <div key={service.id ?? index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"><Input list="equipment-service-names" placeholder="Service name" value={service.name} onChange={(event) => updateService(index, { name: event.target.value })} required /><Input type="number" min="0" placeholder="Start hours" value={service.name.trim().toLowerCase() === 'v-service' ? '' : service.minHours} disabled={service.name.trim().toLowerCase() === 'v-service'} onChange={(event) => updateService(index, { minHours: event.target.value })} /><Input type="number" min="0" placeholder="End hours" value={service.name.trim().toLowerCase() === 'v-service' ? '' : service.maxHours} disabled={service.name.trim().toLowerCase() === 'v-service'} onChange={(event) => updateService(index, { maxHours: event.target.value })} /><Button type="button" variant="ghost" className="text-rose-600" aria-label="Remove service" onClick={() => setServices((current) => current.filter((_, i) => i !== index))}><Trash2 className="h-4 w-4" /></Button></div>)}
          <datalist id="equipment-service-names"><option value="F-Service" /><option value="B-Service" /><option value="C-Service" /><option value="D-Service" /><option value="E-Service" /><option value="V-Service" /><option value="Others" /></datalist>
        </div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeTypeModal}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingType ? 'Save changes' : 'Create type'}</Button></div>
      </form></div></div>}
  </ShellPage>
}

function SettingsTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{children}</button>
}

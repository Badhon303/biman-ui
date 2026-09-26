'use client'

import { FormEvent, useEffect, useState } from 'react'
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react'
import { PasswordInput } from '@/components/ui/password-input'
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
  const { role } = useRole()
  const isSuperAdmin = role === 'Super Admin'
  const canManageUsers = isSuperAdmin || role === 'Manager'
  const [users, setUsers] = useState<User[]>([])
  const [invite, setInvite] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [statusEditTarget, setStatusEditTarget] = useState<User | null>(null)
  const [editedStatus, setEditedStatus] = useState<User['status']>('Active')
  const [statusSaving, setStatusSaving] = useState(false)
  const resetPasswordIsValid = resetNewPassword.length >= 6
  const resetPasswordsMatch = confirmResetPassword.length > 0 && resetNewPassword === confirmResetPassword

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
    const body = { name: String(form.get('name')).trim(), email: String(form.get('email')).trim(), role: String(form.get('role')) as Exclude<Role, 'Super Admin'> }
    try {
      const result = await apiRequest<ApiUser & { temporaryPassword: string }>('users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
      setTemporaryPassword(result.temporaryPassword)
      setUsers((current) => [{ ...result, initials: getInitials(result.name) }, ...current])
      toast.success('User created. Share the temporary password securely.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create user.')
    }
  }

  const deleteUser = async (user: User) => {
    if (!window.confirm(`Delete ${user.name}?`)) return
    try {
      await apiRequest(`users/${encodeURIComponent(user.id)}`, { method: 'DELETE' })
      setUsers((current) => current.filter((item) => item.id !== user.id))
      toast.success('User deleted')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete user.')
    }
  }

  const openStatusDialog = (user: User) => {
    setEditedStatus(user.status)
    setStatusEditTarget(user)
  }

  const saveUserStatus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const target = statusEditTarget
    if (!target) return
    setStatusSaving(true)
    try {
      await apiRequest(`users/${encodeURIComponent(target.id)}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: editedStatus }),
      })
      setUsers((current) => current.map((item) => item.id === target.id ? { ...item, status: editedStatus } : item))
      setStatusEditTarget(null)
      toast.success(`Status updated for ${target.name}.`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to update user status.')
    } finally {
      setStatusSaving(false)
    }
  }

  const openResetDialog = (user: User) => {
    setResetNewPassword('')
    setConfirmResetPassword('')
    setResetTarget(user)
  }

  const closeResetDialog = () => {
    setResetTarget(null)
    setResetNewPassword('')
    setConfirmResetPassword('')
  }

  const resetUserPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetTarget || !resetPasswordIsValid || !resetPasswordsMatch) return
    setResettingPassword(true)
    try {
      await apiRequest(`users/${encodeURIComponent(resetTarget.id)}/password`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ newPassword: resetNewPassword }),
      })
      closeResetDialog()
      toast.success(`Password reset for ${resetTarget.name}. They must change it at their next sign-in.`)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to reset password.')
    } finally {
      setResettingPassword(false)
    }
  }

  const closeInvite = () => { setInvite(false); setTemporaryPassword('') }
  const ngglUsers = users.filter((user) => user.organization === 'NGGL')
  const bimanUsers = users.filter((user) => user.organization === 'Biman')

  return <ShellPage>
    <PageHeader eyebrow="Admin / Access" title="User management" subtitle="Manage NGGL operators and connected Biman users." action={isSuperAdmin && <Button onClick={() => setInvite(true)}><Plus className="h-4 w-4" />Invite user</Button>} />
    <Card>
      {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading users…</div> : error ? <div className="p-10 text-center text-sm text-rose-600">{error}</div> : <>
        <UserTable title="NGGL users" users={ngglUsers} onDelete={isSuperAdmin ? deleteUser : undefined} onResetPassword={isSuperAdmin ? openResetDialog : undefined} onEditStatus={canManageUsers ? openStatusDialog : undefined} canEditSuperAdminStatus={isSuperAdmin} />
        <div className="border-b p-5"><h2 className="text-sm font-semibold">Biman users</h2></div>
        <UserRows users={bimanUsers} onDelete={isSuperAdmin ? deleteUser : undefined} onResetPassword={isSuperAdmin ? openResetDialog : undefined} onEditStatus={canManageUsers ? openStatusDialog : undefined} canEditSuperAdminStatus={isSuperAdmin} />
      </>}
    </Card>
    {invite && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">Invite user</h2><button type="button" onClick={closeInvite} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div>
      {temporaryPassword ? <div className="space-y-4"><p className="text-sm text-slate-500">Copy this temporary password and share it securely. It will not be shown again after closing.</p><Input readOnly value={temporaryPassword} aria-label="Temporary password" /><Button className="w-full" onClick={closeInvite}>Done</Button></div> : <form className="space-y-4" onSubmit={createUser}>
        <label className="block text-xs font-semibold">Full name<Input className="mt-2" name="name" minLength={2} required /></label>
        <label className="block text-xs font-semibold">Work email<Input className="mt-2" name="email" type="email" required /></label>
        <label className="block text-xs font-semibold">Role<select className="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm dark:bg-slate-950" name="role" defaultValue="Engineer">{(['Manager', 'Engineer', 'Biman Admin'] as Exclude<Role, 'Super Admin'>[]).map((role) => <option key={role}>{role}</option>)}</select></label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeInvite}>Cancel</Button><Button type="submit">Create user</Button></div>
      </form>}
    </div></div>}
    {resetTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="reset-password-title" className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between"><div><h2 id="reset-password-title" className="text-lg font-semibold">Reset password</h2><p className="mt-1 text-sm text-slate-500">Set a temporary password for {resetTarget.name}.</p></div><button type="button" onClick={closeResetDialog} disabled={resettingPassword} className="text-2xl leading-none text-slate-400 disabled:opacity-50" aria-label="Close dialog">×</button></div>
        <form className="space-y-4" onSubmit={resetUserPassword}>
          <label className="block text-xs font-semibold">New temporary password<PasswordInput autoComplete="new-password" minLength={6} value={resetNewPassword} onChange={(event) => setResetNewPassword(event.target.value)} required autoFocus /></label>
          <p aria-live="polite" className={`text-xs ${resetPasswordIsValid ? 'text-emerald-600' : 'text-slate-500'}`}>{resetPasswordIsValid ? 'Password meets the 6-character minimum.' : 'Password must be at least 6 characters long.'}</p>
          <label className="block text-xs font-semibold">Confirm password<PasswordInput autoComplete="new-password" minLength={6} value={confirmResetPassword} onChange={(event) => setConfirmResetPassword(event.target.value)} required /></label>
          {confirmResetPassword.length > 0 && <p aria-live="polite" className={`text-xs ${resetPasswordsMatch ? 'text-emerald-600' : 'text-rose-600'}`}>{resetPasswordsMatch ? 'Passwords match.' : 'Passwords do not match.'}</p>}
          <p className="text-xs text-slate-500">The user will be required to choose a new password when they next sign in.</p>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeResetDialog} disabled={resettingPassword}>Cancel</Button><Button type="submit" disabled={resettingPassword || !resetPasswordIsValid || !resetPasswordsMatch}>{resettingPassword ? 'Resetting…' : 'Reset password'}</Button></div>
        </form>
      </div>
    </div>}
    {statusEditTarget && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="edit-user-status-title" className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900">
        <div className="mb-5 flex items-start justify-between"><div><h2 id="edit-user-status-title" className="text-lg font-semibold">Change user status</h2><p className="mt-1 text-sm text-slate-500">Update the account status for {statusEditTarget.name}.</p></div><button type="button" onClick={() => setStatusEditTarget(null)} disabled={statusSaving} className="text-2xl leading-none text-slate-400 disabled:opacity-50" aria-label="Close dialog">×</button></div>
        <form className="space-y-5" onSubmit={saveUserStatus}>
          <label className="block text-xs font-semibold">Status<select className="mt-2 h-10 w-full rounded-lg border bg-white px-3 text-sm dark:bg-slate-950" value={editedStatus} onChange={(event) => setEditedStatus(event.target.value as User['status'])}><option value="Active">Active</option><option value="Inactive">Inactive</option></select></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setStatusEditTarget(null)} disabled={statusSaving}>Cancel</Button><Button type="submit" disabled={statusSaving}>{statusSaving ? 'Saving…' : 'Save status'}</Button></div>
        </form>
      </div>
    </div>}
  </ShellPage>
}

function UserTable({ title, users, onDelete, onResetPassword, onEditStatus, canEditSuperAdminStatus }: { title: string; users: User[]; onDelete?: (user: User) => void; onResetPassword?: (user: User) => void; onEditStatus?: (user: User) => void; canEditSuperAdminStatus?: boolean }) {
  return <><div className="border-b p-5"><h2 className="text-sm font-semibold">{title}</h2></div><UserRows users={users} onDelete={onDelete} onResetPassword={onResetPassword} onEditStatus={onEditStatus} canEditSuperAdminStatus={canEditSuperAdminStatus} /></>
}

function UserRows({ users, onDelete, onResetPassword, onEditStatus, canEditSuperAdminStatus }: { users: User[]; onDelete?: (user: User) => void; onResetPassword?: (user: User) => void; onEditStatus?: (user: User) => void; canEditSuperAdminStatus?: boolean }) {
  const hasActions = onDelete || onResetPassword || onEditStatus
  return <Table><THead><TR><TH>Name</TH><TH>Role</TH><TH>Organization</TH><TH>Status</TH><TH>Email</TH>{hasActions && <TH>Action</TH>}</TR></THead><TBody>{users.map((user) => <TR key={user.id}>
    <TD><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40">{user.initials}</div><span className="font-medium">{user.name}</span></div></TD><TD>{user.role}</TD><TD>{user.organization}</TD><TD><StatusBadge status={user.status} /></TD><TD className="text-slate-500">{user.email}</TD>{hasActions && <TD><div className="flex items-center gap-1">{onResetPassword && <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-blue-600" aria-label={`Reset password for ${user.name}`} title="Reset password" onClick={() => onResetPassword(user)}><KeyRound className="h-4 w-4" /></Button>}{onEditStatus && (canEditSuperAdminStatus || user.role !== 'Super Admin') && <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-slate-600" aria-label={`Edit status for ${user.name}`} title="Edit user status" onClick={() => onEditStatus(user)}><Pencil className="h-4 w-4" /></Button>}{onDelete && <Button type="button" variant="ghost" className="h-8 w-8 p-0 text-rose-600" aria-label={`Delete ${user.name}`} title="Delete user" onClick={() => void onDelete(user)}><Trash2 className="h-4 w-4" /></Button>}</div></TD>}
  </TR>)}</TBody></Table>
}

export function SettingsPage() {
  const { role } = useRole()
  const [activeTab, setActiveTab] = useState<'changePassword' | 'equipmentTypes'>('changePassword')
  const [types, setTypes] = useState<ApiEquipmentType[]>([])
  const [loading, setLoading] = useState(false)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [editingType, setEditingType] = useState<ApiEquipmentType | null>(null)
  const [typeName, setTypeName] = useState('')
  const [services, setServices] = useState<ServiceDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const canManageTypes = role === 'Super Admin' || role === 'Manager'
  const ownPasswordIsValid = newPassword.length >= 6
  const ownPasswordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword

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

  const changeOwnPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.')
      return
    }
    setPasswordSaving(true)
    try {
      await apiRequest('users/me/password', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success('Password updated. Sign in with your new password.')
      window.location.assign('/login')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to change password.')
    } finally {
      setPasswordSaving(false)
    }
  }

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
    <PageHeader eyebrow="Workspace" title="Settings" subtitle="Change your password or view equipment type settings." />
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]"><Card className="h-fit p-2"><SettingsTab active={activeTab === 'changePassword'} onClick={() => setActiveTab('changePassword')}>Change Password</SettingsTab><SettingsTab active={activeTab === 'equipmentTypes'} onClick={() => setActiveTab('equipmentTypes')}>Equipment types</SettingsTab></Card>
      <div className="space-y-6">{activeTab === 'changePassword' ? <>
        <Card className="p-6"><h2 className="text-base font-semibold">Change your password</h2><p className="mt-1 text-sm text-slate-500">Enter your current password and choose a new password with at least 6 characters.</p>
          <form className="mt-6 max-w-xl space-y-4" onSubmit={changeOwnPassword}>
            <label className="block text-xs font-semibold">Current password<PasswordInput autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
            <label className="block text-xs font-semibold">New password<PasswordInput autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
            <p aria-live="polite" className={`text-xs ${ownPasswordIsValid ? 'text-emerald-600' : 'text-slate-500'}`}>{ownPasswordIsValid ? 'Password meets the 6-character minimum.' : 'Password must be at least 6 characters long.'}</p>
            <label className="block text-xs font-semibold">Confirm new password<PasswordInput autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
            {confirmPassword.length > 0 && <p aria-live="polite" className={`text-xs ${ownPasswordsMatch ? 'text-emerald-600' : 'text-rose-600'}`}>{ownPasswordsMatch ? 'Passwords match.' : 'Passwords do not match.'}</p>}
            <Button type="submit" disabled={passwordSaving || !ownPasswordIsValid || !ownPasswordsMatch}>{passwordSaving ? 'Updating…' : 'Update password'}</Button>
          </form>
        </Card>
      </> : <Card>
        <div className="flex items-start justify-between border-b p-6"><div><h2 className="text-base font-semibold">Equipment types</h2><p className="mt-1 text-sm text-slate-500">View equipment types and their service bands. Only Super Admins and Managers can make changes.</p></div>{canManageTypes && <Button onClick={() => openTypeModal()}><Plus className="h-4 w-4" />Add type</Button>}</div>
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

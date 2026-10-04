'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowRight, Check, Copy, KeyRound, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react'
import { PasswordInput } from '@/components/ui/password-input'
import { PageHeader } from '@/components/page-header'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useRole } from '@/components/role-context'
import { apiRequest } from '@/lib/api-client'
import { fetchAllPages } from '@/lib/api-data'
import { ApiUser, EquipmentType, Role, User } from '@/lib/types'
import { toast } from 'sonner'

type ApiEquipmentType = EquipmentType & { _count?: { equipment: number } }
type ServiceDraft = { id?: string; name: string; minHours: string; maxHours: string; months: string }

// Fixed hour bands for the standard F through E services (not user-editable).
const STANDARD_SLIDER_SERVICES: { name: string; minHours: number; maxHours: number }[] = [
  { name: 'F-Service', minHours: 0, maxHours: 500 },
  { name: 'B-Service', minHours: 500, maxHours: 1000 },
  { name: 'C-Service', minHours: 1000, maxHours: 2000 },
  { name: 'D-Service', minHours: 2000, maxHours: 2500 },
  { name: 'E-Service', minHours: 2500, maxHours: 3000 },
]

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
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [resetNewPassword, setResetNewPassword] = useState('')
  const [confirmResetPassword, setConfirmResetPassword] = useState('')
  const [resettingPassword, setResettingPassword] = useState(false)
  const [statusEditTarget, setStatusEditTarget] = useState<User | null>(null)
  const [editedStatus, setEditedStatus] = useState<User['status']>('Active')
  const [statusSaving, setStatusSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState(false)
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
      setPasswordCopied(false)
      setUsers((current) => [{ ...result, initials: getInitials(result.name) }, ...current])
      toast.success('User created. Share the temporary password securely.')
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to create user.')
    }
  }

  const deleteUser = (user: User) => setDeleteTarget(user)

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return
    setDeletingUser(true)
    try {
      await apiRequest(`users/${encodeURIComponent(deleteTarget.id)}`, { method: 'DELETE' })
      setUsers((current) => current.filter((item) => item.id !== deleteTarget.id))
      toast.success('User deleted')
      setDeleteTarget(null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete user.')
    } finally {
      setDeletingUser(false)
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

  const copyTemporaryPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword)
      setPasswordCopied(true)
      toast.success('Temporary password copied.')
    } catch {
      toast.error('Unable to copy the temporary password.')
    }
  }

  const closeInvite = () => { setInvite(false); setTemporaryPassword(''); setPasswordCopied(false) }
  const ngglUsers = users.filter((user) => user.organization === 'NGGL')
  const bimanUsers = users.filter((user) => user.organization === 'Biman')

  return <>
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
      {temporaryPassword ? <div className="space-y-4"><p className="text-sm text-slate-500">Copy this temporary password and share it securely. It will not be shown again after closing.</p><div className="relative"><Input readOnly value={temporaryPassword} aria-label="Temporary password" className="pr-12" /><button type="button" onClick={() => void copyTemporaryPassword()} className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={passwordCopied ? 'Temporary password copied' : 'Copy temporary password'} title={passwordCopied ? 'Copied' : 'Copy password'}>{passwordCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}</button></div><Button className="w-full" onClick={closeInvite}>Done</Button></div> : <form className="space-y-4" onSubmit={createUser}>
        <label className="block text-xs font-semibold">Full name<Input className="mt-2" name="name" minLength={2} required /></label>
        <label className="block text-xs font-semibold">Work email<Input className="mt-2" name="email" type="email" required /></label>
        <label className="block text-xs font-semibold">Role<Select className="mt-2 w-full" name="role" defaultValue="Engineer">{(['Manager', 'Engineer', 'Biman Admin'] as Exclude<Role, 'Super Admin'>[]).map((role) => <option key={role}>{role}</option>)}</Select></label>
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
          <label className="block text-xs font-semibold">Status<Select className="mt-2 w-full" value={editedStatus} onChange={(event) => setEditedStatus(event.target.value as User['status'])}><option value="Active">Active</option><option value="Inactive">Inactive</option></Select></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setStatusEditTarget(null)} disabled={statusSaving}>Cancel</Button><Button type="submit" disabled={statusSaving}>{statusSaving ? 'Saving…' : 'Save status'}</Button></div>
        </form>
      </div>
    </div>}
    <ConfirmDialog
      open={!!deleteTarget}
      title="Delete user"
      description={deleteTarget ? `Delete ${deleteTarget.name}? This action cannot be undone.` : undefined}
      confirmLabel="Delete"
      loading={deletingUser}
      onConfirm={() => void confirmDeleteUser()}
      onCancel={() => setDeleteTarget(null)}
    />
  </>
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
  const [serviceLevel, setServiceLevel] = useState(0)
  const [sliderServiceIds, setSliderServiceIds] = useState<(string | undefined)[]>([])
  const [vServiceEnabled, setVServiceEnabled] = useState(false)
  const [vServiceId, setVServiceId] = useState<string | undefined>(undefined)
  const [customServices, setCustomServices] = useState<ServiceDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<ApiEquipmentType | null>(null)
  const [deletingType, setDeletingType] = useState(false)
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
    const existing = type?.services ?? []
    const matchedSlider = STANDARD_SLIDER_SERVICES.map((std) => existing.find((service) => service.name.trim().toLowerCase() === std.name.toLowerCase()))
    const highestIndex = matchedSlider.reduce((max, service, index) => service ? index : max, -1)
    setServiceLevel(highestIndex >= 0 ? highestIndex : 0)
    setSliderServiceIds(matchedSlider.map((service) => service?.id))
    const vService = existing.find((service) => service.name.trim().toLowerCase() === 'v-service')
    setVServiceEnabled(!!vService)
    setVServiceId(vService?.id)
    const standardNames = new Set([...STANDARD_SLIDER_SERVICES.map((service) => service.name.toLowerCase()), 'v-service'])
    setCustomServices(existing.filter((service) => !standardNames.has(service.name.trim().toLowerCase())).map((service) => ({ id: service.id, name: service.name, minHours: service.minHours?.toString() ?? '', maxHours: service.maxHours?.toString() ?? '', months: service.months?.toString() ?? '' })))
    setTypeModalOpen(true)
  }

  const closeTypeModal = () => {
    setTypeModalOpen(false)
    setEditingType(null)
    setTypeName('')
    setServiceLevel(0)
    setSliderServiceIds([])
    setVServiceEnabled(false)
    setVServiceId(undefined)
    setCustomServices([])
  }

  const updateCustomService = (index: number, patch: Partial<ServiceDraft>) => setCustomServices((current) => current.map((service, i) => i === index ? { ...service, ...patch } : service))
  const removeCustomService = (index: number) => setCustomServices((current) => current.filter((_, i) => i !== index))

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
    const sliderPayload = STANDARD_SLIDER_SERVICES.slice(0, serviceLevel + 1).map((service, index) => ({
      ...(sliderServiceIds[index] ? { id: sliderServiceIds[index] } : {}),
      name: service.name,
      minHours: service.minHours,
      maxHours: service.maxHours,
    }))
    const vServicePayload = vServiceEnabled ? [{ ...(vServiceId ? { id: vServiceId } : {}), name: 'V-Service', months: 6 }] : []
    const customPayload = customServices.filter((service) => service.name.trim()).map((service) => ({
      ...(service.id ? { id: service.id } : {}),
      name: service.name.trim(),
      ...(service.minHours !== '' ? { minHours: Number(service.minHours) } : {}),
      ...(service.maxHours !== '' ? { maxHours: Number(service.maxHours) } : {}),
    }))
    const servicePayload = [...sliderPayload, ...vServicePayload, ...customPayload]
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

  const deleteEquipmentType = (type: ApiEquipmentType) => setDeleteTypeTarget(type)

  const confirmDeleteEquipmentType = async () => {
    if (!deleteTypeTarget) return
    setDeletingType(true)
    try {
      await apiRequest(`equipment-types/${encodeURIComponent(deleteTypeTarget.id)}`, { method: 'DELETE' })
      await loadTypes()
      toast.success('Equipment type deleted')
      setDeleteTypeTarget(null)
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Unable to delete equipment type.')
    } finally {
      setDeletingType(false)
    }
  }

  return <>
    <PageHeader eyebrow="Workspace" title="Settings" subtitle="Change your password or view equipment type settings." />
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]"><Card className="h-fit p-2"><SettingsTab active={activeTab === 'changePassword'} onClick={() => setActiveTab('changePassword')}>Change Password</SettingsTab><SettingsTab active={activeTab === 'equipmentTypes'} onClick={() => setActiveTab('equipmentTypes')}>Equipment types</SettingsTab></Card>
      <div className="space-y-6">{activeTab === 'changePassword' ? <>
        <Card className="overflow-hidden">
          <div className="flex items-start gap-4 border-b p-5 sm:p-6">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40"><KeyRound className="h-5 w-5" /></div>
            <div><h2 className="text-base font-semibold">Change your password</h2><p className="mt-1 text-sm leading-6 text-slate-500">Update the password you use to sign in to your workspace.</p></div>
          </div>
          <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <form className="space-y-5" onSubmit={changeOwnPassword}>
              <label className="block text-sm font-medium">Current password<PasswordInput autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label>
              <div>
                <label className="block text-sm font-medium">New password<PasswordInput autoComplete="new-password" minLength={6} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
                <p aria-live="polite" className={`mt-2 text-xs ${ownPasswordIsValid ? 'text-emerald-600' : newPassword.length > 0 ? 'text-rose-600' : 'text-slate-500'}`}>{ownPasswordIsValid ? 'Password meets the 6-character minimum.' : 'Use at least 6 characters.'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium">Confirm new password<PasswordInput autoComplete="new-password" minLength={6} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
                {confirmPassword.length > 0 && <p aria-live="polite" className={`mt-2 text-xs ${ownPasswordsMatch ? 'text-emerald-600' : 'text-rose-600'}`}>{ownPasswordsMatch ? 'Passwords match.' : 'Passwords do not match.'}</p>}
              </div>
              <Button className="w-full sm:w-auto" type="submit" disabled={passwordSaving || !ownPasswordIsValid || !ownPasswordsMatch}>{passwordSaving ? 'Updating…' : <><span>Update password</span><ArrowRight className="h-4 w-4" /></>}</Button>
            </form>
            <aside className="h-fit rounded-xl border bg-slate-50/70 p-4 dark:bg-slate-950/50">
              <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-blue-600" />Password checklist</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center gap-2"><span className={`grid h-4 w-4 place-items-center rounded-full ${ownPasswordIsValid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>{ownPasswordIsValid && <Check className="h-3 w-3" />}</span><span className={ownPasswordIsValid ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}>At least 6 characters</span></div>
                <div className="flex items-center gap-2"><span className={`grid h-4 w-4 place-items-center rounded-full ${ownPasswordsMatch ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>{ownPasswordsMatch && <Check className="h-3 w-3" />}</span><span className={ownPasswordsMatch ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-600 dark:text-slate-300'}>Passwords match</span></div>
              </div>
              <p className="mt-4 border-t pt-4 text-xs leading-5 text-slate-500">You’ll be asked to sign in again after your password is updated.</p>
            </aside>
          </div>
        </Card>
      </> : <Card>
        <div className="flex items-start justify-between border-b p-6"><div><h2 className="text-base font-semibold">Equipment types</h2><p className="mt-1 text-sm text-slate-500">View equipment types and their service bands. Only Super Admins and Managers can make changes.</p></div>{canManageTypes && <Button onClick={() => openTypeModal()}><Plus className="h-4 w-4" />Add type</Button>}</div>
        {loading ? <div className="p-10 text-center text-sm text-slate-500">Loading equipment types…</div> : <Table><THead><TR><TH>Equipment type</TH><TH>Services</TH><TH>Equipment</TH>{canManageTypes && <TH>Action</TH>}</TR></THead><TBody>{types.map((type) => <TR key={type.id}><TD className="font-semibold">{type.name}</TD><TD>{type.services.map((service) => service.name).join(', ')}</TD><TD>{type._count?.equipment ?? '—'}</TD>{canManageTypes && <TD><div className="flex items-center gap-1"><Button type="button" variant="ghost" className="h-8 w-8 p-0 text-slate-600" aria-label={`Edit ${type.name}`} title="Edit equipment type" onClick={() => openTypeModal(type)}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" className="h-8 w-8 p-0 text-rose-600" aria-label={`Delete ${type.name}`} title="Delete equipment type" onClick={() => void deleteEquipmentType(type)}><Trash2 className="h-4 w-4" /></Button></div></TD>}</TR>)}</TBody></Table>}{!loading && types.length === 0 && <div className="p-10 text-center text-sm text-slate-500">No equipment types found.</div>}
      </Card>}</div>
    </div>
    {typeModalOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">{editingType ? 'Edit equipment type' : 'Add equipment type'}</h2><p className="mt-1 text-sm text-slate-500">Service-band continuity is validated by the API.</p></div><button type="button" onClick={closeTypeModal} className="text-2xl leading-none text-slate-400" aria-label="Close modal">×</button></div>
      <form className="space-y-4" onSubmit={saveEquipmentType}><label className="block text-xs font-semibold">Equipment type name<Input className="mt-2" value={typeName} onChange={(event) => setTypeName(event.target.value)} minLength={2} required /></label>
        <div><div className="text-xs font-semibold">Hour-meter services</div><p className="mt-1 text-xs text-slate-500">Slide to select services from F through E. Each earlier service is included automatically.</p>
          <div className="mt-4 rounded-xl border p-4">
            <input type="range" min={0} max={STANDARD_SLIDER_SERVICES.length - 1} step={1} value={serviceLevel} onChange={(event) => setServiceLevel(Number(event.target.value))} className="w-full accent-blue-600" aria-label="Select highest hour-meter service" />
            <div className="-mt-1 flex justify-between px-1">{STANDARD_SLIDER_SERVICES.map((service, index) => <span key={service.name} className={`h-2 w-2 rounded-full ${index <= serviceLevel ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true" />)}</div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500">{STANDARD_SLIDER_SERVICES.map((service, index) => <span key={service.name} className={index <= serviceLevel ? 'font-semibold text-blue-600' : ''}>{service.name}</span>)}</div>
            <div className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">Selected through {STANDARD_SLIDER_SERVICES[serviceLevel].name} ({STANDARD_SLIDER_SERVICES[serviceLevel].minHours} to {STANDARD_SLIDER_SERVICES[serviceLevel].maxHours} hours)</div>
          </div>
          <label className="mt-3 flex items-center justify-between rounded-xl border p-3 text-sm">V-Service (6 months)<input type="checkbox" checked={vServiceEnabled} onChange={() => setVServiceEnabled((current) => !current)} className="h-4 w-4 accent-blue-600" /></label>
        </div>
        <div><div className="flex items-center justify-between"><span className="text-xs font-semibold">Custom services</span><Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={() => setCustomServices((current) => [...current, { name: '', minHours: '', maxHours: '', months: '' }])}><Plus className="h-3.5 w-3.5" />Add custom</Button></div>
          {customServices.length ? <div className="mt-2 space-y-2">{customServices.map((service, index) => <div key={service.id ?? index} className="space-y-2 rounded-xl border p-3"><div className="flex items-center gap-2"><Input placeholder="Service name" value={service.name} onChange={(event) => updateCustomService(index, { name: event.target.value })} /><Button type="button" variant="ghost" className="px-2 text-rose-600 hover:bg-rose-50" aria-label="Remove custom service" onClick={() => removeCustomService(index)}><Trash2 className="h-4 w-4" /></Button></div><div className="flex items-center gap-2"><Input type="number" min={0} placeholder="Start hours" className="flex-1" value={service.minHours} onChange={(event) => updateCustomService(index, { minHours: event.target.value })} /><span className="text-xs text-slate-400">to</span><Input type="number" min={0} placeholder="End hours" className="flex-1" value={service.maxHours} onChange={(event) => updateCustomService(index, { maxHours: event.target.value })} /></div></div>)}</div> : <p className="mt-2 text-xs text-slate-400">Add a custom service with its own name and hour range.</p>}
        </div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeTypeModal}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : editingType ? 'Save changes' : 'Create type'}</Button></div>
      </form></div></div>}
    <ConfirmDialog
      open={!!deleteTypeTarget}
      title="Delete equipment type"
      description={deleteTypeTarget ? `Delete ${deleteTypeTarget.name}? This action cannot be undone.` : undefined}
      confirmLabel="Delete"
      loading={deletingType}
      onConfirm={() => void confirmDeleteEquipmentType()}
      onCancel={() => setDeleteTypeTarget(null)}
    />
  </>
}

function SettingsTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{children}</button>
}

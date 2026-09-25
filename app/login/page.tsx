'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRole } from '@/components/role-context'
import { ApiUser } from '@/lib/types'

export default function Login() {
  const router = useRouter()
  const { setSession } = useRole()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const result = await response.json() as { user: Pick<ApiUser, 'id' | 'email' | 'role' | 'organization'> & Partial<ApiUser>; mustChangePassword: boolean; message?: string }
      if (!response.ok) throw new Error(result.message ?? 'Unable to sign in.')
      setSession({ ...result.user, mustChangePassword: result.mustChangePassword })
      if (result.mustChangePassword) {
        setMustChangePassword(true)
        toast.info('Change your temporary password to continue.')
      } else {
        router.replace('/dashboard')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      toast.error('The new passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const response = await fetch('/api/bff/users/me/password', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: password, newPassword }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message ?? 'Unable to change password.')
      toast.success('Password updated. Sign in with your new password.')
      window.location.assign('/login')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to change password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen bg-[#f4f7fb] dark:bg-slate-950">
      <div className="hidden w-[42%] flex-col justify-between bg-[#101d31] p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-500 font-bold">NG</div>
            <div><div className="font-bold">NGGL</div><div className="text-[10px] uppercase tracking-[.2em] text-slate-400">GSE operations</div></div>
          </div>
          <div className="mt-32 max-w-sm">
            <div className="mb-5 text-xs font-semibold uppercase tracking-[.2em] text-blue-300">Biman Bangladesh</div>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-tight">Keep every aircraft movement moving.</h1>
            <p className="mt-6 text-base leading-7 text-slate-400">A single source of truth for ground support equipment health, maintenance workflows and service readiness.</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">Secure access to GSE operations</div>
      </div>
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600 font-bold text-white">NG</div><div className="font-bold">NGGL <span className="font-normal text-slate-400">/ GSE Logbook</span></div></div>
          </div>
          <div className="mb-8">
            <div className="mb-3 text-sm font-semibold text-blue-600">Welcome back</div>
            <h2 className="text-3xl font-semibold tracking-tight">{mustChangePassword ? 'Change your password' : 'Sign in to your workspace'}</h2>
            <p className="mt-2 text-sm text-slate-500">{mustChangePassword ? 'Your administrator provided a temporary password. Set a new password to continue.' : 'Use your account credentials to access maintenance operations.'}</p>
          </div>
          {mustChangePassword ? (
            <form className="space-y-4" onSubmit={changePassword}>
              <label className="block text-xs font-semibold">New password<Input className="mt-2" type="password" minLength={12} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" required /></label>
              <label className="block text-xs font-semibold">Confirm new password<Input className="mt-2" type="password" minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
              <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Updating…' : 'Update password'}</Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={signIn}>
              <label className="block text-xs font-semibold">Email<Input className="mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" required /></label>
              <label className="block text-xs font-semibold">Password<Input className="mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
              <Button className="w-full" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Sign in'}</Button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}

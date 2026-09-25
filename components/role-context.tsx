'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { User } from '@/lib/types'

type SessionResponse = Partial<User> & { mustChangePassword?: boolean }
type RoleContextValue = {
  role: User['role'] | null
  user: User | null
  loading: boolean
  mustChangePassword: boolean
  setSession: (user: SessionResponse) => void
  clearSession: () => void
  refreshSession: () => Promise<void>
}

const RoleContext = createContext<RoleContextValue>({
  role: null,
  user: null,
  loading: true,
  mustChangePassword: false,
  setSession: () => {},
  clearSession: () => {},
  refreshSession: async () => {},
})

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0] ?? '').join('').toUpperCase()
}

function toUser(value: SessionResponse): User | null {
  if (!value.id || !value.email || !value.role || !value.organization) return null
  const name = value.name || value.email
  return {
    id: value.id,
    name,
    email: value.email,
    role: value.role,
    organization: value.organization,
    status: value.status ?? 'Active',
    initials: initials(name),
  }
}

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [mustChangePassword, setMustChangePassword] = useState(false)

  const setSession = useCallback((value: SessionResponse) => {
    setUser(toUser(value))
    setMustChangePassword(Boolean(value.mustChangePassword))
  }, [])

  const clearSession = useCallback(() => {
    setUser(null)
    setMustChangePassword(false)
  }, [])

  const refreshSession = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/session', { cache: 'no-store' })
      if (!response.ok) {
        clearSession()
        return
      }
      const value = (await response.json()) as SessionResponse
      setSession(value)
    } catch {
      clearSession()
    } finally {
      setLoading(false)
    }
  }, [clearSession, setSession])

  useEffect(() => {
    void refreshSession()
  }, [refreshSession])

  return (
    <RoleContext.Provider value={{ role: user?.role ?? null, user, loading, mustChangePassword, setSession, clearSession, refreshSession }}>
      {children}
    </RoleContext.Provider>
  )
}

export const useRole = () => useContext(RoleContext)

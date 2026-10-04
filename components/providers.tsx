'use client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { RoleProvider } from './role-context'
import { NotificationsProvider } from './notifications-context'
export function Providers({children}:{children:React.ReactNode}) { return <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false}><RoleProvider><NotificationsProvider>{children}</NotificationsProvider><Toaster position="bottom-right" richColors /></RoleProvider></ThemeProvider> }

'use client'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { RoleProvider } from './role-context'
export function Providers({children}:{children:React.ReactNode}) { return <ThemeProvider attribute="class" defaultTheme="light" enableSystem><RoleProvider>{children}<Toaster position="bottom-right" richColors /></RoleProvider></ThemeProvider> }

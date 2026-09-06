import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
export const metadata: Metadata = { title: 'NGGL GSE Logbook', description: 'Biman GSE Maintenance Logbook & Ticketing System' }
const inter = Inter({ subsets: ['latin'] })
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" suppressHydrationWarning><body className={inter.className}><Providers>{children}</Providers></body></html> }

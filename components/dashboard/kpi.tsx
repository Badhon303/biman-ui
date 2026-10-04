import Link from 'next/link'
import { ArrowUpRight, Box, CalendarClock, CircleAlert, ClipboardList, Droplets, Timer, Wrench } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { AirlinerSilhouette } from '@/components/aviation-backdrop'
import { cn } from '@/lib/utils'

const icons = { box: Box, wrench: Wrench, ticket: ClipboardList, alert: CircleAlert, drop: Droplets, timer: Timer, calendar: CalendarClock }
const iconColors = { blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', sky: 'bg-sky-50 text-sky-700', lime: 'bg-lime-50 text-lime-800', violet: 'bg-violet-50 text-violet-700' }
const cardColors = {
  blue: 'border-blue-700 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 shadow-blue-600/20',
  amber: 'border-amber-800 bg-gradient-to-br from-amber-800 via-orange-700 to-amber-800 shadow-orange-700/20',
  rose: 'border-rose-800 bg-gradient-to-br from-rose-800 via-rose-700 to-pink-700 shadow-rose-700/20',
  emerald: 'border-emerald-800 bg-gradient-to-br from-emerald-800 via-teal-700 to-cyan-800 shadow-emerald-700/20',
  sky: 'border-sky-800 bg-gradient-to-br from-sky-800 via-blue-700 to-indigo-800 shadow-blue-700/20',
  lime: 'border-lime-800 bg-gradient-to-br from-lime-800 via-lime-700 to-green-700 shadow-lime-700/20',
  violet: 'border-violet-800 bg-gradient-to-br from-violet-800 via-purple-700 to-indigo-800 shadow-violet-700/20',
}

export function Kpi({ label, value, delta, icon, color = 'blue', href, featured = false, colorful = false }: {
  label: string; value: string | number; delta?: string; icon: keyof typeof icons; color?: keyof typeof cardColors; href?: string; featured?: boolean; colorful?: boolean;
}) {
  const Icon = icons[icon]
  const colored = colorful || featured
  const tone = colorful ? color : 'blue'
  const card = (
    <Card className={cn('relative h-full min-h-[172px] overflow-hidden p-5', colored && cn(cardColors[tone], 'text-white'), href && 'transition duration-200 hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transform-none')}>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 overflow-hidden" aria-hidden="true">
        <div className={cn('absolute -right-10 top-7 h-40 w-40 rounded-full border border-dashed', colored ? 'border-white/20' : 'border-blue-100')} />
        <AirlinerSilhouette className={cn('absolute -right-4 top-10 w-28 rotate-[32deg]', colored ? 'text-white/10' : 'text-blue-600/[0.07]')} />
      </div>
      <div className="relative flex items-start justify-between">
        <div className={cn('mb-5 grid h-10 w-10 place-items-center rounded-2xl', colored ? 'bg-white/20 text-white' : iconColors[color])}><Icon className="h-[18px] w-[18px]" /></div>
        {href && <ArrowUpRight aria-hidden="true" className={cn('h-4 w-4', colored ? 'text-white/70' : 'text-slate-400')} />}
      </div>
      <div className="relative text-[30px] font-semibold leading-none tracking-tight tabular-nums">{value}</div>
      <div className={cn('relative mt-2 text-xs font-medium', colored ? 'text-white/90' : 'text-slate-600')}>{label}</div>
      {delta && <div className={cn('relative mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold', colored ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700')}>{delta}</div>}
    </Card>
  )
  return href ? <Link href={href} className="block min-w-0 rounded-[24px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{card}</Link> : card
}

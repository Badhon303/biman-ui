'use client'
import { Plane } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

export type ChartDatum = { name: string; value: number; color?: string }
const colors = ['#2667ff', '#f59e0b', '#f43f5e', '#94a3b8', '#8b5cf6']
const tooltipStyle = { borderRadius: 16, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px #1e40af12' }

export function EquipmentChart({ data, loading = false }: { data: ChartDatum[]; loading?: boolean }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  const segments = total && !loading ? data : [{ name: 'No equipment', value: 1, color: '#e9eefb' }]
  return (
    <div className="relative h-[230px] w-full min-w-0" aria-busy={loading} role="img" aria-label={loading ? 'Loading equipment status' : `${total} ground support assets. ${data.map(item => `${item.name}: ${item.value}`).join(', ')}`}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={segments} innerRadius={76} outerRadius={99} paddingAngle={total && !loading ? 5 : 0} cornerRadius={7} dataKey="value" strokeWidth={0} isAnimationActive={false}>
            {segments.map((item, i) => <Cell key={item.name} fill={item.color ?? colors[i % colors.length]} />)}
          </Pie>
          {total > 0 && !loading && <Tooltip contentStyle={tooltipStyle} />}
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <Plane className="mb-1 h-5 w-5 text-blue-600" />
        <span className="text-[32px] font-semibold leading-tight tracking-tight text-slate-900">{loading ? '…' : total}</span>
        <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">Ground assets</span>
      </div>
    </div>
  )
}

export function TicketChart({ data, loading = false }: { data: ChartDatum[]; loading?: boolean }) {
  if (loading || !data.length) return <div className="grid h-[230px] place-items-center rounded-2xl bg-blue-50/40 text-sm text-slate-500" aria-busy={loading}>{loading ? 'Loading maintenance workload…' : 'No open tickets.'}</div>
  return (
    <div className="h-[230px] w-full min-w-0" role="img" aria-label={`Open tickets: ${data.map(item => `${item.name}: ${item.value}`).join(', ')}`}>
      <ResponsiveContainer>
        <BarChart data={data} barSize={34} margin={{ left: -20, right: 4, top: 10, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#edf1f7" strokeDasharray="4 4" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip cursor={{ fill: '#eff6ff', radius: 8 }} contentStyle={tooltipStyle} />
          <Bar dataKey="value" name="Open tickets" radius={[10, 10, 4, 4]} background={{ fill: '#f4f7fd', radius: 10 }} isAnimationActive={false}>
            {data.map(item => <Cell key={item.name} fill={item.color ?? '#2667ff'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

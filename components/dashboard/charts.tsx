'use client'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { equipment, ticketServiceTypes, tickets as ticketData } from '@/lib/mock-data'
const status=[
  {name:'Available',value:equipment.filter((item)=>item.status==='Available').length},
  {name:'Under Maintenance',value:equipment.filter((item)=>item.status==='Under Maintenance').length},
  {name:'Out of Service',value:equipment.filter((item)=>item.status==='Out of Service').length},
  {name:'Inactive',value:equipment.filter((item)=>item.status==='Inactive').length},
]
const colors=['#2667ff','#f59e0b','#f43f5e','#94a3b8','#8b5cf6']
const tickets=ticketServiceTypes.map((serviceType)=>({
  name: serviceType,
  value: ticketData.filter((ticket)=>ticket.serviceType===serviceType).length,
}))
export function EquipmentChart(){return <div className="h-[220px] w-full"><ResponsiveContainer><PieChart><Pie data={status} innerRadius={62} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>{status.map((_,i)=><Cell key={i} fill={colors[i]}/>)}</Pie><Tooltip contentStyle={{borderRadius:12,border:'1px solid #e2e8f0',fontSize:12}}/><text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-900 text-xl font-semibold dark:fill-white">{equipment.length}</text><text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" className="fill-slate-400 text-[10px]">assets</text></PieChart></ResponsiveContainer></div>}
export function TicketChart(){return <div className="h-[220px] w-full"><ResponsiveContainer><BarChart data={tickets} barSize={28} margin={{left:-20,right:4,top:10,bottom:0}}><CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 4"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#64748b'}}/><YAxis axisLine={false} tickLine={false} tick={{fontSize:11,fill:'#94a3b8'}} allowDecimals={false}/><Tooltip cursor={{fill:'#f8fafc'}} contentStyle={{borderRadius:12,border:'1px solid #e2e8f0',fontSize:12}}/><Bar dataKey="value" fill="#2667ff" radius={[6,6,2,2]}/></BarChart></ResponsiveContainer></div>}

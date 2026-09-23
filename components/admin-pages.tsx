'use client'
import { useState } from 'react'
import { BarChart3, Check, Download, LineChart, Pencil, Plus, Save, Settings2, Trash2 } from 'lucide-react'
import { ShellPage } from '@/components/app-shell'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { equipment, equipmentServiceLabel, equipmentTypes as equipmentTypeRecords, standardEquipmentServices, users } from '@/lib/mock-data'
import type { EquipmentType } from '@/lib/types'
import { toast } from 'sonner'
export function ReportsPage(){return <ShellPage><div className="mb-7 flex items-end justify-between"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Insights / Reports</div><h1 className="text-3xl font-semibold tracking-tight">Reports</h1><p className="mt-2 text-sm text-slate-500">Operational insights for fleet readiness and maintenance performance.</p></div><Button variant="outline" onClick={()=>toast.success('Report exported (mock)')}><Download className="h-4 w-4"/>Export</Button></div><div className="grid gap-6 lg:grid-cols-2"><ReportCard title="Equipment availability" subtitle="Current fleet readiness" icon={<BarChart3 className="h-5 w-5"/>}><div className="mt-7 flex items-end gap-3">{[64,82,76,92,84,88,78,94,90,92].map((v,i)=><div key={i} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t-md bg-blue-500/80" style={{height:`${v/1.7}px`}}/><span className="text-[10px] text-slate-400">{['M','T','W','T','F','S','S','M','T','W'][i]}</span></div>)}</div><div className="mt-6 flex items-center justify-between border-t pt-4"><div><div className="text-2xl font-semibold">86.4%</div><div className="text-xs text-slate-500">Average availability</div></div><span className="text-xs font-semibold text-emerald-600">+4.2% vs Aug</span></div></ReportCard><ReportCard title="Downtime & MTBF" subtitle="Rolling 30-day performance" icon={<LineChart className="h-5 w-5"/>}><div className="mt-7 grid grid-cols-3 gap-3"><Metric label="Downtime" value="34.5h"/><Metric label="MTBF" value="128h"/><Metric label="Closed work" value="18"/></div><div className="mt-7 flex h-24 items-end gap-2 border-b">{[30,44,35,62,52,70,58,80,68,91,74,87].map((v,i)=><div key={i} className="flex-1 rounded-t bg-slate-200 dark:bg-slate-700" style={{height:`${v}%`}}/>)}</div></ReportCard><ReportCard title="PM compliance" subtitle="Scheduled work completed on time" icon={<Check className="h-5 w-5"/>}><div className="mt-7 flex items-center gap-8"><div className="grid h-32 w-32 place-items-center rounded-full" style={{background:'conic-gradient(#2667ff 0 92%, #e2e8f0 92% 100%)'}}><div className="grid h-24 w-24 place-items-center rounded-full bg-white text-2xl font-semibold dark:bg-slate-900">92%</div></div><div><div className="text-sm font-semibold">On track</div><p className="mt-2 text-sm leading-6 text-slate-500">23 of 25 scheduled PM activities completed within their due window.</p></div></div></ReportCard><ReportCard title="Request turnaround" subtitle="Approval journey by month" icon={<Settings2 className="h-5 w-5"/>}><div className="mt-7 space-y-4">{[['August','1.8 days','bg-blue-500'],['July','2.4 days','bg-slate-400'],['June','3.1 days','bg-slate-300']].map(([m,v,c])=><div key={m}><div className="mb-2 flex justify-between text-xs"><span className="font-medium">{m}</span><span className="text-slate-500">{v} avg.</span></div><div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-2 rounded-full ${c}`} style={{width:m==='August'?'42%':m==='July'?'58%':'76%'}}/></div></div>)}</div></ReportCard></div></ShellPage>}
function ReportCard({title,subtitle,icon,children}:{title:string;subtitle:string;icon:React.ReactNode;children:React.ReactNode}){return <Card className="p-6"><div className="flex items-start gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">{icon}</div><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div></div>{children}</Card>}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70"><div className="text-lg font-semibold">{value}</div><div className="mt-1 text-[11px] text-slate-500">{label}</div></div>}
export function UsersPage(){const [invite,setInvite]=useState(false);return <ShellPage><div className="mb-7 flex items-end justify-between"><div><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Admin / Access</div><h1 className="text-3xl font-semibold tracking-tight">User management</h1><p className="mt-2 text-sm text-slate-500">Manage NGGL operators and view connected Biman users.</p></div><Button onClick={()=>setInvite(true)}><Plus className="h-4 w-4"/>Invite user</Button></div><Card><div className="border-b p-5"><h2 className="text-sm font-semibold">NGGL users</h2></div><Table><THead><TR><TH>Name</TH><TH>Role</TH><TH>Organization</TH><TH>Status</TH><TH>Email</TH></TR></THead><TBody>{users.filter(u=>u.organization==='NGGL').map(u=><TR key={u.id}><TD><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600 dark:bg-blue-950/40">{u.initials}</div><span className="font-medium">{u.name}</span></div></TD><TD>{u.role}</TD><TD>{u.organization}</TD><TD><StatusBadge status={u.status}/></TD><TD className="text-slate-500">{u.email}</TD></TR>)}</TBody></Table><div className="border-b p-5"><h2 className="text-sm font-semibold">Biman users <span className="ml-2 text-xs font-normal text-slate-400">View only</span></h2></div><Table><TBody>{users.filter(u=>u.organization!=='NGGL').map(u=><TR key={u.id}><TD><div className="flex items-center gap-3"><div className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">{u.initials}</div><span className="font-medium">{u.name}</span></div></TD><TD>{u.role}</TD><TD>{u.organization}</TD><TD><StatusBadge status={u.status}/></TD><TD className="text-slate-500">{u.email}</TD></TR>)}</TBody></Table></Card>{invite&&<Modal title="Invite user" onClose={()=>setInvite(false)}><div className="space-y-4"><Input placeholder="Full name"/><Input placeholder="Work email"/><select className="h-10 w-full rounded-lg border bg-white px-3 text-sm dark:bg-slate-950"><option>Manager</option><option>Engineer</option></select><Button className="w-full" onClick={()=>{setInvite(false);toast.success('Invitation sent (mock)')}}>Send invitation</Button></div></Modal>}</ShellPage>}
export function SettingsPage(){
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'equipmentTypes'>('general')
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>(() =>
    equipmentTypeRecords.map((type) => ({ ...type, services: type.services.map((service) => ({ ...service })) })))
  const [typeName, setTypeName] = useState('')
  const [editingType, setEditingType] = useState<EquipmentType | null>(null)
  const [typeModalOpen, setTypeModalOpen] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [serviceLevel, setServiceLevel] = useState(0)
  const [customServices, setCustomServices] = useState<{ id: string; name: string; minHours: string; maxHours: string }[]>([])
  const sliderServices = standardEquipmentServices.filter((service) => !service.months)

  const openTypeModal = (type?: EquipmentType) => {
    const standardIds = new Set(standardEquipmentServices.map((service) => service.id))
    setTypeModalOpen(true)
    setEditingType(type ?? null)
    setTypeName(type?.name ?? '')
    const selectedSliderServices = type?.services.filter((service) => !service.months) ?? []
    const selectedLevel = selectedSliderServices.length
      ? Math.max(0, sliderServices.findIndex((service) => service.id === selectedSliderServices[selectedSliderServices.length - 1].id))
      : 0
    setServiceLevel(selectedLevel)
    setSelectedServices(type?.services.filter((service) => standardIds.has(service.id) && service.months).map((service) => service.id) ?? [])
    setCustomServices(type?.services.filter((service) => !standardIds.has(service.id)).map((service) => ({
      id: service.id,
      name: service.name,
      minHours: service.minHours?.toString() ?? '',
      maxHours: service.maxHours?.toString() ?? '',
    })) ?? [])
  }

  const closeTypeModal = () => {
    setTypeModalOpen(false)
    setEditingType(null)
    setTypeName('')
    setSelectedServices([])
    setServiceLevel(0)
    setCustomServices([])
  }

  const toggleService = (id: string) => {
    setSelectedServices((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])
  }

  const addCustomService = () => {
    setCustomServices((services) => [...services, { id: `custom-${Date.now()}`, name: '', minHours: '', maxHours: '' }])
  }

  const updateCustomService = (id: string, patch: Partial<{ name: string; minHours: string; maxHours: string }>) => {
    setCustomServices((services) => services.map((service) => service.id === id ? { ...service, ...patch } : service))
  }

  const removeCustomService = (id: string) => {
    setCustomServices((services) => services.filter((service) => service.id !== id))
  }

  const saveEquipmentType = () => {
    const name = typeName.trim()
    if (!name) {
      toast.error('Enter an equipment type name')
      return
    }
    const duplicate = equipmentTypes.some((type) => type.name.toLowerCase() === name.toLowerCase() && type.id !== editingType?.id)
    if (duplicate) {
      toast.error('That equipment type already exists')
      return
    }
    const services: EquipmentType['services'] = [
      ...sliderServices.slice(0, serviceLevel + 1).map((service) => ({ ...service })),
      ...standardEquipmentServices.filter((service) => selectedServices.includes(service.id)).map((service) => ({ ...service })),
      ...customServices.filter((service) => service.name.trim()).map((service) => ({
        id: service.id,
        name: service.name.trim(),
        minHours: service.minHours !== '' ? Number(service.minHours) : undefined,
        maxHours: service.maxHours !== '' ? Number(service.maxHours) : undefined,
      })),
    ]
    setEquipmentTypes((types) => editingType
      ? types.map((type) => type.id === editingType.id ? { ...type, name, services } : type)
      : [...types, { id: `et-${Date.now()}`, name, services }])
    toast.success(editingType ? 'Equipment type updated' : 'Equipment type created')
    closeTypeModal()
  }

  const deleteEquipmentType = (type: EquipmentType) => {
    if (!window.confirm(`Delete ${type.name}?`)) return
    setEquipmentTypes((types) => types.filter((item) => item.id !== type.id))
    toast.success('Equipment type deleted')
  }

  return <ShellPage><div className="mb-7"><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Admin / Workspace</div><h1 className="text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-slate-500">Configure this prototype workspace. Changes stay local to this session.</p></div><div className="grid gap-6 lg:grid-cols-[220px_1fr]"><Card className="h-fit p-2"><SettingsTab active={activeTab === 'general'} onClick={() => setActiveTab('general')}>General</SettingsTab><SettingsTab active={activeTab === 'equipmentTypes'} onClick={() => setActiveTab('equipmentTypes')}>Equipment types</SettingsTab></Card><div className="space-y-6">{activeTab === 'general' && <Card className="p-6"><h2 className="text-base font-semibold">Company information</h2><p className="mt-1 text-sm text-slate-500">Displayed across generated tickets and operational reports.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Company name<Input className="mt-2" defaultValue="National Grid for Learning (NGGL)"/></label><label className="text-xs font-semibold">Partner organization<Input className="mt-2" defaultValue="Biman Bangladesh Airlines"/></label><label className="text-xs font-semibold sm:col-span-2">Operations base<Input className="mt-2" defaultValue="Hazrat Shahjalal International Airport, Dhaka"/></label></div><Button className="mt-6" onClick={()=>{setSaved(true);toast.success('Settings saved locally')}}><Save className="h-4 w-4"/>{saved?'Saved':'Save changes'}</Button></Card>}{activeTab === 'equipmentTypes' && <Card><div className="flex items-start justify-between border-b p-6"><div><h2 className="text-base font-semibold">Equipment types</h2><p className="mt-1 text-sm text-slate-500">Manage the equipment types and service intervals available when registering assets.</p></div><Button onClick={() => openTypeModal()}><Plus className="h-4 w-4"/>Add type</Button></div><Table><THead><TR><TH>Equipment type</TH><TH>Services</TH><TH>Equipment count</TH><TH>Actions</TH></TR></THead><TBody>{equipmentTypes.map((type) => <TR key={type.id}><TD><span className="font-medium text-slate-900 dark:text-white">{type.name}</span></TD><TD><div className="flex max-w-md flex-wrap gap-1.5">{type.services.length ? type.services.map((service) => <span key={service.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{equipmentServiceLabel(service)}</span>) : <span className="text-xs text-slate-400">No services</span>}</div></TD><TD>{equipment.filter((item) => item.type === type.name).length}</TD><TD><div className="flex justify-end gap-1"><Button variant="ghost" className="px-2" aria-label={`Edit ${type.name}`} onClick={() => openTypeModal(type)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" className="px-2 text-rose-600 hover:bg-rose-50" aria-label={`Delete ${type.name}`} onClick={() => deleteEquipmentType(type)}><Trash2 className="h-4 w-4"/></Button></div></TD></TR>)}</TBody></Table></Card>}</div></div>{typeModalOpen ? <Modal title={editingType ? 'Edit equipment type' : 'Add equipment type'} onClose={closeTypeModal}><form className="space-y-4" onSubmit={(event) => {event.preventDefault();saveEquipmentType()}}><label className="block text-xs font-semibold">Type name<Input autoFocus value={typeName} onChange={(event) => setTypeName(event.target.value)} placeholder="e.g. Belt Loader" className="mt-2"/></label><div><div className="text-xs font-semibold">Hour-meter services</div><p className="mt-1 text-xs text-slate-500">Slide to select services from F through E. Each earlier service is included automatically.</p><div className="mt-4 rounded-xl border p-4"><input type="range" min={0} max={sliderServices.length - 1} step={1} list="service-hour-stops" value={serviceLevel} onChange={(event) => setServiceLevel(Number(event.target.value))} className="w-full accent-blue-600" aria-label="Select highest hour-meter service"/><datalist id="service-hour-stops">{sliderServices.map((_, index) => <option key={index} value={index}/>)}</datalist><div className="-mt-1 flex justify-between px-1">{sliderServices.map((service, index) => <span key={service.id} className={`h-2 w-2 rounded-full ${index <= serviceLevel ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`} aria-hidden="true"/> )}</div><div className="mt-2 flex justify-between text-[11px] text-slate-500">{sliderServices.map((service) => <span key={service.id} className={sliderServices.indexOf(service) <= serviceLevel ? 'font-semibold text-blue-600' : ''}>{service.name}</span>)}</div><div className="mt-3 text-xs font-medium text-slate-600 dark:text-slate-300">Selected through {equipmentServiceLabel(sliderServices[serviceLevel])}</div></div><label className="mt-3 flex items-center justify-between rounded-xl border p-3 text-sm">{equipmentServiceLabel(standardEquipmentServices.find((service) => service.id === 'svc-v')!)}<input type="checkbox" checked={selectedServices.includes('svc-v')} onChange={() => toggleService('svc-v')} className="h-4 w-4 accent-blue-600"/></label></div><div><div className="flex items-center justify-between"><span className="text-xs font-semibold">Custom services</span><Button type="button" variant="outline" className="h-8 px-2 text-xs" onClick={addCustomService}><Plus className="h-3.5 w-3.5"/>Add custom</Button></div>{customServices.length ? <div className="mt-2 space-y-2">
{customServices.map((service) => <div key={service.id} className="space-y-2 rounded-xl border p-3"><div className="flex items-center gap-2"><Input placeholder="Service name" value={service.name} onChange={(event) => updateCustomService(service.id, { name: event.target.value })}/><Button type="button" variant="ghost" className="px-2 text-rose-600 hover:bg-rose-50" aria-label="Remove custom service" onClick={() => removeCustomService(service.id)}><Trash2 className="h-4 w-4"/></Button></div><div className="flex items-center gap-2"><Input type="number" placeholder="Start hours" className="flex-1" value={service.minHours} onChange={(event) => updateCustomService(service.id, { minHours: event.target.value })}/><span className="text-xs text-slate-400">to</span><Input type="number" min={0} placeholder="Max hours" className="flex-1" value={service.maxHours} onChange={(event) => updateCustomService(service.id, { maxHours: event.target.value })}/></div></div>)}</div> : <p className="mt-2 text-xs text-slate-400">Add a custom service with its own name and hour range.</p>}</div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={closeTypeModal}>Cancel</Button><Button type="submit">{editingType ? 'Save changes' : 'Create type'}</Button></div></form></Modal> : null}</ShellPage>
}

function SettingsTab({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){return <button type="button" onClick={onClick} className={`w-full rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{children}</button>}
function SettingsPlaceholder({title,description}:{title:string;description:string}){return <Card className="p-6"><h2 className="text-base font-semibold">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p><div className="mt-6 rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">This settings section is ready to be configured.</div></Card>}

function LegacySettingsPage(){const [saved,setSaved]=useState(false);return <ShellPage><div className="mb-7"><div className="mb-2 text-xs font-semibold uppercase tracking-[.18em] text-blue-600">Admin / Workspace</div><h1 className="text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-2 text-sm text-slate-500">Configure this prototype workspace. Changes stay local to this session.</p></div><div className="grid gap-6 lg:grid-cols-[220px_1fr]"><Card className="h-fit p-2"><div className="rounded-lg bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">General</div><div className="px-3 py-2.5 text-sm text-slate-500">Ticket types & statuses</div><div className="px-3 py-2.5 text-sm text-slate-500">Notifications</div></Card><Card className="p-6"><h2 className="text-base font-semibold">Company information</h2><p className="mt-1 text-sm text-slate-500">Displayed across generated tickets and operational reports.</p><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold">Company name<Input className="mt-2" defaultValue="National Grid for Learning (NGGL)"/></label><label className="text-xs font-semibold">Partner organization<Input className="mt-2" defaultValue="Biman Bangladesh Airlines"/></label><label className="text-xs font-semibold sm:col-span-2">Operations base<Input className="mt-2" defaultValue="Hazrat Shahjalal International Airport, Dhaka"/></label></div><Button className="mt-6" onClick={()=>{setSaved(true);toast.success('Settings saved locally')}}><Save className="h-4 w-4"/>{saved?'Saved':'Save changes'}</Button></Card></div></ShellPage>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><button onClick={onClose} className="text-slate-400 hover:text-slate-700">×</button></div>{children}</div></div>}

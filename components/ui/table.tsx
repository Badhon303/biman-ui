import { cn } from '@/lib/utils'
export function Table({children,className}:{children:React.ReactNode;className?:string}){return <div className="overflow-x-auto"><table className={cn('w-full text-left text-sm',className)}>{children}</table></div>}
export const THead=({children}:{children?:React.ReactNode})=><thead className="border-b bg-slate-50/80 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950/60">{children}</thead>
export const TBody=({children}:{children?:React.ReactNode})=><tbody className="divide-y">{children}</tbody>
export const TR=({children,className}:{children:React.ReactNode;className?:string})=><tr className={cn('transition hover:bg-slate-50 dark:hover:bg-slate-800/50',className)}>{children}</tr>
export const TH=({children}:{children?:React.ReactNode})=><th className="px-5 py-3 font-semibold">{children}</th>
export const TD=({children,className}:{children:React.ReactNode;className?:string})=><td className={cn('px-5 py-3.5 text-slate-600 dark:text-slate-300',className)}>{children}</td>

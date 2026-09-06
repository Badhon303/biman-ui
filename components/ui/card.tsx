import { cn } from '@/lib/utils'
export function Card({children,className}:{children?:React.ReactNode;className?:string}){return <div className={cn('rounded-2xl border bg-white shadow-soft dark:bg-slate-900/70',className)}>{children}</div>}

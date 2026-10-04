import { cn } from '@/lib/utils'
export function Card({children,className}:{children?:React.ReactNode;className?:string}){return <div className={cn('rounded-[24px] border border-white bg-white shadow-[0_4px_24px_-8px_rgba(43,69,124,0.10)]',className)}>{children}</div>}

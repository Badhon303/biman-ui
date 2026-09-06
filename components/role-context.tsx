'use client'
import { createContext, useContext, useState } from 'react'
import { Role } from '@/lib/types'
import { users } from '@/lib/mock-data'
const RoleContext = createContext<{role:Role; setRole:(role:Role)=>void; user:typeof users[number]}>({role:'Super Admin',setRole:()=>{},user:users[0]})
export function RoleProvider({children}:{children:React.ReactNode}) { const [role,setRole] = useState<Role>('Super Admin'); const user = users.find(u=>u.role===role) ?? users[0]; return <RoleContext.Provider value={{role,setRole,user}}>{children}</RoleContext.Provider> }
export const useRole = () => useContext(RoleContext)

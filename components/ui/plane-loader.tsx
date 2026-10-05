import { Plane } from 'lucide-react'

export function PlaneLoader({ label = 'Loading…', className = '', fullScreen = false }: { label?: string; className?: string; fullScreen?: boolean }) {
  return (
    <div className={`${fullScreen ? 'grid min-h-screen place-items-center bg-[#eef2fb]' : 'grid place-items-center p-10'} ${className}`} role="status" aria-busy="true" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="relative h-10 w-24 overflow-hidden">
          <span className="plane-loader-trail absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-blue-400 to-transparent" style={{ animation: 'plane-trail 1.8s ease-in-out infinite' }} />
          <Plane className="plane-loader-plane absolute left-1/2 top-1/2 -ml-3 -mt-3 h-6 w-6 text-blue-600" style={{ animation: 'plane-fly 1.8s ease-in-out infinite' }} fill="currentColor" />
        </div>
        <span className="text-sm text-slate-500">{label}</span>
      </div>
    </div>
  )
}

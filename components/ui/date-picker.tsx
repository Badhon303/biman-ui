'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type DatePickerProps = {
  className?: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  disabled?: boolean
  name?: string
  'aria-label'?: string
}

const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function parseDate(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day, 12) : null
}

function dateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

function displayDate(date: Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export function DatePicker({ className, value, onChange, required, disabled, name, 'aria-label': ariaLabel = 'Choose date' }: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)
  const dialogId = useId()
  const selectedDate = parseDate(value)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initial = selectedDate ?? new Date()
    return new Date(initial.getFullYear(), initial.getMonth(), 1, 12)
  })

  useEffect(() => {
    if (!open) return
    const positionCalendar = () => {
      const trigger = triggerRef.current
      const calendar = calendarRef.current
      if (!trigger || !calendar) return
      const triggerRect = trigger.getBoundingClientRect()
      const calendarRect = calendar.getBoundingClientRect()
      const margin = 12
      const gap = 8
      const topBelow = triggerRect.bottom + gap
      const top = topBelow + calendarRect.height <= window.innerHeight - margin
        ? topBelow
        : triggerRect.top - calendarRect.height - gap >= margin
          ? triggerRect.top - calendarRect.height - gap
          : Math.max(margin, window.innerHeight - calendarRect.height - margin)
      const left = Math.min(Math.max(margin, triggerRect.left), window.innerWidth - calendarRect.width - margin)
      setPosition({ top, left })
    }
    positionCalendar()
    window.addEventListener('resize', positionCalendar)
    document.addEventListener('scroll', positionCalendar, true)
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !calendarRef.current?.contains(event.target)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.removeEventListener('resize', positionCalendar)
      document.removeEventListener('scroll', positionCalendar, true)
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1, 12)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - firstDay.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart)
    day.setDate(gridStart.getDate() + index)
    return day
  })
  const today = dateValue(new Date())

  const showPicker = () => {
    const initial = selectedDate ?? new Date()
    setVisibleMonth(new Date(initial.getFullYear(), initial.getMonth(), 1, 12))
    setPosition(null)
    setOpen((current) => !current)
  }

  const changeMonth = (offset: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1, 12))
  }

  const chooseDate = (date: Date) => {
    onChange(dateValue(date))
    setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1, 12))
    setOpen(false)
  }

  return (
    <>
    <div className={cn('relative', className)} ref={rootRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-controls={dialogId}
        aria-expanded={open}
        aria-required={required}
        onClick={showPicker}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-3 rounded-lg border bg-white px-3 text-left text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-950',
          value ? 'text-slate-900 dark:text-white' : 'text-slate-400',
        )}
      >
        <span>{selectedDate ? displayDate(selectedDate) : 'Select a date'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

    </div>
    {open && typeof document !== 'undefined' && createPortal(
        <div ref={calendarRef} id={dialogId} role="dialog" aria-label="Choose due date" style={{ position: 'fixed', top: position?.top ?? 0, left: position?.left ?? 0, visibility: position ? 'visible' : 'hidden' }} className="z-[100] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_20px_60px_-20px_rgba(15,23,42,.35)] ring-1 ring-slate-950/5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-blue-600">Choose date</p>
              <h3 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 dark:text-white">{monthLabel(visibleMonth)}</h3>
            </div>
            <div className="flex gap-1">
              <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" aria-label="Next month" onClick={() => changeMonth(1)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-white"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7">
            {weekdays.map((weekday) => <div key={weekday} className="grid h-8 place-items-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">{weekday}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {days.map((day) => {
              const valueForDay = dateValue(day)
              const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
              const isSelected = valueForDay === value
              const isToday = valueForDay === today
              return <button key={valueForDay} type="button" aria-pressed={isSelected} aria-label={displayDate(day)} onClick={() => chooseDate(day)} className={cn('relative mx-auto grid h-9 w-9 place-items-center rounded-xl text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500', isSelected ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25' : isCurrentMonth ? 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-950/50' : 'text-slate-300 hover:bg-slate-100 dark:text-slate-600 dark:hover:bg-slate-800', isToday && !isSelected && 'bg-blue-50 font-bold text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900')}>
                {day.getDate()}
                {isToday && !isSelected && <span className="absolute bottom-1 h-1 w-1 rounded-full bg-blue-500" />}
              </button>
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
            <span className="text-[11px] text-slate-400">{selectedDate ? `Selected · ${displayDate(selectedDate)}` : 'No date selected'}</span>
            <button type="button" onClick={() => chooseDate(new Date())} className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-950">Today</button>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}

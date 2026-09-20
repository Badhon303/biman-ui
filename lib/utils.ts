import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

function overdueDuration(dueDate: string, resolvedDate?: string) {
  const referenceTime = resolvedDate
    ? new Date(`${resolvedDate}T00:00:00`).getTime()
    : Date.now()
  return referenceTime - new Date(`${dueDate}T00:00:00`).getTime()
}

export function isOverdue(dueDate: string, resolvedDate?: string) {
  return Boolean(dueDate) && overdueDuration(dueDate, resolvedDate) > 0
}

export function overdueBy(dueDate: string, resolvedDate?: string) {
  if (!dueDate) return '—'
  if (!isOverdue(dueDate, resolvedDate)) return 'Not overdue'

  const overdueDays = Math.floor(overdueDuration(dueDate, resolvedDate) / (1000 * 60 * 60 * 24))
  return overdueDays === 0
    ? 'Less than a day'
    : `${overdueDays} day${overdueDays === 1 ? '' : 's'}`
}

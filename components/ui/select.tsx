'use client'

import { Children, ChangeEvent, Fragment, ReactNode, isValidElement, useEffect, useId, useMemo, useRef, useState } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { Check, ChevronDown, ChevronUp, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type Option = { value: string; label: ReactNode; text: string; disabled: boolean }

type SelectProps = {
  className?: string
  contentClassName?: string
  value?: string
  defaultValue?: string
  name?: string
  id?: string
  required?: boolean
  disabled?: boolean
  placeholder?: string
  searchable?: boolean
  searchPlaceholder?: string
  children?: ReactNode
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
  onValueChange?: (value: string) => void
  'aria-label'?: string
}

const EMPTY = '__biman_empty__'

function textOf(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children)
  return ''
}

function collectOptions(children: ReactNode, options: Option[] = []) {
  Children.forEach(children, (child) => {
    if (!isValidElement<{ children?: ReactNode; value?: string | number; disabled?: boolean }>(child)) return
    if (child.type === Fragment) return collectOptions(child.props.children, options)
    if (child.type !== 'option') return
    const text = textOf(child.props.children)
    options.push({
      value: child.props.value === undefined ? text : String(child.props.value),
      label: child.props.children,
      text,
      disabled: Boolean(child.props.disabled),
    })
  })
  return options
}

export function Select({
  className,
  contentClassName,
  value,
  defaultValue,
  name,
  id,
  required,
  disabled,
  placeholder,
  searchable = false,
  searchPlaceholder,
  children,
  onChange,
  onValueChange,
  'aria-label': ariaLabel,
}: SelectProps) {
  const options = useMemo(() => collectOptions(children), [children])
  const placeholderOption = options.find((option) => option.value === '' && option.disabled)
  const items = options.filter((option) => option !== placeholderOption)
  const [innerValue, setInnerValue] = useState(() => defaultValue ?? options.find((option) => !option.disabled)?.value ?? '')
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const current = value ?? innerValue
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const filteredItems = searchable ? items.filter((option) => option.text.toLowerCase().includes(searchQuery.trim().toLowerCase())) : items
  useEffect(() => { if (open && searchable) searchRef.current?.focus() }, [open, searchable])
  const hasEmptyItem = items.some((option) => option.value === '')
  const radixValue = current === '' ? (hasEmptyItem ? EMPTY : '') : current

  const handleChange = (next: string) => {
    const nextValue = next === EMPTY ? '' : next
    if (value === undefined) setInnerValue(nextValue)
    setOpen(false)
    setSearchQuery('')
    onValueChange?.(nextValue)
    onChange?.({ target: { value: nextValue, name }, currentTarget: { value: nextValue, name } } as unknown as ChangeEvent<HTMLSelectElement>)
  }

  return (
    <>
      <SelectPrimitive.Root value={radixValue} onValueChange={handleChange} disabled={disabled} open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) { setSearchQuery(''); setActiveIndex(0) } }}>
        <SelectPrimitive.Trigger
          ref={triggerRef}
          id={id}
          aria-label={ariaLabel}
          className={cn(
            'group flex h-10 min-w-[9rem] items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-sm shadow-sm outline-none transition',
            'hover:border-slate-300 focus-visible:border-blue-500 focus-visible:ring-2 focus-visible:ring-blue-500/15 data-[state=open]:border-blue-500 data-[state=open]:ring-2 data-[state=open]:ring-blue-500/15',
            'disabled:cursor-not-allowed disabled:opacity-60 data-[placeholder]:text-slate-400',
            'dark:bg-slate-950 dark:hover:border-slate-700',
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            <SelectPrimitive.Value placeholder={placeholder ?? placeholderOption?.label ?? 'Select…'} />
          </span>
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            collisionPadding={12}
            className={cn(
              'relative z-[60] max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border bg-white text-sm text-slate-700 shadow-xl shadow-slate-900/10',
              'dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:shadow-black/40',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
              contentClassName,
            )}
          >
            {searchable && <div className="relative border-b p-2 dark:border-slate-800"><Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input ref={searchRef} role="combobox" aria-label={`Search ${ariaLabel ?? 'options'}`} aria-autocomplete="list" aria-expanded={open} aria-controls={listboxId} aria-activedescendant={filteredItems.length ? `${listboxId}-option-${activeIndex}` : undefined} className="h-9 w-full rounded-lg bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20" placeholder={searchPlaceholder ?? `Search ${ariaLabel?.toLowerCase() ?? 'options'}…`} value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setActiveIndex(0) }} onKeyDown={(event) => {
                if (event.key === 'Escape') return
                event.stopPropagation()
                if (event.key === 'ArrowDown') { event.preventDefault(); setActiveIndex((index) => Math.max(0, Math.min(index + 1, filteredItems.length - 1))) }
                else if (event.key === 'ArrowUp') { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)) }
                else if (event.key === 'Enter') { event.preventDefault(); const option = filteredItems[activeIndex]; if (option && !option.disabled) handleChange(option.value || EMPTY) }
              }} />
            </div>}
            <SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center text-slate-400">
              <ChevronUp className="h-4 w-4" />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport id={listboxId} className="p-1">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-2 text-slate-400">{searchable && searchQuery ? 'No matching options' : 'No options'}</div>
              ) : (
                filteredItems.map((option, index) => (
                  <SelectPrimitive.Item
                    key={option.value || EMPTY}
                    id={`${listboxId}-option-${index}`}
                    value={option.value || EMPTY}
                    disabled={option.disabled}
                    textValue={option.text}
                    onMouseMove={() => setActiveIndex(index)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-3 pr-8 outline-none transition-colors',
                      'data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700 data-[state=checked]:font-medium',
                      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                      'dark:data-[highlighted]:bg-blue-950/50 dark:data-[highlighted]:text-blue-200',
                      searchable && activeIndex === index && 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-200',
                    )}
                  >
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                    <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex items-center text-blue-600 dark:text-blue-400">
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))
              )}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center text-slate-400">
              <ChevronDown className="h-4 w-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {(name || required) && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          name={name}
          value={current}
          required={required}
          disabled={disabled}
          onChange={() => {}}
          onFocus={() => triggerRef.current?.focus()}
        />
      )}
    </>
  )
}

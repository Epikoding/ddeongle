'use client'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function Chip({ selected = false, tone = 'default', onClick, onRemove, children, className, ...rest }:
  { selected?: boolean; tone?: 'default' | 'warn'; onClick?: () => void; onRemove?: () => void; children: ReactNode; className?: string; 'data-testid'?: string }) {
  const base = 'inline-flex h-8 items-center gap-1 rounded-full border px-3 text-[14px] leading-none transition-colors select-none'
  const look = selected
    ? tone === 'warn' ? 'border-warn bg-warn-soft text-warn font-semibold' : 'border-accent bg-accent text-primary-foreground font-semibold'
    : tone === 'warn' ? 'border-warn/60 bg-warn-soft/60 text-warn' : 'border-line bg-card text-ink'
  const Tag = onClick ? 'button' : 'span'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick} aria-pressed={onClick ? selected : undefined}
      className={cn(base, look, onClick && 'active:scale-[0.97]', className)} {...rest}>
      {children}
      {onRemove && <button type="button" aria-label="빼기" onClick={(e) => { e.stopPropagation(); onRemove() }} className="-mr-1 rounded-full p-0.5 opacity-70 hover:opacity-100"><X size={12} /></button>}
    </Tag>
  )
}

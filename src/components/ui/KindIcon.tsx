import { UtensilsCrossed, Droplets, Moon, Activity, Zap, Footprints, Pill, CircleDot, StickyNote, type LucideIcon } from 'lucide-react'
import type { Kind } from '@/lib/schemas'
import { cn } from '@/lib/utils'

export const KIND_LUCIDE: Record<Kind, LucideIcon> = {
  meal: UtensilsCrossed, bowel: Droplets, sleep: Moon, symptom: Activity, stress: Zap,
  exercise: Footprints, medication: Pill, cycle: CircleDot, note: StickyNote,
}

const WARN_KINDS: Kind[] = ['bowel', 'symptom']

export function KindIcon({ kind, size = 32, className }: { kind: Kind; size?: 24 | 32 | 40; className?: string }) {
  const Icon = KIND_LUCIDE[kind]
  const tile = WARN_KINDS.includes(kind) ? 'bg-warn-soft' : 'bg-accent-soft'
  return (
    <span aria-hidden className={cn('inline-flex shrink-0 items-center justify-center rounded-[10px] text-ink', tile, className)}
      style={{ width: size, height: size }}>
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.75} />
    </span>
  )
}

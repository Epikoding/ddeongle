'use client'
import { cn } from '@/lib/utils'

export function Segment10({ value, onChange, labels }: { value: number | null; onChange: (v: number | null) => void; labels?: [string, string] }) {
  return (
    <div>
      <div className="grid grid-cols-11 gap-1" role="radiogroup">
        {Array.from({ length: 11 }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} onClick={() => onChange(value === i ? null : i)}
            className={cn('h-9 rounded-xl border text-[12px] tabular-nums', value === i ? 'border-accent bg-accent font-bold text-primary-foreground' : 'border-line bg-card text-ink')}>
            {i}
          </button>
        ))}
      </div>
      {labels && <div className="mt-1 flex justify-between text-[12px] text-mute"><span>{labels[0]}</span><span>{labels[1]}</span></div>}
    </div>
  )
}

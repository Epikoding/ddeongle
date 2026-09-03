'use client'
import { useRef } from 'react'
import { cn } from '@/lib/utils'

const COUNT = 11
// ARIA 라디오 그룹 규약 — 탭 정지점은 하나(고른 칸, 없으면 첫 칸)이고 칸 사이는 화살표·Home·End로 옮긴다.
const STEP: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }

export function Segment10({ value, onChange, labels, 'aria-labelledby': labelledBy }:
  { value: number | null; onChange: (v: number | null) => void; labels?: [string, string]; 'aria-labelledby'?: string }) {
  const group = useRef<HTMLDivElement>(null)
  const stop = value !== null && value >= 0 && value < COUNT ? value : 0
  function move(e: React.KeyboardEvent, i: number) {
    const step = STEP[e.key]
    const next = step !== undefined ? (i + step + COUNT) % COUNT : e.key === 'Home' ? 0 : e.key === 'End' ? COUNT - 1 : -1
    if (next < 0) return
    e.preventDefault()
    onChange(next)
    group.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus()
  }
  return (
    <div>
      <div ref={group} className="grid grid-cols-11 gap-1" role="radiogroup" aria-labelledby={labelledBy}>
        {Array.from({ length: COUNT }, (_, i) => (
          <button key={i} type="button" role="radio" aria-checked={value === i} tabIndex={i === stop ? 0 : -1}
            onKeyDown={(e) => move(e, i)} onClick={() => onChange(value === i ? null : i)}
            className={cn('h-9 rounded-xl border text-[12px] tabular-nums', value === i ? 'border-accent bg-accent font-bold text-primary-foreground' : 'border-line bg-card text-ink')}>
            {i}
          </button>
        ))}
      </div>
      {labels && <div className="mt-1 flex justify-between text-[12px] text-mute"><span>{labels[0]}</span><span>{labels[1]}</span></div>}
    </div>
  )
}

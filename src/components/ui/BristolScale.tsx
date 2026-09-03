'use client'
import { cn } from '@/lib/utils'

export const BRISTOL: { n: 1 | 2 | 3 | 4 | 5 | 6 | 7; label: string }[] = [
  { n: 1, label: '딱딱' }, { n: 2, label: '울퉁' }, { n: 3, label: '금간' }, { n: 4, label: '매끈' },
  { n: 5, label: '무른' }, { n: 6, label: '죽' }, { n: 7, label: '물' },
]

const SHAPES: Record<number, string> = {
  1: '<circle cx="6" cy="12" r="3"/><circle cx="12" cy="9" r="3"/><circle cx="17" cy="14" r="3"/>',
  2: '<rect x="3" y="8" width="18" height="8" rx="4"/><circle cx="8" cy="12" r="1.6" fill="rgba(0,0,0,.25)"/><circle cx="15" cy="12" r="1.6" fill="rgba(0,0,0,.25)"/>',
  3: '<rect x="3" y="9" width="18" height="6" rx="3"/><path d="M8 9v6M13 9v6" stroke="rgba(0,0,0,.25)" stroke-width="1"/>',
  4: '<rect x="2" y="9" width="20" height="6" rx="3"/>',
  5: '<ellipse cx="7" cy="12" rx="4" ry="3"/><ellipse cx="16" cy="11" rx="4" ry="3"/>',
  6: '<path d="M4 14c3-5 6-5 8-2s5 3 8-1v6H4z"/>',
  7: '<path d="M3 15c4-4 6 2 9-1s5-2 9 1v4H3z"/>',
}

export function BristolScale({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1" role="radiogroup" aria-label="브리스톨 척도">
      {BRISTOL.map(({ n, label }) => {
        const on = value === n
        const warn = n >= 6
        return (
          <button key={n} type="button" aria-pressed={on} aria-label={`${n} ${label}`} onClick={() => onChange(on ? null : n)}
            className={cn('flex aspect-[1/1.35] flex-col items-center justify-center gap-0.5 rounded-[10px] border text-[10px]',
              on ? (warn ? 'border-warn bg-warn-soft text-warn' : 'border-accent bg-accent-soft text-accent') : 'border-line bg-card text-mute')}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill={on && warn ? 'var(--warn)' : on ? 'var(--accent)' : 'var(--mute)'}
              dangerouslySetInnerHTML={{ __html: SHAPES[n] }} />
            <b className={cn('text-[13px]', on ? '' : 'text-ink')}>{n}</b>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

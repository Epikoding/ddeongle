import { KIND_LABEL, type Entry } from '@/lib/schemas'
import { isWatched } from '@/lib/watch-ingredients'
import { KindIcon } from '@/components/ui/KindIcon'
import { cn } from '@/lib/utils'

export function summarizeEntry(e: Entry): string {
  switch (e.kind) {
    case 'meal': return e.data.foods.map((f) => f.name).join(', ') || '(음식 없음)'
    case 'symptom': return `${e.data.type}${e.data.severity != null ? ` · 강도 ${e.data.severity}/10` : ''}`
    case 'bowel': {
      const parts = [e.data.bristol != null ? `브리스톨 ${e.data.bristol}` : '배변']
      if (e.data.urgency) parts.push('급함')
      if (e.data.nocturnal) parts.push('야간')
      if (e.data.blood) parts.push('혈변')
      return parts.join(' · ')
    }
    case 'sleep': return e.data.quality != null ? `수면 질 ${e.data.quality}/10` : '수면'
    case 'stress': return e.data.level != null ? `스트레스 ${e.data.level}/10${e.data.cause ? ` · ${e.data.cause}` : ''}` : '스트레스'
    case 'exercise': return `${e.data.type}${e.data.minutes != null ? ` ${e.data.minutes}분` : ''}${e.data.intensity ? ` · ${e.data.intensity}` : ''}`
    case 'medication': return `${e.data.name}${e.data.dose ? ` ${e.data.dose}` : ''}`
    case 'cycle': return `월경 ${e.data.event}`
    case 'note': return e.data.text
  }
}

export function timeLabel(iso: string, tz: string, precision: Entry['time_precision']): string {
  const t = new Intl.DateTimeFormat('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return precision === 'exact' ? t : precision === 'approx' ? `${t} · 대략` : '시각 없음'
}

function subLabel(e: Entry): string {
  const base = KIND_LABEL[e.kind]
  if (e.kind === 'meal' && e.data.meal_type) return `${base} · ${e.data.meal_type}`
  return base
}

export function EntryCard({ entry, tz, onClick, tone = 'normal' }:
  { entry: Entry; tz: string; onClick?: () => void; tone?: 'normal' | 'warn' | 'error' }) {
  const ring = tone === 'error' ? 'border-warn ring-2 ring-warn/25' : tone === 'warn' ? 'border-warn/70 ring-2 ring-warn/15' : 'border-line'
  const time = new Intl.DateTimeFormat('ko-KR', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(entry.occurred_at))
  const tags = entry.kind === 'meal' ? [...new Set(entry.data.foods.flatMap((f) => f.ingredients))] : []
  // 누를 수 있으면 진짜 버튼으로 — div+onClick은 키보드로 닿지 않아 확인 시트에서 카드를 고칠 길이 없다
  const className = cn('flex w-full gap-3 rounded-2xl border bg-card p-3 text-left', ring, onClick && 'cursor-pointer active:bg-accent-soft/40')
  const Root = onClick ? 'button' : 'div'
  return (
    <Root {...(onClick ? { type: 'button' as const, onClick } : {})} className={className}>
      <KindIcon kind={entry.kind} size={32} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-[16px] font-semibold leading-tight">{summarizeEntry(entry)}</p>
          <span className="flex shrink-0 items-center gap-1 text-[12px] text-mute tabular-nums">
            {entry.time_precision === 'unknown' ? <span className="rounded-full bg-warn-soft px-1.5 text-warn">시각 없음</span> : time}
            {entry.time_precision === 'approx' && <span className="rounded-full bg-warn-soft px-1.5 text-warn">대략</span>}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] text-mute">{subLabel(entry)}</p>
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((t) => (
              <span key={t} className={cn('rounded-full px-2 py-0.5 text-[12px]', isWatched(t) ? 'bg-warn-soft text-warn' : 'bg-line text-ink')}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </Root>
  )
}

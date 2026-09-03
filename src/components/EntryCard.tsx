import { KIND_LABEL, type Entry } from '@/lib/schemas'
import { KindIcon } from '@/components/ui/KindIcon'
import { isWatched } from '@/lib/watch-ingredients'

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

export function EntryCard({ entry, tz, onClick, tone = 'normal' }:
  { entry: Entry; tz: string; onClick?: () => void; tone?: 'normal' | 'warn' | 'error' }) {
  const border = tone === 'error' ? 'border-red-500 ring-2 ring-red-200' : tone === 'warn' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-neutral-200'
  return (
    <div onClick={onClick} className={`rounded-xl border bg-white p-3 ${border} ${onClick ? 'cursor-pointer active:bg-neutral-100' : ''}`}>
      <div className="flex justify-between text-xs text-neutral-500">
        <span><KindIcon kind={entry.kind} size={24} /> {KIND_LABEL[entry.kind]}{entry.kind === 'meal' && entry.data.meal_type ? ` · ${entry.data.meal_type}` : ''}</span>
        <span className={entry.time_precision !== 'exact' ? 'rounded bg-amber-100 px-1 text-amber-800' : ''}>
          {timeLabel(entry.occurred_at, tz, entry.time_precision)}
        </span>
      </div>
      <div className="mt-1 font-semibold">{summarizeEntry(entry)}</div>
      {entry.kind === 'meal' && entry.data.foods.some((f) => f.ingredients.length) && (
        <div className="mt-1 flex flex-wrap gap-1">
          {[...new Set(entry.data.foods.flatMap((f) => f.ingredients))].map((t) => (
            <span key={t} className={`rounded-full border px-2 text-xs ${isWatched(t) ? 'border-amber-500 text-amber-800' : 'border-neutral-300'}`}>{t}</span>
          ))}
        </div>
      )}
    </div>
  )
}

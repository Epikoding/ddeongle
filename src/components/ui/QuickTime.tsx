'use client'
import { useState } from 'react'
import { Clock } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Chip } from '@/components/ui/Chip'
import { QUICK_LABEL, quickTimeIso, presetOf, localToIso, isoToLocalInput, type QuickPreset } from '@/lib/quick-time'
import type { Entry } from '@/lib/schemas'

const PRECISION_BADGE: Partial<Record<Entry['time_precision'], string>> = { approx: '대략', unknown: '모름' }

export function QuickTime({ iso, precision, tz, onChange }:
  { iso: string; precision: Entry['time_precision']; tz: string; onChange: (iso: string, precision: Entry['time_precision']) => void }) {
  const [open, setOpen] = useState(false)
  const now = new Date()
  const current = precision === 'unknown' ? 'custom' : presetOf(iso, now, tz)
  const local = isoToLocalInput(iso, tz)
  const [date, time] = local.split('T')
  const badge = PRECISION_BADGE[precision]
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(QUICK_LABEL) as QuickPreset[]).map((p) => (
        <Chip key={p} selected={current === p} onClick={() => { const r = quickTimeIso(p, p === 'now' ? new Date() : new Date(iso), tz); onChange(r.iso, r.precision) }}>{QUICK_LABEL[p]}</Chip>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Chip selected={current === 'custom'} onClick={() => setOpen(true)}><Clock size={14} />{current === 'custom' ? local.replace('T', ' ') : '직접'}</Chip>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3 shadow-none ring-0">
          <label className="block text-[12px] text-mute">날짜
            <input type="date" value={date} onChange={(e) => { if (e.target.value) onChange(localToIso(`${e.target.value}T${time}`, tz, new Date(iso)), precision) }} className="mt-1 block rounded-xl border border-line bg-card p-2 text-[16px] text-ink" />
          </label>
          <label className="block text-[12px] text-mute">시각
            <input type="time" value={time} data-testid="edit-time" onChange={(e) => { if (e.target.value) onChange(localToIso(`${date}T${e.target.value}`, tz, new Date(iso)), 'exact') }} className="mt-1 block rounded-xl border border-line bg-card p-2 text-[16px] text-ink" />
          </label>
        </PopoverContent>
      </Popover>
      {badge && <span className="self-center text-[12px] text-warn">{badge}</span>}
    </div>
  )
}

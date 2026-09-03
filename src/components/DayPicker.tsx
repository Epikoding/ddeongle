'use client'
import { useEffect, useState } from 'react'
import { ko } from 'date-fns/locale'
import { CalendarDays } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { createClient } from '@/lib/supabase/client'
import { dayMarks, type DayMark } from '@/lib/db'

function ymd(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }

export function DayPicker({ date, onPick }: { date: string; tz: string; onPick: (d: string) => void }) {
  const [open, setOpen] = useState(false)
  const [month, setMonth] = useState<Date>(new Date(`${date}T12:00:00`))
  const [marks, setMarks] = useState<Record<string, DayMark>>({})

  useEffect(() => {
    if (!open) return
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    let alive = true
    dayMarks(createClient(), ymd(first), ymd(last))
      .then((rows) => { if (alive) setMarks(Object.fromEntries(rows.map((r) => [r.day, r]))) })
      .catch(() => { if (alive) setMarks({}) })
    return () => { alive = false }
  }, [open, month])

  const entryDays = Object.values(marks).filter((m) => m.has_entry && !m.has_target).map((m) => new Date(`${m.day}T12:00:00`))
  const targetDays = Object.values(marks).filter((m) => m.has_target).map((m) => new Date(`${m.day}T12:00:00`))

  return (
    <Popover open={open} onOpenChange={(o) => { if (o) setMonth(new Date(`${date}T12:00:00`)); setOpen(o) }}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="달력" data-testid="calendar-button" className="rounded-full p-2 text-mute hover:bg-accent-soft"><CalendarDays size={22} /></button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2 shadow-none">
        <Calendar mode="single" locale={ko} weekStartsOn={1} month={month} onMonthChange={setMonth}
          selected={new Date(`${date}T12:00:00`)}
          onSelect={(d) => { if (d) { onPick(ymd(d)); setOpen(false) } }}
          modifiers={{ entry: entryDays, target: targetDays }}
          modifiersClassNames={{ entry: 'gl-dot-entry', target: 'gl-dot-target' }} />
        <p className="px-2 pb-1 text-[12px] text-mute"><span className="inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" /> 기록 <span className="ml-2 inline-block h-1.5 w-1.5 rounded-full bg-warn align-middle" /> 설사</p>
      </PopoverContent>
    </Popover>
  )
}

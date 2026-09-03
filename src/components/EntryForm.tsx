'use client'
import type { Entry } from '@/lib/schemas'

function toLocalInput(iso: string, tz: string): string {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return p.replace(' ', 'T')
}
function fromLocalInput(v: string, tz: string, sampleIso: string): string {
  const off = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date(sampleIso)).find((x) => x.type === 'timeZoneName')!.value.replace('GMT', '') || '+00:00'
  return new Date(`${v}:00${off === '' ? '+00:00' : off}`).toISOString()
}

export function EntryEditor({ value, tz, onChange, onRemove }:
  { value: Entry; tz: string; onChange: (v: Entry) => void; onRemove: () => void }) {
  return (
    <div className="mt-1 space-y-2 rounded-lg border bg-neutral-50 p-2 text-sm">
      <label className="block">시각
        <input type="datetime-local" value={toLocalInput(value.occurred_at, tz)}
          onChange={(e) => onChange({ ...value, occurred_at: fromLocalInput(e.target.value, tz, value.occurred_at), time_precision: 'exact' })}
          className="ml-2 rounded border p-1" data-testid="edit-time" />
      </label>
      <button onClick={onRemove} className="text-red-700">이 항목 빼기</button>
    </div>
  )
}

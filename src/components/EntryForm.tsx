'use client'
import { KINDS, KIND_ICON, KIND_LABEL, type Entry, type Kind, normalizeTag } from '@/lib/schemas'
import { isWatched } from '@/lib/watch-ingredients'
import { useState } from 'react'

export function toLocalInput(iso: string, tz: string): string {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return p.replace(' ', 'T')
}
export function fromLocalInput(v: string, tz: string, sampleIso: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(new Date(sampleIso)).find((x) => x.type === 'timeZoneName')!.value
  const off = name === 'GMT' ? '+00:00' : name.replace('GMT', '')
  return new Date(`${v}:00${off}`).toISOString()
}

export function blankEntry(kind: Kind, nowIso: string): Entry {
  const base = { occurred_at: nowIso, time_precision: 'exact' as const, source_text: null }
  switch (kind) {
    case 'meal': return { kind, ...base, data: { meal_type: null, foods: [{ name: '', ingredients: [], amount: null }], eating_pattern: [] } }
    case 'symptom': return { kind, ...base, data: { type: '복통', severity: null, note: null } }
    case 'bowel': return { kind, ...base, data: { bristol: null, urgency: null, nocturnal: false, blood: null, note: null } }
    case 'sleep': return { kind, ...base, data: { quality: null, hours: null, note: null } }
    case 'stress': return { kind, ...base, data: { level: null, cause: null } }
    case 'exercise': return { kind, ...base, data: { type: '걷기', minutes: null, intensity: null } }
    case 'medication': return { kind, ...base, data: { name: '', dose: null } }
    case 'cycle': return { kind, ...base, data: { event: '시작' } }
    case 'note': return { kind, ...base, data: { text: '' } }
  }
}

const AMOUNTS = ['적게', '보통', '많이'] as const
const EATING_PATTERNS = ['급하게', '거른 끼니 후', '과식', '찬 음료', '기름진'] as const

export function KindPicker({ onPick }: { onPick: (k: Kind) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KINDS.map((k) => (
        <button key={k} onClick={() => onPick(k)} className="rounded-xl border bg-white p-3 text-sm" data-testid={`kind-${k}`}>
          <div className="text-2xl">{KIND_ICON[k]}</div>{KIND_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

const Num = ({ label, value, min, max, onChange }: { label: string; value: number | null; min: number; max: number; onChange: (v: number | null) => void }) => (
  <label className="block">{label}
    <input type="number" min={min} max={max} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="ml-2 w-20 rounded border p-1" />
  </label>
)
const Sel = <T extends string>({ label, value, options, onChange, allowNull }: { label: string; value: T | null; options: readonly T[]; onChange: (v: T | null) => void; allowNull?: boolean }) => (
  <label className="block">{label}
    <select value={value ?? ''} onChange={(e) => onChange((e.target.value || null) as T | null)} className="ml-2 rounded border p-1">
      {allowNull && <option value="">-</option>}
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
)

function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState('')
  function add() { const t = normalizeTag(draft); if (t && !tags.includes(t)) onChange([...tags, t]); setDraft('') }
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <button key={t} onClick={() => onChange(tags.filter((x) => x !== t))} className={`rounded-full border px-2 text-xs ${isWatched(t) ? 'border-amber-500 text-amber-800' : ''}`}>{t} ×</button>
      ))}
      <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add() } }}
        placeholder="+ 재료" className="w-20 rounded border px-1 text-xs" data-testid="tag-input" />
    </div>
  )
}

export function EntryEditor({ value, tz, onChange, onRemove }:
  { value: Entry; tz: string; onChange: (v: Entry) => void; onRemove?: () => void }) {
  const set = (data: Entry['data']) => onChange({ ...value, data } as Entry)
  return (
    <div className="mt-1 space-y-2 rounded-lg border bg-neutral-50 p-2 text-sm">
      <label className="block">시각
        <input type="datetime-local" value={toLocalInput(value.occurred_at, tz)}
          onChange={(e) => { if (!e.target.value) return; onChange({ ...value, occurred_at: fromLocalInput(e.target.value, tz, value.occurred_at), time_precision: 'exact' }) }}
          className="ml-2 rounded border p-1" data-testid="edit-time" />
      </label>

      {value.kind === 'meal' && (
        <div className="space-y-2">
          <Sel label="끼니" value={value.data.meal_type} options={['아침', '점심', '저녁', '간식'] as const} allowNull onChange={(v) => set({ ...value.data, meal_type: v })} />
          {value.data.foods.map((f, i) => (
            <div key={i} className="rounded border bg-white p-2">
              <input value={f.name} placeholder="음식 이름" onChange={(e) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="mb-1 w-full rounded border p-1" data-testid="food-name" />
              <TagEditor tags={f.ingredients} onChange={(t) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, ingredients: t } : x)) })} />
              <Sel label="양" value={f.amount} options={AMOUNTS} allowNull onChange={(v) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, amount: v } : x)) })} />
              <button type="button" onClick={() => set({ ...value.data, foods: value.data.foods.filter((_, j) => j !== i) })} className="text-xs text-red-700" data-testid="food-remove">이 음식 빼기</button>
            </div>
          ))}
          <button onClick={() => set({ ...value.data, foods: [...value.data.foods, { name: '', ingredients: [], amount: null }] })} className="text-xs underline">+ 음식</button>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {EATING_PATTERNS.map((p) => (
              <label key={p} className="text-xs">
                <input type="checkbox" checked={value.data.eating_pattern.includes(p)} data-testid={`pattern-${p}`}
                  onChange={(e) => set({ ...value.data, eating_pattern: e.target.checked ? [...value.data.eating_pattern, p] : value.data.eating_pattern.filter((x) => x !== p) })} /> {p}
              </label>
            ))}
          </div>
        </div>
      )}
      {value.kind === 'symptom' && (<>
        <Sel label="종류" value={value.data.type} options={['복통', '팽만', '가스', '오심', '속쓰림', '두통', '피로', '기타'] as const} onChange={(v) => set({ ...value.data, type: v! })} />
        <Num label="강도 0~10" value={value.data.severity} min={0} max={10} onChange={(v) => set({ ...value.data, severity: v })} />
      </>)}
      {value.kind === 'bowel' && (<>
        <Num label="브리스톨 1~7" value={value.data.bristol} min={1} max={7} onChange={(v) => set({ ...value.data, bristol: v })} />
        <label className="block"><input type="checkbox" checked={!!value.data.urgency} onChange={(e) => set({ ...value.data, urgency: e.target.checked })} /> 급함</label>
        <label className="block"><input type="checkbox" checked={value.data.nocturnal} onChange={(e) => set({ ...value.data, nocturnal: e.target.checked })} /> 야간</label>
        <label className="block"><input type="checkbox" checked={!!value.data.blood} onChange={(e) => set({ ...value.data, blood: e.target.checked })} /> 혈변</label>
      </>)}
      {value.kind === 'sleep' && (<>
        <Num label="잘 잤다 0~10" value={value.data.quality} min={0} max={10} onChange={(v) => set({ ...value.data, quality: v })} />
        <Num label="시간" value={value.data.hours} min={0} max={24} onChange={(v) => set({ ...value.data, hours: v })} />
      </>)}
      {value.kind === 'stress' && (<>
        <Num label="스트레스 0~10" value={value.data.level} min={0} max={10} onChange={(v) => set({ ...value.data, level: v })} />
        <input value={value.data.cause ?? ''} placeholder="원인" onChange={(e) => set({ ...value.data, cause: e.target.value || null })} className="w-full rounded border p-1" />
      </>)}
      {value.kind === 'exercise' && (<>
        <Sel label="종류" value={value.data.type} options={['걷기', '달리기', '자전거', '수영', '근력', '요가', '기타'] as const} onChange={(v) => set({ ...value.data, type: v! })} />
        <Num label="분" value={value.data.minutes} min={0} max={1440} onChange={(v) => set({ ...value.data, minutes: v })} />
        <Sel label="강도" value={value.data.intensity} options={['낮음', '중간', '높음'] as const} allowNull onChange={(v) => set({ ...value.data, intensity: v })} />
      </>)}
      {value.kind === 'medication' && (<>
        <input value={value.data.name} placeholder="약 이름" onChange={(e) => set({ ...value.data, name: e.target.value })} className="w-full rounded border p-1" />
        <input value={value.data.dose ?? ''} placeholder="용량" onChange={(e) => set({ ...value.data, dose: e.target.value || null })} className="w-full rounded border p-1" />
      </>)}
      {value.kind === 'cycle' && (
        <Sel label="월경" value={value.data.event} options={['시작', '진행중', '종료', '배란 추정'] as const} onChange={(v) => set({ ...value.data, event: v! })} />
      )}
      {value.kind === 'note' && (
        <textarea value={value.data.text} onChange={(e) => set({ ...value.data, text: e.target.value })} className="w-full rounded border p-1" />
      )}
      {onRemove && <button onClick={onRemove} className="text-red-700">이 항목 빼기</button>}
    </div>
  )
}

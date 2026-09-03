'use client'
import type { ReactNode } from 'react'
import { KINDS, KIND_LABEL, type Entry, type Kind } from '@/lib/schemas'
import { KindIcon } from '@/components/ui/KindIcon'
import { Chip } from '@/components/ui/Chip'
import { Segment10 } from '@/components/ui/Segment10'
import { BristolScale } from '@/components/ui/BristolScale'
import { QuickTime } from '@/components/ui/QuickTime'
import { TagEditor } from '@/components/ui/TagEditor'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { isoToLocalInput, localToIso } from '@/lib/quick-time'

/** 시각 변환의 정본은 lib/time.ts다(quick-time이 다시 내보낸다). 여기서는 이름만 지키고 그대로 넘긴다. */
export function toLocalInput(iso: string, tz: string): string {
  return isoToLocalInput(iso, tz)
}
export function fromLocalInput(v: string, tz: string, sampleIso: string): string {
  return localToIso(v, tz, new Date(sampleIso))
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

const MEAL_TYPES = ['아침', '점심', '저녁', '간식'] as const
const AMOUNTS = ['적게', '보통', '많이'] as const
const EATING_PATTERNS = ['급하게', '거른 끼니 후', '과식', '찬 음료', '기름진'] as const
const SYMPTOMS = ['복통', '팽만', '가스', '오심', '속쓰림', '두통', '피로', '기타'] as const
const EXERCISES = ['걷기', '달리기', '자전거', '수영', '근력', '요가', '기타'] as const
const INTENSITY = ['낮음', '중간', '높음'] as const
const CYCLE = ['시작', '진행중', '종료', '배란 추정'] as const

export function KindPicker({ onPick }: { onPick: (k: Kind) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2 px-4">
      {KINDS.map((k) => (
        <button key={k} type="button" onClick={() => onPick(k)} data-testid={`kind-${k}`}
          className="flex flex-col items-center gap-2 rounded-2xl border border-line bg-card py-4 text-[14px] font-semibold active:bg-accent-soft/40">
          <KindIcon kind={k} size={40} />{KIND_LABEL[k]}
        </button>
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><p className="mb-1.5 text-[12px] font-semibold tracking-wide text-mute">{label}</p>{children}</div>
}
function ChipRow<T extends string>({ options, value, onChange, tone }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void; tone?: 'default' | 'warn' }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} tone={tone} selected={value === o} onClick={() => onChange(value === o ? null : o)}>{o}</Chip>)}</div>
}
function ChipMulti<T extends string>({ options, value, onChange, testid }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; testid?: (o: T) => string }) {
  return <div className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} selected={value.includes(o)} data-testid={testid?.(o)} onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>{o}</Chip>)}</div>
}
function NumInput({ value, onChange, placeholder, max }: { value: number | null; onChange: (v: number | null) => void; placeholder: string; max: number }) {
  return <Input type="number" inputMode="numeric" min={0} max={max} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="h-10 w-28 rounded-xl border-line bg-card" />
}

export function EntryEditor({ value, tz, onChange, onRemove }:
  { value: Entry; tz: string; onChange: (v: Entry) => void; onRemove?: () => void }) {
  const set = (data: Entry['data']) => onChange({ ...value, data } as Entry)
  return (
    <div className="mt-1 space-y-4 rounded-2xl border border-line bg-bg p-3 text-[14px]">
      <Field label="언제">
        <QuickTime iso={value.occurred_at} precision={value.time_precision} tz={tz} onChange={(iso, precision) => onChange({ ...value, occurred_at: iso, time_precision: precision })} />
      </Field>

      {value.kind === 'meal' && (<>
        <Field label="끼니"><ChipRow options={MEAL_TYPES} value={value.data.meal_type} onChange={(v) => set({ ...value.data, meal_type: v })} /></Field>
        {value.data.foods.map((f, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line bg-card p-3">
            <Input value={f.name} placeholder="음식 이름" data-testid="food-name" onChange={(e) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="h-10 rounded-xl border-line" />
            <TagEditor tags={f.ingredients} onChange={(t) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, ingredients: t } : x)) })} />
            <div className="flex items-center justify-between">
              <ChipRow options={AMOUNTS} value={f.amount} onChange={(v) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, amount: v } : x)) })} />
              <button type="button" onClick={() => set({ ...value.data, foods: value.data.foods.filter((_, j) => j !== i) })} className="text-[12px] text-warn" data-testid="food-remove">이 음식 빼기</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set({ ...value.data, foods: [...value.data.foods, { name: '', ingredients: [], amount: null }] })} className="text-[14px] font-semibold text-accent">+ 음식 추가</button>
        <Field label="어떻게 먹었나"><ChipMulti options={EATING_PATTERNS} value={value.data.eating_pattern} onChange={(v) => set({ ...value.data, eating_pattern: v })} testid={(p) => `pattern-${p}`} /></Field>
      </>)}

      {value.kind === 'symptom' && (<>
        <Field label="종류"><ChipRow options={SYMPTOMS} value={value.data.type} onChange={(v) => set({ ...value.data, type: v ?? '복통' })} /></Field>
        <Field label="강도"><Segment10 value={value.data.severity} onChange={(v) => set({ ...value.data, severity: v })} labels={['없음', '못 견딤']} /></Field>
      </>)}

      {value.kind === 'bowel' && (<>
        <Field label="모양 (브리스톨)"><BristolScale value={value.data.bristol} onChange={(v) => set({ ...value.data, bristol: v })} /></Field>
        <Field label="함께">
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="warn" selected={!!value.data.urgency} onClick={() => set({ ...value.data, urgency: !value.data.urgency })}>급했음</Chip>
            <Chip tone="warn" selected={value.data.nocturnal} onClick={() => set({ ...value.data, nocturnal: !value.data.nocturnal })}>야간</Chip>
            <Chip tone="warn" selected={!!value.data.blood} onClick={() => set({ ...value.data, blood: !value.data.blood })}>혈변</Chip>
          </div>
        </Field>
      </>)}

      {value.kind === 'sleep' && (<>
        <Field label="잘 잤다"><Segment10 value={value.data.quality} onChange={(v) => set({ ...value.data, quality: v })} labels={['전혀', '푹']} /></Field>
        <Field label="잔 시간"><NumInput value={value.data.hours} onChange={(v) => set({ ...value.data, hours: v })} placeholder="시간" max={24} /></Field>
      </>)}

      {value.kind === 'stress' && (<>
        <Field label="스트레스"><Segment10 value={value.data.level} onChange={(v) => set({ ...value.data, level: v })} labels={['없음', '극심']} /></Field>
        <Field label="원인"><Input value={value.data.cause ?? ''} placeholder="한 마디" onChange={(e) => set({ ...value.data, cause: e.target.value || null })} className="h-10 rounded-xl border-line bg-card" /></Field>
      </>)}

      {value.kind === 'exercise' && (<>
        <Field label="종류"><ChipRow options={EXERCISES} value={value.data.type} onChange={(v) => set({ ...value.data, type: v ?? '걷기' })} /></Field>
        <div className="flex gap-4">
          <Field label="분"><NumInput value={value.data.minutes} onChange={(v) => set({ ...value.data, minutes: v })} placeholder="분" max={1440} /></Field>
          <Field label="강도"><ChipRow options={INTENSITY} value={value.data.intensity} onChange={(v) => set({ ...value.data, intensity: v })} /></Field>
        </div>
      </>)}

      {value.kind === 'medication' && (<>
        <Field label="약 이름"><Input value={value.data.name} placeholder="예: 메트포르민" onChange={(e) => set({ ...value.data, name: e.target.value })} className="h-10 rounded-xl border-line bg-card" /></Field>
        <Field label="용량"><Input value={value.data.dose ?? ''} placeholder="예: 500mg" onChange={(e) => set({ ...value.data, dose: e.target.value || null })} className="h-10 rounded-xl border-line bg-card" /></Field>
      </>)}

      {value.kind === 'cycle' && (
        <Field label="월경"><ChipRow options={CYCLE} value={value.data.event} onChange={(v) => set({ ...value.data, event: v ?? '시작' })} /></Field>
      )}

      {value.kind === 'note' && (
        <Field label="메모"><Textarea value={value.data.text} rows={3} onChange={(e) => set({ ...value.data, text: e.target.value })} className="rounded-xl border-line bg-card" /></Field>
      )}

      {onRemove && <button type="button" onClick={onRemove} className="text-[14px] text-warn">이 항목 빼기</button>}
    </div>
  )
}

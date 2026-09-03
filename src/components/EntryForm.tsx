'use client'
import { useId, type ReactNode } from 'react'
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

const LABEL_CLASS = 'mb-1.5 block text-[12px] font-semibold tracking-wide text-mute'

/** 라벨과 입력을 잇는다. 칸이 하나면 `<label htmlFor>`(id를 자식에게), 칩·세그먼트처럼 여러 개면
 *  `group`으로 두고 자식 묶음이 `aria-labelledby={labelId}`를 받는다(라벨이 가리킬 것이 없는 htmlFor를 만들지 않는다). */
function Field({ label, group, children }:
  { label: string; group?: boolean; children: (ids: { id: string; labelId: string }) => ReactNode }) {
  const base = useId()
  const ids = { id: base, labelId: `${base}-label` }
  return (
    <div>
      {group
        ? <span id={ids.labelId} className={LABEL_CLASS}>{label}</span>
        : <label id={ids.labelId} htmlFor={ids.id} className={LABEL_CLASS}>{label}</label>}
      {children(ids)}
    </div>
  )
}

function ChipRow<T extends string>({ options, value, onChange, tone, labelledBy }: { options: readonly T[]; value: T | null; onChange: (v: T | null) => void; tone?: 'default' | 'warn'; labelledBy?: string }) {
  return <div role={labelledBy ? 'group' : undefined} aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} tone={tone} selected={value === o} onClick={() => onChange(value === o ? null : o)}>{o}</Chip>)}</div>
}
function ChipMulti<T extends string>({ options, value, onChange, testid, labelledBy }: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; testid?: (o: T) => string; labelledBy?: string }) {
  return <div role={labelledBy ? 'group' : undefined} aria-labelledby={labelledBy} className="flex flex-wrap gap-1.5">{options.map((o) => <Chip key={o} selected={value.includes(o)} data-testid={testid?.(o)} onClick={() => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o])}>{o}</Chip>)}</div>
}
function NumInput({ id, value, onChange, max }: { id?: string; value: number | null; onChange: (v: number | null) => void; max: number }) {
  return <Input id={id} type="number" inputMode="numeric" min={0} max={max} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} className="h-10 w-28 rounded-xl border-line bg-card" />
}

export function EntryEditor({ value, tz, onChange, onRemove }:
  { value: Entry; tz: string; onChange: (v: Entry) => void; onRemove?: () => void }) {
  const set = (data: Entry['data']) => onChange({ ...value, data } as Entry)
  return (
    <div className="mt-1 space-y-4 rounded-2xl border border-line bg-bg p-3 text-[14px]">
      <Field label="언제" group>{({ labelId }) => (
        <div role="group" aria-labelledby={labelId}>
          <QuickTime iso={value.occurred_at} precision={value.time_precision} tz={tz} onChange={(iso, precision) => onChange({ ...value, occurred_at: iso, time_precision: precision })} />
        </div>
      )}</Field>

      {value.kind === 'meal' && (<>
        <Field label="끼니" group>{({ labelId }) => <ChipRow labelledBy={labelId} options={MEAL_TYPES} value={value.data.meal_type} onChange={(v) => set({ ...value.data, meal_type: v })} />}</Field>
        {value.data.foods.map((f, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-line bg-card p-3">
            <Input value={f.name} placeholder="음식 이름" data-testid="food-name" onChange={(e) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className="h-10 rounded-xl border-line" />
            <TagEditor tags={f.ingredients} onChange={(t) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, ingredients: t } : x)) })} />
            <div className="flex items-center justify-between">
              <ChipRow options={AMOUNTS} value={f.amount} onChange={(v) => set({ ...value.data, foods: value.data.foods.map((x, j) => (j === i ? { ...x, amount: v } : x)) })} />
              <button type="button" onClick={() => set({ ...value.data, foods: value.data.foods.filter((_, j) => j !== i) })} className="text-[14px] text-warn" data-testid="food-remove">이 음식 빼기</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set({ ...value.data, foods: [...value.data.foods, { name: '', ingredients: [], amount: null }] })} className="text-[14px] font-semibold text-accent">+ 음식 추가</button>
        <Field label="어떻게 먹었나" group>{({ labelId }) => <ChipMulti labelledBy={labelId} options={EATING_PATTERNS} value={value.data.eating_pattern} onChange={(v) => set({ ...value.data, eating_pattern: v })} testid={(p) => `pattern-${p}`} />}</Field>
      </>)}

      {value.kind === 'symptom' && (<>
        <Field label="종류" group>{({ labelId }) => <ChipRow labelledBy={labelId} options={SYMPTOMS} value={value.data.type} onChange={(v) => set({ ...value.data, type: v ?? value.data.type })} />}</Field>
        <Field label="강도" group>{({ labelId }) => <Segment10 aria-labelledby={labelId} value={value.data.severity} onChange={(v) => set({ ...value.data, severity: v })} labels={['없음', '못 견딤']} />}</Field>
      </>)}

      {value.kind === 'bowel' && (<>
        <Field label="모양 (브리스톨)" group>{({ labelId }) => (
          <div role="group" aria-labelledby={labelId}>
            <BristolScale value={value.data.bristol} onChange={(v) => set({ ...value.data, bristol: v })} />
          </div>
        )}</Field>
        <Field label="함께" group>{({ labelId }) => (
          <div role="group" aria-labelledby={labelId} className="flex flex-wrap gap-1.5">
            <Chip tone="warn" selected={!!value.data.urgency} onClick={() => set({ ...value.data, urgency: !value.data.urgency })}>급했음</Chip>
            <Chip tone="warn" selected={value.data.nocturnal} onClick={() => set({ ...value.data, nocturnal: !value.data.nocturnal })}>야간</Chip>
            <Chip tone="warn" selected={!!value.data.blood} onClick={() => set({ ...value.data, blood: !value.data.blood })}>혈변</Chip>
          </div>
        )}</Field>
      </>)}

      {value.kind === 'sleep' && (<>
        <Field label="잘 잤다" group>{({ labelId }) => <Segment10 aria-labelledby={labelId} value={value.data.quality} onChange={(v) => set({ ...value.data, quality: v })} labels={['전혀', '푹']} />}</Field>
        <Field label="잔 시간">{({ id }) => <NumInput id={id} value={value.data.hours} onChange={(v) => set({ ...value.data, hours: v })} max={24} />}</Field>
      </>)}

      {value.kind === 'stress' && (<>
        <Field label="스트레스" group>{({ labelId }) => <Segment10 aria-labelledby={labelId} value={value.data.level} onChange={(v) => set({ ...value.data, level: v })} labels={['없음', '극심']} />}</Field>
        <Field label="원인">{({ id }) => <Input id={id} value={value.data.cause ?? ''} placeholder="한 마디" onChange={(e) => set({ ...value.data, cause: e.target.value || null })} className="h-10 rounded-xl border-line bg-card" />}</Field>
      </>)}

      {value.kind === 'exercise' && (<>
        <Field label="종류" group>{({ labelId }) => <ChipRow labelledBy={labelId} options={EXERCISES} value={value.data.type} onChange={(v) => set({ ...value.data, type: v ?? value.data.type })} />}</Field>
        <div className="flex gap-4">
          <Field label="분">{({ id }) => <NumInput id={id} value={value.data.minutes} onChange={(v) => set({ ...value.data, minutes: v })} max={1440} />}</Field>
          <Field label="강도" group>{({ labelId }) => <ChipRow labelledBy={labelId} options={INTENSITY} value={value.data.intensity} onChange={(v) => set({ ...value.data, intensity: v })} />}</Field>
        </div>
      </>)}

      {value.kind === 'medication' && (<>
        <Field label="약 이름">{({ id }) => <Input id={id} value={value.data.name} placeholder="예: 메트포르민" onChange={(e) => set({ ...value.data, name: e.target.value })} className="h-10 rounded-xl border-line bg-card" />}</Field>
        <Field label="용량">{({ id }) => <Input id={id} value={value.data.dose ?? ''} placeholder="예: 500mg" onChange={(e) => set({ ...value.data, dose: e.target.value || null })} className="h-10 rounded-xl border-line bg-card" />}</Field>
      </>)}

      {value.kind === 'cycle' && (
        <Field label="월경" group>{({ labelId }) => <ChipRow labelledBy={labelId} options={CYCLE} value={value.data.event} onChange={(v) => set({ ...value.data, event: v ?? value.data.event })} />}</Field>
      )}

      {value.kind === 'note' && (
        <Field label="메모">{({ id }) => <Textarea id={id} value={value.data.text} rows={3} onChange={(e) => set({ ...value.data, text: e.target.value })} className="rounded-xl border-line bg-card" />}</Field>
      )}

      {onRemove && <button type="button" onClick={onRemove} className="text-[14px] text-warn">이 항목 빼기</button>}
    </div>
  )
}

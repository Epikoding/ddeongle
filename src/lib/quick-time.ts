import { toLocalDateStr, localToIso } from './time'

/** 시각 변환의 정본은 lib/time.ts다. 이름만 여기서 함께 내보낸다. */
export { localToIso } from './time'

export type QuickPreset = 'now' | 'morning' | 'lunch' | 'evening'
export const QUICK_LABEL: Record<QuickPreset, string> = { now: '지금', morning: '아침', lunch: '점심', evening: '저녁' }
const FIXED: Record<Exclude<QuickPreset, 'now'>, string> = { morning: '08:00', lunch: '12:30', evening: '19:00' }

/** UTC ISO → 지역 날짜+시각 문자열("2026-09-03T12:30"). localToIso의 역방향. */
export function isoToLocalInput(iso: string, tz: string): string {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return p.replace(' ', 'T')
}

/** 고정 프리셋(아침·점심·저녁)은 `sample`이 놓인 **그 날**의 시각을 돌려준다 — 어제 항목에서 '아침'을 눌러도
 *  날짜가 오늘로 튀지 않는다. `'now'`는 `sample` 자체를 돌려주므로 실제 현재 시각은 호출부가 넣는다. */
export function quickTimeIso(preset: QuickPreset, sample: Date, tz: string): { iso: string; precision: 'exact' | 'approx' } {
  if (preset === 'now') return { iso: sample.toISOString(), precision: 'exact' }
  return { iso: localToIso(`${toLocalDateStr(sample, tz)}T${FIXED[preset]}`, tz, sample), precision: 'approx' }
}

/** `now`는 '지금'인지 가리는 데만 쓴다 — 고정 프리셋은 그 항목(`iso`) 자신의 날짜를 기준으로 비교한다. */
export function presetOf(iso: string, now: Date, tz: string): QuickPreset | 'custom' {
  const at = new Date(iso)
  if (Math.abs(at.getTime() - now.getTime()) <= 60_000) return 'now'
  for (const p of ['morning', 'lunch', 'evening'] as const) {
    if (quickTimeIso(p, at, tz).iso === at.toISOString()) return p
  }
  return 'custom'
}

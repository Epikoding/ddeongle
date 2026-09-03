import { toLocalDateStr } from './time'

export type QuickPreset = 'now' | 'morning' | 'lunch' | 'evening'
export const QUICK_LABEL: Record<QuickPreset, string> = { now: '지금', morning: '아침', lunch: '점심', evening: '저녁' }
const FIXED: Record<Exclude<QuickPreset, 'now'>, string> = { morning: '08:00', lunch: '12:30', evening: '19:00' }

function offsetAt(d: Date, tz: string): string {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' }).formatToParts(d).find((x) => x.type === 'timeZoneName')!.value
  return name === 'GMT' ? '+00:00' : name.replace('GMT', '')
}

/** 지역 날짜+시각 문자열("2026-09-03T12:30") → UTC ISO. 서머타임 전환일은 실제 오프셋으로 한 번 더 잡는다. */
export function localToIso(local: string, tz: string, sample: Date): string {
  const guess = new Date(`${local}:00${offsetAt(sample, tz)}`)
  const actual = offsetAt(guess, tz)
  return (actual === offsetAt(sample, tz) ? guess : new Date(`${local}:00${actual}`)).toISOString()
}

/** UTC ISO → 지역 날짜+시각 문자열("2026-09-03T12:30"). localToIso의 역방향. */
export function isoToLocalInput(iso: string, tz: string): string {
  const p = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return p.replace(' ', 'T')
}

export function quickTimeIso(preset: QuickPreset, now: Date, tz: string): { iso: string; precision: 'exact' | 'approx' } {
  if (preset === 'now') return { iso: now.toISOString(), precision: 'exact' }
  return { iso: localToIso(`${toLocalDateStr(now, tz)}T${FIXED[preset]}`, tz, now), precision: 'approx' }
}

export function presetOf(iso: string, now: Date, tz: string): QuickPreset | 'custom' {
  const t = new Date(iso).getTime()
  if (Math.abs(t - now.getTime()) <= 60_000) return 'now'
  for (const p of ['morning', 'lunch', 'evening'] as const) {
    if (quickTimeIso(p, now, tz).iso === new Date(iso).toISOString()) return p
  }
  return 'custom'
}

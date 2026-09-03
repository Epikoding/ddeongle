const DAY_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

function parts(d: Date, tz: string) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
    timeZoneName: 'longOffset',
  })
  const p: Record<string, string> = {}
  for (const x of f.formatToParts(d)) p[x.type] = x.value
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday)
  const offset = p.timeZoneName === 'GMT' ? '+00:00' : p.timeZoneName.replace('GMT', '')
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute, weekday, offset }
}

export function formatReference(d: Date, tz: string): string {
  const p = parts(d, tz)
  return `${p.y}-${p.m}-${p.d} ${DAY_KO[p.weekday]} ${p.hh}:${p.mm}, 시간대 ${p.offset}`
}

export function isFuture(iso: string, now: Date, graceMinutes = 5): boolean {
  return new Date(iso).getTime() > now.getTime() + graceMinutes * 60_000
}

export function toLocalDateStr(d: Date, tz: string): string {
  const p = parts(d, tz)
  return `${p.y}-${p.m}-${p.d}`
}

/** 그 시각 그 시간대의 UTC 오프셋("+09:00"). */
export function offsetAt(d: Date, tz: string): string {
  return parts(d, tz).offset
}

/** 지역 날짜+시각 문자열("2026-09-03T12:30") → UTC ISO. 기준 시각(sample)의 오프셋으로 한 번 찍고,
 *  그 결과 날짜의 실제 오프셋으로 한 번 다시 잡는다(서머타임 전환을 건너뛰면 기준 오프셋이 더는 맞지 않는다). */
export function localToIso(local: string, tz: string, sample: Date): string {
  const guess = new Date(`${local}:00${offsetAt(sample, tz)}`)
  const actual = offsetAt(guess, tz)
  return (actual === offsetAt(sample, tz) ? guess : new Date(`${local}:00${actual}`)).toISOString()
}

/** 그 날 현지 자정의 정확한 instant. 기준은 그 날 UTC 정오. */
function localMidnight(dateStr: string, tz: string): Date {
  return new Date(localToIso(`${dateStr}T00:00`, tz, new Date(`${dateStr}T12:00:00Z`)))
}

function nextDateStr(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1, d) + 24 * 3600_000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`
}

export function dayRange(dateStr: string, tz: string): { from: string; to: string } {
  const from = localMidnight(dateStr, tz)
  const to = new Date(localMidnight(nextDateStr(dateStr), tz).getTime() - 1)
  return { from: from.toISOString(), to: to.toISOString() }
}

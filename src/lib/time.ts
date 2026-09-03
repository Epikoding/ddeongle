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

function offsetFor(dateStr: string, tz: string): string {
  return parts(new Date(`${dateStr}T12:00:00Z`), tz).offset
}

export function dayRange(dateStr: string, tz: string): { from: string; to: string } {
  const off = offsetFor(dateStr, tz)
  const from = new Date(`${dateStr}T00:00:00${off}`)
  const to = new Date(from.getTime() + 24 * 3600_000 - 1)
  return { from: from.toISOString(), to: to.toISOString() }
}

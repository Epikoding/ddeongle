import type { RankingRow } from './db'

export function baselineOf(r: RankingRow): number | null {
  const n = r.exposed_n + r.control_n
  return n > 0 ? (r.exposed_hits + r.control_hits) / n : null
}

export function ratioTone(r: RankingRow): 'warn' | 'accent' | 'mute' {
  if (!r.enough || r.ratio == null) return 'mute'
  if (r.ratio >= 2) return 'warn'
  if (r.ratio >= 1) return 'accent'
  return 'mute'
}

import type { EntryRow } from './db'
import { summarizeEntry } from '@/components/EntryCard'

function q(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function entriesToCsv(rows: EntryRow[], tz: string): string {
  const fmt = new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const head = 'id,kind,occurred_at_local,time_precision,summary,tags,data_json,source_text'
  const body = rows.map((r) => {
    const tags = r.kind === 'meal' ? [...new Set(r.data.foods.flatMap((f) => f.ingredients))].join('|') : ''
    return [r.id, r.kind, fmt.format(new Date(r.occurred_at)), r.time_precision, summarizeEntry(r), tags, JSON.stringify(r.data), r.source_text ?? ''].map(q).join(',')
  })
  return [head, ...body].join('\n')
}

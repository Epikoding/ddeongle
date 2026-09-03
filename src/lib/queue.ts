import type { Entry } from './schemas'
import type { RawInput } from './db'

const KEY = 'gutlog.pending'
export type PendingItem = { id: string; raw: RawInput | null; entries: Entry[]; queued_at: string }

function store(s?: Storage): Storage | null {
  if (s) return s
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}

export function loadQueue(s?: Storage): PendingItem[] {
  const st = store(s); if (!st) return []
  try {
    const v = JSON.parse(st.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch { return [] }
}

function write(items: PendingItem[], s?: Storage) {
  const st = store(s); if (!st) return
  try { st.setItem(KEY, JSON.stringify(items)) } catch { /* 저장 공간 부족 등 — 조용히 포기 */ }
}

export function enqueue(item: Omit<PendingItem, 'id' | 'queued_at'>, s?: Storage): PendingItem {
  const full: PendingItem = { ...item, id: crypto.randomUUID(), queued_at: new Date().toISOString() }
  write([...loadQueue(s), full], s)
  return full
}

export function dequeue(id: string, s?: Storage) {
  write(loadQueue(s).filter((i) => i.id !== id), s)
}

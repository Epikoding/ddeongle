import type { Entry } from './schemas'
import type { RawInput } from './db'

export const QUEUE_KEY = 'gutlog.pending'
const KEY = QUEUE_KEY
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

function write(items: PendingItem[], s?: Storage): boolean {
  const st = store(s); if (!st) return false
  try { st.setItem(KEY, JSON.stringify(items)); return true } catch { return false /* 저장 공간 부족 등 */ }
}

// randomUUID는 보안 컨텍스트(https·localhost)에서만 있다 — 폰에서 http://192.168.x.x 로 열면 없다
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// 큐가 바뀌면 알린다 — PendingBanner가 이걸로 다시 읽는다(같은 탭은 storage 이벤트가 안 온다)
const listeners = new Set<() => void>()

export function subscribeQueue(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function notifyQueue() {
  for (const l of [...listeners]) l()
}

/** 저장에 실패하면 null — 부르는 쪽은 "보관했다"고 안내하기 전에 이 값을 봐야 한다 */
export function enqueue(item: Omit<PendingItem, 'id' | 'queued_at'>, s?: Storage): PendingItem | null {
  const full: PendingItem = { ...item, id: newId(), queued_at: new Date().toISOString() }
  if (!write([...loadQueue(s), full], s)) return null
  notifyQueue()
  return full
}

export function dequeue(id: string, s?: Storage) {
  if (write(loadQueue(s).filter((i) => i.id !== id), s)) notifyQueue()
}

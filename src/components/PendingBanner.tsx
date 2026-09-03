'use client'
import { useState, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveEntries } from '@/lib/db'
import { loadQueue, dequeue, type PendingItem } from '@/lib/queue'

// localStorage는 React 밖의 저장소라 useSyncExternalStore로 읽는다.
// (useEffect 안에서 setState 하면 react-hooks/set-state-in-effect 규칙에 걸린다)
const EMPTY: PendingItem[] = []
let cache: PendingItem[] = EMPTY
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  cache = loadQueue() // 붙을 때마다 큐를 다시 읽는다
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function getSnapshot(): PendingItem[] { return cache }
function getServerSnapshot(): PendingItem[] { return EMPTY }
function refresh() { cache = loadQueue(); listeners.forEach((l) => l()) }

export function PendingBanner({ onFlushed }: { onFlushed: () => void }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [busy, setBusy] = useState(false)
  if (items.length === 0) return null

  async function flush() {
    setBusy(true)
    const sb = createClient()
    for (const it of items) {
      try { await saveEntries(sb, it.raw, it.entries); dequeue(it.id) } catch { /* 다음 기회 */ }
    }
    refresh(); setBusy(false); onFlushed()
  }

  return (
    <div className="mb-3 flex items-center justify-between rounded-lg border border-amber-500 bg-amber-50 p-2 text-sm">
      <span>보내지 못한 기록 {items.length}건이 있습니다.</span>
      <button onClick={flush} disabled={busy} className="font-semibold underline">다시 보내기</button>
    </div>
  )
}

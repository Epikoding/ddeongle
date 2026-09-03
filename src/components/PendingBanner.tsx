'use client'
import { useState, useSyncExternalStore } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveEntries } from '@/lib/db'
import { loadQueue, dequeue, subscribeQueue, QUEUE_KEY, type PendingItem } from '@/lib/queue'

// localStorage는 React 밖의 저장소라 useSyncExternalStore로 읽는다.
// (useEffect 안에서 setState 하면 react-hooks/set-state-in-effect 규칙에 걸린다)
const EMPTY: PendingItem[] = []
let cache: PendingItem[] = EMPTY

function subscribe(listener: () => void) {
  cache = loadQueue() // 붙을 때마다 큐를 다시 읽는다
  const onChange = () => { cache = loadQueue(); listener() }
  const unsubscribe = subscribeQueue(onChange)          // 같은 탭의 enqueue·dequeue
  const onStorage = (e: StorageEvent) => { if (!e.key || e.key === QUEUE_KEY) onChange() } // 다른 탭
  window.addEventListener('storage', onStorage)
  return () => { unsubscribe(); window.removeEventListener('storage', onStorage) }
}
function getSnapshot(): PendingItem[] { return cache }
function getServerSnapshot(): PendingItem[] { return EMPTY }

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
    setBusy(false); onFlushed() // 목록 갱신은 dequeue가 알린다
  }

  return (
    <div role="status" className="mx-4 mb-2 flex items-center justify-between rounded-xl border border-warn/60 bg-warn-soft px-3 py-2 text-[14px] text-warn">
      <span>보내지 못한 기록 {items.length}건이 있습니다.</span>
      <button onClick={flush} disabled={busy} className="font-semibold underline disabled:opacity-50">다시 보내기</button>
    </div>
  )
}

import { describe, it, expect } from 'vitest'
import { loadQueue, enqueue, dequeue } from '@/lib/queue'

function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k),
    clear: () => m.clear(), key: () => null, get length() { return m.size },
  } as Storage
}

describe('queue', () => {
  it('넣고 읽고 뺀다', () => {
    const s = memStorage()
    expect(loadQueue(s)).toEqual([])
    const item = enqueue({ raw: null, entries: [] }, s)
    expect(loadQueue(s)).toHaveLength(1)
    expect(item.id).toBeTruthy()
    dequeue(item.id, s)
    expect(loadQueue(s)).toEqual([])
  })
  it('깨진 저장값은 빈 배열', () => {
    const s = memStorage(); s.setItem('gutlog.pending', '{bad')
    expect(loadQueue(s)).toEqual([])
  })
})

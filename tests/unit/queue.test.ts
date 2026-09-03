import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadQueue, enqueue, dequeue } from '@/lib/queue'

function memStorage(): Storage {
  const m = new Map<string, string>()
  return {
    getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k),
    clear: () => m.clear(), key: () => null, get length() { return m.size },
  } as Storage
}

afterEach(() => { vi.unstubAllGlobals() })

describe('queue', () => {
  it('넣고 읽고 뺀다', () => {
    const s = memStorage()
    expect(loadQueue(s)).toEqual([])
    const item = enqueue({ raw: null, entries: [] }, s)
    expect(loadQueue(s)).toHaveLength(1)
    expect(item!.id).toBeTruthy()
    dequeue(item!.id, s)
    expect(loadQueue(s)).toEqual([])
  })
  it('깨진 저장값은 빈 배열', () => {
    const s = memStorage(); s.setItem('gutlog.pending', '{bad')
    expect(loadQueue(s)).toEqual([])
  })
  it('저장이 막히면 null을 돌려준다', () => {
    const s = memStorage()
    s.setItem = () => { throw new Error('QuotaExceededError') }
    expect(enqueue({ raw: null, entries: [] }, s)).toBeNull()
  })
  it('randomUUID가 없어도 id를 만든다', () => {
    const s = memStorage()
    vi.stubGlobal('crypto', {}) // 보안 컨텍스트가 아닌 http:// 접속 상황
    const item = enqueue({ raw: null, entries: [] }, s)
    expect(item!.id).toBeTruthy()
    vi.stubGlobal('crypto', undefined)
    const item2 = enqueue({ raw: null, entries: [] }, s)
    expect(item2!.id).toBeTruthy()
    expect(item2!.id).not.toBe(item!.id)
  })
})

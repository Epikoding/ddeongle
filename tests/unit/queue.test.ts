import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadQueue, enqueue, dequeue, subscribeQueue } from '@/lib/queue'

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
  it('넣고 뺄 때 구독자에게 알린다', () => {
    const s = memStorage()
    let calls = 0
    const unsubscribe = subscribeQueue(() => { calls += 1 })
    const item = enqueue({ raw: null, entries: [] }, s)
    expect(calls).toBe(1)
    dequeue(item!.id, s)
    expect(calls).toBe(2)
    unsubscribe()
    enqueue({ raw: null, entries: [] }, s)
    expect(calls).toBe(2)
  })
  it('randomUUID가 없어도 uuid 모양의 id를 만든다', () => {
    // id는 서버로 가는 client_id다 — uuid가 아니면 ::uuid 캐스팅이 터져 큐가 영영 안 빠진다
    const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    const s = memStorage()
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array) => { for (let i = 0; i < a.length; i++) a[i] = i * 7 + 3; return a } })
    const item = enqueue({ raw: null, entries: [] }, s) // 보안 컨텍스트가 아닌 http:// 접속 상황
    expect(item!.id).toMatch(uuidV4)
    vi.stubGlobal('crypto', undefined)
    const item2 = enqueue({ raw: null, entries: [] }, s) // crypto 자체가 없는 상황
    expect(item2!.id).toMatch(uuidV4)
    expect(item2!.id).not.toBe(item!.id)
  })
})

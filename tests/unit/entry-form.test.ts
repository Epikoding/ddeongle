import { describe, it, expect } from 'vitest'
import { toLocalInput, fromLocalInput, blankEntry } from '@/components/EntryForm'
import { KINDS, entrySchema } from '@/lib/schemas'

describe('시각 칸 변환', () => {
  it('서울 지역시각 → UTC ISO', () => {
    expect(fromLocalInput('2026-09-03T12:00', 'Asia/Seoul', '2026-09-03T00:00:00+09:00'))
      .toBe('2026-09-03T03:00:00.000Z')
  })
  it('UTC ISO → 서울 지역시각', () => {
    expect(toLocalInput('2026-09-03T03:00:00Z', 'Asia/Seoul')).toBe('2026-09-03T12:00')
  })
  it('UTC 왕복', () => {
    const iso = fromLocalInput('2026-09-03T12:00', 'UTC', '2026-09-03T00:00:00Z')
    expect(iso).toBe('2026-09-03T12:00:00.000Z')
    expect(toLocalInput(iso, 'UTC')).toBe('2026-09-03T12:00')
  })
  it('서울 왕복', () => {
    const iso = fromLocalInput('2026-01-15T07:30', 'Asia/Seoul', '2026-01-15T00:00:00+09:00')
    expect(toLocalInput(iso, 'Asia/Seoul')).toBe('2026-01-15T07:30')
  })
  it('서머타임을 건너뛰면 그 날의 오프셋으로 다시 잡는다', () => {
    // 기준 시각은 PST(-08:00), 고른 시각은 전환 뒤라 PDT(-07:00)
    expect(fromLocalInput('2026-03-09T12:00', 'America/Los_Angeles', '2026-03-07T20:00:00Z'))
      .toBe('2026-03-09T19:00:00.000Z')
  })
})

describe('blankEntry', () => {
  const now = '2026-09-03T03:00:00.000Z'
  const needsInput: Record<string, string> = { meal: 'name', medication: 'name', note: 'text' }

  it('9종을 모두 만든다', () => {
    expect(KINDS.map((k) => blankEntry(k, now).kind)).toEqual([...KINDS])
  })
  it('사용자 입력 칸이 없는 6종은 그대로 유효하다', () => {
    for (const k of KINDS.filter((k) => !(k in needsInput))) {
      const r = entrySchema.safeParse(blankEntry(k, now))
      expect(r.success, `${k}: ${r.success ? '' : JSON.stringify(r.error.issues)}`).toBe(true)
    }
  })
  it('meal·medication·note는 사용자가 채울 칸 하나만 비어 있다', () => {
    for (const k of Object.keys(needsInput) as (typeof KINDS)[number][]) {
      const r = entrySchema.safeParse(blankEntry(k, now))
      expect(r.success, k).toBe(false)
      if (r.success) continue
      expect(r.error.issues.length, k).toBe(1)
      expect(r.error.issues[0].path.at(-1), k).toBe(needsInput[k])
    }
  })
})

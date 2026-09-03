import { describe, it, expect } from 'vitest'
import { quickTimeIso, presetOf } from '@/lib/quick-time'

const now = new Date('2026-09-03T10:45:00Z') // 19:45 KST
describe('quickTimeIso', () => {
  it('지금은 exact', () => {
    expect(quickTimeIso('now', now, 'Asia/Seoul')).toEqual({ iso: now.toISOString(), precision: 'exact' })
  })
  it('아침·점심·저녁은 오늘의 고정 시각, approx', () => {
    expect(quickTimeIso('morning', now, 'Asia/Seoul')).toEqual({ iso: '2026-09-02T23:00:00.000Z', precision: 'approx' })
    expect(quickTimeIso('lunch', now, 'Asia/Seoul')).toEqual({ iso: '2026-09-03T03:30:00.000Z', precision: 'approx' })
    expect(quickTimeIso('evening', now, 'Asia/Seoul')).toEqual({ iso: '2026-09-03T10:00:00.000Z', precision: 'approx' })
  })
  it('UTC 시간대', () => {
    expect(quickTimeIso('lunch', now, 'UTC').iso).toBe('2026-09-03T12:30:00.000Z')
  })
})
describe('presetOf', () => {
  it('역매핑', () => {
    expect(presetOf(now.toISOString(), now, 'Asia/Seoul')).toBe('now')
    expect(presetOf('2026-09-03T03:30:00.000Z', now, 'Asia/Seoul')).toBe('lunch')
    expect(presetOf('2026-09-03T05:00:00.000Z', now, 'Asia/Seoul')).toBe('custom')
  })
})

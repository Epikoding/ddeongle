import { describe, it, expect } from 'vitest'
import { formatReference, isFuture, dayRange, toLocalDateStr } from '@/lib/time'

describe('time', () => {
  const now = new Date('2026-09-03T10:45:00Z') // 19:45 KST 목요일
  it('formatReference', () => {
    expect(formatReference(now, 'Asia/Seoul')).toBe('2026-09-03 목요일 19:45, 시간대 +09:00')
  })
  it('isFuture 5분 여유', () => {
    expect(isFuture('2026-09-03T19:48:00+09:00', now)).toBe(false)
    expect(isFuture('2026-09-03T19:51:00+09:00', now)).toBe(true)
  })
  it('dayRange', () => {
    expect(dayRange('2026-09-03', 'Asia/Seoul')).toEqual({ from: '2026-09-02T15:00:00.000Z', to: '2026-09-03T14:59:59.999Z' })
  })
  it('toLocalDateStr', () => {
    expect(toLocalDateStr(now, 'Asia/Seoul')).toBe('2026-09-03')
  })
})

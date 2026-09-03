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
  it('dayRange 서머타임 전환일 (America/New_York 봄)', () => {
    expect(dayRange('2026-03-08', 'America/New_York')).toEqual({ from: '2026-03-08T05:00:00.000Z', to: '2026-03-09T03:59:59.999Z' })
  })
  it('dayRange 서머타임 전환일 (America/New_York 가을)', () => {
    expect(dayRange('2026-11-01', 'America/New_York')).toEqual({ from: '2026-11-01T04:00:00.000Z', to: '2026-11-02T04:59:59.999Z' })
  })
  it('dayRange 서머타임 전환일 (Europe/Paris 봄)', () => {
    expect(dayRange('2026-03-29', 'Europe/Paris')).toEqual({ from: '2026-03-28T23:00:00.000Z', to: '2026-03-29T21:59:59.999Z' })
  })
})

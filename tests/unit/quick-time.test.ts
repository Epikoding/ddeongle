import { describe, it, expect } from 'vitest'
import { quickTimeIso, presetOf, isoToLocalInput, localToIso } from '@/lib/quick-time'

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
describe('isoToLocalInput', () => {
  it('지역 시각 칸으로 바꿨다가 되돌리면 같은 시각', () => {
    const iso = '2026-09-03T03:30:00.000Z'
    expect(isoToLocalInput(iso, 'Asia/Seoul')).toBe('2026-09-03T12:30')
    expect(localToIso(isoToLocalInput(iso, 'Asia/Seoul'), 'Asia/Seoul', now)).toBe(iso)
  })
})
describe('localToIso', () => {
  it('서머타임이 시작된 뒤 날짜는 바뀐 오프셋으로 잡는다', () => {
    expect(localToIso('2026-03-09T12:00', 'America/Los_Angeles', new Date('2026-03-07T20:00:00Z')))
      .toBe('2026-03-09T19:00:00.000Z')
  })
})

import { describe, it, expect } from 'vitest'
import { baselineOf, ratioTone } from '@/lib/baseline'

const row = { candidate: '마늘', grp: 'ingredient', exposed_n: 10, exposed_hits: 6, control_n: 20, control_hits: 3, ratio: 4, enough: true }
describe('baselineOf', () => {
  it('(6+3)/(10+20) = 0.3', () => expect(baselineOf(row)).toBeCloseTo(0.3))
  it('분모 0이면 null', () => expect(baselineOf({ ...row, exposed_n: 0, control_n: 0 })).toBeNull())
})
describe('ratioTone', () => {
  it('2 이상 warn', () => expect(ratioTone(row)).toBe('warn'))
  it('1~2 accent', () => expect(ratioTone({ ...row, ratio: 1.3 })).toBe('accent'))
  it('1 미만·부족·null은 mute', () => {
    expect(ratioTone({ ...row, ratio: 0.9 })).toBe('mute')
    expect(ratioTone({ ...row, enough: false })).toBe('mute')
    expect(ratioTone({ ...row, ratio: null })).toBe('mute')
  })
})

import { describe, it, expect } from 'vitest'
import { formatRatio } from '@/components/RankingTable'

const base = { candidate: '마늘', grp: 'ingredient', exposed_n: 10, exposed_hits: 6, control_n: 20, control_hits: 3 }

describe('formatRatio', () => {
  it('배수', () => expect(formatRatio({ ...base, ratio: 4, enough: true })).toBe('4.0배'))
  it('자료 부족', () => expect(formatRatio({ ...base, exposed_n: 2, ratio: 4, enough: false })).toBe('자료 부족'))
  it('비교 불가', () => expect(formatRatio({ ...base, ratio: null, enough: true })).toBe('비교 불가'))
})

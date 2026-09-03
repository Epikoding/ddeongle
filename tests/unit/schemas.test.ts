import { describe, it, expect } from 'vitest'
import { entrySchema, parsedResultSchema, normalizeTag } from '@/lib/schemas'
import { isWatched } from '@/lib/watch-ingredients'

const meal = {
  kind: 'meal', occurred_at: '2026-09-03T12:00:00+09:00', time_precision: 'exact', source_text: '김치찌개',
  data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: [' 마늘', '두부 '], amount: null }], eating_pattern: [] },
}

describe('entrySchema', () => {
  it('meal 정상 파싱과 재료 정규화', () => {
    const r = entrySchema.parse(meal)
    expect(r.kind).toBe('meal')
    if (r.kind === 'meal') expect(r.data.foods[0].ingredients).toEqual(['마늘', '두부'])
  })
  it('bowel bristol 범위 검사', () => {
    expect(() => entrySchema.parse({ ...meal, kind: 'bowel', data: { bristol: 9, urgency: null, nocturnal: false, blood: null, note: null } })).toThrow()
  })
  it('symptom에 설사는 없다', () => {
    expect(() => entrySchema.parse({ ...meal, kind: 'symptom', data: { type: '설사', severity: 3, note: null } })).toThrow()
  })
  it('모르는 kind 거부', () => {
    expect(() => entrySchema.parse({ ...meal, kind: 'banana' })).toThrow()
  })
  it('빠진 선택 칸은 기본값', () => {
    const r = entrySchema.parse({ kind: 'note', occurred_at: '2026-09-03T12:00:00+09:00', data: { text: '메모' } })
    expect(r.time_precision).toBe('exact')
    expect(r.source_text).toBeNull()
  })
})

describe('parsedResultSchema', () => {
  it('questions 없으면 빈 배열', () => {
    const r = parsedResultSchema.parse({ entries: [meal] })
    expect(r.questions).toEqual([])
  })
})

describe('normalizeTag / isWatched', () => {
  it('trim과 공백 축약', () => expect(normalizeTag('  다진   마늘 ')).toBe('다진 마늘'))
  it('감시 재료 판정', () => {
    expect(isWatched('마늘')).toBe(true)
    expect(isWatched('쌀')).toBe(false)
  })
})

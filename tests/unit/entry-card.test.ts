import { describe, it, expect } from 'vitest'
import { summarizeEntry } from '@/components/EntryCard'

describe('summarizeEntry', () => {
  it('meal', () => {
    expect(summarizeEntry({ kind: 'meal', occurred_at: 'x', time_precision: 'exact', source_text: null,
      data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: [], amount: null }, { name: '공깃밥', ingredients: [], amount: null }], eating_pattern: [] } }))
      .toBe('김치찌개, 공깃밥')
  })
  it('bowel', () => {
    expect(summarizeEntry({ kind: 'bowel', occurred_at: 'x', time_precision: 'exact', source_text: null,
      data: { bristol: 7, urgency: true, nocturnal: false, blood: null, note: null } })).toBe('변 굳기 7 · 급함')
  })
  it('symptom', () => {
    expect(summarizeEntry({ kind: 'symptom', occurred_at: 'x', time_precision: 'exact', source_text: null,
      data: { type: '복통', severity: 3, note: null } })).toBe('복통 · 강도 3/10')
  })
  it('sleep', () => {
    expect(summarizeEntry({ kind: 'sleep', occurred_at: 'x', time_precision: 'approx', source_text: null,
      data: { quality: 3, hours: null, note: null } })).toBe('수면 질 3/10')
  })
})

import { describe, it, expect } from 'vitest'
import { extractJson, parsePaste } from '@/lib/parse-paste'

const good = {
  entries: [
    { kind: 'sleep', occurred_at: '2026-09-03T07:00:00+09:00', time_precision: 'approx', source_text: '잠을 잘 못 잤어', data: { quality: 3, hours: null, note: null } },
    { kind: 'meal', occurred_at: '2026-09-03T12:00:00+09:00', time_precision: 'exact', source_text: '김치찌개', data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: ['김치', '마늘'], amount: null }], eating_pattern: [] } },
  ],
  questions: [],
}

describe('extractJson', () => {
  it('코드블록 기호를 벗긴다', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })
  it('앞뒤 설명을 버린다', () => {
    expect(extractJson('네, 정리했어요.\n{"a":1}\n도움이 됐길!')).toBe('{"a":1}')
  })
  it('중괄호가 없으면 null', () => {
    expect(extractJson('그냥 글')).toBeNull()
  })
})

describe('parsePaste', () => {
  it('정상 JSON', () => {
    const r = parsePaste(JSON.stringify(good))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.entries).toHaveLength(2)
      expect(r.invalid).toHaveLength(0)
    }
  })
  it('JSON 없음', () => {
    const r = parsePaste('네, 정리해 드릴게요! 식사는 ...')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('no_json')
  })
  it('깨진 JSON', () => {
    const r = parsePaste('{"entries": [')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('no_json')
  })
  it('entries가 배열이 아니면 bad_shape', () => {
    const r = parsePaste('{"entries": "x"}')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBe('bad_shape')
  })
  it('항목 하나만 틀리면 그것만 invalid', () => {
    const bad = { ...good, entries: [...good.entries, { kind: 'bowel', occurred_at: 'x', data: {} }] }
    const r = parsePaste(JSON.stringify(bad))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.entries).toHaveLength(2)
      expect(r.invalid).toHaveLength(1)
      expect(r.invalid[0].index).toBe(2)
      expect(r.invalid[0].reason).toContain('occurred_at')
    }
  })
  it('questions 전달', () => {
    const r = parsePaste(JSON.stringify({ ...good, questions: ['떡볶이는 언제였나요?'] }))
    if (r.ok) expect(r.questions).toEqual(['떡볶이는 언제였나요?'])
  })
})

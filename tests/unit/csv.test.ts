import { describe, it, expect } from 'vitest'
import { entriesToCsv } from '@/lib/csv'

describe('entriesToCsv', () => {
  it('헤더와 따옴표 처리', () => {
    const csv = entriesToCsv([{
      id: 'e1', raw_input_id: null, created_at: 'x', kind: 'meal', occurred_at: '2026-09-03T03:00:00Z', time_precision: 'exact', source_text: '김치찌개, "매운" 것',
      data: { meal_type: '점심', foods: [{ name: '김치찌개', ingredients: ['김치', '마늘'], amount: null }], eating_pattern: [] },
    }], 'Asia/Seoul')
    const lines = csv.split('\n')
    expect(lines[0]).toBe('id,kind,occurred_at_local,time_precision,summary,tags,data_json,source_text')
    expect(lines[1]).toContain('e1,meal,2026-09-03 12:00,exact,김치찌개,김치|마늘,')
    expect(lines[1]).toContain('"김치찌개, ""매운"" 것"')
  })
})

import { describe, it, expect } from 'vitest'
import { buildPrompt } from '@/lib/prompt'

const referenceAt = new Date('2026-09-03T10:45:00Z')

describe('buildPrompt', () => {
  it('빈칸을 채운다', () => {
    const p = buildPrompt({ text: '아까 12시에 김치찌개', referenceAt, tz: 'Asia/Seoul' })
    expect(p).toContain('지금은 `2026-09-03 목요일 19:45, 시간대 +09:00` 입니다')
    expect(p.trimEnd().endsWith('아까 12시에 김치찌개')).toBe(true)
    expect(p).not.toContain('{{')
  })
  it('설명 문단은 빼고 본문만', () => {
    const p = buildPrompt({ text: 'x', referenceAt, tz: 'Asia/Seoul' })
    expect(p.startsWith('당신은 소화기 증상 일기 앱의 변환기입니다')).toBe(true)
  })
  it('음식 사전 절을 변환할 문장 앞에 넣는다', () => {
    const p = buildPrompt({ text: 'x', referenceAt, tz: 'Asia/Seoul', foods: [{ name: '엄마 김치찌개', ingredients: ['김치', '돼지고기'] }] })
    const a = p.indexOf('## 이 사용자의 등록 음식')
    const b = p.indexOf('## 변환할 문장')
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(b)
    expect(p).toContain('- 엄마 김치찌개: 김치, 돼지고기')
  })
  it('사용자 입력의 $ 패턴을 특수 치환으로 해석하지 않는다', () => {
    const text = "어제 $' 먹고 값 $& 였다 $$ 그리고 $` 끝"
    const p = buildPrompt({ text, referenceAt, tz: 'Asia/Seoul', foods: [{ name: '$& 찌개', ingredients: ["$' 김치"] }] })
    expect(p.trimEnd().endsWith(text)).toBe(true)
    expect(p).toContain("- $& 찌개: $' 김치")
    expect(p).not.toContain('{{')
  })
})

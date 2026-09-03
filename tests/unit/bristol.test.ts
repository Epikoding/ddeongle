import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { BRISTOL, BristolScale } from '@/components/ui/BristolScale'

describe('BristolScale', () => {
  it('7칸, 6·7은 경고 라벨', () => {
    expect(BRISTOL.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(BRISTOL.map((b) => b.label)).toEqual(['딱딱', '울퉁', '금간', '매끈', '무른', '죽', '물'])
  })
  it('선택된 칸에 aria-pressed', () => {
    const html = renderToStaticMarkup(createElement(BristolScale, { value: 7, onChange: () => {} }))
    expect(html.match(/aria-pressed="true"/g)?.length).toBe(1)
    expect(html.match(/<svg/g)?.length).toBe(7)
  })
})

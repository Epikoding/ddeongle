import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { BRISTOL, BristolScale } from '@/components/ui/BristolScale'

const render = (value: number | null) => renderToStaticMarkup(createElement(BristolScale, { value, onChange: () => {} }))

describe('BristolScale', () => {
  it('7칸, 6·7은 경고 라벨', () => {
    expect(BRISTOL.map((b) => b.n)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(BRISTOL.map((b) => b.label)).toEqual(['딱딱', '울퉁', '금간', '매끈', '무른', '죽', '물'])
  })
  it('선택된 칸에 aria-checked', () => {
    const html = render(7)
    expect(html.match(/aria-checked="true"/g)?.length).toBe(1)
    expect(html.match(/role="radio"/g)?.length).toBe(7)
    expect(html.match(/<svg/g)?.length).toBe(7)
    expect(html).not.toContain('aria-pressed')
  })
  it('선택 전에는 켜진 칸이 없다', () => {
    expect(render(null)).not.toContain('aria-checked="true"')
  })
  it('6·7을 고르면 경고색, 5까지는 강조색', () => {
    for (const n of [1, 4, 5]) {
      expect(render(n), `${n}칸`).toContain('border-accent')
      expect(render(n), `${n}칸`).toContain('bg-accent-soft')
      expect(render(n), `${n}칸`).not.toContain('border-warn')
    }
    for (const n of [6, 7]) {
      expect(render(n), `${n}칸`).toContain('border-warn')
      expect(render(n), `${n}칸`).toContain('bg-warn-soft')
      expect(render(n), `${n}칸`).not.toContain('border-accent')
    }
  })
  it('탭 정지점은 언제나 한 칸뿐이다', () => {
    for (const v of [null, 1, 4, 7]) {
      expect(render(v).match(/tabindex="0"/g)?.length, `${v}`).toBe(1)
    }
  })
})

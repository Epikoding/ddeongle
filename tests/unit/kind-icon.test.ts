import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { KindIcon, KIND_LUCIDE } from '@/components/ui/KindIcon'
import { KINDS } from '@/lib/schemas'

describe('KindIcon', () => {
  it('9종 전부 lucide 아이콘이 있다', () => {
    for (const k of KINDS) expect(KIND_LUCIDE[k], k).toBeTypeOf('object')
  })
  it('svg를 그리고 이모지가 없다', () => {
    const html = renderToStaticMarkup(createElement(KindIcon, { kind: 'meal' }))
    expect(html).toContain('<svg')
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })
  it('배변·증상은 경고 타일', () => {
    expect(renderToStaticMarkup(createElement(KindIcon, { kind: 'bowel' }))).toContain('bg-warn-soft')
    expect(renderToStaticMarkup(createElement(KindIcon, { kind: 'sleep' }))).toContain('bg-accent-soft')
  })
})

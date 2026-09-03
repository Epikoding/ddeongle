import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key'

// 로그인 상태를 테스트마다 갈아끼우기 위한 훅 상태 (vi.mock 팩토리가 호이스팅되므로 vi.hoisted 사용)
const h = vi.hoisted(() => ({ user: null as { id: string } | null }))

vi.mock('@supabase/ssr', () => ({
  createServerClient: (
    _url: string,
    _key: string,
    opts: { cookies: { setAll: (c: { name: string; value: string; options?: object }[]) => void } },
  ) => ({
    auth: {
      getUser: async () => {
        // 실제 클라이언트가 토큰을 갱신하면 getUser 응답 전에 setAll이 불린다
        if (h.user) opts.cookies.setAll([{ name: 'sb-x', value: 'v', options: { path: '/' } }])
        return { data: { user: h.user } }
      },
    },
  }),
}))

const { updateSession } = await import('@/lib/supabase/middleware')

describe('updateSession', () => {
  beforeEach(() => { h.user = null })

  it('미로그인 요청은 /login으로 리다이렉트한다', async () => {
    const res = await updateSession(new NextRequest('http://localhost:3000/'))
    expect([307, 308]).toContain(res.status)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/login')
  })

  it('로그인 상태로 /login에 오면 /로 보내면서 갱신된 세션 쿠키를 유지한다', async () => {
    h.user = { id: 'u' }
    const res = await updateSession(new NextRequest('http://localhost:3000/login'))
    expect([307, 308]).toContain(res.status)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/')
    expect(res.cookies.get('sb-x')?.value).toBe('v')
  })

  it('로그인 상태의 일반 요청은 리다이렉트하지 않는다', async () => {
    h.user = { id: 'u' }
    const res = await updateSession(new NextRequest('http://localhost:3000/'))
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })
})

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC = ['/login', '/auth/callback', '/manifest.webmanifest', '/sw.js']

/** getUser()가 토큰을 갱신했으면 그 Set-Cookie가 response에 실려 있다 — 리다이렉트에도 옮겨 싣는다. */
function redirectKeepingCookies(url: URL, response: NextResponse) {
  const redirect = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublic = PUBLIC.some((p) => path.startsWith(p)) || path.startsWith('/icons/') || path.startsWith('/fonts/')
  if (!user && !isPublic) {
    const url = request.nextUrl.clone(); url.pathname = '/login'; return redirectKeepingCookies(url, response)
  }
  if (user && path === '/login') {
    const url = request.nextUrl.clone(); url.pathname = '/'; return redirectKeepingCookies(url, response)
  }
  return response
}

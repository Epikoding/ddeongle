'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// useSearchParams를 쓰는 부분만 Suspense 안에 둔다 — 페이지 전체를 감싸면 폼이 프리렌더 HTML에서 빠진다(Next 16)
function LinkErrorNotice() {
  if (useSearchParams().get('error') !== 'link') return null // /auth/callback이 링크 교환에 실패하면 ?error=link로 되돌려 보낸다
  return (
    <p role="alert" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm">
      로그인 링크가 만료됐거나 다른 브라우저에서 열렸습니다. 링크를 요청한 브라우저에서 다시 시도해 주세요.
    </p>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'not_invited' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (!error) { setState('sent'); return }
    if (/not_invited|Database error/i.test(error.message)) {
      setState('not_invited'); setMessage('초대가 필요합니다. 가족 관리자에게 이메일 등록을 부탁하세요.')
    } else { setState('error'); setMessage(error.message) }
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="mb-6 text-2xl font-bold">장 기록</h1>
      {state === 'sent' ? (
        <p className="rounded-lg bg-green-50 p-4">로그인 링크를 보냈습니다. 이메일을 열어 링크를 눌러 주세요.</p>
      ) : (
        <>
          <Suspense fallback={null}><LinkErrorNotice /></Suspense>
          <form onSubmit={submit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일" className="w-full rounded-lg border p-3" autoComplete="email" />
            <button disabled={state === 'sending'} className="w-full rounded-lg bg-black p-3 font-semibold text-white disabled:opacity-50">
              로그인 링크 받기
            </button>
            {(state === 'not_invited' || state === 'error') && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{message}</p>
            )}
          </form>
        </>
      )}
    </main>
  )
}

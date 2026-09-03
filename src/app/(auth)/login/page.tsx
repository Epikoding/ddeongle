'use client'
import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// useSearchParams를 쓰는 부분만 Suspense 안에 둔다 — 페이지 전체를 감싸면 폼이 프리렌더 HTML에서 빠진다(Next 16)
function LinkErrorNotice() {
  if (useSearchParams().get('error') !== 'link') return null // /auth/callback이 링크 교환에 실패하면 ?error=link로 되돌려 보낸다
  return (
    <p role="alert" className="mb-3 rounded-xl bg-warn-soft p-3 text-[12px] text-warn">
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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pb-16">
      <h1 className="text-[24px] font-bold tracking-[-0.01em]">장 기록</h1>
      <p className="mt-1 mb-8 text-[14px] text-mute">설사 유발요인을 찾는 일기</p>
      {/* 보낸 뒤에도 폼을 지우지 않는다 — 주소를 잘못 적었으면 그 자리에서 고쳐야 하고, 폼이 통째로
          사라지면 방금 누른 버튼과 함께 포커스도 사라진다. 안내 자리는 늘 두고 문구만 갈아 끼운다. */}
      <div role="status">
        {state === 'sent' && (
          <p className="rounded-xl bg-accent-soft p-4 text-[14px]">로그인 링크를 보냈습니다. 이메일을 열어 링크를 눌러 주세요.</p>
        )}
      </div>
      {state === 'sent' && (
        <button type="button" onClick={() => setState('idle')} className="mt-2 mb-3 self-start py-1 text-[14px] font-semibold text-accent">
          다른 이메일로 다시 보내기
        </button>
      )}
      <Suspense fallback={null}><LinkErrorNotice /></Suspense>
      <form onSubmit={submit} className="space-y-3">
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" autoComplete="email" className="h-12 rounded-xl border-line bg-card text-[16px] md:text-[16px]" />
        <Button type="submit" disabled={state === 'sending'} className="h-12 w-full rounded-xl text-[16px] font-bold">로그인 링크 받기</Button>
        {(state === 'not_invited' || state === 'error') && (
          <p role="alert" className="rounded-xl bg-warn-soft p-3 text-[12px] text-warn">{message}</p>
        )}
      </form>
    </main>
  )
}

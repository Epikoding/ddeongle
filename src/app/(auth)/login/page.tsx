'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { authMessage } from '@/lib/auth-message'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// useSearchParams를 쓰는 부분만 Suspense 안에 둔다 — 페이지 전체를 감싸면 폼이 프리렌더 HTML에서 빠진다(Next 16)
function LinkErrorNotice() {
  if (useSearchParams().get('error') !== 'link') return null // /auth/callback이 링크 교환에 실패하면 ?error=link로 되돌려 보낸다
  return (
    <p role="alert" className="mb-3 rounded-xl bg-warn-soft p-3 text-[12px] text-warn">
      로그인 링크가 다른 브라우저에서 열렸습니다. 아래에서 6자리 코드로 로그인해 주세요.
    </p>
  )
}

export default function LoginPage() {
  const router = useRouter()
  // 링크 대신 코드로 로그인한다 — 폰 메일 앱이 링크를 자기 내장 브라우저에서 열면
  // 코드 교환에 쓸 검증기가 앱 브라우저에 없어 실패한다. 코드는 사람이 옮겨 적으므로 그 함정이 없다.
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function sendCode(address: string) {
    const supabase = createClient()
    return supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    const { error } = await sendCode(email.trim().toLowerCase())
    setBusy(false)
    if (error) { setError(authMessage(error.message)); return }
    setStep('code')
  }

  async function resend() {
    setBusy(true); setError(''); setNotice('')
    const { error } = await sendCode(email.trim().toLowerCase())
    setBusy(false)
    if (error) { setError(authMessage(error.message)); return }
    setNotice('다시 보냈습니다.')
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setError(''); setNotice('')
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: 'email' })
    if (error) { setBusy(false); setError(authMessage(error.message)); return }
    // replace로 로그인 화면을 히스토리에서 걷어내고, refresh로 서버 컴포넌트가 새 세션으로 다시 그려지게 한다
    router.replace('/')
    router.refresh()
  }

  function backToEmail() {
    setStep('email'); setCode(''); setError(''); setNotice('')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 pb-16">
      <h1 className="text-[24px] font-bold tracking-[-0.01em] text-ink">똥글</h1>
      <p className="mt-1 mb-8 text-[14px] text-mute">설사 유발요인을 찾는 일기</p>
      <Suspense fallback={null}><LinkErrorNotice /></Suspense>

      {step === 'email' ? (
        <form onSubmit={submitEmail} className="space-y-3">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" autoComplete="email" className="h-12 rounded-xl border-line bg-card text-[16px] md:text-[16px]" />
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-xl text-[16px] font-bold">코드 보내기</Button>
        </form>
      ) : (
        <>
          {/* 안내 자리는 늘 두고 문구만 갈아 끼운다 — 재발송 문구가 떠도 입력 칸과 포커스가 그대로 남게 */}
          <div role="status" className="mb-3 rounded-xl bg-accent-soft p-4 text-[14px] text-ink">
            {email.trim().toLowerCase()}로 6자리 코드를 보냈습니다.{notice && ` ${notice}`}
          </div>
          <form onSubmit={submitCode} className="space-y-3">
            <Input
              data-testid="otp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6자리 코드"
              className="h-12 rounded-xl border-line bg-card text-center text-[16px] tracking-[0.4em] md:text-[16px]"
            />
            <Button type="submit" data-testid="otp-submit" disabled={busy} className="h-12 w-full rounded-xl text-[16px] font-bold">로그인</Button>
          </form>
          <div className="mt-3 flex justify-between text-[14px] font-semibold">
            <button type="button" onClick={backToEmail} className="py-1 text-mute">다른 이메일로</button>
            <button type="button" onClick={resend} disabled={busy} className="py-1 text-accent">코드 다시 보내기</button>
          </div>
        </>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl bg-warn-soft p-3 text-[12px] text-warn">{error}</p>}
    </main>
  )
}

'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
      )}
    </main>
  )
}

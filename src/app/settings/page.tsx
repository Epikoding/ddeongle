'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listInvites, addInvite, updateTimezone } from '@/lib/db'
import template from '../../../prompts/parse-ko.md'

const TZS = ['Asia/Seoul', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC']

function toMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  return m === 'not_found' || m === 'profile_missing' ? '프로필을 찾지 못했습니다.' : m
}

export default function SettingsPage() {
  const [userId, setUserId] = useState('')
  const [tz, setTz] = useState('Asia/Seoul')
  const [invites, setInvites] = useState<{ email: string; created_at: string }[]>([])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)

  // 프로필이 없어도 화면은 뜬다 — userId는 빈 값으로 두고 초대 목록만이라도 보여준다.
  const load = useCallback(() => {
    const sb = createClient()
    getProfile(sb).then((p) => { setUserId(p.user_id); setTz(p.timezone) }).catch(() => {})
    listInvites(sb).then(setInvites).catch(() => {})
  }, [])
  useEffect(() => { load() }, [load])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    try { await addInvite(createClient(), email, userId); setEmail(''); setMsg('초대했습니다.'); load() }
    catch (err) { setMsg(toMsg(err)) }
  }
  async function changeTz(v: string) {
    // 저장에 실패하면 화면의 선택값을 되돌린다 — 다른 화면은 여전히 옛 시간대를 쓴다.
    const prev = tz; setTz(v)
    try { await updateTimezone(createClient(), userId, v) }
    catch (err) { setTz(prev); setMsg(toMsg(err)) }
  }
  async function signOut() { await createClient().auth.signOut(); window.location.href = '/login' }

  return (
    <main className="mx-auto max-w-md space-y-6 p-4">
      <Link href="/" className="text-sm text-neutral-600">← 타임라인</Link>
      <section>
        <h2 className="font-bold">초대 이메일</h2>
        <form onSubmit={invite} className="mt-2 flex gap-2">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="가족 이메일" className="flex-1 rounded border p-2" />
          <button className="rounded bg-black px-3 text-white">추가</button>
        </form>
        {msg && <p className="mt-1 text-sm">{msg}</p>}
        <ul className="mt-2 text-sm">{invites.map((i) => <li key={i.email}>{i.email}</li>)}</ul>
      </section>
      <section>
        <h2 className="font-bold">시간대</h2>
        <select value={tz} onChange={(e) => changeTz(e.target.value)} className="mt-2 rounded border p-2">{TZS.map((t) => <option key={t}>{t}</option>)}</select>
      </section>
      <section>
        <h2 className="font-bold">프롬프트 원문</h2>
        <details className="mt-2 text-xs"><summary>보기</summary><pre className="whitespace-pre-wrap rounded bg-neutral-100 p-2">{template}</pre></details>
      </section>
      <button onClick={signOut} className="w-full rounded-xl border p-2 text-sm">로그아웃</button>
    </main>
  )
}

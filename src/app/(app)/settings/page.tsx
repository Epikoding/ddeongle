'use client'
import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listInvites, addInvite, updateTimezone, exportRows } from '@/lib/db'
import { entriesToCsv } from '@/lib/csv'
import { dayRange, toLocalDateStr } from '@/lib/time'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import template from '../../../../prompts/parse-ko.md'

const TZS = ['Asia/Seoul', 'Asia/Tokyo', 'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC']
function toMsg(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err)
  return m === 'not_found' || m === 'profile_missing' ? '프로필을 찾지 못했습니다.' : m
}
function Card({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return <section id={id} className="mx-4 mb-2 rounded-2xl border border-line bg-card p-4"><h2 className="mb-3 text-[16px] font-semibold">{title}</h2>{children}</section>
}

export default function SettingsPage() {
  const [userId, setUserId] = useState('')
  // 프로필을 못 읽으면 관리자가 아닌 쪽으로 둔다 — 어차피 RLS가 막으므로 폼을 띄워 봐야 실패만 보여준다
  const [isAdmin, setIsAdmin] = useState(false)
  const [tz, setTz] = useState('Asia/Seoul')
  const [invites, setInvites] = useState<{ email: string; created_at: string }[]>([])
  const [email, setEmail] = useState('')
  const [inviteMsg, setInviteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [tzMsg, setTzMsg] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportMsg, setExportMsg] = useState<string | null>(null)

  const refreshInvites = useCallback(() => {
    listInvites(createClient()).then(setInvites).catch(() => {})
  }, [])

  // 프로필이 없어도 화면은 뜬다 — userId는 빈 값으로 두고 초대 목록만이라도 보여준다.
  // 시간대와 내보내기 기간 기본값은 마운트 때 한 번만 정한다 — 초대를 추가해도 고르던 기간이 되돌아가지 않게.
  useEffect(() => {
    getProfile(createClient())
      .then((p) => { setUserId(p.user_id); setTz(p.timezone); setIsAdmin(p.is_admin); return p.timezone })
      .catch(() => 'Asia/Seoul')
      .then((zone) => {
        const today = toLocalDateStr(new Date(), zone)
        const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 29)
        setFrom(d.toISOString().slice(0, 10)); setTo(today)
      })
    refreshInvites()
  }, [refreshInvites])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    try { await addInvite(createClient(), email, userId); setEmail(''); setInviteMsg({ ok: true, text: '초대했습니다.' }); refreshInvites() }
    catch (err) { setInviteMsg({ ok: false, text: toMsg(err) }) }
  }
  async function changeTz(v: string) {
    const prev = tz; setTz(v); setTzMsg(null)
    try { await updateTimezone(createClient(), userId, v) } catch (err) { setTz(prev); setTzMsg(toMsg(err)) }
  }
  async function download() {
    setExportMsg(null); setExporting(true)
    try {
      const rows = await exportRows(createClient(), dayRange(from, tz).from, dayRange(to, tz).to)
      // 엑셀이 UTF-8로 알아보게 BOM을 앞에 붙인다.
      const blob = new Blob(['\uFEFF' + entriesToCsv(rows, tz)], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `ddeongle_${from}_${to}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) { setExportMsg('내보내지 못했습니다. ' + toMsg(err)) }
    finally { setExporting(false) }
  }
  async function signOut() {
    await createClient().auth.signOut()
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 전체 리로드로 세션 잔재를 비운다
    window.location.href = '/login'
  }
  const fmtDate = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: tz, month: 'long', day: 'numeric' }).format(new Date(iso))

  return (
    <main className="pb-6">
      <PageHeader title="설정" />
      <Card title="초대 이메일">
        {isAdmin ? (
          <>
            <form onSubmit={invite} className="flex gap-2">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="가족 이메일" className="h-10 flex-1 rounded-xl border-line bg-bg" />
              <Button type="submit" className="h-10 rounded-xl px-4 font-semibold">추가</Button>
            </form>
            {inviteMsg && <p role={inviteMsg.ok ? undefined : 'alert'} className={cn('mt-2 text-[12px]', inviteMsg.ok ? 'text-mute' : 'text-warn')}>{inviteMsg.text}</p>}
          </>
        ) : (
          <p className="text-[14px] text-mute">초대는 관리자만 추가할 수 있어요.</p>
        )}
        <ul className="mt-3 divide-y divide-line text-[14px]">
          {invites.map((i) => <li key={i.email} className="flex justify-between py-2"><span>{i.email}</span><span className="text-mute">{fmtDate(i.created_at)}</span></li>)}
        </ul>
      </Card>
      <Card title="시간대">
        <Select value={tz} onValueChange={changeTz}>
          <SelectTrigger className="h-10 rounded-xl border-line bg-bg"><SelectValue /></SelectTrigger>
          <SelectContent className="shadow-none">{TZS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
        </Select>
        {tzMsg && <p role="alert" className="mt-2 text-[12px] text-warn">{tzMsg}</p>}
      </Card>
      <Card title="내보내기" id="export">
        <div className="flex items-center gap-2 text-[14px]">
          <input type="date" aria-label="시작일" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-2 text-[16px]" />
          <span className="text-mute">~</span>
          <input type="date" aria-label="종료일" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-bg px-2 text-[16px]" />
        </div>
        <Button onClick={download} disabled={!from || !to || from > to || exporting} className="mt-3 h-10 w-full rounded-xl font-semibold">CSV 내려받기</Button>
        {exportMsg && <p role="alert" className="mt-2 text-[12px] text-warn">{exportMsg}</p>}
      </Card>
      <details className="mx-4 mb-2 min-w-0 rounded-2xl border border-line bg-card p-4 text-[14px]">
        <summary className="cursor-pointer font-semibold">프롬프트 원문</summary>
        {/* 프롬프트 안 JSON 예시는 공백 없이 352자가 이어진다 — anywhere 없이는 pre가 그 폭만큼 벌어져 화면 전체가 넓어진다 */}
        <pre className="mt-2 min-w-0 max-w-full whitespace-pre-wrap [overflow-wrap:anywhere] rounded-xl bg-bg p-2 text-[12px] text-mute">{template}</pre>
      </details>
      <div className="px-4"><Button variant="outline" onClick={signOut} className="h-10 w-full rounded-xl border-line">로그아웃</Button></div>
    </main>
  )
}

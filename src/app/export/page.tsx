'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getProfile, exportRows } from '@/lib/db'
import { entriesToCsv } from '@/lib/csv'
import { dayRange, toLocalDateStr } from '@/lib/time'

export default function ExportPage() {
  const [tz, setTz] = useState('Asia/Seoul')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    // 프로필이 없어도 기본 시간대(Asia/Seoul)로 화면은 뜨게 한다.
    getProfile(createClient())
      .then((p) => p.timezone)
      .catch(() => 'Asia/Seoul')
      .then((zone) => {
        setTz(zone)
        const today = toLocalDateStr(new Date(), zone)
        const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 29)
        setFrom(d.toISOString().slice(0, 10)); setTo(today)
      })
  }, [])

  async function download() {
    setMsg(null)
    try {
      const rows = await exportRows(createClient(), dayRange(from, tz).from, dayRange(to, tz).to)
      const blob = new Blob(['\uFEFF' + entriesToCsv(rows, tz)], { type: 'text/csv;charset=utf-8' })
      // \uC575\uCEE4\uB97C \uBB38\uC11C\uC5D0 \uBD99\uC5EC\uC57C WebKit(iOS Safari)\uC5D0\uC11C \uD074\uB9AD\uC774 \uBA39\uACE0, revoke\uB294 \uB2E4\uC6B4\uB85C\uB4DC\uAC00 \uC2DC\uC791\uB41C \uB4A4\uC5D0 \uD55C\uB2E4.
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `gut-log_${from}_${to}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) {
      setMsg('\uB0B4\uBCF4\uB0B4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <Link href="/" className="text-sm text-neutral-600">← 타임라인</Link>
      <h1 className="my-2 text-lg font-bold">CSV 내보내기</h1>
      <div className="flex gap-2 text-sm">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border p-1" />
        <span>~</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border p-1" />
      </div>
      <button onClick={download} disabled={!from || !to} className="mt-3 w-full rounded-xl bg-black p-3 font-semibold text-white disabled:opacity-50">내려받기</button>
      {msg && <p role="alert" className="mt-2 text-sm text-red-600">{msg}</p>}
    </main>
  )
}

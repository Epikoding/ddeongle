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
    const rows = await exportRows(createClient(), dayRange(from, tz).from, dayRange(to, tz).to)
    const blob = new Blob(['\uFEFF' + entriesToCsv(rows, tz)], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `gut-log_${from}_${to}.csv`; a.click()
    URL.revokeObjectURL(a.href)
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
      <button onClick={download} className="mt-3 w-full rounded-xl bg-black p-3 font-semibold text-white">내려받기</button>
    </main>
  )
}

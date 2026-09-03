'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listEntriesForDay, type EntryRow } from '@/lib/db'
import { toLocalDateStr } from '@/lib/time'
import { EntryCard } from '@/components/EntryCard'

export default function HomePage() {
  const [tz, setTz] = useState('Asia/Seoul')
  const [date, setDate] = useState<string>('')
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const loading = !date || loadedKey !== `${date}|${tz}`

  useEffect(() => {
    const sb = createClient()
    getProfile(sb).then((p) => { setTz(p.timezone); setDate(toLocalDateStr(new Date(), p.timezone)) })
  }, [])

  useEffect(() => {
    if (!date) return
    const sb = createClient()
    let alive = true
    listEntriesForDay(sb, date, tz)
      .then((rows) => { if (alive) setEntries(rows) })
      .finally(() => { if (alive) setLoadedKey(`${date}|${tz}`) })
    return () => { alive = false }
  }, [date, tz])

  function shift(days: number) {
    const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  return (
    <main className="mx-auto max-w-md p-4 pb-40">
      <header className="mb-3 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="p-2">◀</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded border p-1" />
        <button onClick={() => shift(1)} className="p-2">▶</button>
      </header>
      <nav className="mb-3 flex gap-3 text-sm text-neutral-600">
        <Link href="/analysis">분석</Link><Link href="/export">내보내기</Link><Link href="/settings">설정</Link>
      </nav>
      {loading ? <p className="text-neutral-500">불러오는 중…</p> :
        entries.length === 0 ? <p className="text-neutral-500">이 날 기록이 없습니다.</p> :
        <div className="space-y-2">
          {entries.map((e) => <Link key={e.id} href={`/entries/${e.id}`}><EntryCard entry={e} tz={tz} /></Link>)}
        </div>}
    </main>
  )
}

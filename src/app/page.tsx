'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listEntriesForDay, listFoods, type EntryRow, type RawInput } from '@/lib/db'
import { toLocalDateStr } from '@/lib/time'
import { EntryCard } from '@/components/EntryCard'
import { InputBar } from '@/components/InputBar'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { PendingBanner } from '@/components/PendingBanner'
import type { PasteResult } from '@/lib/parse-paste'
import type { FoodHint } from '@/lib/prompt'

export default function HomePage() {
  const [tz, setTz] = useState('Asia/Seoul')
  const [date, setDate] = useState<string>('')
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [foods, setFoods] = useState<FoodHint[]>([])
  const [sheet, setSheet] = useState<{ result: Extract<PasteResult, { ok: true }>; raw: RawInput } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [inputKey, setInputKey] = useState(0) // 저장에 성공하면 올려서 InputBar를 새로 띄운다(입력·기준 시각 초기화)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loading = !date || loadedKey !== `${date}|${tz}|${reloadKey}`

  useEffect(() => {
    const sb = createClient()
    getProfile(sb)
      .then((p) => { setTz(p.timezone); setDate(toLocalDateStr(new Date(), p.timezone)) })
      .catch(() => { setTz('Asia/Seoul'); setDate(toLocalDateStr(new Date(), 'Asia/Seoul')) })
    listFoods(sb).then(setFoods)
  }, [])

  useEffect(() => {
    if (!date) return
    const sb = createClient()
    let alive = true
    listEntriesForDay(sb, date, tz)
      .then((rows) => { if (alive) { setEntries(rows); setLoadError(null) } })
      .catch(() => { if (alive) { setEntries([]); setLoadError('기록을 불러오지 못했습니다.') } })
      .finally(() => { if (alive) setLoadedKey(`${date}|${tz}|${reloadKey}`) })
    return () => { alive = false }
  }, [date, tz, reloadKey])

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
      <PendingBanner onFlushed={() => setReloadKey((k) => k + 1)} />
      {loading ? <p className="text-neutral-500">불러오는 중…</p> :
        loadError ? <p role="alert" className="text-red-600">{loadError}</p> :
        entries.length === 0 ? <p className="text-neutral-500">이 날 기록이 없습니다.</p> :
        <div className="space-y-2">
          {entries.map((e) => <Link key={e.id} href={`/entries/${e.id}`}><EntryCard entry={e} tz={tz} /></Link>)}
        </div>}
      <InputBar key={inputKey} tz={tz} foods={foods} onParsed={(result, raw) => setSheet({ result, raw })} />
      {sheet && <ConfirmSheet result={sheet.result} raw={sheet.raw} tz={tz}
        onSaved={() => { setSheet(null); setReloadKey((k) => k + 1); setInputKey((k) => k + 1); listFoods(createClient()).then(setFoods) }}
        onClose={() => setSheet(null)} />}
    </main>
  )
}

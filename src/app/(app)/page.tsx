'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Mic } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, listEntriesForDay, listFoods, type EntryRow, type RawInput } from '@/lib/db'
import type { PasteResult } from '@/lib/parse-paste'
import type { FoodHint } from '@/lib/prompt'
import { toLocalDateStr } from '@/lib/time'
import { EntryCard } from '@/components/EntryCard'
import { InputBar } from '@/components/InputBar'
import { InputSheet } from '@/components/InputSheet'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { DayPicker } from '@/components/DayPicker'
import { PendingBanner } from '@/components/PendingBanner'
import { EmptyState } from '@/components/ui/EmptyState'

function dayTitle(date: string, tz: string): { title: string; rel: string | null } {
  const d = new Date(`${date}T12:00:00Z`)
  // ko-KR 기본 서식은 `9월 3일 (목)` — 명세 5.1의 `9월 3일 목`이 되게 조각에서 괄호만 뺀다
  const title = new Intl.DateTimeFormat('ko-KR', { timeZone: 'UTC', month: 'long', day: 'numeric', weekday: 'short' })
    .formatToParts(d).map((p) => (p.type === 'literal' ? p.value.replace(/[()]/g, '') : p.value)).join('').trim()
  const today = toLocalDateStr(new Date(), tz)
  const y = new Date(`${today}T12:00:00Z`); y.setUTCDate(y.getUTCDate() - 1)
  const rel = date === today ? '오늘' : date === y.toISOString().slice(0, 10) ? '어제' : null
  return { title, rel }
}

export default function HomePage() {
  const router = useRouter()
  const [tz, setTz] = useState('Asia/Seoul')
  const [date, setDate] = useState<string>('')
  const [entries, setEntries] = useState<EntryRow[]>([])
  const [reloadKey, setReloadKey] = useState(0)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [foods, setFoods] = useState<FoodHint[]>([])
  const [sheet, setSheet] = useState<{ result: Extract<PasteResult, { ok: true }>; raw: RawInput } | null>(null)
  const [inputOpen, setInputOpen] = useState(false)
  const [inputKey, setInputKey] = useState(0)
  const loading = !date || loadedKey !== `${date}|${tz}|${reloadKey}`

  useEffect(() => {
    const sb = createClient()
    getProfile(sb)
      .then((p) => { setTz(p.timezone); setDate(toLocalDateStr(new Date(), p.timezone)) })
      .catch(() => { setTz('Asia/Seoul'); setDate(toLocalDateStr(new Date(), 'Asia/Seoul')) })
    listFoods(sb).then(setFoods).catch(() => {})
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
    if (!date) return
    const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days)
    setDate(d.toISOString().slice(0, 10))
  }

  const { title, rel } = date ? dayTitle(date, tz) : { title: '', rel: null }
  const subtitle = [rel, loading ? null : `기록 ${entries.length}건`].filter(Boolean).join(' · ')

  return (
    <main className="pb-[88px]">
      <header className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.01em]">{title || ' '}</h1>
          <p className="mt-0.5 text-[12px] text-mute">{subtitle || ' '}</p>
        </div>
        <div className="flex items-center">
          <button type="button" onClick={() => shift(-1)} disabled={!date} aria-label="하루 전" className="rounded-full p-2 text-mute hover:bg-accent-soft disabled:opacity-40"><ChevronLeft size={22} /></button>
          <button type="button" onClick={() => shift(1)} disabled={!date} aria-label="하루 뒤" className="rounded-full p-2 text-mute hover:bg-accent-soft disabled:opacity-40"><ChevronRight size={22} /></button>
          {date && <DayPicker date={date} tz={tz} onPick={setDate} />}
        </div>
      </header>

      <PendingBanner onFlushed={() => setReloadKey((k) => k + 1)} />

      <section className="space-y-2 px-4">
        {loading ? <p role="status" className="py-8 text-center text-[12px] text-mute">불러오는 중…</p> :
          loadError ? (
            <div role="alert" className="flex items-center justify-between gap-2 rounded-xl bg-warn-soft p-3 text-[12px] text-warn">
              <span>{loadError}</span>
              <button type="button" onClick={() => setReloadKey((k) => k + 1)} className="shrink-0 font-semibold underline">다시 시도</button>
            </div>
          ) :
          entries.length === 0 ? <EmptyState icon={Mic} title="아직 기록이 없어요" hint="아래에서 말로 적어 보세요" /> :
          entries.map((e) => <Link key={e.id} href={`/entries/${e.id}`} className="block"><EntryCard entry={e} tz={tz} /></Link>)}
      </section>

      <InputBar onOpenInput={() => setInputOpen(true)} onOpenForm={() => router.push('/entries/new')} />
      <InputSheet key={inputKey} open={inputOpen} onOpenChange={setInputOpen} tz={tz} foods={foods}
        onParsed={(result, raw) => setSheet({ result, raw })} />
      {sheet && <ConfirmSheet result={sheet.result} raw={sheet.raw} tz={tz}
        onSaved={(remaining) => {
          setReloadKey((k) => k + 1)
          listFoods(createClient()).then(setFoods).catch(() => {})
          if (remaining === 0) { setSheet(null); setInputKey((k) => k + 1) }
        }}
        onClose={() => setSheet(null)} />}
    </main>
  )
}

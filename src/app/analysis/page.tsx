'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getProfile, suspectRanking, suspectDetail, type RankingRow, type DetailRow } from '@/lib/db'
import { RankingTable, GRP_LABEL } from '@/components/RankingTable'
import { toLocalDateStr, dayRange } from '@/lib/time'

const TARGETS = [['diarrhea', '설사'], ['urgency', '급박 배변'], ['pain', '복통'], ['bloating', '팽만']] as const
const WINDOWS = [2, 4, 8, 24] as const

export default function AnalysisPage() {
  const [tz, setTz] = useState('Asia/Seoul')
  const [days, setDays] = useState(30)
  const [windowHours, setWindowHours] = useState<(typeof WINDOWS)[number]>(8)
  const [target, setTarget] = useState<(typeof TARGETS)[number][0]>('diarrhea')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [picked, setPicked] = useState<RankingRow | null>(null)
  const [detail, setDetail] = useState<DetailRow[]>([])
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const tokenRef = useRef(0) // 상세 조회 경쟁 가드: 마지막으로 요청한 것만 화면에 반영한다
  const loadKey = `${tz}|${days}|${windowHours}|${target}`
  const loading = loadedKey !== loadKey

  function range() {
    const today = toLocalDateStr(new Date(), tz)
    const start = new Date(`${today}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - (days - 1))
    return { from: dayRange(start.toISOString().slice(0, 10), tz).from, to: dayRange(today, tz).to }
  }

  useEffect(() => { getProfile(createClient()).then((p) => setTz(p.timezone)).catch(() => {}) }, [])
  useEffect(() => {
    const sb = createClient()
    let alive = true
    tokenRef.current += 1 // 이전 조건으로 날아간 상세 응답이 새 순위표에 얹히지 않게 무효화
    suspectRanking(sb, { ...range(), windowHours, target })
      .then((rs) => { if (alive) { setRows(rs); setPicked(null); setLoadError(null) } })
      .catch(() => { if (alive) { setRows([]); setPicked(null); setLoadError('순위표를 불러오지 못했습니다.') } })
      .finally(() => { if (alive) setLoadedKey(loadKey) })
    return () => { alive = false }
  }, [tz, days, windowHours, target]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(r: RankingRow) {
    setPicked(r); setDetail([]); setDetailError(null)
    const t = ++tokenRef.current
    try {
      const d = await suspectDetail(createClient(), { ...range(), windowHours, target, grp: r.grp, candidate: r.candidate })
      if (t === tokenRef.current) setDetail(d)
    } catch {
      if (t === tokenRef.current) setDetailError('상세를 불러오지 못했습니다.')
    }
  }
  const fmt = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: tz, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))

  return (
    <main className="mx-auto max-w-md p-4">
      <Link href="/" className="text-sm text-neutral-600">← 타임라인</Link>
      <h1 className="my-2 text-lg font-bold">용의자 순위표</h1>
      <div className="mb-2 flex flex-wrap gap-2 text-sm">
        <select value={target} onChange={(e) => setTarget(e.target.value as typeof target)} className="rounded border p-1">
          {TARGETS.map(([v, l]) => <option key={v} value={v}>표적: {l}</option>)}
        </select>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded border p-1">
          {[14, 30, 60, 90].map((d) => <option key={d} value={d}>최근 {d}일</option>)}
        </select>
      </div>
      <div className="mb-3 flex gap-1">
        {WINDOWS.map((w) => (
          <button key={w} onClick={() => setWindowHours(w)} className={`flex-1 rounded-lg border p-1 text-sm ${w === windowHours ? 'bg-black text-white' : ''}`}>{w}h</button>
        ))}
      </div>
      <p className="mb-2 text-xs text-neutral-500">연관은 가설입니다. 확인은 한 가지씩 3일 재도입으로.</p>
      {loading ? <p className="text-neutral-500">계산 중…</p> :
        loadError ? <p role="alert" className="text-red-600">{loadError}</p> :
        rows.length === 0 ? <p className="text-neutral-500">기간 안에 기록이 없습니다.</p> :
        <RankingTable rows={rows} onPick={pick} />}
      {picked && !loading && (
        <section className="mt-4 rounded-xl border bg-white p-3 text-sm">
          <h2 className="font-semibold">{GRP_LABEL[picked.grp]} · {picked.candidate}</h2>
          {detailError && <p role="alert" className="mt-2 text-red-600">{detailError}</p>}
          <ul className="mt-2 space-y-1">
            {detail.map((d) => (
              <li key={d.exposure_id} className="flex justify-between">
                <span>{fmt(d.exposure_at)}</span>
                <span className={d.hit ? 'text-red-700' : 'text-neutral-400'}>{d.hit && d.target_at ? `→ ${fmt(d.target_at)} 발생` : '없음'}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

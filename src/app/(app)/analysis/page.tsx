'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, suspectRanking, suspectDetail, type RankingRow, type DetailRow } from '@/lib/db'
import { RankingBars, rowKey } from '@/components/RankingTable'
import { baselineOf } from '@/lib/baseline'
import { toLocalDateStr, dayRange } from '@/lib/time'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3 } from 'lucide-react'

const TARGETS = [['diarrhea', '설사'], ['urgency', '급박 배변'], ['pain', '복통'], ['bloating', '팽만']] as const
const WINDOWS = [2, 4, 8, 24] as const
const DAYS = [14, 30, 60, 90] as const

export default function AnalysisPage() {
  const [tz, setTz] = useState('Asia/Seoul')
  const [days, setDays] = useState<(typeof DAYS)[number]>(30)
  const [windowHours, setWindowHours] = useState<(typeof WINDOWS)[number]>(8)
  const [target, setTarget] = useState<(typeof TARGETS)[number][0]>('diarrhea')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [pickedKey, setPickedKey] = useState<string | null>(null)
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
      .then((rs) => { if (alive) { setRows(rs); setPickedKey(null); setLoadError(null) } })
      .catch(() => { if (alive) { setRows([]); setPickedKey(null); setLoadError('순위표를 불러오지 못했습니다.') } })
      .finally(() => { if (alive) setLoadedKey(loadKey) })
    return () => { alive = false }
  }, [tz, days, windowHours, target]) // eslint-disable-line react-hooks/exhaustive-deps

  async function pick(r: RankingRow) {
    const key = rowKey(r)
    if (pickedKey === key) { setPickedKey(null); return }
    setPickedKey(key); setDetail([]); setDetailError(null)
    const t = ++tokenRef.current
    try {
      const d = await suspectDetail(createClient(), { ...range(), windowHours, target, grp: r.grp, candidate: r.candidate })
      if (t === tokenRef.current) setDetail(d)
    } catch {
      if (t === tokenRef.current) setDetailError('상세를 불러오지 못했습니다.')
    }
  }

  const targetLabel = TARGETS.find(([v]) => v === target)![1]
  const mealBase = rows.find((r) => ['ingredient', 'food', 'pattern'].includes(r.grp))
  const basePct = mealBase ? baselineOf(mealBase) : null
  const allShort = rows.length > 0 && rows.every((r) => !r.enough)
  const pill = 'h-8 rounded-full border-line bg-card px-3 text-[12px] text-mute'

  return (
    <main>
      <PageHeader title="용의자 순위" subtitle={`${targetLabel} · 최근 ${days}일 · ${windowHours}시간 창`} />
      <div className="flex gap-1.5 px-4 pb-3">
        <Select value={target} onValueChange={(v) => setTarget(v as typeof target)}>
          <SelectTrigger className={pill}><SelectValue /></SelectTrigger>
          <SelectContent className="shadow-none">{TARGETS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v) as typeof days)}>
          <SelectTrigger className={pill}><SelectValue /></SelectTrigger>
          <SelectContent className="shadow-none">{DAYS.map((d) => <SelectItem key={d} value={String(d)}>최근 {d}일</SelectItem>)}</SelectContent>
        </Select>
        <Select value={String(windowHours)} onValueChange={(v) => setWindowHours(Number(v) as typeof windowHours)}>
          <SelectTrigger className={pill}><SelectValue /></SelectTrigger>
          <SelectContent className="shadow-none">{WINDOWS.map((w) => <SelectItem key={w} value={String(w)}>{w}시간 창</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="px-4">
        {loading ? <p className="py-8 text-center text-[12px] text-mute">계산 중…</p> :
          loadError ? <p role="alert" className="rounded-xl bg-warn-soft p-3 text-[12px] text-warn">{loadError}</p> :
          rows.length === 0 ? <EmptyState icon={BarChart3} title="기간 안에 기록이 없어요" hint="기록이 쌓이면 여기에 순위가 나옵니다" /> : (
          <>
            <p className="mb-1 flex items-center gap-3 text-[12px] text-mute">
              <span><i className="mr-1 inline-block h-2 w-3 rounded-sm bg-warn align-middle" />먹은 뒤 {targetLabel} 비율</span>
              {basePct != null && <span><i className="mr-1 inline-block h-2.5 w-0.5 bg-ink align-middle" />평소 비율 {Math.round(basePct * 100)}%</span>}
            </p>
            {allShort && <p className="mb-2 rounded-xl bg-accent-soft p-2.5 text-[12px] text-ink">노출이 3번 이상 쌓이면 배수가 나옵니다.</p>}
            <RankingBars rows={rows} pickedKey={pickedKey} onPick={pick} detail={detail} detailError={detailError} tz={tz} />
          </>)}
        <p className="mt-4 text-[12px] text-mute">연관은 가설입니다. 확인은 한 가지씩 3일 재도입으로.</p>
      </div>
    </main>
  )
}

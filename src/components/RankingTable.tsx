'use client'
import type { RankingRow, DetailRow } from '@/lib/db'
import { isWatched } from '@/lib/watch-ingredients'
import { baselineOf, ratioTone } from '@/lib/baseline'
import { cn } from '@/lib/utils'

export const GRP_LABEL: Record<string, string> = {
  ingredient: '재료', food: '음식', pattern: '식사 패턴', sleep: '수면', stress: '스트레스', exercise: '운동', medication: '약',
}
const DAY_GROUPS = ['sleep', 'stress', 'exercise', 'medication']

export function formatRatio(r: RankingRow): string {
  if (!r.enough) return '자료 부족'
  if (r.ratio == null) return '비교 불가'
  return `${r.ratio.toFixed(1)}배`
}

export function rowKey(r: RankingRow): string { return `${r.grp}:${r.candidate}` }

export function RankingBars({ rows, pickedKey, onPick, onRetry, detail, detailError, tz }:
  { rows: RankingRow[]; pickedKey: string | null; onPick: (r: RankingRow) => void; onRetry: (r: RankingRow) => void; detail: DetailRow[]; detailError: string | null; tz: string }) {
  const fmt = (iso: string) => new Intl.DateTimeFormat('ko-KR', { timeZone: tz, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso))
  return (
    <ul className="divide-y divide-line">
      {rows.map((r, i) => {
        const pct = r.exposed_n ? (r.exposed_hits / r.exposed_n) * 100 : 0
        const base = baselineOf(r)
        const tone = ratioTone(r)
        const bar = tone === 'warn' ? 'bg-warn' : tone === 'accent' ? 'bg-accent' : 'bg-mute'
        const num = tone === 'warn' ? 'text-warn' : tone === 'accent' ? 'text-accent' : 'text-mute'
        const isDay = DAY_GROUPS.includes(r.grp)
        const open = pickedKey === rowKey(r)
        const plain = !r.enough || r.ratio == null // 숫자가 아닌 배수 칸(자료 부족·비교 불가)은 작게
        const detailId = `detail-${i}` // 후보 이름에 콜론·한글이 섞여 선택자로 안전하지 않으므로 자리 번호로 만든다
        return (
          <li key={rowKey(r)}>
            <button type="button" onClick={() => onPick(r)} data-testid="ranking-row" aria-expanded={open}
              aria-controls={open ? detailId : undefined}
              className={cn('grid w-full grid-cols-[84px_1fr_52px] items-center gap-2 py-2.5 text-left', !r.enough && 'text-mute')}>
              <div className="text-right">
                <p title={r.candidate} className="truncate text-[12px] font-semibold">{r.candidate}{r.grp === 'ingredient' && isWatched(r.candidate) && <span className="ml-1 rounded-full bg-warn-soft px-1 text-[12px] text-warn">감시</span>}</p>
                <p className="text-[12px] text-mute">{GRP_LABEL[r.grp] ?? r.grp} · {r.exposed_n}{isDay ? '일' : '번'}{isDay && <span className="ml-1 rounded-full bg-line px-1 text-ink">날 기준</span>}</p>
              </div>
              <div className="relative h-4 rounded bg-line">
                <div className={cn('absolute inset-y-0 left-0 rounded', bar)} style={{ width: `${pct}%` }} />
                {base != null && <div className="absolute -inset-y-0.5 w-0.5 bg-ink" style={{ left: `${base * 100}%` }} aria-hidden />}
              </div>
              <p className={cn('text-right text-[14px] font-bold whitespace-nowrap tabular-nums', num, plain && 'text-[12px] font-normal')}>{formatRatio(r)}</p>
            </button>
            {open && (
              <div id={detailId} className="mb-2 rounded-xl bg-card p-3 text-[12px]">
                <p className="mb-1.5 font-semibold">{r.candidate}</p>
                {detailError && (
                  <div className="flex flex-wrap items-center gap-2">
                    <p role="alert" className="text-warn">{detailError}</p>
                    <button type="button" onClick={() => onRetry(r)} className="rounded-xl border border-warn px-2 py-0.5 font-semibold text-warn">다시 시도</button>
                  </div>
                )}
                {!detailError && detail.length === 0 && <p role="status" className="text-mute">불러오는 중…</p>}
                <ul className="space-y-1">
                  {detail.map((d) => (
                    <li key={d.exposure_id} className="flex justify-between">
                      <span>{fmt(d.exposure_at)}</span>
                      <span className={d.hit ? 'text-warn' : 'text-mute'}>{d.hit && d.target_at ? `→ ${fmt(d.target_at)} 발생` : '없음'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

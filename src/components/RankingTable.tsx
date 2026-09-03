import type { RankingRow } from '@/lib/db'
import { isWatched } from '@/lib/watch-ingredients'

export const GRP_LABEL: Record<string, string> = {
  ingredient: '재료', food: '음식', pattern: '식사 패턴', sleep: '수면', stress: '스트레스', exercise: '운동', medication: '약',
}

export function formatRatio(r: RankingRow): string {
  if (!r.enough) return '자료 부족'
  if (r.ratio == null) return '비교 불가'
  return `${r.ratio.toFixed(1)}배`
}

export function RankingTable({ rows, onPick }: { rows: RankingRow[]; onPick: (r: RankingRow) => void }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-neutral-500"><tr><th className="text-left">용의자</th><th>먹은 뒤</th><th>안 먹은 뒤</th><th>배수</th></tr></thead>
      <tbody>
        {rows.map((r) => {
          const pct = r.exposed_n ? Math.round((r.exposed_hits / r.exposed_n) * 100) : 0
          return (
            <tr key={`${r.grp}:${r.candidate}`} onClick={() => onPick(r)} className={`cursor-pointer border-t ${r.enough ? '' : 'opacity-40'}`} data-testid="ranking-row">
              <td className="py-2">
                <span className="text-xs text-neutral-500">{GRP_LABEL[r.grp] ?? r.grp} · </span>{r.candidate}
                {r.grp === 'ingredient' && isWatched(r.candidate) && <span className="ml-1 rounded-full border border-amber-500 px-1 text-[10px] text-amber-800">감시</span>}
              </td>
              <td className="text-center">{r.exposed_hits}/{r.exposed_n}
                <div className="mx-auto mt-1 h-1.5 w-16 rounded bg-neutral-200"><div className="h-1.5 rounded bg-red-500" style={{ width: `${pct}%` }} /></div>
              </td>
              <td className="text-center">{r.control_hits}/{r.control_n}</td>
              <td className="text-center font-semibold">{formatRatio(r)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

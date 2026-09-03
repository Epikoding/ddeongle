'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveEntries, type RawInput } from '@/lib/db'
import { enqueue, dequeue, newId, type PendingItem } from '@/lib/queue'
import { isFuture } from '@/lib/time'
import type { PasteResult } from '@/lib/parse-paste'
import { entrySchema, type Entry } from '@/lib/schemas'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { EntryCard } from './EntryCard'
import { EntryEditor } from './EntryForm'

type Ok = Extract<PasteResult, { ok: true }>

export function ConfirmSheet({ result, raw, tz, onSaved, onClose }:
  { result: Ok; raw: RawInput; tz: string; onSaved: (remaining: number) => void; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>(result.entries)
  const [editing, setEditing] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [queuedId, setQueuedId] = useState<string | null>(null)
  // 저장 직전 재검사에서 걸린 항목 — 인덱스별 사유. 고칠 때까지 저장에서 뺀다
  const [problems, setProblems] = useState<Record<number, string>>({})
  // 이 회차의 client_id. 저장에 성공하고도 남은 항목이 있으면 새 값으로 돌린다 —
  // 같은 id로 다시 보내면 서버가 "이미 받은 회차"로 보고 조기 반환해 고친 항목이 조용히 사라진다
  const [clientId, setClientId] = useState<string | undefined>(raw.client_id)

  const blocked = entries.filter((e, i) => e.time_precision === 'unknown' || problems[i] !== undefined).length
  // 미래 시각 판정 기준은 렌더 시점이 아니라 프롬프트에 넣은 기준 시각이다 (명세 §4.2)
  const reference = new Date(raw.reference_at)

  async function save() {
    // 붙여넣기 뒤 편집으로 모양이 깨졌을 수 있다 — 보내기 직전에 다시 검사한다
    const failed: Record<number, string> = {}
    const ready: Entry[] = []
    entries.forEach((e, i) => {
      if (e.time_precision === 'unknown') return
      const r = entrySchema.safeParse(e)
      if (r.success) ready.push(e)
      else failed[i] = r.error.issues.map((x) => `${x.path.join('.') || '항목'}: ${x.message}`).join(' / ')
    })
    setProblems(failed)
    if (ready.length === 0) {
      setMsg('저장할 수 있는 항목이 없습니다. 표시된 항목을 고쳐 주세요.')
      return
    }
    setBusy(true)
    const payload: RawInput = { ...raw, client_id: clientId }
    try {
      await saveEntries(createClient(), payload, ready)
      if (queuedId) { dequeue(queuedId); setQueuedId(null) } // 재시도로 성공 — 큐에 남기면 두 번 들어간다
      // 저장 못 한 항목(시각 미정·모양 오류)은 지우지 않고 시트에 남긴다 (명세 §4.2 "고치기 전까지 제외")
      const rest = entries.map((e, i) => ({ e, i })).filter(({ e, i }) => e.time_precision === 'unknown' || failed[i] !== undefined)
      const restProblems: Record<number, string> = {}
      rest.forEach((x, ni) => { if (failed[x.i] !== undefined) restProblems[ni] = failed[x.i] })
      setEntries(rest.map((x) => x.e))
      setProblems(restProblems)
      setEditing(null)
      setMsg(rest.length > 0 ? `${ready.length}건 저장했습니다. 남은 ${rest.length}건은 시각을 정한 뒤 저장하세요.` : null)
      if (rest.length > 0 && clientId) setClientId(newId()) // 남은 항목은 새 회차로 보낸다
      onSaved(rest.length)
    } catch (err) {
      const kept = `저장하지 못해 폰에 보관했습니다. 다음에 열 때 다시 보냅니다. (${(err as Error).message})`
      // 이미 보관해 둔 회차가 있어도 편집분이 반영되도록 새로 넣고 옛것을 뺀다(넣기 실패 시 옛것을 잃지 않게 순서를 지킨다)
      let queued: PendingItem | null = null
      // 실패한 회차의 client_id는 그대로 둔다 — 서버에 들어갔을 수도 있어서, 같은 id여야 두 번 들어가지 않는다
      try { queued = enqueue({ raw: payload, entries: ready }) } catch { queued = null }
      if (queued) {
        if (queuedId) dequeue(queuedId)
        setQueuedId(queued.id); setMsg(kept)
      } else if (queuedId) {
        setMsg(kept) // 새로 보관하지 못했지만 앞서 보관해 둔 회차가 남아 있다
      } else {
        setMsg(`저장도 보관도 못 했습니다. 이 창을 닫지 말고 잠시 후 다시 저장을 눌러 주세요. (${(err as Error).message})`)
      }
    } finally { setBusy(false) }
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="bottom" className="mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[22px] border-line bg-card p-0" data-testid="confirm-sheet">
        <SheetHeader className="px-4 pt-3 pb-2"><SheetTitle className="text-[20px] font-bold">확인 후 저장</SheetTitle></SheetHeader>
        <div className="flex-1 space-y-2 overflow-y-auto px-4 pb-2">
          {result.questions.length > 0 && (
            <div className="rounded-xl bg-accent-soft p-3 text-[14px] text-ink">{result.questions.map((q) => <div key={q}>{q}</div>)}</div>
          )}
          {result.invalid.length > 0 && (
            <div className="rounded-xl bg-warn-soft p-3 text-[14px] text-warn">
              항목 {result.invalid.length}개는 모양이 틀려 뺐습니다: {result.invalid.map((i) => i.reason).join(' / ')}
            </div>
          )}
          {entries.map((e, i) => (
            <div key={i}>
              <EntryCard entry={e} tz={tz} onClick={() => setEditing(editing === i ? null : i)}
                tone={e.time_precision === 'unknown' || problems[i] !== undefined ? 'error' : e.time_precision === 'approx' || isFuture(e.occurred_at, reference) ? 'warn' : 'normal'} />
              {problems[i] !== undefined && <p role="alert" className="mt-1 text-[12px] text-warn">모양이 틀려 저장하지 않았습니다: {problems[i]}</p>}
              {isFuture(e.occurred_at, reference) && <p className="mt-1 text-[12px] text-warn">기준 시각보다 뒤의 시각입니다.</p>}
              {editing === i && (
                <EntryEditor value={e} tz={tz}
                  onChange={(v) => {
                    setEntries(entries.map((x, j) => (j === i ? v : x)))
                    setProblems((p) => { const next = { ...p }; delete next[i]; return next }) // 고쳤으면 사유를 지우고 다음 저장에서 다시 본다
                  }}
                  onRemove={() => { setEntries(entries.filter((_, j) => j !== i)); setProblems({}); setEditing(null) }} />
              )}
            </div>
          ))}
          {msg && <p role="alert" className="rounded-xl bg-warn-soft p-2.5 text-[14px] text-warn">{msg}</p>}
          {showRaw && <pre className="whitespace-pre-wrap rounded-xl bg-bg p-2 text-[12px] text-mute">{raw.text}</pre>}
        </div>
        <div className="border-t border-line bg-card px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Button onClick={save} disabled={busy || entries.length - blocked === 0} className="h-12 w-full rounded-xl text-[16px] font-bold" data-testid="save-entries">
            저장 ({entries.length - blocked}건){blocked ? ` · ${blocked}건 보류` : ''}
          </Button>
          <button type="button" onClick={() => setShowRaw(!showRaw)} className="mt-2 w-full py-1 text-[14px] text-mute underline">원문 보기</button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

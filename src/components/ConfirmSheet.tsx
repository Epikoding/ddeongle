'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { saveEntries, type RawInput } from '@/lib/db'
import { enqueue } from '@/lib/queue'
import { isFuture } from '@/lib/time'
import type { PasteResult } from '@/lib/parse-paste'
import type { Entry } from '@/lib/schemas'
import { EntryCard } from './EntryCard'
import { EntryEditor } from './EntryForm'

type Ok = Extract<PasteResult, { ok: true }>

export function ConfirmSheet({ result, raw, tz, onSaved, onClose }:
  { result: Ok; raw: RawInput; tz: string; onSaved: () => void; onClose: () => void }) {
  const [entries, setEntries] = useState<Entry[]>(result.entries)
  const [editing, setEditing] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  const blocked = entries.filter((e) => e.time_precision === 'unknown').length
  const now = new Date()

  async function save() {
    const ready = entries.filter((e) => e.time_precision !== 'unknown')
    if (ready.length === 0) return
    setBusy(true)
    try {
      await saveEntries(createClient(), raw, ready)
      onSaved()
    } catch (err) {
      enqueue({ raw, entries: ready })
      setMsg(`저장하지 못해 폰에 보관했습니다. 다음에 열 때 다시 보냅니다. (${(err as Error).message})`)
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={onClose}>
      <div className="mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()} data-testid="confirm-sheet">
        <h2 className="mb-2 text-lg font-bold">확인 후 저장</h2>
        {result.questions.length > 0 && (
          <div className="mb-2 rounded-lg border border-amber-500 bg-amber-50 p-2 text-sm">{result.questions.map((q) => <div key={q}>{q}</div>)}</div>
        )}
        {result.invalid.length > 0 && (
          <div className="mb-2 rounded-lg border border-red-500 bg-red-50 p-2 text-sm">
            항목 {result.invalid.length}개는 모양이 틀려 뺐습니다: {result.invalid.map((i) => i.reason).join(' / ')}
          </div>
        )}
        <div className="space-y-2">
          {entries.map((e, i) => (
            <div key={i}>
              <EntryCard entry={e} tz={tz} onClick={() => setEditing(editing === i ? null : i)}
                tone={e.time_precision === 'unknown' ? 'error' : e.time_precision === 'approx' || isFuture(e.occurred_at, now) ? 'warn' : 'normal'} />
              {isFuture(e.occurred_at, now) && <p className="text-xs text-amber-700">지금보다 뒤의 시각입니다.</p>}
              {editing === i && (
                <EntryEditor value={e} tz={tz} onChange={(v) => setEntries(entries.map((x, j) => (j === i ? v : x)))}
                  onRemove={() => { setEntries(entries.filter((_, j) => j !== i)); setEditing(null) }} />
              )}
            </div>
          ))}
        </div>
        {msg && <p role="alert" className="mt-2 rounded-lg bg-amber-50 p-2 text-sm">{msg}</p>}
        <button onClick={save} disabled={busy || entries.length - blocked === 0}
          className="mt-3 w-full rounded-xl bg-black p-3 font-semibold text-white disabled:opacity-40" data-testid="save-entries">
          저장 ({entries.length - blocked}건){blocked ? ` · ${blocked}건 보류` : ''}
        </button>
        <button onClick={() => setShowRaw(!showRaw)} className="mt-2 w-full rounded-xl border p-2 text-sm">원문 보기</button>
        {showRaw && <pre className="mt-2 whitespace-pre-wrap rounded bg-neutral-100 p-2 text-xs">{raw.text}</pre>}
      </div>
    </div>
  )
}

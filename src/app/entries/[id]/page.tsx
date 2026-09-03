'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProfile, getEntry, getRawInput, updateEntry, deleteEntry, type EntryRow } from '@/lib/db'
import { entrySchema } from '@/lib/schemas'
import { EntryEditor } from '@/components/EntryForm'

export default function EntryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tz, setTz] = useState('Asia/Seoul')
  const [entry, setEntry] = useState<EntryRow | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    getProfile(sb).then((p) => setTz(p.timezone))
    getEntry(sb, id).then(async (e) => {
      setEntry(e)
      if (e?.raw_input_id) setRaw((await getRawInput(sb, e.raw_input_id))?.text ?? null)
    })
  }, [id])

  async function save() {
    if (!entry) return
    const r = entrySchema.safeParse(entry)
    if (!r.success) { setErr(r.error.issues.map((i) => i.message).join('; ')); return }
    await updateEntry(createClient(), id, { occurred_at: r.data.occurred_at, time_precision: r.data.time_precision, data: r.data.data })
    router.push('/')
  }
  async function remove() {
    if (!confirm('이 기록을 지울까요?')) return
    await deleteEntry(createClient(), id); router.push('/')
  }

  if (!entry) return <main className="p-4 text-neutral-500">불러오는 중…</main>
  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-lg font-bold">기록 수정</h1>
      <EntryEditor value={entry} tz={tz} onChange={(v) => setEntry({ ...entry, ...v } as EntryRow)} />
      {raw && <details className="mt-2 text-sm"><summary>원문 보기</summary><pre className="whitespace-pre-wrap rounded bg-neutral-100 p-2 text-xs">{raw}</pre></details>}
      {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
      <button onClick={save} className="mt-3 w-full rounded-xl bg-black p-3 font-semibold text-white">저장</button>
      <button onClick={remove} className="mt-2 w-full rounded-xl border border-red-600 p-2 text-sm text-red-700">삭제</button>
    </main>
  )
}

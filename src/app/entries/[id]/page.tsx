'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProfile, getEntry, getRawInput, updateEntry, deleteEntry, type EntryRow } from '@/lib/db'
import { entrySchema } from '@/lib/schemas'
import { EntryEditor } from '@/components/EntryForm'

function reason(e: unknown): string {
  const m = (e as Error).message
  return m === 'not_found' ? '기록을 찾지 못했습니다. 이미 지워졌을 수 있습니다.' : m
}

export default function EntryPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tz, setTz] = useState('Asia/Seoul')
  const [status, setStatus] = useState<'loading' | 'missing' | 'error' | 'ready'>('loading')
  const [entry, setEntry] = useState<EntryRow | null>(null)
  const [raw, setRaw] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const sb = createClient()
    getProfile(sb).then((p) => setTz(p.timezone)).catch(() => {})
    getEntry(sb, id).then(async (e) => {
      if (!e) { setStatus('missing'); return }
      setEntry(e)
      setStatus('ready')
      if (e.raw_input_id) {
        try { setRaw((await getRawInput(sb, e.raw_input_id))?.text ?? null) } catch { /* 원문은 못 읽어도 수정은 계속 */ }
      }
    }).catch((e) => { setErr(reason(e)); setStatus('error') })
  }, [id])

  async function save() {
    if (!entry) return
    const r = entrySchema.safeParse(entry)
    if (!r.success) { setErr(r.error.issues.map((i) => i.message).join('; ')); return }
    try {
      await updateEntry(createClient(), id, { occurred_at: r.data.occurred_at, time_precision: r.data.time_precision, data: r.data.data })
      router.push('/')
    } catch (e) { setErr(reason(e)) }
  }
  async function remove() {
    if (!confirm('이 기록을 지울까요?')) return
    try { await deleteEntry(createClient(), id); router.push('/') }
    catch (e) { setErr(reason(e)) }
  }

  if (status === 'loading') return <main className="p-4 text-neutral-500">불러오는 중…</main>
  if (status !== 'ready' || !entry) return (
    <main className="mx-auto max-w-md p-4">
      <p role="alert" className="text-sm text-red-700">
        {status === 'missing' ? '기록을 찾지 못했습니다.' : `불러오지 못했습니다.${err ? ` (${err})` : ''}`}
      </p>
      <Link href="/" className="mt-3 inline-block underline">← 타임라인</Link>
    </main>
  )
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

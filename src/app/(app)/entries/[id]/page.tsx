'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, getEntry, getRawInput, updateEntry, deleteEntry, type EntryRow } from '@/lib/db'
import { entrySchema, KIND_LABEL } from '@/lib/schemas'
import { EntryEditor } from '@/components/EntryForm'
import { KindIcon } from '@/components/ui/KindIcon'
import { Button } from '@/components/ui/button'

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

  if (status === 'loading') return <main className="px-4 pt-4 text-mute">불러오는 중…</main>
  if (status !== 'ready' || !entry) return (
    <main className="px-4 pt-4">
      <p role="alert" className="text-[14px] text-warn">
        {status === 'missing' ? '기록을 찾지 못했습니다.' : `불러오지 못했습니다.${err ? ` (${err})` : ''}`}
      </p>
      <Link href="/" className="mt-3 inline-block text-[14px] text-accent underline">← 타임라인</Link>
    </main>
  )
  return (
    <main className="pb-6">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <button type="button" onClick={() => router.back()} aria-label="뒤로" className="rounded-full p-2 text-mute"><ChevronLeft size={22} /></button>
        <span className="flex items-center gap-2 text-[20px] font-bold"><KindIcon kind={entry.kind} size={24} />{KIND_LABEL[entry.kind]} 수정</span>
      </header>
      <div className="px-4">
        <EntryEditor value={entry} tz={tz} onChange={(v) => setEntry({ ...entry, ...v } as EntryRow)} />
        {raw && <details className="mt-3 text-[12px] text-mute"><summary>원문 보기</summary><pre className="mt-1 whitespace-pre-wrap rounded-xl bg-card p-2 text-[12px]">{raw}</pre></details>}
        {err && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[14px] text-warn">{err}</p>}
        <Button onClick={save} className="mt-4 h-12 w-full rounded-xl text-[16px] font-bold">저장</Button>
        <button type="button" onClick={remove} className="mt-2 w-full rounded-xl border border-warn/60 py-2.5 text-[14px] text-warn">삭제</button>
      </div>
    </main>
  )
}

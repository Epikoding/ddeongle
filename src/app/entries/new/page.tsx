'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getProfile, saveEntries } from '@/lib/db'
import { entrySchema, type Entry, type Kind } from '@/lib/schemas'
import { KindPicker, blankEntry, EntryEditor } from '@/components/EntryForm'

export default function NewEntryPage() {
  const router = useRouter()
  const [tz, setTz] = useState('Asia/Seoul')
  const [entry, setEntry] = useState<Entry | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { getProfile(createClient()).then((p) => setTz(p.timezone)).catch(() => {}) }, [])

  async function save() {
    if (!entry) return
    const r = entrySchema.safeParse(entry)
    if (!r.success) { setErr(r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')); return }
    try { await saveEntries(createClient(), null, [r.data]); router.push('/') }
    catch (e) { setErr((e as Error).message) }
  }

  return (
    <main className="mx-auto max-w-md p-4">
      <h1 className="mb-3 text-lg font-bold">새 기록</h1>
      {!entry ? <KindPicker onPick={(k: Kind) => setEntry(blankEntry(k, new Date().toISOString()))} /> : (
        <>
          <EntryEditor value={entry} tz={tz} onChange={setEntry} />
          {err && <p role="alert" className="mt-2 text-sm text-red-700">{err}</p>}
          <button onClick={save} className="mt-3 w-full rounded-xl bg-black p-3 font-semibold text-white" data-testid="form-save">저장</button>
          <button onClick={() => setEntry(null)} className="mt-2 w-full rounded-xl border p-2 text-sm">종류 다시 고르기</button>
        </>
      )}
    </main>
  )
}

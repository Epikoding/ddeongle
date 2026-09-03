'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getProfile, saveEntries } from '@/lib/db'
import { entrySchema, KIND_LABEL, type Entry, type Kind } from '@/lib/schemas'
import { KindPicker, blankEntry, EntryEditor } from '@/components/EntryForm'
import { KindIcon } from '@/components/ui/KindIcon'
import { Button } from '@/components/ui/button'

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
    <main className="pb-6">
      <header className="flex items-center gap-1 px-2 pt-3 pb-2">
        <button type="button" onClick={() => (entry ? setEntry(null) : router.back())} aria-label={entry ? '종류 다시 고르기' : '뒤로'} className="rounded-full p-2 text-mute"><ChevronLeft size={22} /></button>
        {entry ? <h1 className="flex items-center gap-2 text-[20px] font-bold"><KindIcon kind={entry.kind} size={24} />{KIND_LABEL[entry.kind]}</h1> : <h1 className="text-[20px] font-bold">무엇을 적을까요?</h1>}
      </header>
      {!entry ? <KindPicker onPick={(k: Kind) => setEntry(blankEntry(k, new Date().toISOString()))} /> : (
        <div className="px-4">
          <EntryEditor value={entry} tz={tz} onChange={setEntry} />
          {err && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[14px] text-warn">{err}</p>}
          <Button onClick={save} className="mt-4 h-12 w-full rounded-xl text-[16px] font-bold" data-testid="form-save">저장</Button>
        </div>
      )}
    </main>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { buildPrompt, type FoodHint } from '@/lib/prompt'
import { parsePaste, type PasteResult } from '@/lib/parse-paste'
import type { RawInput } from '@/lib/db'
import { newId } from '@/lib/queue'

export function InputBar({ tz, foods, onParsed }:
  { tz: string; foods: FoodHint[]; onParsed: (result: Extract<PasteResult, { ok: true }>, raw: RawInput) => void }) {
  const [text, setText] = useState('')
  const [referenceAt, setReferenceAt] = useState<Date | null>(null)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'no' | 'yes' | 'manual'>('no')
  const [promptText, setPromptText] = useState('')

  async function copyPrompt() {
    if (!text.trim()) return
    const now = new Date()
    const p = buildPrompt({ text, referenceAt: now, tz, foods })
    setReferenceAt(now); setPromptText(p)
    try { await navigator.clipboard.writeText(p); setCopied('yes') } catch { setCopied('manual') }
  }

  function submitPaste() {
    const r = parsePaste(paste)
    if (!r.ok) { setError(r.message); return }
    setError(null)
    // client_id는 이 회차의 이름표 — 큐에 보관됐다가 다시 보내도 같은 값이라 서버가 두 번 받지 않는다
    onParsed(r, { text, source: 'voice', reference_at: (referenceAt ?? new Date()).toISOString(), pasted_json: JSON.parse(paste.slice(paste.indexOf('{'), paste.lastIndexOf('}') + 1)), client_id: newId() })
    setPaste('')
  }

  return (
    <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md space-y-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <textarea value={text} onChange={(e) => { setText(e.target.value); setReferenceAt(null); setCopied('no') }} rows={2}
        placeholder="키보드 마이크로 말하세요. 예: 아까 12시에 김치찌개 먹었고 지금 배가 좀 아파"
        className="w-full rounded-lg border p-2" data-testid="input-text" />
      <div className="flex gap-2">
        <button onClick={copyPrompt} disabled={!text.trim()} className="flex-1 rounded-lg bg-black p-2 text-sm font-semibold text-white disabled:opacity-40" data-testid="copy-prompt">
          {copied === 'yes' ? '복사됨 ✓ 자기 LLM에 붙여넣기' : '프롬프트 복사'}
        </button>
        <Link href="/entries/new" className="rounded-lg border px-4 py-2 text-sm font-semibold">+ 폼</Link>
      </div>
      {copied === 'manual' && (
        <details open className="rounded-lg border bg-neutral-50 p-2 text-xs"><summary>복사가 막혔습니다. 아래를 길게 눌러 복사하세요.</summary><pre className="whitespace-pre-wrap">{promptText}</pre></details>
      )}
      <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={2}
        placeholder="LLM 답변(JSON)을 여기에 붙여넣기" className="w-full rounded-lg border p-2 font-mono text-xs" data-testid="paste-text" />
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      <button onClick={submitPaste} disabled={!paste.trim()} className="w-full rounded-lg border border-black p-2 text-sm font-semibold disabled:opacity-40" data-testid="submit-paste">
        확인 시트로
      </button>
    </div>
  )
}

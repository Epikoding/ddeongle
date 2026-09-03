'use client'
import { useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buildPrompt, type FoodHint } from '@/lib/prompt'
import { parsePaste, type PasteResult } from '@/lib/parse-paste'
import type { RawInput } from '@/lib/db'
import { newId } from '@/lib/queue'
import { cn } from '@/lib/utils'

const STEPS = ['1 말하기', '2 프롬프트 복사', '3 결과 붙여넣기'] as const

export function InputSheet({ open, onOpenChange, tz, foods, onParsed }:
  { open: boolean; onOpenChange: (o: boolean) => void; tz: string; foods: FoodHint[]; onParsed: (result: Extract<PasteResult, { ok: true }>, raw: RawInput) => void }) {
  const [text, setText] = useState('')
  const [referenceAt, setReferenceAt] = useState<Date | null>(null)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'no' | 'yes' | 'manual'>('no')
  const [promptText, setPromptText] = useState('')
  const step = copied === 'no' ? 0 : paste.trim() ? 2 : 1

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
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" aria-describedby={undefined}
        onCloseAutoFocus={(e) => { e.preventDefault(); (document.querySelector('[data-testid="open-input"]') as HTMLElement | null)?.focus() }}
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-[22px] border-line bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="px-0 pt-3 pb-2"><SheetTitle className="text-[20px] font-bold">말로 적기</SheetTitle></SheetHeader>
        <ol className="mb-3 grid grid-cols-3 gap-1.5 text-[12px]">
          {STEPS.map((s, i) => <li key={s} className={cn('rounded-xl py-1.5 text-center', i === step ? 'bg-accent-soft font-bold text-accent' : i < step ? 'bg-line text-mute line-through' : 'bg-bg text-mute')}>{s}</li>)}
        </ol>
        <Textarea value={text} onChange={(e) => { setText(e.target.value); setReferenceAt(null); setCopied('no') }} rows={3} autoFocus
          placeholder="키보드 마이크를 누르고 말하세요. 예: 아까 12시에 김치찌개 먹었고 지금 배가 좀 아파"
          className="rounded-xl border-line bg-bg text-[14px]" data-testid="input-text" />
        <Button onClick={copyPrompt} disabled={!text.trim()} className="mt-2 h-11 w-full rounded-xl text-[14px] font-bold" data-testid="copy-prompt">
          {copied === 'yes' ? '복사됨 ✓ 자기 LLM에 붙여넣기' : '프롬프트 복사'}
        </Button>
        {copied === 'manual' && (
          <details open className="mt-2 rounded-xl border border-line bg-bg p-2 text-[12px]"><summary>복사가 막혔습니다. 아래를 길게 눌러 복사하세요.</summary><pre className="whitespace-pre-wrap">{promptText}</pre></details>
        )}
        <div className={cn('mt-3 transition-opacity', copied === 'no' && 'opacity-50')}>
          <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3}
            placeholder="LLM 답변(JSON)을 여기에 붙여넣기" className="rounded-xl border-line bg-bg font-mono text-[12px]" data-testid="paste-text" />
          {error && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[14px] text-warn">{error}</p>}
          <Button variant="outline" onClick={submitPaste} disabled={!paste.trim()} className="mt-2 h-11 w-full rounded-xl border-accent text-[14px] font-bold text-accent" data-testid="submit-paste">
            확인 시트로
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

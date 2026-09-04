'use client'
import { useEffect, useRef, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { buildPrompt, type FoodHint } from '@/lib/prompt'
import { parsePaste, type PasteResult } from '@/lib/parse-paste'
import type { RawInput } from '@/lib/db'
import { newId } from '@/lib/queue'
import { cn } from '@/lib/utils'

const STEPS = ['1 말하기', '2 프롬프트 복사', '3 결과 붙여넣기'] as const

/** 클립보드 API가 없을 때의 대체 복사(http 주소의 iOS Safari 등). 사용자 제스처 안에서만 동작한다.
 *  iOS Safari는 숨은 textarea의 선택을 복사하지 않아(빈 문자열이 실려 감) 화면에 있는 입력 칸을 잠깐 빌린다 —
 *  값을 프롬프트로 바꿔 전체 선택 → execCommand('copy') → 원래 값·선택으로 되돌린다. React 리렌더 전에 끝나 화면엔 안 보인다. */
function legacyCopy(value: string, field: HTMLTextAreaElement | null): boolean {
  const el = field ?? document.createElement('textarea')
  const temp = !field
  if (temp) { el.style.position = 'fixed'; el.style.top = '0'; el.style.left = '0'; el.style.opacity = '0'; document.body.appendChild(el) }
  const prev = el.value, selStart = el.selectionStart, selEnd = el.selectionEnd
  el.value = value
  el.focus({ preventScroll: true })
  el.setSelectionRange(0, value.length)
  let ok = false
  try { ok = document.execCommand('copy') } catch { ok = false }
  el.value = prev
  try { el.setSelectionRange(selStart, selEnd) } catch { /* 무시 */ }
  if (temp) el.remove()
  return ok
}
// 하루 한 번 적는 흐름에 맞춘 안내 — 말해야 할 항목을 한 줄씩. 굳기 기준 낱말은 BristolScale의 7칸과 같다.
const INPUT_PLACEHOLDER = [
  '오늘 있었던 일을 순서대로 말해 주세요. 예:',
  '- 식사: 8시 토스트랑 우유, 12시 김치찌개, 7시 삼겹살에 소주 한 잔',
  '- 배변: 3시쯤 한 번, 물처럼 묽었음(굳기 7), 급했음',
  '  (굳기 기준: 1 딱딱 · 2 울퉁 · 3 금간 · 4 매끈 · 5 무른 · 6 죽 · 7 물)',
  '- 증상: 오후 내내 배가 더부룩, 저녁엔 복통 5 정도',
  '- 수면: 어젯밤 6시간, 자주 깼음',
  '- 스트레스: 마감 때문에 높음',
  '- 운동: 저녁에 30분 걷기',
  '- 약: 아침에 메트포르민',
  '- 월경: 오늘 시작',
  '- 메모: 점심 후에 커피 두 잔',
].join('\n')

export function InputSheet({ open, onOpenChange, tz, foods, onParsed }:
  { open: boolean; onOpenChange: (o: boolean) => void; tz: string; foods: FoodHint[]; onParsed: (result: Extract<PasteResult, { ok: true }>, raw: RawInput) => void }) {
  const [text, setText] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)
  const [referenceAt, setReferenceAt] = useState<Date | null>(null)
  const [paste, setPaste] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'no' | 'yes' | 'manual'>('no')
  const [promptText, setPromptText] = useState('')
  // 버튼 라벨만 4초 뒤 되돌린다 (명세 5.2) — copied는 단계·수동 복사 안내가 계속 쓰므로 그대로 둔다
  const [justCopied, setJustCopied] = useState(false)
  const revertTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const step = copied === 'no' ? 0 : paste.trim() ? 2 : 1

  function clearRevert() { if (revertTimer.current) { clearTimeout(revertTimer.current); revertTimer.current = null } }
  useEffect(() => () => { if (revertTimer.current) clearTimeout(revertTimer.current) }, []) // 시트가 사라져도 타이머를 남기지 않는다

  async function copyPrompt() {
    if (!text.trim()) return
    const now = new Date()
    const p = buildPrompt({ text, referenceAt: now, tz, foods })
    setReferenceAt(now); setPromptText(p)
    // http(비보안) 주소에서는 navigator.clipboard가 없다(iOS Safari 등) — 그때는 옛 방식으로 바로 복사한다.
    // await 뒤에는 사용자 제스처가 끝나 execCommand가 거부될 수 있으므로, 옛 방식은 await 없이 먼저 시도한다.
    let ok = false
    if (navigator.clipboard?.writeText) {
      try { await navigator.clipboard.writeText(p); ok = true } catch { ok = legacyCopy(p, textRef.current) }
    } else {
      ok = legacyCopy(p, textRef.current)
    }
    if (ok) {
      setCopied('yes'); setJustCopied(true)
      clearRevert(); revertTimer.current = setTimeout(() => setJustCopied(false), 4000)
    } else { setCopied('manual'); setJustCopied(false); clearRevert() }
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
        className="mx-auto max-h-[90dvh] max-w-md gap-0 overflow-y-auto rounded-t-[22px] border-line bg-card px-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,.15)]">
        <SheetHeader className="px-0 pt-3 pb-2"><SheetTitle className="text-[20px] font-bold">말로 적기</SheetTitle></SheetHeader>
        <ol className="mb-3 grid grid-cols-3 gap-1.5 text-[12px]">
          {STEPS.map((s, i) => <li key={s} className={cn('rounded-xl py-1.5 text-center', i === step ? 'bg-accent-soft font-bold text-ink' : i < step ? 'bg-line text-ink line-through' : 'bg-bg text-mute')}>{s}</li>)}
        </ol>
        <Textarea ref={textRef} value={text} onChange={(e) => { setText(e.target.value); setReferenceAt(null); setCopied('no'); setJustCopied(false); clearRevert() }} rows={11} autoFocus
          placeholder={INPUT_PLACEHOLDER}
          className="rounded-xl border-line bg-bg text-[16px] md:text-[16px]" data-testid="input-text" />
        <Button onClick={copyPrompt} disabled={!text.trim()} className="mt-2 h-11 w-full rounded-xl text-[14px] font-bold" data-testid="copy-prompt">
          {justCopied ? '복사됨 ✓ 자기 LLM에 붙여넣기' : '프롬프트 복사'}
        </Button>
        {copied === 'manual' && (
          <details open className="mt-2 rounded-xl border border-line bg-bg p-2 text-[12px]"><summary>복사가 막혔습니다. 아래를 길게 눌러 복사하세요.</summary><pre className="whitespace-pre-wrap">{promptText}</pre></details>
        )}
        <div className="mt-3">
          <Textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={3}
            placeholder="LLM 답변(JSON)을 여기에 붙여넣기" className="rounded-xl border-line bg-bg font-mono text-[16px] md:text-[16px]" data-testid="paste-text" />
          {error && <p role="alert" className="mt-2 rounded-xl bg-warn-soft p-2.5 text-[14px] text-warn">{error}</p>}
          <Button variant="outline" onClick={submitPaste} disabled={!paste.trim()} className="mt-2 h-11 w-full rounded-xl border-accent text-[14px] font-bold text-accent" data-testid="submit-paste">
            확인 시트로
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

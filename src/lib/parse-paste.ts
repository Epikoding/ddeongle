import { entrySchema, parsedResultSchema, type Entry } from './schemas'

export type InvalidEntry = { index: number; raw: unknown; reason: string }
export type PasteResult =
  | { ok: true; entries: Entry[]; invalid: InvalidEntry[]; questions: string[] }
  | { ok: false; error: 'no_json' | 'bad_shape'; message: string }

export function extractJson(text: string): string | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  return text.slice(start, end + 1)
}

export function parsePaste(text: string): PasteResult {
  const json = extractJson(text)
  if (!json) return { ok: false, error: 'no_json', message: 'JSON을 찾지 못했습니다. LLM 답변 전체를 다시 복사해 주세요.' }

  let obj: unknown
  try {
    obj = JSON.parse(json)
  } catch {
    return { ok: false, error: 'no_json', message: 'JSON이 중간에 끊겼습니다. LLM 답변 전체를 다시 복사해 주세요.' }
  }

  const shape = parsedResultSchema.safeParse(obj)
  if (!shape.success) return { ok: false, error: 'bad_shape', message: '결과 모양이 다릅니다. 프롬프트를 다시 복사해 보내 주세요.' }

  const entries: Entry[] = []
  const invalid: InvalidEntry[] = []
  shape.data.entries.forEach((raw, index) => {
    const r = entrySchema.safeParse(raw)
    if (r.success) entries.push(r.data)
    else invalid.push({ index, raw, reason: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
  })
  entries.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
  return { ok: true, entries, invalid, questions: shape.data.questions }
}

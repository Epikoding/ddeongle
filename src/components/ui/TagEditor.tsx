'use client'
import { useState } from 'react'
import { Chip } from '@/components/ui/Chip'
import { normalizeTag } from '@/lib/schemas'
import { WATCH_INGREDIENTS, isWatched } from '@/lib/watch-ingredients'

export function TagEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState('')
  function add(raw: string) { const t = normalizeTag(raw); if (t && !tags.includes(t)) onChange([...tags, t]); setDraft('') }
  const suggestions = WATCH_INGREDIENTS.filter((w) => !tags.includes(w) && (draft === '' || w.includes(draft))).slice(0, 8)
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((t) => <Chip key={t} tone={isWatched(t) ? 'warn' : 'default'} selected={isWatched(t)} onRemove={() => onChange(tags.filter((x) => x !== t))}>{t}</Chip>)}
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) { e.preventDefault(); add(draft) } }}
          placeholder="+ 재료" className="h-8 w-24 rounded-full border border-dashed border-line bg-transparent px-3 text-[16px]" data-testid="tag-input" />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {suggestions.map((s) => <button key={s} type="button" onClick={() => add(s)} className="rounded-full bg-warn-soft/50 px-2 py-0.5 text-[12px] text-warn">+ {s}</button>)}
        </div>
      )}
    </div>
  )
}

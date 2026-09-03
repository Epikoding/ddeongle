'use client'
import { Mic, Plus } from 'lucide-react'

export function InputBar({ onOpenInput, onOpenForm }: { onOpenInput: () => void; onOpenForm: () => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-md px-4 pb-3 pt-6 bg-gradient-to-t from-bg via-bg/90 to-transparent">
      <div className="pointer-events-auto flex h-12 items-center rounded-full border border-line bg-card pl-4 pr-1.5">
        <button type="button" onClick={onOpenInput} data-testid="open-input" className="flex h-full flex-1 items-center gap-2 text-left text-[14px] text-mute">
          <Mic size={18} className="text-accent" /> 말로 적기…
        </button>
        <button type="button" onClick={onOpenForm} data-testid="open-form" aria-label="폼으로 적기" className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-primary-foreground active:scale-95">
          <Plus size={20} />
        </button>
      </div>
    </div>
  )
}

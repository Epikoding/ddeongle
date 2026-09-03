import type { LucideIcon } from 'lucide-react'
export function EmptyState({ icon: Icon, title, hint }: { icon: LucideIcon; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon size={22} /></span>
      <p className="text-[16px] font-semibold">{title}</p>
      {hint && <p className="text-[13px] text-mute">{hint}</p>}
    </div>
  )
}

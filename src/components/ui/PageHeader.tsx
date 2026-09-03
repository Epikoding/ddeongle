import type { ReactNode } from 'react'
export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between px-4 pt-4 pb-2">
      <div>
        <h1 className="text-[24px] font-bold tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[12px] text-mute">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-1">{right}</div>}
    </header>
  )
}

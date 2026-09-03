'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarCheck, BarChart3, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/', label: '오늘', icon: CalendarCheck, match: (p: string) => p === '/' || p.startsWith('/entries') },
  { href: '/analysis', label: '분석', icon: BarChart3, match: (p: string) => p.startsWith('/analysis') },
  { href: '/settings', label: '설정', icon: Settings, match: (p: string) => p.startsWith('/settings') },
] as const

export function TabBar() {
  const path = usePathname()
  return (
    <nav aria-label="주 메뉴" className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-line bg-card pb-[env(safe-area-inset-bottom)]">
      <ul className="flex h-16 items-stretch">
        {TABS.map(({ href, label, icon: Icon, match }) => {
          const on = match(path)
          return (
            <li key={href} className="flex-1">
              <Link href={href} aria-current={on ? 'page' : undefined}
                className={cn('flex h-full flex-col items-center justify-center gap-0.5 text-[11px]', on ? 'font-bold text-accent' : 'text-mute')}>
                <Icon size={22} strokeWidth={on ? 2.25 : 1.75} />{label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

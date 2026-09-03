import { TabBar } from '@/components/TabBar'
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {children}
      <TabBar />
    </div>
  )
}

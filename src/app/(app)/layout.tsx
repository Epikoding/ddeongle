import { TabBar } from '@/components/TabBar'
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md pb-20">
      {children}
      <TabBar />
    </div>
  )
}

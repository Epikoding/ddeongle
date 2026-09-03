import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = { title: '장 기록', description: '설사 유발요인 찾기 일기' }
export const viewport: Viewport = { themeColor: '#111111', width: 'device-width', initialScale: 1, viewportFit: 'cover' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh bg-neutral-50 text-neutral-900 antialiased">{children}</body>
    </html>
  )
}

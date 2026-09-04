import type { Metadata, Viewport } from 'next'
import { SwRegister } from '@/components/SwRegister'
import './globals.css'

export const metadata: Metadata = { title: '똥글', description: '설사 유발요인을 찾는 일기', appleWebApp: { title: '똥글', capable: true, statusBarStyle: 'default' } }
export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f3f8' },
    { media: '(prefers-color-scheme: dark)', color: '#171622' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh"><SwRegister />{children}</body>
    </html>
  )
}

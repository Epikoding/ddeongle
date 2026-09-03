import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '장 기록', short_name: '장기록', description: '설사 유발요인 찾기 일기',
    start_url: '/', display: 'standalone', background_color: '#f4f3f8', theme_color: '#f4f3f8', lang: 'ko',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

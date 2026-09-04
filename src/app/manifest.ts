import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '똥글', short_name: '똥글', description: '설사 유발요인을 찾는 일기',
    start_url: '/', display: 'standalone', background_color: '#f4f3f8', theme_color: '#f4f3f8', lang: 'ko',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

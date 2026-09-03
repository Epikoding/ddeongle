import { readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  plugins: [
    {
      name: 'md-raw',
      enforce: 'pre',
      load(id: string) {
        const file = id.split('?')[0]
        if (file.endsWith('.md')) {
          return { code: `export default ${JSON.stringify(readFileSync(file, 'utf8'))}`, map: null }
        }
      },
    },
  ],
})

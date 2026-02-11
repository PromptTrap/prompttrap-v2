import { defineConfig } from 'tsup'
import { copyFileSync, mkdirSync } from 'fs'
import { join } from 'path'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'dashboard/server': 'src/dashboard/server.ts',
  },
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  shims: true,
  banner: {
    js: '#!/usr/bin/env node',
  },
  onSuccess: async () => {
    // Copy dashboard static files
    try {
      mkdirSync('dist/dashboard/public', { recursive: true })
      copyFileSync('src/dashboard/public/index.html', 'dist/dashboard/public/index.html')
      console.log('✓ Copied dashboard static files')
    } catch (error) {
      console.error('Failed to copy dashboard files:', error)
    }
  },
})

import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        content: path.resolve(__dirname, 'src/content/index.ts'),
        background: path.resolve(__dirname, 'src/background/index.ts'),
        popup: path.resolve(__dirname, 'src/popup/popup.ts'),
        'native-host': path.resolve(__dirname, 'src/native-host/host.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        format: 'es',
      },
    },
    target: 'es2022',
    minify: false, // Keep readable for review/debugging
    sourcemap: true,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'public/manifest.json',
          dest: '.',
        },
        {
          src: 'src/popup/popup.html',
          dest: '.',
        },
        {
          src: 'src/native-host/manifest-*.json',
          dest: 'native-host',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@prompttrap/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});

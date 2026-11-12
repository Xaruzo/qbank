import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'fabric',
      'katex',
      'lucide-react',
      '@supabase/supabase-js',
      'react-markdown',
      'remark-gfm',
      'remark-math',
      'remark-breaks',
      'rehype-katex',
      'three',
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,ts}'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 1200,
    minify: 'esbuild',
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('fabric')) return 'vendor-fabric';
            if (id.includes('katex')) return 'vendor-katex';
            if (
              id.includes('react-markdown') ||
              id.includes('remark') ||
              id.includes('rehype') ||
              id.includes('micromark') ||
              id.includes('unist') ||
              id.includes('mdast') ||
              id.includes('vfile') ||
              id.includes('property-information') ||
              id.includes('hast')
            ) {
              return 'vendor-markdown';
            }
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react';
            }
          }
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: 'all',
    headers: {
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https: wss:; base-uri 'self';",
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import legacy from '@vitejs/plugin-legacy'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Emits an additional, transpiled + polyfilled bundle loaded via
    // <script nomodule> for browsers/webviews that don't support native
    // ES modules (some older Android stock browsers, some in-app browsers).
    // Without this, those devices silently skip the <script type="module">
    // tag entirely and the page stays blank white forever, with no error.
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
  },
})
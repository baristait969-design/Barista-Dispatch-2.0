import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'html2canvas-modern-color-fix',
        transform(code, id) {
          if (id.includes('html2canvas')) {
            return code.replace(
              /if\s*\(\s*typeof colorFunction === ['"]undefined['"]\s*\)\s*(?:\{\s*)?throw new Error\([^;]+\);(?:\s*\})?/g,
              'if (typeof colorFunction === "undefined") return 0x000000ff;'
            );
          }
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findAvailablePort } from './scripts/portUtils.js';
import { gripmApi } from './server/plugin.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(async () => {
  const host = process.env.GRIPM_HOST || '127.0.0.1';
  const defaultPort = parseInt(process.env.GRIPM_PORT || '4100', 10);
  const resolvedPort = await findAvailablePort(defaultPort, host);
  const displayHost = host === '127.0.0.1' ? 'localhost' : host;
  const isAutoOpenDisabled = process.env.GRIPM_OPEN === 'false' || process.env.CI === 'true';

  return {
    plugins: [react(), gripmApi()],
    resolve: {
      dedupe: ['react', 'react-dom']
    },
    optimizeDeps: {
      include: [
        'react',
        'react/jsx-runtime',
        'react-dom',
        'react-dom/client',
        'lucide-react'
      ]
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss({
            config: path.resolve(__dirname, 'tailwind.config.js')
          }),
          autoprefixer()
        ]
      }
    },
    server: {
      headers: {
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: wss:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
      },
      port: resolvedPort,
      strictPort: false,
      host,
      open: isAutoOpenDisabled ? false : `http://${displayHost}:${resolvedPort}/`,
      fs: {
        allow: [
          __dirname,
          path.resolve(__dirname, '..')
        ]
      },
      watch: {
        ignored: ['**/backlog/**', '**/.gripm/**', '**/data/**']
      }
    }
  };
});

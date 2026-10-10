import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), {
      name: 'production-security-policy', apply: 'build',
      transformIndexHtml() {
        let api;
        try { api = new URL(env.VITE_API_URL); } catch { throw new Error('Set VITE_API_URL to the backend HTTPS URL before building.'); }
        if (api.protocol !== 'https:' || api.username || api.password)
          throw new Error('Production VITE_API_URL must be an HTTPS URL without credentials.');
        const policy = ["default-src 'self'", "script-src 'self'", "style-src 'self' 'unsafe-inline'",
          "img-src 'self' blob: data:", "font-src 'self' data:", `connect-src 'self' ${api.origin}`,
          'frame-src https://www.google.com', "object-src 'none'", "base-uri 'self'", "form-action 'self'"].join('; ');
        return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' },
          { tag: 'meta', attrs: { name: 'referrer', content: 'no-referrer' }, injectTo: 'head-prepend' }];
      },
    }],
    server: { host: '127.0.0.1', port: 5173, strictPort: true },
  };
});

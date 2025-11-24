import { defineConfig } from 'vite';
import dns from 'node:dns';

dns.setDefaultResultOrder('verbatim');

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    allowedHosts: ['localhost', '127.0.0.1'],
    hmr: {
      protocol: 'ws',
      host: '127.0.0.1',
    },
  },
});

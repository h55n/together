import base from './vite.config.js';

export default {
  ...base,
  server: {
    ...base.server,
    host: '127.0.0.1',
    port: 5188,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:3101', changeOrigin: true } },
  },
};

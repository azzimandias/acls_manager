import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          antd: ['antd', '@ant-design/icons'],
          axios: ['axios'],
        },
      },
    },
    chunkSizeWarningLimit: 950,
  },
    server: {
        host: true,
        port: 3005,
    }
});

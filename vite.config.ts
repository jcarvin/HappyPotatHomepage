import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    hmr: {
      overlay: true // Shows errors as an overlay in the browser
    },
    watch: {
      usePolling: false // Set to true if HMR doesn't work (especially on Docker/WSL)
    }
  }
});

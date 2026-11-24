import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    // the three.js chunk is ~0.9 MB by nature; it is lazy and long-cached
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      output: {
        // three.js and React Three Fiber in their own long-cached chunk. Only
        // the hangar and the game load it (both are lazy in App.jsx), so
        // Home/About/Contact never download the 3D stack.
        manualChunks(id) {
          if (/node_modules[\\/](three|three-stdlib|@react-three|troika|camera-controls|maath|meshline|stats-gl)/.test(id)) {
            return 'three';
          }
          // motion is shared by every section; name its chunk for what it is
          if (/node_modules[\\/](motion|framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion';
          return undefined;
        },
      },
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/login': {
        target: "http://localhost:29202",
        changeOrigin: true,
        secure: false
      },
      '/register': {
        target: "http://localhost:29201",
        changeOrigin: true,
        secure: false
      },
      '/get_building_plan': {
        target: 'http://localhost:29204',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

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
      },
      '/real_time_data': {
        target: 'http://localhost:29204',
        changeOrigin: true,
        secure: false
      },
      '/get_reservations': {
        target: 'http://localhost:29203',
        changeOrigin: true,
        secure: false
      },
      '/reserve': {
        target: 'http://localhost:29203',
        changeOrigin: true,
        secure: false
      },
      '/delete_reservation': {
        target: 'http://localhost:29203',
        changeOrigin: true,
        secure: false
      },
      '/get_issues': {
        target: 'http://localhost:29207',
        changeOrigin: true,
        secure: false
      },
      '/push_issue': {
        target: 'http://localhost:29207',
        changeOrigin: true,
        secure: false
      },
      '/solving_issue': {
        target: 'http://localhost:29207',
        changeOrigin: true,
        secure: false
      },
      '/resolve_issue': {
        target: 'http://localhost:29207',
        changeOrigin: true,
        secure: false
      },
      '/comment': {
        target: 'http://localhost:29207',
        changeOrigin: true,
        secure: false
      },
      '/historical_data': {
        target: 'http://localhost:29204',
        changeOrigin: true,
        secure: false
      },
      '/available_sensors': {
        target: 'http://localhost:29204',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

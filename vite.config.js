import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expõe para a rede local (0.0.0.0)
    port: 3000,
  }
})
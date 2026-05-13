import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expõe para a rede local (0.0.0.0)
    port: 3000,
    headers: {
      // Permite que popups de autenticação (como o do Google) se comuniquem com a aba principal
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
      // Garante que não há bloqueio de recursos cruzados no ambiente de desenvolvimento
      "Cross-Origin-Embedder-Policy": "unsafe-none",
    }
  }
})
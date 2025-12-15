import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // IMPORTANTE: Isso assume que sua pasta src está na raiz (academic-calendar/src)
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  root: './', 
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite automatically loads .env files from the project root.
  // Environment variables prefixed with VITE_ are exposed to client-side code 
  // via import.meta.env.
  // For example, VITE_API_URL can be accessed as import.meta.env.VITE_API_URL.
  server: {
    port: 3000, // Optional: define a port for the dev server (e.g., 3000 or 5173)
    // If you are running your backend on a different port (e.g., 3001) 
    // and want to proxy API requests to avoid CORS issues during development,
    // you can configure a proxy here.
    // Make sure your VITE_API_URL in .env points to the proxied path (e.g., /api)
    // and not the direct backend URL if you use this.
    // Example (if VITE_API_URL in .env is '/api', and backend is on http://localhost:3001):
    // proxy: {
    //   '/api': { 
    //     target: 'http://localhost:3001', // Your actual backend server address
    //     changeOrigin: true, // Recommended for virtual hosted sites
    //     // If your backend API routes do not start with /api, you might need to rewrite the path.
    //     // For example, if backend expects /orders but frontend calls /api/orders:
    //     // rewrite: (path) => path.replace(/^\/api/, '') 
    //   }
    // }
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: 'index.html',
        admin: 'admin.html',
        order: 'order.html',
        quote: 'quote.html',
        quote_inquiry: 'quote_inquiry.html',
      },
      external: ['@google/genai', 'axios'],
    },
  }
})
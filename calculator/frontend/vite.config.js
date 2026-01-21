import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
// Cache invalidation trigger: 1
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5432',
                changeOrigin: true,
            }
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (!id.includes('node_modules')) return
                    if (id.includes('react') || id.includes('react-dom')) return 'react-vendor'
                    if (id.includes('mantine') || id.includes('radix') || id.includes('lucide-react')) return 'ui-vendor'
                    if (id.includes('date-fns')) return 'date-vendor'
                    if (id.includes('socket.io-client')) return 'socket-vendor'
                    if (id.includes('lottie-web')) return 'lottie-vendor'
                    return 'vendor'
                }
            }
        }
    }
})

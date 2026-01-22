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
        dedupe: ['react', 'react-dom'],
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
                    // React core만 분리 (react/ 또는 react-dom/ 정확히 매칭)
                    if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor'
                    // UI 라이브러리 (react-* 패키지들 포함)
                    if (id.includes('mantine') || id.includes('radix') || id.includes('lucide-react')) return 'ui-vendor'
                    if (id.includes('react-router') || id.includes('react-day-picker') || id.includes('react-resizable')) return 'ui-vendor'
                    if (id.includes('lottie-react')) return 'ui-vendor'
                    if (id.includes('date-fns') || id.includes('dayjs')) return 'date-vendor'
                    if (id.includes('socket.io-client')) return 'socket-vendor'
                    if (id.includes('lottie-web')) return 'lottie-vendor'
                    return 'vendor'
                }
            }
        }
    }
})

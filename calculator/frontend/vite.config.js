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
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // React 관련
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    
                    // UI 라이브러리들
                    'ui-vendor': [
                        '@radix-ui/react-dialog',
                        '@radix-ui/react-select', 
                        '@radix-ui/react-popover',
                        '@radix-ui/react-tooltip',
                        '@radix-ui/react-tabs',
                        '@radix-ui/react-accordion'
                    ],
                    
                    // 날짜 관련
                    'date-vendor': ['@mantine/dates'],
                    
                    // 아이콘 및 애니메이션
                    'icon-vendor': ['lucide-react', 'lottie-web'],
                    
                    // 유틸리티
                    'utils': ['clsx', 'tailwind-merge']
                }
            }
        },
        chunkSizeWarningLimit: 1000
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://localhost:5432',
                changeOrigin: true,
            }
        }
    }
})

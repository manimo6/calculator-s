import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const devProxyTarget = process.env.VITE_DEV_PROXY_TARGET || "http://localhost:3000"

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
        dedupe: ["react", "react-dom"],
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    "react-vendor": ["react", "react-dom", "react-router-dom"],
                    "ui-vendor": [
                        "@radix-ui/react-dialog",
                        "@radix-ui/react-select",
                        "@radix-ui/react-popover",
                        "@radix-ui/react-tooltip",
                        "@radix-ui/react-tabs",
                        "@radix-ui/react-accordion",
                    ],
                    "date-vendor": ["@mantine/dates"],
                    "icon-vendor": ["lucide-react", "lottie-web"],
                    utils: ["clsx", "tailwind-merge"],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
    server: {
        proxy: {
            "/api": {
                target: devProxyTarget,
                changeOrigin: true,
            },
            "/socket.io": {
                target: devProxyTarget,
                changeOrigin: true,
                ws: true,
            },
        },
    },
})

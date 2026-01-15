import "@mantine/core/styles.layer.css"
import "@mantine/dates/styles.layer.css"

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initAuthFromStorage } from './auth-store.js'
import { AuthProvider } from './auth-context.jsx'

initAuthFromStorage()

ReactDOM.createRoot(document.getElementById('root')).render(
    <AuthProvider>
        <App />
    </AuthProvider>
)

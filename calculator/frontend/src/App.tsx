import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import { canAccessAdmin, canAccessCalculator } from './auth-routing'

const StudentPage = React.lazy(() => import('./pages/StudentPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const ChangePasswordPage = React.lazy(() => import('./pages/ChangePasswordPage'));

// Simple loading wrapper
const PageLoader = () => <div style={{ padding: 20 }}>Loading...</div>;

// Placeholder components - will be replaced by real implementations
/* StudentCalculator placeholder removed */

const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={
                    <React.Suspense fallback={<PageLoader />}>
                        <LoginPage />
                    </React.Suspense>
                } />
                <Route path="/change-password" element={
                    <ProtectedRoute>
                        <React.Suspense fallback={<PageLoader />}>
                            <ChangePasswordPage />
                        </React.Suspense>
                    </ProtectedRoute>
                } />
                <Route path="/" element={
                    <ProtectedRoute allow={canAccessCalculator}>
                        <React.Suspense fallback={<PageLoader />}>
                            <StudentPage />
                        </React.Suspense>
                    </ProtectedRoute>
                } />
                <Route path="/sehan/*" element={
                    <ProtectedRoute allow={canAccessAdmin}>
                        <React.Suspense fallback={<PageLoader />}>
                            <AdminDashboard />
                        </React.Suspense>
                    </ProtectedRoute>
                } />
            </Routes>
        </BrowserRouter>
    )
}

export default App

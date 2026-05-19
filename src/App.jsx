import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './utils/supabaseClient'
import Login from './pages/Login'
import Admin from './pages/Admin'
import Scanner from './pages/Scanner'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import NavBar from './components/NavBar'

// Layout wrapper for routes that require NavBar and Auth Protection
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-brand-dark flex flex-col">
        <NavBar />
        <main className="flex-grow">
          <Outlet />
        </main>
      </div>
    </ProtectedRoute>
  )
}

// Redirects `/` and unknown routes dynamically based on session/role
function RootRedirect() {
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [sessionExists, setSessionExists] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionExists(true)
        setIsAdmin(session.user?.email?.toLowerCase().includes('admin'))
      }
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-accent/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-brand-accent border-t-transparent animate-spin"></div>
        </div>
      </div>
    )
  }

  if (!sessionExists) {
    return <Navigate to="/login" replace />
  }

  return isAdmin ? <Navigate to="/dashboard" replace /> : <Navigate to="/scanner" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/admin" element={<ProtectedRoute requireAdmin={true}><Admin /></ProtectedRoute>} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/dashboard" element={<ProtectedRoute requireAdmin={true}><Dashboard /></ProtectedRoute>} />
        </Route>

        {/* Catch-all Redirect */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
      
      {/* Toast Notification Container matching dark theme aesthetics */}
      <Toaster 
        position="top-right"
        toastOptions={{
          className: 'glass-panel text-white border-brand-border/60',
          style: {
            background: 'rgba(19, 19, 38, 0.9)',
            backdropFilter: 'blur(12px)',
            color: '#f1f5f9',
            border: '1px solid rgba(42, 43, 74, 0.6)',
            borderRadius: '12px',
            fontSize: '0.875rem'
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#131326',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#131326',
            },
          }
        }}
      />
    </BrowserRouter>
  )
}

import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(true)
  const location = useLocation()

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session && requireAdmin) {
        const email = session.user?.email || ''
        const isAdmin = email.toLowerCase().includes('admin')
        if (!isAdmin) {
          setAuthorized(false)
          toast.error("Access Denied: Admin authorization required.")
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session && requireAdmin) {
        const email = session.user?.email || ''
        const isAdmin = email.toLowerCase().includes('admin')
        if (!isAdmin) {
          setAuthorized(false)
        } else {
          setAuthorized(true)
        }
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [requireAdmin])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-brand-dark">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-brand-accent/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-brand-accent border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse-slow">Checking authorization...</p>
      </div>
    )
  }

  if (!session) {
    // Redirect to login but save the current location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requireAdmin && !authorized) {
    // Redirect non-admins to the scanner route
    return <Navigate to="/scanner" replace />
  }

  return children
}

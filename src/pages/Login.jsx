import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error("Please enter both email and password.")
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      toast.success("Successfully logged in! 👋")

      // Redirect depending on user email role
      const userEmail = data.user?.email || ''
      if (userEmail.toLowerCase().includes('admin')) {
        navigate('/admin')
      } else {
        navigate('/scanner')
      }
    } catch (error) {
      toast.error(error.message || "Invalid login credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-panel-glow p-8 sm:p-10 rounded-2xl relative overflow-hidden">
        {/* Glow blob backgrounds inside card */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-brand-accent/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-brand-accentHolo/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center relative">
          <div className="text-5xl mb-3 animate-bounce">🎟️</div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Event Ticket System
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Please log in with your credentials to access the system
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email-address" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="glass-input"
                placeholder="name@school.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="glass-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex justify-center items-center py-3.5"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-slate-500 pt-4 border-t border-brand-border/30">
          Admin and Scanner accounts are managed via Supabase auth settings.
        </div>
      </div>
    </div>
  )
}

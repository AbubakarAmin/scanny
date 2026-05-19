import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../utils/supabaseClient'
import toast from 'react-hot-toast'

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserEmail(user.email)
        setIsAdmin(user.email.toLowerCase().includes('admin'))
      }
    })
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      toast.success("Successfully logged out!")
      navigate('/login')
    } catch (error) {
      toast.error(error.message || "Failed to log out")
    }
  }

  const navLinks = [
    { name: 'Admin', path: '/admin' },
    { name: 'Scanner', path: '/scanner' },
    { name: 'Dashboard', path: '/dashboard' }
  ].filter(link => {
    // Admin and Dashboard pages are only accessible to administrators
    if (link.path === '/admin' || link.path === '/dashboard') {
      return isAdmin
    }
    return true
  })

  const isActive = (path) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 bg-brand-dark/80 backdrop-blur-md border-b border-brand-border/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand Name */}
          <div className="flex items-center">
            <Link to={isAdmin ? "/dashboard" : "/scanner"} className="flex items-center space-x-2">
              <span className="text-2xl">🎟️</span>
              <span className="text-lg font-bold bg-gradient-to-r from-white via-indigo-200 to-brand-accent bg-clip-text text-transparent">
                Event Tickets
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive(link.path)
                    ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30 shadow-sm shadow-brand-accent/5'
                    : 'text-slate-300 hover:bg-brand-border/30 hover:text-white'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* User Email & Logout (Desktop) */}
          <div className="hidden md:flex items-center space-x-4">
            <span className="text-xs text-slate-400 bg-brand-card border border-brand-border/40 px-3 py-1.5 rounded-lg max-w-[180px] truncate" title={userEmail}>
              👤 {userEmail || 'User'}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all duration-200"
            >
              Sign Out
            </button>
          </div>

          {/* Hamburger Menu Toggle (Mobile) */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-white hover:bg-brand-card focus:outline-none"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden transition-all duration-300 ${isOpen ? 'block' : 'hidden'}`} id="mobile-menu">
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-brand-card/95 border-b border-brand-border/40">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className={`block px-3 py-2.5 rounded-xl text-base font-medium transition-all ${
                isActive(link.path)
                  ? 'bg-brand-accent/20 text-brand-accent border border-brand-accent/30'
                  : 'text-slate-300 hover:bg-brand-border/30 hover:text-white'
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-4 pb-2 border-t border-brand-border/40 px-3 flex flex-col space-y-2">
            <span className="text-xs text-slate-400 truncate">
              👤 {userEmail || 'User'}
            </span>
            <button
              onClick={() => {
                setIsOpen(false)
                handleLogout()
              }}
              className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

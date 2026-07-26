import { useState } from 'react'
import { Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { authAPI } from '../services/api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(username, password)
      
      // Handle localStorage errors on mobile
      try {
        localStorage.setItem('token', response.token)
      } catch (storageError) {
        throw new Error('Storage error. Please enable cookies/storage and try again.')
      }
      
      onLogin(response.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col lg:flex-row"
      style={{ background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #000000 100%)' }}
    >
      {/* Left panel — branding (desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          {Array.from({ length: 8 }).map((_, r) =>
            Array.from({ length: 6 }).map((_, c) => (
              <div
                key={`${r}-${c}`}
                className="absolute w-24 h-24 border border-white rounded-lg"
                style={{ top: r * 140 - 20, left: c * 170 - 20, transform: 'rotate(15deg)' }}
              />
            ))
          )}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="w-20 h-20 rounded-xl object-cover" />
            <span className="text-white font-semibold text-lg tracking-tight">Amity Garden Resort and Hotel</span>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-400 text-sm font-mono mb-6 tracking-widest uppercase">Inventory Management</p>
          <h1 className="text-5xl font-bold text-white leading-tight mb-6">
            Your inventory,<br />
            <span className="text-yellow-400">always in control.</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Track products, manage sales, monitor stock levels, and generate reports — all in one place.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-4" />
      </div>

      {/* Compact branding bar — mobile & tablet only */}
      <div className="lg:hidden w-full px-4 sm:px-8 pt-8 sm:pt-12 pb-2">
        <div className="flex items-center gap-3 justify-center sm:justify-start max-w-sm sm:max-w-md mx-auto">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover shrink-0"
          />
          <div className="text-center sm:text-left">
            <span className="block text-white font-semibold text-base sm:text-xl leading-tight">
              Amity Garden Resort and Hotel
            </span>
            <span className="hidden sm:block text-slate-400 text-xs font-mono mt-1 tracking-widest uppercase">
              Inventory Management
            </span>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:p-8 py-6 sm:py-10">
        <div className="w-full max-w-[380px] sm:max-w-md">
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
              <p className="text-slate-500 text-sm">Sign in to your account to continue</p>
            </div>

            {error && (
              <div className="mb-5 flex items-center gap-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <div className="relative">
                  <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 sm:py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 sm:py-2.5 border border-slate-200 rounded-lg text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(s => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-600 disabled:opacity-60 text-black font-semibold py-3 sm:py-2.5 rounded-lg text-sm transition-all"
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Safe-area spacer for iPhone home indicator */}
      <div className="lg:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </div>
  )
}
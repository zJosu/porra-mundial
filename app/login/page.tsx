'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Globe, Mail, Lock, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Email o contraseña incorrectos.')
    else router.push('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a1628' }}>
      {/* Hero image */}
      <div className="relative flex-1 flex flex-col justify-end">
        <Image
          src="/cris-leo-ney.png"
          alt="Jugadores del Mundial"
          fill
          className="object-cover object-top opacity-30"
          priority
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center px-6 pb-12 pt-24">
          {/* Logo */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 shadow-xl"
            style={{ background: '#004FA3' }}
          >
            <Globe size={28} className="text-white" />
          </div>

          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-1"
            style={{ color: '#FFD100' }}
          >
            Mundial 2026 · USA · Canadá · México
          </p>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1">La clika</h1>
          <p className="text-sm text-gray-400 mb-10">Porra del Mundial 2026</p>

          {/* Rainbow stripe */}
          <div className="w-24 h-[3px] rounded-full fifa-rainbow mb-10" />

          {/* Login form */}
          <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1">
              Tu email
            </label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/50 transition-colors"
              />
            </div>

            <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-1 mt-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="tu jugador del mundial"
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-white/50 transition-colors"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-50 mt-1"
              style={{ background: '#004FA3', color: 'white' }}
            >
              {loading ? (
                <span>Entrando...</span>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-500 mt-1">
              Tu contraseña es el nombre de un jugador del Mundial ⚽
            </p>
          </form>
        </div>
      </div>

      {/* Rainbow bottom stripe */}
      <div className="h-[4px] fifa-rainbow shrink-0" />
    </div>
  )
}

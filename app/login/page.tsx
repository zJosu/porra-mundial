'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Mail, Lock, ArrowRight, Eye, EyeOff, UserPlus, Copy, Check, ArrowLeft } from 'lucide-react'
import { createAccount } from '@/app/actions/auth'

type View = 'login' | 'register' | 'success'

export default function LoginPage() {
  const [view, setView] = useState<View>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError('Email o contraseña incorrectos.')
    else {
      router.refresh()
      router.push('/')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await createAccount(email)
    setLoading(false)
    if (!result.ok) {
      setError(result.error ?? 'Error al crear la cuenta.')
    } else {
      setGeneratedPassword(result.password ?? '')
      setView('success')
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10"
      style={{
        background: '#0a0a0a',
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(201,168,76,0.12) 0%, transparent 70%), radial-gradient(ellipse 50% 40% at 50% 100%, rgba(0,77,64,0.2) 0%, transparent 70%)',
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-6">
        <Image
          src="/fifa26-logo.jpg"
          alt="FIFA World Cup 26"
          width={72}
          height={72}
          className="object-contain rounded-xl mb-4"
          unoptimized
          priority
        />
        <p
          className="text-[10px] font-black uppercase tracking-[0.22em] mb-1"
          style={{ color: '#C9A84C' }}
        >
          FIFA World Cup 2026
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight">La clika</h1>
        <div className="w-20 h-[3px] rounded-full fifa-rainbow mt-3" />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* --- LOGIN --- */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-white mb-1">Entrar</h2>

            {/* Email */}
            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#666' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#666' }}
              />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="tu jugador del mundial"
                className="w-full rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: showPwd ? '#C9A84C' : '#555' }}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="text-red-400 text-xs px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-40 mt-1"
              style={{ background: '#C9A84C', color: '#0a0a0a' }}
            >
              {loading ? 'Entrando...' : <><span>Entrar</span><ArrowRight size={15} /></>}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
              <span className="text-[11px]" style={{ color: '#444' }}>o</span>
              <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            </div>

            <button
              type="button"
              onClick={() => { setView('register'); setError('') }}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#aaa' }}
            >
              <UserPlus size={15} />
              ¿No tienes cuenta? Créala aquí
            </button>
          </form>
        )}

        {/* --- REGISTER --- */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setView('login'); setError('') }}
              className="flex items-center gap-1.5 text-xs mb-1 transition-colors"
              style={{ color: '#666' }}
            >
              <ArrowLeft size={13} /> Volver
            </button>

            <h2 className="text-base font-bold text-white mb-1">Crear cuenta</h2>
            <p className="text-xs leading-relaxed mb-2" style={{ color: '#888' }}>
              Pon tu email y te generaremos una contraseña automática. ¡Toma nota!
            </p>

            <div className="relative">
              <Mail
                size={15}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: '#666' }}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none transition-colors"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {error && <p className="text-red-400 text-xs px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
              style={{ background: '#C9A84C', color: '#0a0a0a' }}
            >
              {loading ? 'Creando cuenta...' : <><UserPlus size={15} /><span>Crear cuenta</span></>}
            </button>
          </form>
        )}

        {/* --- SUCCESS --- */}
        {view === 'success' && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(0,166,81,0.15)' }}
            >
              <Check size={22} style={{ color: '#00A651' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white mb-1">¡Cuenta creada!</h2>
              <p className="text-xs" style={{ color: '#888' }}>
                Tu contraseña es este crack. Anótala — la necesitarás para entrar.
              </p>
            </div>

            {/* Password display */}
            <div
              className="w-full rounded-xl px-4 py-4 flex items-center justify-between gap-3"
              style={{ background: 'rgba(201,168,76,0.1)', border: '1.5px solid rgba(201,168,76,0.3)' }}
            >
              <span className="text-xl font-black tracking-wide" style={{ color: '#C9A84C' }}>
                {generatedPassword}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 transition-colors"
                style={{ color: copied ? '#00A651' : '#666' }}
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>

            <p className="text-[11px]" style={{ color: '#555' }}>
              Vuelve al login y usa tu email + esta contraseña
            </p>

            <button
              type="button"
              onClick={() => setView('login')}
              className="flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm w-full justify-center transition-all"
              style={{ background: '#C9A84C', color: '#0a0a0a' }}
            >
              Ir al login <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Rainbow bottom stripe */}
      <div className="w-32 h-[3px] rounded-full fifa-rainbow mt-8" />
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Lock, Eye, EyeOff, Check, ArrowRight } from 'lucide-react'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  // Supabase sends the token as a hash fragment; exchangeCodeForSession handles it automatically
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // session is now active, ready to update
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) setError('Error al cambiar la contraseña. El enlace puede haber caducado.')
    else setDone(true)
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
        <p className="text-[10px] font-black uppercase tracking-[0.22em] mb-1" style={{ color: '#C9A84C' }}>
          FIFA World Cup 2026
        </p>
        <h1 className="text-4xl font-black text-white tracking-tight">La clika</h1>
        <div className="w-20 h-[3px] rounded-full fifa-rainbow mt-3" />
      </div>

      <div
        className="w-full max-w-sm rounded-2xl p-6"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {!done ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <h2 className="text-base font-bold text-white mb-1">Nueva contraseña</h2>
            <p className="text-xs mb-2" style={{ color: '#888' }}>Elige una contraseña nueva para tu cuenta.</p>

            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#666' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nueva contraseña"
                className="w-full rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-[#555] focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: showPwd ? '#C9A84C' : '#555' }}
                tabIndex={-1}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#666' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
            </div>

            {error && <p className="text-red-400 text-xs px-1">{error}</p>}

            <button
              type="submit"
              disabled={loading || !password || !confirm}
              className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm transition-all disabled:opacity-40 mt-1"
              style={{ background: '#C9A84C', color: '#0a0a0a' }}
            >
              {loading ? 'Guardando...' : <><span>Cambiar contraseña</span><ArrowRight size={15} /></>}
            </button>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,166,81,0.15)' }}>
              <Check size={22} style={{ color: '#00A651' }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white mb-1">¡Contraseña cambiada!</h2>
              <p className="text-xs" style={{ color: '#888' }}>Ya puedes entrar con tu nueva contraseña.</p>
            </div>
            <button
              type="button"
              onClick={() => { router.refresh(); router.push('/') }}
              className="flex items-center gap-2 py-3 px-6 rounded-xl font-bold text-sm w-full justify-center transition-all"
              style={{ background: '#C9A84C', color: '#0a0a0a' }}
            >
              Ir a la app <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>

      <div className="w-32 h-[3px] rounded-full fifa-rainbow mt-8" />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Eye, EyeOff, Check, ArrowLeft, KeyRound, ShieldCheck } from 'lucide-react'

export default function CambiarPasswordPage() {
  const [email, setEmail] = useState<string | null>(null)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNext, setShowNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const router = useRouter()

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  )

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login')
        return
      }
      setEmail(data.user.email ?? null)
    })
  }, [supabase, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (next !== confirm) {
      setError('Las contraseñas nuevas no coinciden.')
      return
    }
    if (next.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (next === current) {
      setError('La nueva contraseña debe ser distinta de la actual.')
      return
    }
    if (!email) {
      setError('Sesión no detectada. Vuelve a iniciar sesión.')
      return
    }

    setLoading(true)
    // Verifica la contraseña actual reautenticando
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password: current,
    })
    if (signErr) {
      setLoading(false)
      setError('La contraseña actual es incorrecta.')
      return
    }

    const { error: upErr } = await supabase.auth.updateUser({ password: next })
    setLoading(false)
    if (upErr) {
      setError('No se pudo cambiar la contraseña. Inténtalo de nuevo.')
      return
    }
    setDone(true)
    setCurrent('')
    setNext('')
    setConfirm('')
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-black">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.18) 0%, transparent 70%)',
          }}
        />
        <div className="relative px-4 pt-5 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white opacity-70 hover:opacity-100 mb-3"
          >
            <ArrowLeft size={13} /> Volver
          </Link>
          <div className="flex items-center gap-2 mb-1.5">
            <ShieldCheck size={13} style={{ color: '#C9A84C' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              Mi cuenta
            </span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Cambiar contraseña</h1>
          {email && (
            <p className="text-[11px] mt-1.5 opacity-60 text-white truncate">{email}</p>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px] fifa-rainbow" />
      </div>

      {/* Card */}
      <div className="px-4 py-5">
        <div
          className="rounded-2xl p-5 bg-white"
          style={{
            boxShadow:
              '0 4px 20px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)',
          }}
        >
          {!done ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <PasswordInput
                value={current}
                onChange={setCurrent}
                show={showCurrent}
                onToggleShow={() => setShowCurrent((v) => !v)}
                placeholder="Contraseña actual"
                icon={<KeyRound size={15} />}
                autoComplete="current-password"
              />

              <div className="h-px bg-gray-100 my-1" />

              <PasswordInput
                value={next}
                onChange={setNext}
                show={showNext}
                onToggleShow={() => setShowNext((v) => !v)}
                placeholder="Nueva contraseña"
                icon={<Lock size={15} />}
                autoComplete="new-password"
              />
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                show={showNext}
                placeholder="Repite la nueva contraseña"
                icon={<Lock size={15} />}
                autoComplete="new-password"
              />

              <p className="text-[10px] text-gray-400 px-1">Mínimo 6 caracteres.</p>

              {error && (
                <p className="text-[11px] font-semibold text-red-600 px-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !current || !next || !confirm}
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 mt-1"
                style={{ background: '#004d40' }}
              >
                {loading ? 'Guardando…' : 'Cambiar contraseña'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center gap-4 text-center py-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(0,166,81,0.15)' }}
              >
                <Check size={22} style={{ color: '#00A651' }} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 mb-1">
                  ¡Contraseña actualizada!
                </h2>
                <p className="text-xs text-gray-500">Tu nueva contraseña ya está activa.</p>
              </div>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-bold text-sm text-white w-full transition-all"
                style={{ background: '#004d40' }}
              >
                Volver al inicio
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordInput({
  value,
  onChange,
  show,
  onToggleShow,
  placeholder,
  icon,
  autoComplete,
}: {
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggleShow?: () => void
  placeholder: string
  icon: React.ReactNode
  autoComplete: string
}) {
  return (
    <div className="relative">
      <span
        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        aria-hidden="true"
      >
        {icon}
      </span>
      <input
        type={show ? 'text' : 'password'}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-xl pl-10 pr-11 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
      {onToggleShow && (
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          tabIndex={-1}
          aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  )
}

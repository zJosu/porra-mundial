'use client'

import { useState } from 'react'
import { createParticipant, type ParticipantResult } from '@/app/actions/admin'
import { UserPlus, Copy, Check } from 'lucide-react'

export function AddParticipantForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ParticipantResult | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult(null)
    const res = await createParticipant(email.trim())
    setResult(res)
    setLoading(false)
    if (res.ok) setEmail('')
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-base font-bold text-gray-800 mb-4">Añadir participante</h2>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="email@ejemplo.com"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#65ffd9]"
        />
        <button
          type="submit"
          disabled={loading || !email}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
          style={{ background: '#004d40' }}
        >
          <UserPlus size={15} />
          {loading ? 'Creando…' : 'Registrar'}
        </button>
      </form>

      {result && (
        <div className={`mt-4 rounded-xl p-4 text-sm ${result.ok ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'}`}>
          {result.ok ? (
            <div className="space-y-2">
              <p className="font-semibold text-green-800">✅ Usuario creado</p>
              <p className="text-green-700">
                Envía esto por Gmail a <strong>{result.email}</strong>:
              </p>
              <div className="bg-white rounded-lg p-3 border border-green-200 font-mono text-xs space-y-1">
                <p>🔐 <strong>Contraseña:</strong> <span className="text-[#004d40] font-semibold">{result.password}</span></p>
                <p>⚽ <strong>Tu jugador:</strong> {result.jugador}</p>
              </div>
              <button
                onClick={() => copy(`Tu contraseña para La clika es: ${result.password} (jugador: ${result.jugador})`)}
                className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-900 transition-colors"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado' : 'Copiar mensaje'}
              </button>
            </div>
          ) : (
            <p className="text-red-700">{result.error}</p>
          )}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useTransition, useMemo, useEffect, useRef } from 'react'
import { Check, Send, AlertCircle, CloudCheck, Pencil } from 'lucide-react'
import { CuadroStep } from './CuadroStep'
import type { BracketWinners, BracketScores } from './CuadroStep'
import type { EquipoInfo } from './standings'
import { saveBracket } from '@/app/actions/bracket'
import type { Round } from './bracket'

type BracketSaved = {
  ronda: Round
  slot: number
  ganador_equipo_id: number
  goles_local: number | null
  goles_visitante: number | null
}

const CACHE_KEY = 'porra-mundial-2026-knockout:'

export function KnockoutWizard({
  userId,
  equipos,
  bracketSaved,
  porraEnviada,
}: {
  userId: string
  equipos: EquipoInfo[]
  bracketSaved: BracketSaved[]
  porraEnviada: boolean
}) {
  const cacheKey = `${CACHE_KEY}${userId}`

  const [localEnviada, setLocalEnviada] = useState(porraEnviada)
  const [editMode, setEditMode] = useState(false)

  const [bracketWinners, setBracketWinners] = useState<BracketWinners>(
    () => new Map(bracketSaved.map((b) => [`${b.ronda}:${b.slot}`, b.ganador_equipo_id])),
  )
  const [bracketScores, setBracketScores] = useState<BracketScores>(
    () => {
      const m = new Map<string, { gl: number; gv: number }>()
      for (const b of bracketSaved) {
        if (b.goles_local != null && b.goles_visitante != null) {
          m.set(`${b.ronda}:${b.slot}`, { gl: b.goles_local, gv: b.goles_visitante })
        }
      }
      return m
    },
  )
  const [campeonId, setCampeonId] = useState<number | null>(
    bracketSaved.find((b) => b.ronda === 'F')
      ? bracketSaved.find((b) => b.ronda === 'F')?.ganador_equipo_id ?? null
      : null,
  )

  const [hydrated, setHydrated] = useState(false)
  const [saveTick, setSaveTick] = useState(0)
  const lastSavedRef = useRef<number>(0)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.bracket)) setBracketWinners(new Map(parsed.bracket))
          if (Array.isArray(parsed.bracketScores)) setBracketScores(new Map(parsed.bracketScores))
          lastSavedRef.current = parsed.ts ?? Date.now()
        }
      }
    } catch {
      // ignore
    }
    setHydrated(true)
  }, [cacheKey])

  // Persist on change
  useEffect(() => {
    if (!hydrated) return
    const state = {
      bracket: [...bracketWinners.entries()],
      bracketScores: [...bracketScores.entries()],
      ts: Date.now(),
    }
    try {
      localStorage.setItem(cacheKey, JSON.stringify(state))
      lastSavedRef.current = state.ts
      setSaveTick((t) => t + 1)
    } catch {
      // quota exceeded
    }
  }, [hydrated, bracketWinners, bracketScores, cacheKey])

  const bracketComplete = bracketWinners.size === 32

  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const handleSubmit = () => {
    if (!bracketComplete) {
      setToast({ type: 'err', msg: 'Completa todos los partidos del cuadro' })
      return
    }
    const bracket = [...bracketWinners.entries()].map(([key, ganador_equipo_id]) => {
      const [ronda, slotStr] = key.split(':')
      const sc = bracketScores.get(key)
      return {
        ronda: ronda as Round,
        slot: parseInt(slotStr, 10),
        ganador_equipo_id,
        goles_local: sc?.gl ?? null,
        goles_visitante: sc?.gv ?? null,
      }
    })
    startTransition(async () => {
      const res = await saveBracket(bracket, {
        campeon_equipo_id: campeonId,
        pichichi_jugador_id: null,
        mvp_jugador_id: null,
        guante_oro_jugador_id: null,
        joven_jugador_id: null,
        best_xi: null,
      })
      if (res.ok) {
        setLocalEnviada(true)
        setEditMode(false)
        setToast({ type: 'ok', msg: '¡Cuadro guardado!' })
      } else {
        setToast({ type: 'err', msg: res.error })
      }
    })
  }

  const lastSavedLabel = useMemo(() => {
    if (saveTick === 0) return null
    const d = new Date(lastSavedRef.current)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [saveTick])

  return (
    <>
      {/* Already-submitted banner */}
      {localEnviada && !editMode && (
        <div className="px-4 pt-4 pb-2">
          <div
            className="rounded-2xl px-4 py-4 flex items-start justify-between gap-3"
            style={{ background: 'linear-gradient(135deg, #004d40 0%, #00897b 100%)' }}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Check size={14} color="white" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white opacity-80">
                  Cuadro enviado
                </span>
              </div>
              <p className="text-white font-black text-base leading-tight">¡Ya has enviado tu cuadro!</p>
              <p className="text-[11px] text-white opacity-70 mt-0.5">
                El plazo de predicciones ha cerrado.
              </p>
            </div>
          </div>
        </div>
      )}

      {!localEnviada && (
        <div className="px-4 pt-4 pb-2">
          <div className="rounded-2xl px-4 py-4 text-center" style={{ background: '#f3f4f6' }}>
            <p className="text-sm font-bold text-gray-500">El plazo de envío del cuadro ha cerrado.</p>
          </div>
        </div>
      )}
    </>
  )
}

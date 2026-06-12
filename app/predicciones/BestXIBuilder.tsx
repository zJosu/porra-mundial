'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import type { Jugador } from './PlayerSelect'
import { sortByPriority } from '@/app/lib/player-priority'

export type BestXISlot =
  | 'GK'
  | 'LD'
  | 'DF1'
  | 'DF2'
  | 'LI'
  | 'MC1'
  | 'MC2'
  | 'MC3'
  | 'ED'
  | 'DC'
  | 'EI'

export type BestXI = Partial<Record<BestXISlot, number | null>>

const POSITIONS: Array<{ slot: BestXISlot; label: string; x: number; y: number }> = [
  { slot: 'EI', label: 'EI',  x: 15, y: 18 },
  { slot: 'DC', label: 'DC',  x: 50, y: 14 },
  { slot: 'ED', label: 'ED',  x: 85, y: 18 },
  { slot: 'MC1', label: 'MC', x: 25, y: 42 },
  { slot: 'MC2', label: 'MC', x: 50, y: 52 },
  { slot: 'MC3', label: 'MC', x: 75, y: 42 },
  { slot: 'LI', label: 'LI',  x: 12, y: 71 },
  { slot: 'DF1', label: 'DF', x: 37, y: 71 },
  { slot: 'DF2', label: 'DF', x: 63, y: 71 },
  { slot: 'LD', label: 'LD',  x: 88, y: 71 },
  { slot: 'GK', label: 'PT',  x: 50, y: 88 },
]

const SLOT_POSICION: Record<BestXISlot, string> = {
  GK:  'portero',
  LD:  'defensa',
  DF1: 'defensa',
  DF2: 'defensa',
  LI:  'defensa',
  MC1: 'centrocampista',
  MC2: 'centrocampista',
  MC3: 'centrocampista',
  ED:  'delantero',
  DC:  'delantero',
  EI:  'delantero',
}

const SLOT_NAMES: Record<BestXISlot, string> = {
  GK:  'Portero',
  LD:  'Lateral derecho',
  DF1: 'Defensa central',
  DF2: 'Defensa central',
  LI:  'Lateral izquierdo',
  MC1: 'Mediocentro',
  MC2: 'Mediocentro',
  MC3: 'Mediocentro',
  ED:  'Extremo derecho',
  DC:  'Delantero centro',
  EI:  'Extremo izquierdo',
}

type EquipoMin = { nombre: string; codigo_bandera: string }

export function BestXIBuilder({
  bestXI,
  onChange,
  jugadores,
  equipos,
}: {
  bestXI: BestXI
  onChange: (next: BestXI) => void
  jugadores: Jugador[]
  equipos: Map<number, EquipoMin>
}) {
  const [activeSlot, setActiveSlot] = useState<BestXISlot | null>(null)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (activeSlot) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [activeSlot])

  const playerById = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const posFilter = activeSlot ? SLOT_POSICION[activeSlot] : null
    const baseRaw = posFilter
      ? jugadores.filter((j) => j.posicion === posFilter)
      : jugadores
    const base = sortByPriority(baseRaw, posFilter)
    if (!q) return posFilter ? base : base.slice(0, 40)
    return base.filter((j) => {
      const full = `${j.nombre} ${j.apellidos ?? ''}`
        .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      const eq = equipos.get(j.equipo_id)
      const eqNorm = (eq?.nombre ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      return full.includes(q) || eqNorm.includes(q)
    })
  }, [query, jugadores, equipos, activeSlot])

  const pick = (playerId: number) => {
    if (!activeSlot) return
    // Remove player from any other slot
    const next: BestXI = {}
    for (const [k, v] of Object.entries(bestXI) as [BestXISlot, number | null][]) {
      if (v !== playerId) next[k] = v
    }
    next[activeSlot] = playerId
    onChange(next)
    setActiveSlot(null)
  }

  const clearSlot = (slot: BestXISlot) => {
    const next = { ...bestXI }
    delete next[slot]
    onChange(next)
  }

  const filledCount = Object.values(bestXI).filter((v) => v != null).length

  return (
    <div className="select-none">
      {/* Field */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ aspectRatio: '3/4' }}
      >
        {/* Background field */}
        <img
          src="/squad_builder_template.jpg"
          alt="Campo"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Subtle dark overlay for readability */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.15)' }} />

        {/* Formation positions */}
        {POSITIONS.map(({ slot, label, x, y }) => {
          const playerId = bestXI[slot] ?? null
          const player = playerId != null ? playerById.get(playerId) ?? null : null
          const isActive = activeSlot === slot

          return (
            <button
              key={slot}
              type="button"
              onClick={() => setActiveSlot(isActive ? null : slot)}
              className="absolute flex flex-col items-center transition-transform"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: `translate(-50%, -50%) scale(${isActive ? 1.12 : 1})`,
                gap: 2,
              }}
            >
              {/* Player photo circle */}
              <div
                className="rounded-full overflow-hidden flex items-center justify-center"
                style={{
                  width: 44,
                  height: 44,
                  border: `3px solid ${isActive ? '#FFD100' : player ? '#65ffd9' : 'rgba(255,255,255,0.65)'}`,
                  background: player ? '#1a1a1a' : 'rgba(0,0,0,0.48)',
                  boxShadow: isActive
                    ? '0 0 0 3px rgba(255,209,0,0.45)'
                    : player
                    ? '0 2px 10px rgba(0,0,0,0.45)'
                    : '0 1px 4px rgba(0,0,0,0.3)',
                }}
              >
                {player ? (
                  player.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-black text-[14px]">
                      {player.nombre.charAt(0)}
                      {player.apellidos?.charAt(0) ?? ''}
                    </span>
                  )
                ) : (
                  <span
                    className="font-black text-[11px]"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {label}
                  </span>
                )}
              </div>

              {/* Name tag */}
              <div
                className="rounded-full text-[8.5px] font-black leading-none px-1.5 py-[3px] max-w-[68px] truncate"
                style={{
                  background: player ? 'rgba(0,77,64,0.9)' : 'rgba(0,0,0,0.6)',
                  color: player ? '#65ffd9' : 'rgba(255,255,255,0.75)',
                }}
              >
                {player
                  ? (player.apellidos?.trim() ? player.apellidos : player.nombre)
                  : '+'}
              </div>
            </button>
          )
        })}

        {/* Counter badge */}
        <div
          className="absolute top-2.5 right-2.5 rounded-full px-2.5 py-1 text-[9px] font-black"
          style={{
            background: filledCount === 11 ? '#004d40' : 'rgba(0,0,0,0.55)',
            color: filledCount === 11 ? '#65ffd9' : 'rgba(255,255,255,0.75)',
          }}
        >
          {filledCount}/11
        </div>
      </div>

      {/* Player search panel */}
      {activeSlot && (
        <div
          className="mt-2 rounded-2xl bg-white overflow-hidden border border-slate-200"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ background: '#004d40' }}
          >
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/60">
                Seleccionar
              </span>
              <p className="text-[12px] font-black text-white leading-none">
                {SLOT_NAMES[activeSlot]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {bestXI[activeSlot] != null && (
                <button
                  type="button"
                  onClick={() => { clearSlot(activeSlot); setActiveSlot(null) }}
                  className="text-[9px] font-black text-red-300 underline"
                >
                  Quitar
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                <X size={11} color="white" />
              </button>
            </div>
          </div>

          {/* Search input */}
          <div className="px-3 pt-2.5 pb-1.5">
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre o selección…"
              className="w-full text-[12px] rounded-lg px-3 py-2 border border-slate-200 bg-slate-50 outline-none focus:ring-1 focus:ring-[#004d40] focus:border-[#004d40]"
            />
          </div>

          {/* Player list */}
          <div className="overflow-y-auto" style={{ maxHeight: 220 }}>
            {filtered.map((j) => {
              const eq = equipos.get(j.equipo_id)
              const selected = bestXI[activeSlot] === j.id
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => pick(j.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-left"
                  style={{
                    background: selected ? '#e6fff9' : 'transparent',
                    borderLeft: `3px solid ${selected ? '#004d40' : 'transparent'}`,
                  }}
                >
                  {/* Photo */}
                  <div
                    className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0"
                    style={{ background: '#e2e8f0' }}
                  >
                    {j.foto_url ? (
                      <img
                        src={j.foto_url}
                        alt={j.nombre}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-slate-500 text-[10px] font-bold">
                        {j.nombre.charAt(0)}
                        {j.apellidos?.charAt(0) ?? ''}
                      </span>
                    )}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-slate-800 truncate">
                      {j.nombre} {j.apellidos}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">{eq?.nombre ?? ''}</div>
                  </div>
                  {selected && (
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: '#004d40' }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

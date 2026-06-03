'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, ChevronDown, Trophy } from 'lucide-react'

export type Jugador = {
  id: number
  nombre: string
  apellidos: string
  posicion: string | null
  numero_dorsal: number | null
  foto_url: string | null
  equipo_id: number
}

export type EquipoLite = {
  id: number
  nombre: string
  codigo_bandera: string
}

function PhotoOrInitials({
  jugador,
  size = 32,
}: {
  jugador: Jugador
  size?: number
}) {
  const initials = `${jugador.nombre.charAt(0)}${jugador.apellidos.charAt(0)}`.toUpperCase()
  if (jugador.foto_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={jugador.foto_url}
        alt={`${jugador.nombre} ${jugador.apellidos}`}
        width={size}
        height={size}
        className="rounded-full object-cover bg-gray-100"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  )
}

function FlagImg({ codigo, alt }: { codigo: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${codigo.toLowerCase()}.png`}
      alt={alt}
      width={16}
      height={11}
      className="rounded-sm object-cover"
      style={{ width: 16, height: 11 }}
    />
  )
}

export function PlayerSelect({
  label,
  icon,
  iconColor,
  jugadores,
  equipos,
  value,
  onChange,
  placeholder = 'Buscar jugador…',
}: {
  label: string
  icon: React.ReactNode
  iconColor: string
  jugadores: Jugador[]
  equipos: Map<number, EquipoLite>
  value: number | null
  onChange: (id: number | null) => void
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const selected = useMemo(
    () => (value != null ? jugadores.find((j) => j.id === value) : null) ?? null,
    [value, jugadores],
  )
  const selectedTeam = selected ? equipos.get(selected.equipo_id) ?? null : null

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return jugadores.slice(0, 50)
    const matches: Jugador[] = []
    for (const j of jugadores) {
      const team = equipos.get(j.equipo_id)
      const hay =
        `${j.nombre} ${j.apellidos} ${team?.nombre ?? ''}`.toLowerCase().includes(q)
      if (hay) matches.push(j)
      if (matches.length >= 60) break
    }
    return matches
  }, [query, jugadores, equipos])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (!panelRef.current) return
      if (!panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left active:scale-[0.99] transition"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${iconColor}1a` }}
        >
          <span style={{ color: iconColor }}>{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
          {selected ? (
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <PhotoOrInitials jugador={selected} size={20} />
              <span className="text-[13px] font-bold text-gray-900 truncate">
                {selected.nombre} {selected.apellidos}
              </span>
              {selectedTeam && (
                <div className="flex items-center gap-1 shrink-0">
                  <FlagImg codigo={selectedTeam.codigo_bandera} alt={selectedTeam.nombre} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-[13px] text-gray-400 mt-0.5">Sin seleccionar</p>
          )}
        </div>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-30 overflow-hidden"
          style={{ maxHeight: 380 }}
        >
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-2">
            <Search size={14} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 text-[13px] bg-transparent outline-none placeholder:text-gray-300"
            />
            {value != null && (
              <button
                type="button"
                onClick={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="text-[10px] font-bold text-red-500 uppercase tracking-wider px-2 py-1 rounded-md hover:bg-red-50"
              >
                Quitar
              </button>
            )}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <X size={14} />
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 330 }}>
            {results.length === 0 && (
              <p className="px-4 py-6 text-center text-[11px] text-gray-400">
                Sin resultados
              </p>
            )}
            {results.map((j) => {
              const team = equipos.get(j.equipo_id)
              const isSel = j.id === value
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => {
                    onChange(j.id)
                    setOpen(false)
                    setQuery('')
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 border-t border-gray-50 first:border-t-0 ${
                    isSel ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <PhotoOrInitials jugador={j} size={36} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate flex items-center gap-1.5">
                      {j.nombre} {j.apellidos}
                      {isSel && <Trophy size={11} style={{ color: iconColor }} />}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {team && <FlagImg codigo={team.codigo_bandera} alt={team.nombre} />}
                      <span className="text-[10px] text-gray-500 truncate">
                        {team?.nombre ?? '?'}
                        {j.posicion ? ` · ${j.posicion}` : ''}
                        {j.numero_dorsal ? ` · #${j.numero_dorsal}` : ''}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

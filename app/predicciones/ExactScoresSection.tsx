'use client'

import { useState, useTransition } from 'react'
import { Check, Send, Clock } from 'lucide-react'
import { HARDCODED_R32 } from './bracket'
import type { EquipoInfo } from './standings'
import { saveExactScore } from '@/app/actions/bracket'

type KORonda = 'R32' | 'R16' | 'QF' | 'SF' | 'F'

export type ExactScoresSectionProps = {
  equipos: EquipoInfo[]
  /** "ronda:slot" → { gl, gv } for already-submitted predictions. */
  lockedScores: Record<string, { gl: number; gv: number }>
  /** "ronda:slot" → winner equipo_id, from resultados_bracket (official). */
  realBracket: Record<string, number>
  /** Knockout partidos with start times, for the client-side time check. */
  knockoutPartidos: { equipo_local_id: number; equipo_visitante_id: number; fecha: string }[]
}

const ROUNDS: KORonda[] = ['R32', 'R16', 'QF', 'SF', 'F']
const ROUND_LABEL: Record<KORonda, string> = {
  R32: '1/16 — Ronda de 32',
  R16: 'Octavos de final',
  QF: 'Cuartos de final',
  SF: 'Semifinales',
  F: 'Final',
}
const ROUND_SLOTS: Record<KORonda, number> = { R32: 16, R16: 8, QF: 4, SF: 2, F: 1 }

function getTeamIds(
  ronda: KORonda,
  slot: number,
  realBracket: Record<string, number>,
): [number | null, number | null] {
  if (ronda === 'R32') {
    const m = HARDCODED_R32[slot - 1]
    return m ? [m.teamA, m.teamB] : [null, null]
  }
  const prevRonda: Record<string, string> = { R16: 'R32', QF: 'R16', SF: 'QF', F: 'SF' }
  const pr = prevRonda[ronda]
  if (!pr) return [null, null]
  const sA = ronda === 'F' ? 1 : (slot - 1) * 2 + 1
  const sB = ronda === 'F' ? 2 : (slot - 1) * 2 + 2
  return [realBracket[`${pr}:${sA}`] ?? null, realBracket[`${pr}:${sB}`] ?? null]
}

function getFecha(
  teamA: number,
  teamB: number,
  partidos: { equipo_local_id: number; equipo_visitante_id: number; fecha: string }[],
): string | null {
  const p = partidos.find(
    (p) =>
      (p.equipo_local_id === teamA && p.equipo_visitante_id === teamB) ||
      (p.equipo_local_id === teamB && p.equipo_visitante_id === teamA),
  )
  return p?.fecha ?? null
}

// ─── Single match row ─────────────────────────────────────────────────────────

function MatchRow({
  ronda, slot, teamA, teamB, equipoA, equipoB, locked, matchFecha,
}: {
  ronda: KORonda; slot: number
  teamA: number; teamB: number
  equipoA?: EquipoInfo; equipoB?: EquipoInfo
  locked: { gl: number; gv: number } | null
  matchFecha: string | null
}) {
  const matchStarted = matchFecha != null && Date.now() > new Date(matchFecha).getTime()
  const [gl, setGl] = useState('')
  const [gv, setGv] = useState('')
  const [sent, setSent] = useState<{ gl: number; gv: number } | null>(locked)
  const [err, setErr] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const handleSubmit = () => {
    const glN = parseInt(gl, 10)
    const gvN = parseInt(gv, 10)
    if (!Number.isInteger(glN) || glN < 0 || glN > 99 || !Number.isInteger(gvN) || gvN < 0 || gvN > 99) {
      setErr('Resultado inválido')
      return
    }
    setErr(null)
    startTransition(async () => {
      const res = await saveExactScore(ronda, slot, glN, gvN)
      if (res.ok) setSent({ gl: glN, gv: gvN })
      else setErr(res.error)
    })
  }

  return (
    <div className="py-2.5 px-3 border-b border-gray-100 last:border-0">
      {/* Teams */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {equipoA && (
            <img
              src={`https://flagcdn.com/w40/${equipoA.codigo_bandera.toLowerCase()}.png`}
              alt={equipoA.codigo_bandera}
              className="w-5 h-5 rounded-full object-cover shrink-0"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
            />
          )}
          <span className="text-[11px] font-bold text-gray-800 truncate">
            {equipoA?.nombre ?? '—'}
          </span>
        </div>
        <span className="text-[9px] text-gray-400 font-bold shrink-0">vs</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
          <span className="text-[11px] font-bold text-gray-800 truncate text-right">
            {equipoB?.nombre ?? '—'}
          </span>
          {equipoB && (
            <img
              src={`https://flagcdn.com/w40/${equipoB.codigo_bandera.toLowerCase()}.png`}
              alt={equipoB.codigo_bandera}
              className="w-5 h-5 rounded-full object-cover shrink-0"
              style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
            />
          )}
        </div>
      </div>

      {/* Score entry / locked / started */}
      <div className="flex items-center justify-end gap-2">
        {sent != null ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-black tabular-nums" style={{ color: '#004d40' }}>
              {sent.gl} — {sent.gv}
            </span>
            <span className="flex items-center gap-0.5 text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              <Check size={8} /> Enviado
            </span>
          </div>
        ) : matchStarted ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-orange-500">
            <Clock size={10} /> Partido en curso
          </span>
        ) : (
          <>
            {err && <span className="text-[9px] text-red-500 flex-1 text-right">{err}</span>}
            <input
              type="number" min="0" max="99" inputMode="numeric"
              value={gl} onChange={(e) => setGl(e.target.value)}
              className="w-9 h-8 rounded-lg border border-gray-200 bg-gray-50 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="0"
            />
            <span className="text-[10px] text-gray-400 font-black">—</span>
            <input
              type="number" min="0" max="99" inputMode="numeric"
              value={gv} onChange={(e) => setGv(e.target.value)}
              className="w-9 h-8 rounded-lg border border-gray-200 bg-gray-50 text-center text-xs font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="0"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || gl === '' || gv === ''}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-white disabled:opacity-40 transition active:scale-95"
              style={{ background: '#00A651' }}
            >
              <Send size={9} />
              {pending ? '…' : 'OK'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function ExactScoresSection({
  equipos, lockedScores, realBracket, knockoutPartidos,
}: ExactScoresSectionProps) {
  const equipoMap = new Map(equipos.map((e) => [e.id, e]))

  const visibleRounds = ROUNDS.flatMap((ronda) => {
    const total = ROUND_SLOTS[ronda]
    const matches: { slot: number; teamA: number; teamB: number }[] = []
    for (let slot = 1; slot <= total; slot++) {
      const [tA, tB] = getTeamIds(ronda, slot, realBracket)
      if (tA != null && tB != null) matches.push({ slot, teamA: tA, teamB: tB })
    }
    return matches.length > 0 ? [{ ronda, matches }] : []
  })

  if (visibleRounds.length === 0) return null

  const totalSent = Object.keys(lockedScores).length

  return (
    <div className="px-4 pb-8">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
              Vida extra
            </p>
            <h3 className="text-sm font-black text-gray-900">Resultados exactos</h3>
          </div>
          <div className="flex items-center gap-2">
            {totalSent > 0 && (
              <span className="text-[10px] font-bold text-gray-400">{totalSent} enviados</span>
            )}
            <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1 rounded-full">
              +1 por acierto
            </span>
          </div>
        </div>

        {visibleRounds.map(({ ronda, matches }) => (
          <div key={ronda}>
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                {ROUND_LABEL[ronda]}
              </span>
            </div>
            {matches.map(({ slot, teamA, teamB }) => (
              <MatchRow
                key={`${ronda}:${slot}`}
                ronda={ronda}
                slot={slot}
                teamA={teamA}
                teamB={teamB}
                equipoA={equipoMap.get(teamA)}
                equipoB={equipoMap.get(teamB)}
                locked={lockedScores[`${ronda}:${slot}`] ?? null}
                matchFecha={getFecha(teamA, teamB, knockoutPartidos)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

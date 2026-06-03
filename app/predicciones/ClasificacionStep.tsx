'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, ArrowDown, Check, AlertCircle, Trophy } from 'lucide-react'
import {
  computeGroupStandings,
  type EquipoInfo,
  type PartidoInfo,
  type Resultado,
  type FilaClasif,
} from './standings'

function FlagImg({ codigo, nombre, size = 24 }: { codigo: string; nombre: string; size?: number }) {
  const src = `https://flagcdn.com/w80/${codigo.toLowerCase()}.png`
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={nombre}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded object-cover shadow-sm"
      style={{ width: size, height: Math.round(size * 0.67) }}
    />
  )
}

type Row = FilaClasif & { equipo: EquipoInfo }

export function ClasificacionStep({
  equipos,
  partidos,
  picks,
  clasifSaved,
  tercerosSaved,
  onSnapshotChange,
}: {
  equipos: EquipoInfo[]
  partidos: PartidoInfo[]
  picks: Map<number, Resultado>
  clasifSaved: { grupo: string; equipo_id: number; posicion: number }[]
  tercerosSaved: { equipo_id: number; posicion: number }[]
  onSnapshotChange: (
    clasif: { grupo: string; equipo_id: number; posicion: number }[],
    terceros: { equipo_id: number; posicion: number }[],
  ) => void
}) {
  const equipoById = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos])

  // How many matches per group have been picked (0..6).
  const playedByGroup = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of partidos) {
      if (!m.has(p.grupo)) m.set(p.grupo, 0)
      if (picks.get(p.id)) m.set(p.grupo, m.get(p.grupo)! + 1)
    }
    return m
  }, [partidos, picks])

  const isGroupComplete = (g: string) => (playedByGroup.get(g) ?? 0) === 6

  // Raw standings from picks (sorted by points desc).
  const rawStandings = useMemo(
    () => computeGroupStandings(equipos, partidos, picks),
    [equipos, partidos, picks],
  )

  // Per-group ordered list, applying user's saved overrides for tied teams when valid.
  const buildOrdered = (): Map<string, Row[]> => {
    const out = new Map<string, Row[]>()
    for (const [grupo, rows] of rawStandings) {
      const withTeam: Row[] = rows.map((r) => ({ ...r, equipo: equipoById.get(r.equipo_id)! }))
      // Apply saved override only within tied groups
      const savedForGroup = clasifSaved.filter((c) => c.grupo === grupo)
      if (savedForGroup.length === 4) {
        const savedPos = new Map(savedForGroup.map((c) => [c.equipo_id, c.posicion]))
        // Only reorder among teams with same points
        const groupedByPts = new Map<number, Row[]>()
        for (const r of withTeam) {
          if (!groupedByPts.has(r.puntos)) groupedByPts.set(r.puntos, [])
          groupedByPts.get(r.puntos)!.push(r)
        }
        const result: Row[] = []
        const ptsKeys = [...groupedByPts.keys()].sort((a, b) => b - a)
        for (const pts of ptsKeys) {
          const tie = groupedByPts.get(pts)!
          tie.sort((a, b) => {
            const pa = savedPos.get(a.equipo_id) ?? 99
            const pb = savedPos.get(b.equipo_id) ?? 99
            return pa - pb
          })
          result.push(...tie)
        }
        out.set(grupo, result)
      } else {
        out.set(grupo, withTeam)
      }
    }
    return out
  }

  const [standings, setStandings] = useState<Map<string, Row[]>>(buildOrdered)

  // Rebuild when picks change (live re-derive).
  // Use functional updater: return prev if equipo ordering is identical to avoid
  // triggering downstream effects when data hasn't actually changed.
  useEffect(() => {
    setStandings((prev) => {
      const next = buildOrdered()
      if (prev.size === next.size) {
        let same = true
        for (const [g, rows] of next) {
          const prevRows = prev.get(g)
          if (!prevRows || prevRows.length !== rows.length) { same = false; break }
          for (let i = 0; i < rows.length; i++) {
            if (prevRows[i].equipo_id !== rows[i].equipo_id) { same = false; break }
          }
          if (!same) break
        }
        if (same) return prev
      }
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picks])

  // Thirds list ordered by user (saved override or default by group letter).
  const groupKeys = useMemo(() => [...standings.keys()].sort(), [standings])

  const thirdsTeams = useMemo(() => {
    const list: { team: EquipoInfo; puntos: number }[] = []
    for (const g of groupKeys) {
      if (!isGroupComplete(g)) continue
      const third = standings.get(g)?.[2]
      if (third) list.push({ team: third.equipo, puntos: third.puntos })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupKeys, standings, playedByGroup])

  const thirdsPoints = useMemo(() => {
    const m = new Map<number, number>()
    for (const t of thirdsTeams) m.set(t.team.id, t.puntos)
    return m
  }, [thirdsTeams])

  const [thirdsOrder, setThirdsOrder] = useState<number[]>([])

  // When thirds change (because phase 1 picks changed), reorder:
  // primary key = points desc, secondary = saved tie-break order (if any), tertiary = equipo_id asc.
  useEffect(() => {
    setThirdsOrder((prev) => {
      const savedMap = new Map(tercerosSaved.map((t) => [t.equipo_id, t.posicion]))
      const ordered = thirdsTeams
        .map((t) => t.team.id)
        .sort((a, b) => {
          const pa = thirdsPoints.get(a) ?? 0
          const pb = thirdsPoints.get(b) ?? 0
          if (pb !== pa) return pb - pa
          const sa = savedMap.get(a) ?? 99
          const sb = savedMap.get(b) ?? 99
          if (sa !== sb) return sa - sb
          return a - b
        })
      // Bail out if identical to avoid render loops.
      if (prev.length === ordered.length && prev.every((id, i) => id === ordered[i])) {
        return prev
      }
      return ordered
    })
  }, [thirdsTeams, thirdsPoints, tercerosSaved])

  const moveInGroup = (grupo: string, fromIdx: number, dir: -1 | 1) => {
    setStandings((prev) => {
      const next = new Map(prev)
      const rows = [...next.get(grupo)!]
      const toIdx = fromIdx + dir
      if (toIdx < 0 || toIdx >= rows.length) return prev
      // Only allow swap if same points (don't break sport logic)
      if (rows[fromIdx].puntos !== rows[toIdx].puntos) return prev
      ;[rows[fromIdx], rows[toIdx]] = [rows[toIdx], rows[fromIdx]]
      next.set(grupo, rows)
      return next
    })
  }

  const moveThird = (fromIdx: number, dir: -1 | 1) => {
    setThirdsOrder((prev) => {
      const pts = thirdsPoints.get(prev[fromIdx]) ?? 0
      // Find nearest same-points peer in the given direction.
      let toIdx = -1
      if (dir === -1) {
        for (let i = fromIdx - 1; i >= 0; i--) {
          if ((thirdsPoints.get(prev[i]) ?? 0) === pts) {
            toIdx = i
            break
          }
        }
      } else {
        for (let i = fromIdx + 1; i < prev.length; i++) {
          if ((thirdsPoints.get(prev[i]) ?? 0) === pts) {
            toIdx = i
            break
          }
        }
      }
      if (toIdx === -1) return prev
      const next = [...prev]
      ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]]
      return next
    })
  }

  // Emit snapshot upward whenever standings or thirds change.
  // Only emit when groups are complete (positions are meaningful).
  const lastEmittedRef = useRef<string>('')
  useEffect(() => {
    const clasifPayload: { grupo: string; equipo_id: number; posicion: number }[] = []
    for (const [grupo, rows] of standings) {
      if (!isGroupComplete(grupo)) continue
      rows.forEach((r, idx) => {
        clasifPayload.push({ grupo, equipo_id: r.equipo_id, posicion: idx + 1 })
      })
    }
    const tercerosPayload = thirdsOrder.map((id, idx) => ({ equipo_id: id, posicion: idx + 1 }))
    const sig = JSON.stringify({ c: clasifPayload, t: tercerosPayload })
    if (sig === lastEmittedRef.current) return
    lastEmittedRef.current = sig
    onSnapshotChange(clasifPayload, tercerosPayload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standings, thirdsOrder, playedByGroup])

  const posStyle = (pos: number) => {
    if (pos === 1) return { bg: '#00A651', color: 'white', label: '1º' }
    if (pos === 2) return { bg: '#00A651', color: 'white', label: '2º' }
    if (pos === 3) return { bg: '#FFD100', color: '#004d40', label: '3º' }
    return { bg: '#E8192C', color: 'white', label: '4º' }
  }

  return (
    <>
      {/* Group tables */}
      <div className="px-4 py-4 space-y-5">
        {groupKeys.map((grupo) => {
          const rows = standings.get(grupo)!
          const played = playedByGroup.get(grupo) ?? 0
          const complete = played === 6
          return (
            <section key={grupo}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest text-white"
                  style={{ background: '#004d40' }}
                >
                  Grupo {grupo}
                </span>
                {!complete && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                    style={{ background: '#fff3e0', color: '#c07700' }}
                  >
                    Provisional · {played}/6
                  </span>
                )}
                {complete && (
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1"
                    style={{ background: '#dcfce7', color: '#15803d' }}
                  >
                    <Check size={10} strokeWidth={3} /> Completo
                  </span>
                )}
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[28px_minmax(0,1fr)_28px_28px_28px_28px_36px_60px] gap-1 px-3 py-2 bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                  <span></span>
                  <span>Equipo</span>
                  <span className="text-center">PJ</span>
                  <span className="text-center">G</span>
                  <span className="text-center">E</span>
                  <span className="text-center">P</span>
                  <span className="text-center">Pts</span>
                  <span></span>
                </div>

                {rows.map((r, idx) => {
                  const pos = idx + 1
                  const style = posStyle(pos)
                  const canUp = idx > 0 && rows[idx - 1].puntos === r.puntos
                  const canDown = idx < rows.length - 1 && rows[idx + 1].puntos === r.puntos
                  return (
                    <div
                      key={r.equipo_id}
                      className="grid grid-cols-[28px_minmax(0,1fr)_28px_28px_28px_28px_36px_60px] gap-1 px-3 py-2.5 items-center border-t border-gray-50"
                    >
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black"
                        style={{ background: style.bg, color: style.color }}
                      >
                        {style.label}
                      </div>
                      <div className="flex items-center gap-2 min-w-0">
                        <FlagImg codigo={r.equipo.codigo_bandera} nombre={r.equipo.nombre} />
                        <span className="text-[12px] font-semibold text-gray-800 truncate">
                          {r.equipo.nombre}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-400 text-center tabular-nums">{r.pj}</span>
                      <span className="text-[11px] text-gray-500 text-center tabular-nums">{r.g}</span>
                      <span className="text-[11px] text-gray-500 text-center tabular-nums">{r.e}</span>
                      <span className="text-[11px] text-gray-500 text-center tabular-nums">{r.p}</span>
                      <span
                        className="text-[12px] font-black text-center tabular-nums"
                        style={{ color: '#004d40' }}
                      >
                        {r.puntos}
                      </span>
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          type="button"
                          onClick={() => moveInGroup(grupo, idx, -1)}
                          disabled={!canUp}
                          className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-200 active:scale-90 transition"
                          title={canUp ? 'Subir (empate a puntos)' : 'No se puede mover'}
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveInGroup(grupo, idx, 1)}
                          disabled={!canDown}
                          className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-200 active:scale-90 transition"
                          title={canDown ? 'Bajar (empate a puntos)' : 'No se puede mover'}
                        >
                          <ArrowDown size={11} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {/* Thirds ranking */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-2 mb-3 mt-2">
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest text-white"
            style={{ background: '#FFD100', color: '#004d40' }}
          >
            Mejores terceros
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <p className="text-[11px] text-gray-500 mb-3 px-1">
          Se ordenan por <span className="font-bold text-gray-700">puntos</span>. Solo puedes
          reordenar manualmente los terceros que estén <span className="font-bold">empatados</span>.
          Los <span className="font-bold" style={{ color: '#004d40' }}>8 primeros</span> se
          clasifican a dieciseisavos.
        </p>
        {thirdsOrder.length < 12 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 mb-3 flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#a16207' }} />
            <p className="text-[11px] leading-relaxed" style={{ color: '#854d0e' }}>
              <span className="font-bold">{thirdsOrder.length} de 12 terceros disponibles.</span>{' '}
              Completa los grupos pendientes en Fase 1 para poder ordenarlos todos.
            </p>
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {thirdsOrder.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-[11px] text-gray-400">
                Aún no hay grupos completos. Termina algún grupo en Fase 1 para empezar a ordenar
                terceros.
              </p>
            </div>
          )}
          {thirdsOrder.map((id, idx) => {
            const team = equipoById.get(id)
            if (!team) return null
            const pasa = idx < 8
            const pts = thirdsPoints.get(id) ?? 0
            // Check if any other third anywhere in the list shares the same points.
            let canMoveUp = false
            let canMoveDown = false
            for (let i = 0; i < thirdsOrder.length; i++) {
              if (i === idx) continue
              if ((thirdsPoints.get(thirdsOrder[i]) ?? 0) !== pts) continue
              if (i < idx) canMoveUp = true
              else canMoveDown = true
            }
            const hasArrows = canMoveUp || canMoveDown
            return (
              <div
                key={id}
                className={`grid grid-cols-[36px_minmax(0,1fr)_70px_60px] gap-2 px-3 py-2.5 items-center border-t border-gray-50 first:border-t-0 ${
                  pasa ? '' : 'bg-gray-50/50'
                }`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{
                    background: pasa ? '#00A651' : '#E8192C',
                    color: 'white',
                  }}
                >
                  {idx + 1}
                </div>
                <div className="flex items-center gap-2 min-w-0">
                  <FlagImg codigo={team.codigo_bandera} nombre={team.nombre} />
                  <div className="min-w-0">
                    <p
                      className={`text-[12px] font-semibold truncate ${pasa ? 'text-gray-800' : 'text-gray-500'}`}
                    >
                      {team.nombre}
                    </p>
                    <p className="text-[9px] text-gray-400">
                      Grupo {team.grupo} · 3º · {pts} pts
                    </p>
                  </div>
                </div>
                <span
                  className="text-[9px] font-bold uppercase tracking-wider text-center"
                  style={{ color: pasa ? '#00A651' : '#E8192C' }}
                >
                  {pasa ? 'Pasa' : 'Eliminado'}
                </span>
                <div className="flex items-center gap-0.5 justify-end">
                  {hasArrows ? (
                    <>
                      <button
                        type="button"
                        onClick={() => moveThird(idx, -1)}
                        disabled={!canMoveUp}
                        className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-200 active:scale-90 transition"
                      >
                        <ArrowUp size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveThird(idx, 1)}
                        disabled={!canMoveDown}
                        className="w-6 h-6 rounded-md flex items-center justify-center bg-gray-100 text-gray-500 disabled:opacity-25 disabled:cursor-not-allowed hover:bg-gray-200 active:scale-90 transition"
                      >
                        <ArrowDown size={11} />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Summary card */}
      <div className="px-4 pb-2">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: '#fff8d6' }}
          >
            <Trophy size={20} style={{ color: '#004d40' }} />
          </div>
          <div className="text-[11px] text-gray-500 leading-relaxed">
            <span className="font-bold text-gray-700">32 selecciones</span> pasarán a dieciseisavos: 24
            cabezas de grupo (1º y 2º) + 8 mejores terceros.
          </div>
        </div>
      </div>
    </>
  )
}

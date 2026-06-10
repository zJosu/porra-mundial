'use client'

import { useMemo } from 'react'
import { Lock, Check } from 'lucide-react'
import type { Resultado } from './standings'

export type PartidoUI = {
  id: number
  fecha: string
  grupo: string
  jornada: number
  sede: string
  local: { nombre: string; codigo_bandera: string }
  visitante: { nombre: string; codigo_bandera: string }
}

export type ScorePick = {
  gl: number | null
  gv: number | null
}

export type PrediccionExistente = {
  partido_id: number
  resultado: Resultado
  goles_local: number | null
  goles_visitante: number | null
}

export function resultadoFromScore(gl: number, gv: number): Resultado {
  if (gl > gv) return 'L'
  if (gl < gv) return 'V'
  return 'X'
}

function FlagImg({ codigo, nombre, size = 36 }: { codigo: string; nombre: string; size?: number }) {
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

function ResultPanel({
  active,
  dimmed,
  children,
  title,
}: {
  active: boolean
  dimmed: boolean
  children: React.ReactNode
  title: string
}) {
  return (
    <div
      title={title}
      className={`flex-1 h-9 rounded-lg text-xs font-black tracking-wide flex items-center justify-center select-none transition-all ${
        active
          ? 'text-white shadow-md'
          : 'text-gray-400 bg-white border border-gray-200'
      } ${dimmed && !active ? 'opacity-50' : ''}`}
      style={active ? { background: '#004d40', borderColor: '#004d40' } : undefined}
      aria-hidden="true"
    >
      {children}
    </div>
  )
}

function ScoreInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: number | null
  onChange: (v: number | null) => void
  disabled: boolean
  label: string
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={99}
      step={1}
      disabled={disabled}
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = parseInt(raw, 10)
        if (Number.isNaN(n)) return onChange(null)
        if (n < 0 || n > 99) return
        onChange(n)
      }}
      placeholder="–"
      aria-label={label}
      className="w-10 h-9 text-center text-base font-black rounded-lg bg-white border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed tabular-nums"
    />
  )
}

function formatHora(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) +
    ' · ' +
    d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) +
    ' UTC'
  )
}

export function PredictionForm({
  partidos,
  picks,
  scores,
  onScoresChange,
}: {
  partidos: PartidoUI[]
  picks: Map<number, Resultado>
  scores: Map<number, ScorePick>
  onScoresChange: (m: Map<number, ScorePick>) => void
}) {
  const nowMs = Date.now()

  const { completas, editables } = useMemo(() => {
    let comp = 0, bloq = 0, edit = 0
    for (const p of partidos) {
      const started = new Date(p.fecha).getTime() <= nowMs
      const pick = picks.get(p.id)
      if (started) bloq++
      else {
        edit++
        if (pick) comp++
      }
    }
    return { completas: comp, bloqueadas: bloq, editables: edit }
  }, [partidos, picks, nowMs])

  const pct = editables === 0 ? 100 : Math.round((completas / editables) * 100)

  const grouped = useMemo(() => {
    const byGroup = new Map<string, Map<number, PartidoUI[]>>()
    for (const p of partidos) {
      if (!byGroup.has(p.grupo)) byGroup.set(p.grupo, new Map())
      const byJ = byGroup.get(p.grupo)!
      if (!byJ.has(p.jornada)) byJ.set(p.jornada, [])
      byJ.get(p.jornada)!.push(p)
    }
    return byGroup
  }, [partidos])

  const groupKeys = useMemo(() => [...grouped.keys()].sort(), [grouped])

  const groupProgress = useMemo(() => {
    const m = new Map<string, { done: number; total: number }>()
    for (const g of groupKeys) {
      let done = 0, total = 0
      for (const j of grouped.get(g)!.values()) {
        for (const p of j) {
          if (new Date(p.fecha).getTime() > nowMs) {
            total++
            if (picks.get(p.id)) done++
          }
        }
      }
      m.set(g, { done, total })
    }
    return m
  }, [grouped, groupKeys, picks, nowMs])

  const setScore = (id: number, which: 'gl' | 'gv', value: number | null) => {
    const next = new Map(scores)
    const prev = next.get(id) ?? { gl: null, gv: null }
    const updated: ScorePick = { ...prev, [which]: value }
    if (updated.gl === null && updated.gv === null) next.delete(id)
    else next.set(id, updated)
    onScoresChange(next)
  }

  return (
    <>
      <div className="px-4 pt-2 pb-2 sticky top-32 md:top-0 z-10" style={{ background: '#f9fafb' }}>
        <div className="bg-white rounded-2xl shadow-sm px-4 py-2.5 flex items-center gap-3">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: 'linear-gradient(90deg, #004d40 0%, #65ffd9 100%)',
              }}
            />
          </div>
          <span className="text-sm font-black tabular-nums shrink-0" style={{ color: '#004d40' }}>
            {pct}%
          </span>
        </div>
      </div>



      <div className="px-4 py-4 space-y-7">
        {groupKeys.map((grupo) => {
          const byJ = grouped.get(grupo)!
          const jornadas = [...byJ.keys()].sort((a, b) => a - b)
          return (
            <section key={grupo} id={`grupo-${grupo}`} className="scroll-mt-20">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest text-white"
                  style={{ background: '#004d40' }}
                >
                  Grupo {grupo}
                </span>
                {(() => {
                  const prog = groupProgress.get(grupo)!
                  const done = prog.total > 0 && prog.done === prog.total
                  return (
                    <span
                      className="text-[11px] font-bold tabular-nums"
                      style={{ color: done ? '#005C29' : '#94a3b8' }}
                    >
                      {prog.done}/{prog.total}{done && ' ✓'}
                    </span>
                  )
                })()}
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="space-y-4">
                {jornadas.map((j) => (
                  <div key={j}>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
                      Jornada {j}
                    </p>
                    <div className="space-y-2">
                      {byJ.get(j)!.map((p) => {
                        const pick = picks.get(p.id)
                        const sc = scores.get(p.id) ?? { gl: null, gv: null }
                        const started = new Date(p.fecha).getTime() <= nowMs
                        const hasResult = pick != null

                        return (
                          <div
                            key={p.id}
                            className={`bg-white rounded-2xl shadow-sm px-3.5 py-3 transition ${
                              started ? 'opacity-60' : ''
                            } ${hasResult && !started ? 'ring-1 ring-green-100' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] text-gray-400">{formatHora(p.fecha)}</span>
                              {started ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                  <Lock size={10} /> Cerrado
                                </span>
                              ) : hasResult ? (
                                <span
                                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
                                  style={{ color: '#004d40' }}
                                >
                                  <Check size={11} /> Listo
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
                                  Pendiente
                                </span>
                              )}
                            </div>

                            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 mb-2.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <FlagImg codigo={p.local.codigo_bandera} nombre={p.local.nombre} />
                                <span
                                  className={`text-[13px] font-semibold leading-tight truncate ${
                                    pick === 'L' ? 'text-gray-900' : 'text-gray-500'
                                  }`}
                                >
                                  {p.local.nombre}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <ScoreInput
                                  value={sc.gl}
                                  onChange={(v) => setScore(p.id, 'gl', v)}
                                  disabled={started}
                                  label={`Goles ${p.local.nombre}`}
                                />
                                <span className="text-[11px] font-black text-gray-300">–</span>
                                <ScoreInput
                                  value={sc.gv}
                                  onChange={(v) => setScore(p.id, 'gv', v)}
                                  disabled={started}
                                  label={`Goles ${p.visitante.nombre}`}
                                />
                              </div>
                              <div className="flex items-center gap-2 min-w-0 justify-end">
                                <span
                                  className={`text-[13px] font-semibold leading-tight truncate text-right ${
                                    pick === 'V' ? 'text-gray-900' : 'text-gray-500'
                                  }`}
                                >
                                  {p.visitante.nombre}
                                </span>
                                <FlagImg codigo={p.visitante.codigo_bandera} nombre={p.visitante.nombre} />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <ResultPanel
                                active={pick === 'L'}
                                dimmed={!hasResult}
                                title={`Gana ${p.local.nombre}`}
                              >
                                1
                              </ResultPanel>
                              <ResultPanel
                                active={pick === 'X'}
                                dimmed={!hasResult}
                                title="Empate"
                              >
                                X
                              </ResultPanel>
                              <ResultPanel
                                active={pick === 'V'}
                                dimmed={!hasResult}
                                title={`Gana ${p.visitante.nombre}`}
                              >
                                2
                              </ResultPanel>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </>
  )
}


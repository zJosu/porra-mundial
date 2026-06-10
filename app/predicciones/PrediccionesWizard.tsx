'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import {
  Target,
  ListOrdered,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Check,
  Send,
  CloudCheck,
  AlertCircle,
  Pencil,
} from 'lucide-react'
import { PredictionForm, type PartidoUI, type PrediccionExistente, type ScorePick, resultadoFromScore } from './PredictionForm'
import { ClasificacionStep } from './ClasificacionStep'
import { CuadroStep, type BracketWinners } from './CuadroStep'
import type { BestXI } from './BestXIBuilder'
import type { Jugador } from './PlayerSelect'
import type { EquipoInfo, PartidoInfo, Resultado } from './standings'
import { submitPorraCompleta } from '@/app/actions/submit'
import type { Round } from './bracket'

// Feature flag: bracket (knockout cuadro) hidden until activated.
// Cuando se quiera activar, poner SHOW_BRACKET = true y restaurar el botón
// del cuadro en el stepper + requisito en phase3Complete.
const SHOW_BRACKET = false

type Step = 1 | 2 | 3

const STEPS: { n: Step; label: string; sub: string }[] = [
  { n: 1, label: 'Group Stage', sub: 'Fase 1' },
  { n: 2, label: 'Clasification', sub: 'Fase 2' },
  { n: 3, label: 'Individual Awards', sub: 'Fase 3' },
]

type ClasifSnap = { grupo: string; equipo_id: number; posicion: number }
type TercerosSnap = { equipo_id: number; posicion: number }
type BracketSaved = { ronda: Round; slot: number; ganador_equipo_id: number }
type ExtrasSaved = {
  campeon_equipo_id: number | null
  pichichi_jugador_id: number | null
  mvp_jugador_id: number | null
  guante_oro_jugador_id: number | null
  joven_jugador_id: number | null
  best_xi: Record<string, number> | null
}

type CacheState = {
  picks: [number, Resultado][]
  scores: [number, ScorePick][]
  clasif: ClasifSnap[]
  terceros: TercerosSnap[]
  bracket: [string, number][]
  extras: {
    campeon_equipo_id: number | null
    pichichi_jugador_id: number | null
    mvp_jugador_id: number | null
    guante_oro_jugador_id: number | null
    joven_jugador_id: number | null
    best_xi: Record<string, number>
  }
  ts: number
}

const CACHE_KEY_PREFIX = 'porra-mundial-2026:'

export function PrediccionesWizard({
  userId,
  partidos,
  equipos,
  partidosInfo,
  iniciales,
  clasifSaved,
  tercerosSaved,
  jugadores,
  bracketSaved,
  extrasSaved,
  porraEnviada,
}: {
  userId: string
  partidos: PartidoUI[]
  equipos: EquipoInfo[]
  partidosInfo: PartidoInfo[]
  iniciales: PrediccionExistente[]
  clasifSaved: ClasifSnap[]
  tercerosSaved: TercerosSnap[]
  jugadores: Jugador[]
  bracketSaved: BracketSaved[]
  extrasSaved: ExtrasSaved
  porraEnviada: boolean
}) {
  const cacheKey = `${CACHE_KEY_PREFIX}${userId}`

  const [localEnviada, setLocalEnviada] = useState(porraEnviada)
  const [editMode, setEditMode] = useState(false)

  const [step, setStep] = useState<Step>(1)

  const changeStep = (n: Step) => {
    setStep(n)
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' })
  }

  // Scores: source of truth. Picks (Resultado) are derived from scores when both gl & gv set.
  const [scores, setScores] = useState<Map<number, ScorePick>>(() => {
    const m = new Map<number, ScorePick>()
    for (const p of iniciales) {
      if (p.goles_local != null || p.goles_visitante != null) {
        m.set(p.partido_id, { gl: p.goles_local, gv: p.goles_visitante })
      }
    }
    return m
  })

  const picks = useMemo<Map<number, Resultado>>(() => {
    const m = new Map<number, Resultado>()
    for (const [id, s] of scores) {
      if (s.gl != null && s.gv != null) m.set(id, resultadoFromScore(s.gl, s.gv))
    }
    return m
  }, [scores])
  const [clasifSnap, setClasifSnap] = useState<ClasifSnap[]>(clasifSaved)
  const [tercerosSnap, setTercerosSnap] = useState<TercerosSnap[]>(tercerosSaved)
  const [bracketWinners, setBracketWinners] = useState<BracketWinners>(
    () => new Map(bracketSaved.map((b) => [`${b.ronda}:${b.slot}`, b.ganador_equipo_id])),
  )
  const [campeonId, setCampeonId] = useState<number | null>(extrasSaved.campeon_equipo_id)
  const [pichichiId, setPichichiId] = useState<number | null>(extrasSaved.pichichi_jugador_id)
  const [mvpId, setMvpId] = useState<number | null>(extrasSaved.mvp_jugador_id)
  const [guanteOroId, setGuanteOroId] = useState<number | null>(extrasSaved.guante_oro_jugador_id)
  const [jovenId, setJovenId] = useState<number | null>(extrasSaved.joven_jugador_id)
  const [bestXI, setBestXI] = useState<BestXI>((extrasSaved.best_xi ?? {}) as BestXI)

  const [hydrated, setHydrated] = useState(false)
  const [saveTick, setSaveTick] = useState(0)
  const lastSavedRef = useRef<number>(0)

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey)
      if (raw) {
        const parsed: CacheState = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.scores)) setScores(new Map(parsed.scores))
          else if (Array.isArray(parsed.picks)) {
            // Legacy cache: synthesize scores from 1X2 (gl/gv unknown)
            // We just leave scores empty so the user re-enters; picks are derived
          }
          if (Array.isArray(parsed.clasif)) setClasifSnap(parsed.clasif)
          if (Array.isArray(parsed.terceros)) setTercerosSnap(parsed.terceros)
          if (Array.isArray(parsed.bracket)) setBracketWinners(new Map(parsed.bracket))
          if (parsed.extras) {
            if (parsed.extras.campeon_equipo_id !== undefined)
              setCampeonId(parsed.extras.campeon_equipo_id)
            if (parsed.extras.pichichi_jugador_id !== undefined)
              setPichichiId(parsed.extras.pichichi_jugador_id)
            if (parsed.extras.mvp_jugador_id !== undefined)
              setMvpId(parsed.extras.mvp_jugador_id)
            if (parsed.extras.guante_oro_jugador_id !== undefined)
              setGuanteOroId(parsed.extras.guante_oro_jugador_id)
            if (parsed.extras.joven_jugador_id !== undefined)
              setJovenId(parsed.extras.joven_jugador_id)
            if (parsed.extras.best_xi !== undefined)
              setBestXI(parsed.extras.best_xi as BestXI)
          }
          lastSavedRef.current = parsed.ts ?? Date.now()
        }
      }
    } catch {
      // ignore corrupt cache
    }
    setHydrated(true)
  }, [cacheKey])

  // Persist on every change (debounced via microtask + tick for indicator)
  useEffect(() => {
    if (!hydrated) return
    const state: CacheState = {
      picks: [...picks.entries()],
      scores: [...scores.entries()],
      clasif: clasifSnap,
      terceros: tercerosSnap,
      bracket: [...bracketWinners.entries()],
      extras: {
        campeon_equipo_id: campeonId,
        pichichi_jugador_id: pichichiId,
        mvp_jugador_id: mvpId,
        guante_oro_jugador_id: guanteOroId,
        joven_jugador_id: jovenId,
        best_xi: bestXI as Record<string, number>,
      },
      ts: Date.now(),
    }
    try {
      localStorage.setItem(cacheKey, JSON.stringify(state))
      lastSavedRef.current = state.ts
      setSaveTick((t) => t + 1)
    } catch {
      // quota exceeded etc.
    }
  }, [hydrated, picks, scores, clasifSnap, tercerosSnap, bracketWinners, campeonId, pichichiId, mvpId, guanteOroId, jovenId, bestXI, cacheKey])

  const totalGroupMatches = partidos.length
  const completedPicks = useMemo(() => {
    let n = 0
    for (const p of partidos) if (picks.get(p.id)) n++
    return n
  }, [partidos, picks])
  const phase1Complete = completedPicks === totalGroupMatches

  const phase2Complete =
    clasifSnap.length === 48 && tercerosSnap.length === 12

  // Phase 3 (Individual Awards): pichichi + mvp + guante + joven required.
  // Best XI and bracket NOT required while SHOW_BRACKET = false.
  const phase3Complete = SHOW_BRACKET
    ? bracketWinners.size === 32 && campeonId != null && pichichiId != null && mvpId != null
    : pichichiId != null && mvpId != null && guanteOroId != null && jovenId != null

  // --- Submit ---
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const canSubmit = phase1Complete && phase2Complete && phase3Complete

  const handleSubmit = () => {
    if (!canSubmit) {
      setToast({
        type: 'err',
        msg: !phase1Complete
          ? `Faltan ${totalGroupMatches - completedPicks} pronósticos`
          : !phase2Complete
            ? 'Completa la clasificación en Fase 2'
            : SHOW_BRACKET
              ? 'Completa el cuadro, pichichi y MVP en Fase 3'
              : 'Completa los premios individuales en Fase 3',
      })
      return
    }
    const predicciones = [...picks.entries()].map(([partido_id, resultado]) => {
      const sc = scores.get(partido_id)
      return {
        partido_id,
        resultado,
        goles_local: sc?.gl ?? null,
        goles_visitante: sc?.gv ?? null,
      }
    })
    const bracket = [...bracketWinners.entries()].map(([key, ganador_equipo_id]) => {
      const [ronda, slotStr] = key.split(':')
      return {
        ronda: ronda as Round,
        slot: parseInt(slotStr, 10),
        ganador_equipo_id,
      }
    })
    startTransition(async () => {
      const res = await submitPorraCompleta({
        predicciones,
        clasificacion: clasifSnap,
        terceros: tercerosSnap,
        bracket,
        extras: {
          campeon_equipo_id: campeonId,
          pichichi_jugador_id: pichichiId,
          mvp_jugador_id: mvpId,
          guante_oro_jugador_id: guanteOroId,
          joven_jugador_id: jovenId,
          best_xi: bestXI as Record<string, number>,
        },
      })
      if (res.ok) {
        setLocalEnviada(true)
        setEditMode(false)
        setToast({
          type: 'ok',
          msg: `Porra enviada · ${res.guardadas} pronósticos guardados${res.bloqueadas > 0 ? ` (${res.bloqueadas} cerrados)` : ''}`,
        })
      } else {
        setToast({ type: 'err', msg: res.error })
      }
    })
  }

  // Last-saved label
  const lastSavedLabel = useMemo(() => {
    if (saveTick === 0) return null
    const d = new Date(lastSavedRef.current)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }, [saveTick])

  return (
    <>
      {/* Already submitted banner */}
      {localEnviada && !editMode && (
        <div className="px-4 pt-4 pb-2">
          <div
            className="rounded-2xl px-4 py-4 flex items-start justify-between gap-3"
            style={{ background: 'linear-gradient(135deg, #004d40 0%, #00897b 100%)' }}
          >
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Check size={14} color="white" />
                <span className="text-[11px] font-black uppercase tracking-widest text-white opacity-80">Porra enviada</span>
              </div>
              <p className="text-white font-black text-base leading-tight">¡Ya has enviado tu porra!</p>
              <p className="text-[11px] text-white opacity-70 mt-0.5">Puedes cambiarla hasta que empiece el torneo.</p>
            </div>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="shrink-0 flex items-center gap-1.5 bg-white bg-opacity-20 hover:bg-opacity-30 text-white text-[11px] font-bold px-3 py-2 rounded-xl transition active:scale-95"
            >
              <Pencil size={12} />
              Cambiar
            </button>
          </div>
        </div>
      )}

      {/* Wizard (hidden when submitted and not editing) */}
      {(!localEnviada || editMode) && (
        <>
      {/* Stepper — FIFA style, border only for active */}
      <div className="px-4 pt-4">
        <div
          className="flex items-stretch gap-2 rounded-2xl p-2 bg-white"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.07), 0 0 0 1px rgba(15,23,42,0.04)' }}
        >
          {STEPS.map((s, i) => {
            const isActive = s.n === step
            const isDone =
              (s.n === 1 && phase1Complete) ||
              (s.n === 2 && phase2Complete) ||
              (s.n === 3 && phase3Complete)
            return (
              <>
                <button
                  key={s.n}
                  onClick={() => changeStep(s.n)}
                  className="relative flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-all duration-150"
                  style={{
                    border: isActive
                      ? '2px solid #FFD100'
                      : '2px solid transparent',
                    background: isActive ? 'rgba(255,209,0,0.06)' : 'transparent',
                  }}
                >
                  {/* FIFA logo */}
                  <div className="relative">
                    <Image
                      src="/fifa26-logo.png"
                      alt="FIFA World Cup 26"
                      width={30}
                      height={30}
                      className="object-contain"
                      unoptimized
                    />
                    {/* Done badge */}
                    {isDone && (
                      <div
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: '#00A651' }}
                      >
                        <Check size={9} strokeWidth={3} color="white" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center leading-none gap-0.5">
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.18em]"
                      style={{ color: isActive ? '#b58900' : '#94a3b8' }}
                    >
                      {s.sub}
                    </span>
                    <span
                      className="text-[11px] font-black"
                      style={{
                        color: isActive ? '#004d40' : isDone ? '#004d40' : '#94a3b8',
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className="self-center w-px h-10 shrink-0"
                    style={{ background: 'rgba(15,23,42,0.07)' }}
                  />
                )}
              </>
            )
          })}
        </div>
      </div>

      {/* Autosave indicator */}
      {lastSavedLabel && (
        <div className="px-4 pt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
            <CloudCheck size={12} className="text-emerald-500" />
            <span>Guardado automáticamente · {lastSavedLabel}</span>
          </div>
        </div>
      )}

      {/* Step content */}
      {step === 1 && (
        <PredictionForm partidos={partidos} picks={picks} scores={scores} onScoresChange={setScores} />
      )}

      {step === 2 && (
        <ClasificacionStep
          equipos={equipos}
          partidos={partidosInfo}
          picks={picks}
          clasifSaved={clasifSnap}
          tercerosSaved={tercerosSnap}
          onSnapshotChange={(c, t) => {
            // Use functional updater to avoid re-render when data hasn't changed
            setClasifSnap((prev) =>
              prev.length === c.length &&
              prev.every(
                (item, i) =>
                  item.grupo === c[i].grupo &&
                  item.equipo_id === c[i].equipo_id &&
                  item.posicion === c[i].posicion,
              )
                ? prev
                : c,
            )
            setTercerosSnap((prev) =>
              prev.length === t.length &&
              prev.every(
                (item, i) =>
                  item.equipo_id === t[i].equipo_id && item.posicion === t[i].posicion,
              )
                ? prev
                : t,
            )
          }}
        />
      )}

      {step === 3 && (
        <CuadroStep
          equipos={equipos.map((e) => ({
            id: e.id,
            nombre: e.nombre,
            codigo_bandera: e.codigo_bandera,
          }))}
          jugadores={jugadores}
          clasif={clasifSnap}
          terceros={tercerosSnap}
          winners={bracketWinners}
          onWinnersChange={setBracketWinners}
          campeonId={campeonId}
          pichichiId={pichichiId}
          mvpId={mvpId}
          guanteOroId={guanteOroId}
          jovenId={jovenId}
          bestXI={bestXI}
          onCampeonChange={setCampeonId}
          onPichichiChange={setPichichiId}
          onMvpChange={setMvpId}
          onGuanteOroChange={setGuanteOroId}
          onJovenChange={setJovenId}
          onBestXIChange={setBestXI}
          showBracket={SHOW_BRACKET}
        />
      )}

      {/* Step navigation */}
      <div className="px-4 pb-28 pt-2 space-y-2">
        {toast && (
          <div
            className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold flex items-center gap-2 ${
              toast.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {toast.type === 'ok' ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{toast.msg}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => changeStep(Math.max(1, step - 1) as Step)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white border border-gray-200 text-gray-600 transition active:scale-95"
            >
              <ChevronLeft size={14} />
              Atrás
            </button>
          ) : (
            <div />
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <button
              type="button"
              onClick={() => changeStep(Math.min(3, step + 1) as Step)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold text-white transition active:scale-95"
              style={{ background: '#004d40' }}
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={pending || !canSubmit}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: canSubmit ? '#00A651' : '#9ca3af' }}
            >
              <Send size={14} />
              {pending ? 'Enviando…' : 'Enviar mi porra'}
            </button>
          )}
        </div>
      </div>
        </>
      )}
    </>
  )
}

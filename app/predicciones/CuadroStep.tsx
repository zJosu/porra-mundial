'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Trophy,
  Crown,
  Target,
  Star,
  AlertCircle,
  MoveHorizontal,
  Medal,
  ChevronLeft,
  ChevronRight,
  Eye,
  PlayCircle,
  RotateCcw,
  Shirt,
  Sparkles,
} from 'lucide-react'
import {
  ROUND_ORDER,
  buildR32Matches,
  seedLabel,
  type Round,
} from './bracket'
import { PlayerSelect, type Jugador, type EquipoLite } from './PlayerSelect'
import { BestXIBuilder, type BestXI } from './BestXIBuilder'
export type { BestXI }

type ClasifSnap = { grupo: string; equipo_id: number; posicion: number }
type TercerosSnap = { equipo_id: number; posicion: number }
export type BracketWinners = Map<string, number>
export type BracketScores = Map<string, { gl: number; gv: number }>

type Match = {
  slot: number
  teamA: number | null
  teamB: number | null
  labelA: string
  labelB: string
}

// ---- geometry ----
// Card height per round (final/p3 a bit taller for visual hierarchy)
const CARD_H = 72
const GAP = 18
const COL_W = 156
const CENTER_W = 200
// Box heights per round (left/right half).
const BOX_H = {
  R32: CARD_H,                                 // 56
  R16: CARD_H * 2 + GAP,                       // 130
  QF: (CARD_H * 2 + GAP) * 2 + GAP,            // 278
  SF: ((CARD_H * 2 + GAP) * 2 + GAP) * 2 + GAP, // 574
}
// Connector column width
const CONN_W = 26
// Header pill height (py-1.5 + text ≈ 26px, keep in sync with RoundHeader)
const HEADER_H = 26

// FIFA palette
const NAVY = '#004d40'
const GOLD = '#FFD100'
const GREEN = '#00A651'
const RED = '#E8192C'
const BLUE = '#004d40'

// Walk-through (paso a paso) — orden lineal de los 32 partidos del KO
const WALK_ROUNDS: Round[] = ['R32', 'R16', 'QF', 'SF', 'P3', 'F']
const ROUND_SIZE: Record<Round, number> = { R32: 16, R16: 8, QF: 4, SF: 2, P3: 1, F: 1 }
const WALK_STEPS: Array<{ round: Round; slot: number }> = (() => {
  const out: Array<{ round: Round; slot: number }> = []
  for (const r of WALK_ROUNDS) {
    for (let s = 1; s <= ROUND_SIZE[r]; s++) out.push({ round: r, slot: s })
  }
  return out
})()
const WALK_TOTAL = WALK_STEPS.length // 32

function matchKey(r: Round, slot: number) {
  return `${r}:${slot}`
}
function stepIdxOf(r: Round, slot: number) {
  return WALK_STEPS.findIndex((s) => s.round === r && s.slot === slot)
}

function FlagImg({
  codigo,
  nombre,
  size = 16,
}: {
  codigo: string
  nombre: string
  size?: number
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${codigo.toLowerCase()}.png`}
      alt={nombre}
      width={size}
      height={Math.round(size * 0.7)}
      className="rounded-[2px] object-cover shrink-0"
      style={{ width: size, height: Math.round(size * 0.7) }}
    />
  )
}

function MatchCard({
  match,
  ronda,
  winnerId,
  onPick,
  score,
  onScoreChange,
  equipos,
  variant = 'default',
  isActive = false,
  isDimmed = false,
  showScores = true,
}: {
  match: Match
  ronda: Round
  winnerId: number | null
  onPick: (teamId: number) => void
  score: { gl: number; gv: number } | null
  onScoreChange: (gl: number | null, gv: number | null) => void
  equipos: Map<number, EquipoLite>
  variant?: 'default' | 'final' | 'p3'
  isActive?: boolean
  isDimmed?: boolean
  showScores?: boolean
}) {
  const bothSet = match.teamA != null && match.teamB != null
  const teamA = match.teamA != null ? equipos.get(match.teamA) ?? null : null
  const teamB = match.teamB != null ? equipos.get(match.teamB) ?? null : null

  const isFinal = variant === 'final'
  const isP3 = variant === 'p3'

  const gl = score?.gl ?? null
  const gv = score?.gv ?? null

  const handleScore = (nextGl: number | null, nextGv: number | null) => {
    onScoreChange(nextGl, nextGv)
    if (nextGl != null && nextGv != null && match.teamA != null && match.teamB != null && nextGl !== nextGv) {
      const inferred = nextGl > nextGv ? match.teamA : match.teamB
      if (inferred !== winnerId) onPick(inferred)
    }
  }

  const ScoreInput = ({ value, onChange, ariaLabel }: { value: number | null; onChange: (v: number | null) => void; ariaLabel: string }) => (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={20}
      aria-label={ariaLabel}
      value={value ?? ''}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => {
        const raw = e.target.value
        if (raw === '') return onChange(null)
        const n = parseInt(raw, 10)
        if (Number.isFinite(n) && n >= 0 && n <= 20) onChange(n)
      }}
      disabled={!bothSet}
      className="w-9 h-7 rounded-md text-center text-[12px] font-black tabular-nums text-slate-900 border border-slate-200 bg-white disabled:bg-slate-50 disabled:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#FFD100] focus:border-transparent"
    />
  )

  const Row = ({
    team,
    teamId,
    placeholder,
    selected,
    goals,
    onGoalsChange,
    side,
  }: {
    team: EquipoLite | null
    teamId: number | null
    placeholder: string
    selected: boolean
    goals: number | null
    onGoalsChange: (n: number | null) => void
    side: 'A' | 'B'
  }) => {
    const selectedBg = isFinal ? GOLD : isP3 ? '#cd7f32' : GREEN
    const selectedText = isFinal || isP3 ? NAVY : '#fff'
    return (
      <div
        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 transition-all duration-150 ${
          selected ? 'font-black' : team ? 'text-slate-800' : 'text-slate-400'
        }`}
        style={selected ? { background: selectedBg, color: selectedText } : undefined}
      >
        <button
          type="button"
          disabled={!team}
          onClick={() => teamId != null && onPick(teamId)}
          className="flex-1 min-w-0 flex items-center gap-1.5 text-left disabled:cursor-not-allowed py-1 hover:opacity-90"
          title={team ? `Marcar como ganador: ${team.nombre}` : undefined}
        >
          {team ? (
            <>
              <FlagImg codigo={team.codigo_bandera} nombre={team.nombre} />
              <span className="text-[11px] font-bold truncate">{team.nombre}</span>
            </>
          ) : (
            <>
              <div className="w-[16px] h-[11px] rounded-[2px] bg-slate-100" />
              <span className="text-[9.5px] italic truncate text-slate-400">{placeholder}</span>
            </>
          )}
        </button>
        {showScores && (
          <ScoreInput
            value={goals}
            ariaLabel={`Goles ${side}`}
            onChange={(n) => onGoalsChange(n)}
          />
        )}
      </div>
    )
  }

  const borderColor = isFinal
    ? GOLD
    : isP3
      ? '#cd7f32'
      : bothSet
        ? 'rgba(15,23,42,0.10)'
        : 'rgba(15,23,42,0.06)'

  return (
    <div
      data-match-key={`${ronda}:${match.slot}`}
      className={`w-full ${isActive ? 'walk-active' : ''} ${isDimmed ? 'walk-dim' : ''}`}
    >
    <div
      className="w-full overflow-hidden flex flex-col rounded-md bg-white"
      style={{
        height: CARD_H,
        background: isFinal
          ? 'linear-gradient(180deg, #fffbe6 0%, #ffffff 100%)'
          : '#ffffff',
        border: `1px solid ${borderColor}`,
        boxShadow: isFinal
          ? '0 0 0 1px rgba(255,209,0,0.45), 0 6px 18px rgba(255,209,0,0.18)'
          : bothSet
            ? '0 1px 2px rgba(15,23,42,0.06)'
            : 'none',
      }}
    >
      <Row
        team={teamA}
        teamId={match.teamA}
        placeholder={match.labelA}
        selected={winnerId != null && winnerId === match.teamA}
        goals={gl}
        onGoalsChange={(n) => handleScore(n, gv)}
        side="A"
      />
      <div className="h-px" style={{ background: 'rgba(15,23,42,0.08)' }} />
      <Row
        team={teamB}
        teamId={match.teamB}
        placeholder={match.labelB}
        selected={winnerId != null && winnerId === match.teamB}
        goals={gv}
        onGoalsChange={(n) => handleScore(gl, n)}
        side="B"
      />
    </div>
    </div>
  )
}

// Connector column: stacks N boxes of height boxH, draws an elbow inside each
// connecting the centers of two prevBoxes (top/bottom halves) into a midpoint
// that flows toward the next column.
function Connectors({
  count,
  boxH,
  prevBoxH,
  side,
}: {
  count: number
  boxH: number
  prevBoxH: number // height of each previous-round box (= position of source centers)
  side: 'left' | 'right'
}) {
  const stroke = 'rgba(10,22,40,0.18)'
  const items: React.ReactNode[] = []
  for (let i = 0; i < count; i++) {
    const top = prevBoxH / 2
    const bot = boxH - prevBoxH / 2
    items.push(
      <div
        key={i}
        className="relative"
        style={{ height: boxH, marginTop: i === 0 ? 0 : GAP }}
      >
        {/* upper horizontal */}
        <div
          className="absolute"
          style={{
            top: top - 0.5,
            left: side === 'left' ? 0 : '50%',
            width: '50%',
            height: 1,
            background: stroke,
          }}
        />
        {/* lower horizontal */}
        <div
          className="absolute"
          style={{
            top: bot - 0.5,
            left: side === 'left' ? 0 : '50%',
            width: '50%',
            height: 1,
            background: stroke,
          }}
        />
        {/* vertical join */}
        <div
          className="absolute"
          style={{
            top: top,
            [side === 'left' ? 'left' : 'right']: 'calc(50% - 0.5px)',
            width: 1,
            height: bot - top,
            background: stroke,
          }}
        />
        {/* output stub to next column */}
        <div
          className="absolute"
          style={{
            top: boxH / 2 - 0.5,
            [side === 'left' ? 'left' : 'right']: '50%',
            width: '50%',
            height: 1,
            background: stroke,
          }}
        />
      </div>,
    )
  }
  return (
    <div className="flex flex-col" style={{ width: CONN_W }}>
      {/* spacer aligns connector with card area below headers */}
      <div style={{ height: HEADER_H + 8 }} />
      {items}
    </div>
  )
}

// A round column: stacks N boxes of height boxH; each box vertically centers a CARD_H card.
function RoundColumn({
  matches,
  ronda,
  boxH,
  winners,
  onPick,
  scores,
  onScoreChange,
  equipos,
  label,
  activeKey,
  walkMode,
  showScores = true,
}: {
  matches: Match[]
  ronda: Round
  boxH: number
  winners: BracketWinners
  onPick: (slot: number, teamId: number) => void
  scores: BracketScores
  onScoreChange: (slot: number, gl: number | null, gv: number | null) => void
  equipos: Map<number, EquipoLite>
  label?: string
  activeKey: string | null
  walkMode: boolean
  showScores?: boolean
}) {
  return (
    <div className="flex flex-col" style={{ width: COL_W }}>
      {label != null ? <RoundHeader>{label}</RoundHeader> : <div style={{ height: HEADER_H + 8 }} />}
      {matches.map((m, i) => {
        const key = matchKey(ronda, m.slot)
        const isActive = activeKey === key
        const isDimmed = walkMode && activeKey != null && !isActive
        return (
          <div
            key={`${ronda}-${m.slot}`}
            className="flex items-center"
            style={{ height: boxH, marginTop: i === 0 ? 0 : GAP }}
          >
            <MatchCard
              match={m}
              ronda={ronda}
              winnerId={winners.get(key) ?? null}
              onPick={(teamId) => onPick(m.slot, teamId)}
              score={scores.get(key) ?? null}
              onScoreChange={(gl, gv) => onScoreChange(m.slot, gl, gv)}
              equipos={equipos}
              isActive={isActive}
              isDimmed={isDimmed}
              showScores={showScores}
            />
          </div>
        )
      })}
    </div>
  )
}

function RoundHeader({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[9px] font-black uppercase tracking-[0.18em] text-center py-1.5 rounded-md mb-2"
      style={{
        color: NAVY,
        background: 'linear-gradient(180deg, #FFD100 0%, #ffb800 100%)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      {children}
    </div>
  )
}

export function CuadroStep({
  equipos,
  jugadores,
  clasif,
  terceros,
  winners,
  onWinnersChange,
  scores,
  onScoresChange,
  showScores = true,
  campeonId,
  pichichiId,
  mvpId,
  guanteOroId,
  jovenId,
  bestXI,
  onCampeonChange,
  onPichichiChange,
  onMvpChange,
  onGuanteOroChange,
  onJovenChange,
  onBestXIChange,
  showBracket = true,
  showAwards = true,
  readOnly = false,
}: {
  equipos: EquipoLite[]
  jugadores: Jugador[]
  clasif: ClasifSnap[]
  terceros: TercerosSnap[]
  winners: BracketWinners
  onWinnersChange: (next: BracketWinners) => void
  scores: BracketScores
  onScoresChange: (next: BracketScores) => void
  showScores?: boolean
  campeonId: number | null
  pichichiId: number | null
  mvpId: number | null
  guanteOroId: number | null
  jovenId: number | null
  bestXI: BestXI
  onCampeonChange: (id: number | null) => void
  onPichichiChange: (id: number | null) => void
  onMvpChange: (id: number | null) => void
  onGuanteOroChange: (id: number | null) => void
  onJovenChange: (id: number | null) => void
  onBestXIChange: (xi: BestXI) => void
  showBracket?: boolean
  showAwards?: boolean
  readOnly?: boolean
}) {
  const equipoById = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos])

  // ---- Walk-through (paso a paso) ----
  const [mode, setMode] = useState<'walk' | 'full'>(readOnly ? 'full' : 'walk')
  // stepIdx = índice del PRÓXIMO partido pendiente; va de 0 a WALK_TOTAL (incluido = terminado)
  const initialStep = useMemo(() => {
    // Coloca el cursor en el primer partido sin ganador (por orden lineal)
    for (let i = 0; i < WALK_STEPS.length; i++) {
      const { round, slot } = WALK_STEPS[i]
      if (!winners.has(matchKey(round, slot))) return i
    }
    return WALK_TOTAL
    // intencionalmente solo al montar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [stepIdx, setStepIdx] = useState(initialStep)

  // En walk mode, derivamos los ganadores "visibles" cortando por el cursor.
  // Esto hace que las rondas posteriores aparezcan vacías progresivamente.
  const displayWinners = useMemo<BracketWinners>(() => {
    if (mode === 'full') return winners
    const out = new Map<string, number>()
    for (let i = 0; i < stepIdx; i++) {
      const { round, slot } = WALK_STEPS[i]
      const k = matchKey(round, slot)
      const w = winners.get(k)
      if (w != null) out.set(k, w)
    }
    return out
  }, [mode, stepIdx, winners])

  const activeKey =
    mode === 'walk' && stepIdx < WALK_TOTAL
      ? matchKey(WALK_STEPS[stepIdx].round, WALK_STEPS[stepIdx].slot)
      : null
  const walkMode = mode === 'walk'

  // Build all rounds (R32..F)
  const rounds = useMemo(() => {
    const result: Record<Round, Match[]> = {
      R32: [],
      R16: [],
      QF: [],
      SF: [],
      P3: [],
      F: [],
    }
    const r32 = buildR32Matches(clasif, terceros)
    result.R32 = r32.map((m) => ({
      slot: m.slot,
      teamA: m.teamA,
      teamB: m.teamB,
      labelA: seedLabel(m.sourceA),
      labelB: seedLabel(m.sourceB),
    }))
    const chain: [Round, Round][] = [
      ['R32', 'R16'],
      ['R16', 'QF'],
      ['QF', 'SF'],
      ['SF', 'F'],
    ]
    for (const [prev, next] of chain) {
      const prevMatches = result[prev]
      for (let s = 0; s < prevMatches.length; s += 2) {
        const a = displayWinners.get(`${prev}:${prevMatches[s].slot}`) ?? null
        const b = displayWinners.get(`${prev}:${prevMatches[s + 1].slot}`) ?? null
        result[next].push({
          slot: s / 2 + 1,
          teamA: a,
          teamB: b,
          labelA: `Gan. ${prev}-${prevMatches[s].slot}`,
          labelB: `Gan. ${prev}-${prevMatches[s + 1].slot}`,
        })
      }
    }
    // P3: losers of SF1 vs SF2
    const sf1 = result.SF[0]
    const sf2 = result.SF[1]
    const sf1Winner = sf1 ? displayWinners.get(`SF:${sf1.slot}`) ?? null : null
    const sf2Winner = sf2 ? displayWinners.get(`SF:${sf2.slot}`) ?? null : null
    const sf1Loser =
      sf1 && sf1.teamA != null && sf1.teamB != null && sf1Winner != null
        ? sf1Winner === sf1.teamA
          ? sf1.teamB
          : sf1.teamA
        : null
    const sf2Loser =
      sf2 && sf2.teamA != null && sf2.teamB != null && sf2Winner != null
        ? sf2Winner === sf2.teamA
          ? sf2.teamB
          : sf2.teamA
        : null
    result.P3 = [
      {
        slot: 1,
        teamA: sf1Loser,
        teamB: sf2Loser,
        labelA: 'Perd. SF-1',
        labelB: 'Perd. SF-2',
      },
    ]
    return result
  }, [clasif, terceros, displayWinners])

  // Cascade invalidation: if a winner is no longer in its match, remove it.
  // Solo en modo "cuadro completo" — en walk mode la limpieza se hace al editar (setWinner).
  useEffect(() => {
    if (walkMode) return
    let changed = false
    let scoresChanged = false
    const next = new Map(winners)
    const nextScores = new Map(scores)
    for (const r of ROUND_ORDER) {
      for (const m of rounds[r]) {
        const key = `${r}:${m.slot}`
        const w = next.get(key)
        if (w == null) {
          if (nextScores.has(key)) {
            nextScores.delete(key)
            scoresChanged = true
          }
          continue
        }
        if (w !== m.teamA && w !== m.teamB) {
          next.delete(key)
          changed = true
          if (nextScores.has(key)) {
            nextScores.delete(key)
            scoresChanged = true
          }
        }
      }
    }
    if (changed) onWinnersChange(next)
    if (scoresChanged) onScoresChange(nextScores)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds, walkMode])

  const finalMatch = rounds.F[0]
  const p3Match = rounds.P3[0]
  const finalWinnerId = finalMatch ? displayWinners.get(`F:${finalMatch.slot}`) ?? null : null
  const subcampeonId =
    finalMatch && finalWinnerId != null
      ? finalWinnerId === finalMatch.teamA
        ? finalMatch.teamB
        : finalMatch.teamA
      : null
  const p3WinnerId = p3Match ? displayWinners.get(`P3:${p3Match.slot}`) ?? null : null
  const p3LoserId =
    p3Match && p3WinnerId != null
      ? p3WinnerId === p3Match.teamA
        ? p3Match.teamB
        : p3Match.teamA
      : null

  useEffect(() => {
    if (finalWinnerId !== campeonId) onCampeonChange(finalWinnerId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalWinnerId])

  const r32Ready = rounds.R32.every((m) => m.teamA != null && m.teamB != null)

  const setWinner = (ronda: Round, slot: number, teamId: number) => {
    const next = new Map(winners)
    next.set(matchKey(ronda, slot), teamId)
    if (walkMode) {
      // En walk mode, editar un partido anterior re-arranca desde ese punto:
      // se descartan todos los ganadores posteriores y el cursor avanza al siguiente.
      const idx = stepIdxOf(ronda, slot)
      if (idx >= 0) {
        const nextScores = new Map(scores)
        let scoresChanged = false
        for (let i = idx + 1; i < WALK_TOTAL; i++) {
          const k = matchKey(WALK_STEPS[i].round, WALK_STEPS[i].slot)
          next.delete(k)
          if (nextScores.delete(k)) scoresChanged = true
        }
        onWinnersChange(next)
        if (scoresChanged) onScoresChange(nextScores)
        setStepIdx(idx + 1)
        return
      }
    }
    onWinnersChange(next)
  }

  const setScore = (ronda: Round, slot: number, gl: number | null, gv: number | null) => {
    const next = new Map(scores)
    const key = matchKey(ronda, slot)
    if (gl == null && gv == null) next.delete(key)
    else next.set(key, { gl: gl ?? 0, gv: gv ?? 0 })
    onScoresChange(next)
  }

  // Split halves
  const leftR32 = rounds.R32.slice(0, 8)
  const rightR32 = rounds.R32.slice(8, 16)
  const leftR16 = rounds.R16.slice(0, 4)
  const rightR16 = rounds.R16.slice(4, 8)
  const leftQF = rounds.QF.slice(0, 2)
  const rightQF = rounds.QF.slice(2, 4)
  const leftSF = rounds.SF[0]
  const rightSF = rounds.SF[1]

  const totalH = BOX_H.SF // full bracket vertical extent

  // Center scroll on mount
  const scrollerRef = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState(true)
  useEffect(() => {
    if (!scrollerRef.current) return
    const el = scrollerRef.current
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2
    const onScroll = () => setHint(false)
    el.addEventListener('scroll', onScroll, { once: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [r32Ready])

  // ---- Fit-to-screen + pinch-to-zoom (readOnly views) ----
  // Initially the whole bracket is scaled to fit the container; the user can then
  // pinch with two fingers (móvil) to zoom into the bracket itself.
  const bracketInnerRef = useRef<HTMLDivElement>(null)
  const [naturalDims, setNaturalDims] = useState<{ w: number; h: number } | null>(null)
  const [fitScale, setFitScale] = useState(1)
  const [scale, setScale] = useState(1)
  const userZoomedRef = useRef(false)
  const MAX_ZOOM = 1.6
  const zoomEnabled = readOnly

  // Keep latest scale/fit accessible from the (stable) touch listeners.
  const scaleRef = useRef(scale)
  const fitScaleRef = useRef(fitScale)
  useEffect(() => {
    scaleRef.current = scale
    fitScaleRef.current = fitScale
  })

  useLayoutEffect(() => {
    if (!zoomEnabled) return
    const scroller = scrollerRef.current
    const inner = bracketInnerRef.current
    if (!scroller || !inner) return
    // offsetWidth/offsetHeight ignore CSS transforms, so we always read the natural size.
    const measure = () => {
      const w = inner.offsetWidth
      const h = inner.offsetHeight
      if (w <= 0 || h <= 0) return
      setNaturalDims({ w, h })
      const fit = Math.min(1, scroller.clientWidth / w)
      setFitScale(fit)
      if (!userZoomedRef.current) setScale(fit)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(scroller)
    return () => ro.disconnect()
  }, [zoomEnabled, r32Ready])

  // Pinch-to-zoom (two fingers) sobre el cuadro, manteniendo el punto focal estable.
  useEffect(() => {
    if (!zoomEnabled) return
    const scroller = scrollerRef.current
    if (!scroller) return
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY)
    let pinching = false
    let startDist = 0
    let startScale = 1
    let focalX = 0
    let contentX = 0
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      pinching = true
      startDist = dist(e.touches)
      startScale = scaleRef.current
      const rect = scroller.getBoundingClientRect()
      focalX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left
      contentX = (scroller.scrollLeft + focalX) / startScale
      e.preventDefault()
    }
    const onTouchMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return
      e.preventDefault()
      const ratio = dist(e.touches) / startDist
      const next = Math.min(MAX_ZOOM, Math.max(fitScaleRef.current, startScale * ratio))
      userZoomedRef.current = true
      setScale(next)
      requestAnimationFrame(() => {
        scroller.scrollLeft = contentX * next - focalX
      })
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinching = false
    }
    scroller.addEventListener('touchstart', onTouchStart, { passive: false })
    scroller.addEventListener('touchmove', onTouchMove, { passive: false })
    scroller.addEventListener('touchend', onTouchEnd)
    scroller.addEventListener('touchcancel', onTouchEnd)
    return () => {
      scroller.removeEventListener('touchstart', onTouchStart)
      scroller.removeEventListener('touchmove', onTouchMove)
      scroller.removeEventListener('touchend', onTouchEnd)
      scroller.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [zoomEnabled])

  // Auto-scroll al partido activo (modo walk)
  useEffect(() => {    if (!walkMode || !activeKey) return
    // Esperamos al siguiente frame para que React pinte la clase walk-active
    const t = window.setTimeout(() => {
      const el = document.querySelector(`[data-match-key="${activeKey}"]`) as HTMLElement | null
      if (!el) return
      // Scroll horizontal dentro del bracket
      const scroller = scrollerRef.current
      if (scroller) {
        const elBox = el.getBoundingClientRect()
        const scBox = scroller.getBoundingClientRect()
        const target =
          scroller.scrollLeft +
          (elBox.left - scBox.left) -
          scroller.clientWidth / 2 +
          elBox.width / 2
        scroller.scrollTo({ left: target, behavior: 'smooth' })
      }
      // Scroll vertical de la página (el scroller corta overflow-y)
      const r = el.getBoundingClientRect()
      const targetY = window.scrollY + r.top - window.innerHeight / 2 + r.height / 2
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' })
    }, 60)
    return () => window.clearTimeout(t)
  }, [activeKey, walkMode])

  // Confeti: solo dispara cuando el usuario completa la final ahora (no al recargar)
  const [showConfetti, setShowConfetti] = useState(false)
  const prevStepRef = useRef(stepIdx)
  useEffect(() => {
    const prev = prevStepRef.current
    prevStepRef.current = stepIdx
    if (walkMode && prev < WALK_TOTAL && stepIdx >= WALK_TOTAL) {
      setShowConfetti(true)
      const t = window.setTimeout(() => setShowConfetti(false), 6500)
      return () => window.clearTimeout(t)
    }
  }, [stepIdx, walkMode])

  const champion = finalWinnerId != null ? equipoById.get(finalWinnerId) : null
  const subcampeon = subcampeonId != null ? equipoById.get(subcampeonId) : null
  const tercero = p3WinnerId != null ? equipoById.get(p3WinnerId) : null
  const cuarto = p3LoserId != null ? equipoById.get(p3LoserId) : null

  return (
    <div className="pb-2">
      {showBracket && (<>
      {walkMode && showConfetti && champion && <Confetti />}
      {/* Modo de visualización: paso a paso vs cuadro completo */}
      {r32Ready && !readOnly && (
        <div className="px-4 pt-3 flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex p-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-black uppercase tracking-[0.16em]"
          >
            <button
              type="button"
              onClick={() => setMode('walk')}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition ${
                walkMode ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              <PlayCircle size={11} /> Paso a paso
            </button>
            <button
              type="button"
              onClick={() => setMode('full')}
              className={`px-3 py-1.5 rounded-full flex items-center gap-1.5 transition ${
                !walkMode ? 'bg-white shadow text-slate-900' : 'text-slate-500'
              }`}
            >
              <Eye size={11} /> Cuadro completo
            </button>
          </div>

          {walkMode && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
                disabled={stepIdx === 0}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30"
                aria-label="Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <div
                className="text-[10px] font-black tabular-nums px-2 py-1 rounded-full bg-white border border-slate-200"
                style={{ color: NAVY }}
              >
                {Math.min(stepIdx + 1, WALK_TOTAL)} / {WALK_TOTAL}
              </div>
              <button
                type="button"
                onClick={() => setStepIdx((s) => Math.min(WALK_TOTAL, s + 1))}
                disabled={stepIdx >= WALK_TOTAL}
                className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-30"
                aria-label="Siguiente (saltar)"
              >
                <ChevronRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => setStepIdx(0)}
                className="ml-1 w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500"
                aria-label="Reiniciar"
                title="Reiniciar narración"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}

          {walkMode && (
            <div className="basis-full">
              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${(stepIdx / WALK_TOTAL) * 100}%`,
                    background: `linear-gradient(90deg, ${NAVY} 0%, #65ffd9 100%)`,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {!r32Ready && (
        <div className="px-4 pt-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
            <AlertCircle
              size={14}
              className="shrink-0 mt-0.5"
              style={{ color: '#a16207' }}
            />
            <p className="text-[11px] leading-relaxed" style={{ color: '#854d0e' }}>
              <span className="font-bold">Completa Fase 2.</span> El cuadro se rellena con
              los 24 clasificados directos y los 8 mejores terceros.
            </p>
          </div>
        </div>
      )}

      {/* Bracket scroller (clean light card) */}
      <div className="pt-4">
        <div
          className="relative mx-3 rounded-2xl overflow-hidden bg-white"
          style={{
            boxShadow:
              '0 4px 20px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)',
          }}
        >
          {/* Hint: desliza / pellizca para hacer zoom */}
          {hint && (
            <div className="relative z-20 flex justify-end px-4 pt-2">
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                <MoveHorizontal size={11} />
                <span>{zoomEnabled ? 'Desliza · pellizca para hacer zoom' : 'Desliza para ver todo'}</span>
              </div>
            </div>
          )}

          {/* Round headers + bracket in a single flex row — headers live inside each column so they never drift */}
          <div
            ref={scrollerRef}
            className="relative z-10 overflow-x-auto overflow-y-hidden"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: zoomEnabled ? 'pan-x pan-y' : undefined }}
          >
            <div
              className="relative"
              style={
                zoomEnabled && naturalDims
                  ? { width: naturalDims.w * scale, height: naturalDims.h * scale }
                  : undefined
              }
            >
            <div
              ref={bracketInnerRef}
              className="flex items-start px-3 pt-3 pb-4"
              style={
                zoomEnabled && naturalDims
                  ? { position: 'absolute', top: 0, left: 0, transform: `scale(${scale})`, transformOrigin: 'top left' }
                  : undefined
              }
            >
              {/* LEFT BRACKET */}
              <RoundColumn
                matches={leftR32}
                ronda="R32"
                boxH={BOX_H.R32}
                winners={displayWinners}
                onPick={(slot, teamId) => setWinner('R32', slot, teamId)}
                scores={scores}
                onScoreChange={(slot, gl, gv) => setScore('R32', slot, gl, gv)}
                equipos={equipoById}
                label="R32"
                activeKey={activeKey}
                walkMode={walkMode}
                showScores={showScores}
              />
              <Connectors count={4} boxH={BOX_H.R16} prevBoxH={BOX_H.R32} side="left" />
              <RoundColumn
                matches={leftR16}
                ronda="R16"
                boxH={BOX_H.R16}
                winners={displayWinners}
                onPick={(slot, teamId) => setWinner('R16', slot, teamId)}
                scores={scores}
                onScoreChange={(slot, gl, gv) => setScore('R16', slot, gl, gv)}
                equipos={equipoById}
                label="Octavos"
                activeKey={activeKey}
                walkMode={walkMode}
                showScores={showScores}
              />
              <Connectors count={2} boxH={BOX_H.QF} prevBoxH={BOX_H.R16} side="left" />
              <RoundColumn
                matches={leftQF}
                ronda="QF"
                boxH={BOX_H.QF}
                winners={displayWinners}
                onPick={(slot, teamId) => setWinner('QF', slot, teamId)}
                scores={scores}
                onScoreChange={(slot, gl, gv) => setScore('QF', slot, gl, gv)}
                equipos={equipoById}
                label="Cuartos"
                activeKey={activeKey}
                walkMode={walkMode}
                showScores={showScores}
              />
              <Connectors count={1} boxH={BOX_H.SF} prevBoxH={BOX_H.QF} side="left" />
              {/* Left SF */}
              <div className="flex flex-col" style={{ width: COL_W }}>
                <RoundHeader>Semis</RoundHeader>
                <div className="flex items-center" style={{ height: BOX_H.SF }}>
                  {leftSF && (
                    <MatchCard
                      match={leftSF}
                      ronda="SF"
                      winnerId={displayWinners.get(`SF:${leftSF.slot}`) ?? null}
                      onPick={(teamId) => setWinner('SF', leftSF.slot, teamId)}
                      score={scores.get(`SF:${leftSF.slot}`) ?? null}
                      onScoreChange={(gl, gv) => setScore('SF', leftSF.slot, gl, gv)}
                      equipos={equipoById}
                      isActive={activeKey === matchKey('SF', leftSF.slot)}
                      isDimmed={walkMode && activeKey != null && activeKey !== matchKey('SF', leftSF.slot)}
                      showScores={showScores}
                    />
                  )}
                </div>
              </div>

              {/* CENTER COLUMN — FIFA Logo / Final / Champion */}
              <div
                className="flex flex-col items-center px-3"
                style={{ width: CENTER_W }}
              >
                <RoundHeader>Final</RoundHeader>
                {/* FIFA 26 logo halo */}
                <div className="flex flex-col items-center mb-2 mt-2">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{
                      background:
                        'radial-gradient(circle, rgba(255,209,0,0.45) 0%, rgba(255,209,0,0) 70%)',
                    }}
                  >
                    <FifaLogo size={68} />
                  </div>
                </div>

                {finalMatch && (
                  <div style={{ width: COL_W }}>
                    <MatchCard
                      match={finalMatch}
                      ronda="F"
                      winnerId={finalWinnerId}
                      onPick={(teamId) => setWinner('F', finalMatch.slot, teamId)}
                      score={scores.get(`F:${finalMatch.slot}`) ?? null}
                      onScoreChange={(gl, gv) => setScore('F', finalMatch.slot, gl, gv)}
                      equipos={equipoById}
                      variant="final"
                      isActive={activeKey === matchKey('F', finalMatch.slot)}
                      isDimmed={walkMode && activeKey != null && activeKey !== matchKey('F', finalMatch.slot)}
                      showScores={showScores}
                    />
                  </div>
                )}

                {/* Champion plate */}
                {champion && (
                  <div className="mt-3 flex flex-col items-center gap-1">
                    <FlagImg
                      codigo={champion.codigo_bandera}
                      nombre={champion.nombre}
                      size={26}
                    />
                    <span
                      className="text-[11px] font-black text-center"
                      style={{ color: NAVY }}
                    >
                      {champion.nombre}
                    </span>
                    <span
                      className="text-[8px] font-black uppercase tracking-[0.22em]"
                      style={{ color: 'rgba(15,23,42,0.45)' }}
                    >
                      Campeón
                    </span>
                  </div>
                )}

                {/* 3rd place mini-match */}
                <div className="mt-5 w-full flex flex-col items-center">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Medal size={11} style={{ color: '#cd7f32' }} />
                    <span
                      className="text-[8.5px] font-black uppercase tracking-[0.22em]"
                      style={{ color: '#cd7f32' }}
                    >
                      3.er y 4.º puesto
                    </span>
                  </div>
                  {p3Match && (
                    <div style={{ width: COL_W }}>
                      <MatchCard
                        match={p3Match}
                        ronda="P3"
                        winnerId={p3WinnerId}
                        onPick={(teamId) => setWinner('P3', p3Match.slot, teamId)}
                        score={scores.get(`P3:${p3Match.slot}`) ?? null}
                        onScoreChange={(gl, gv) => setScore('P3', p3Match.slot, gl, gv)}
                        equipos={equipoById}
                        variant="p3"
                        isActive={activeKey === matchKey('P3', p3Match.slot)}
                        isDimmed={walkMode && activeKey != null && activeKey !== matchKey('P3', p3Match.slot)}
                        showScores={showScores}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right SF */}
              <div className="flex flex-col" style={{ width: COL_W }}>
                <RoundHeader>Semis</RoundHeader>
                <div className="flex items-center" style={{ height: BOX_H.SF }}>
                  {rightSF && (
                    <MatchCard
                      match={rightSF}
                      ronda="SF"
                      winnerId={displayWinners.get(`SF:${rightSF.slot}`) ?? null}
                      onPick={(teamId) => setWinner('SF', rightSF.slot, teamId)}
                      score={scores.get(`SF:${rightSF.slot}`) ?? null}
                      onScoreChange={(gl, gv) => setScore('SF', rightSF.slot, gl, gv)}
                      equipos={equipoById}
                      isActive={activeKey === matchKey('SF', rightSF.slot)}
                      isDimmed={walkMode && activeKey != null && activeKey !== matchKey('SF', rightSF.slot)}
                      showScores={showScores}
                    />
                  )}
                </div>
              </div>
              <Connectors count={1} boxH={BOX_H.SF} prevBoxH={BOX_H.QF} side="right" />
              <RoundColumn
                matches={rightQF}
                ronda="QF"
                boxH={BOX_H.QF}
                winners={displayWinners}
                onPick={(slot, teamId) => setWinner('QF', slot, teamId)}
                scores={scores}
                onScoreChange={(slot, gl, gv) => setScore('QF', slot, gl, gv)}
                equipos={equipoById}
                label="Cuartos"
                activeKey={activeKey}
                walkMode={walkMode}
                showScores={showScores}
              />
              <Connectors count={2} boxH={BOX_H.QF} prevBoxH={BOX_H.R16} side="right" />
              <RoundColumn
                matches={rightR16}
                ronda="R16"
                boxH={BOX_H.R16}
                winners={displayWinners}
                onPick={(slot, teamId) => setWinner('R16', slot, teamId)}
                scores={scores}
                onScoreChange={(slot, gl, gv) => setScore('R16', slot, gl, gv)}
                equipos={equipoById}
                label="Octavos"
                activeKey={activeKey}
                walkMode={walkMode}
                showScores={showScores}
              />
              <Connectors count={4} boxH={BOX_H.R16} prevBoxH={BOX_H.R32} side="right" />
              <RoundColumn
                matches={rightR32}
                ronda="R32"
                boxH={BOX_H.R32}
                winners={displayWinners}
                onPick={(slot, teamId) => setWinner('R32', slot, teamId)}
                scores={scores}
                onScoreChange={(slot, gl, gv) => setScore('R32', slot, gl, gv)}
                equipos={equipoById}
                label="R32"
                activeKey={activeKey}
                walkMode={walkMode}
                showScores={showScores}
              />
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* PODIUM banner */}
      {(champion || subcampeon || tercero || cuarto) && (
        <div className="px-4 pt-5">
          <div
            className="rounded-2xl p-4 bg-white"
            style={{
              boxShadow:
                '0 4px 20px rgba(15,23,42,0.06), 0 0 0 1px rgba(15,23,42,0.04)',
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Crown size={14} style={{ color: '#b58900' }} />
              <span
                className="text-[10px] font-black uppercase tracking-[0.22em]"
                style={{ color: NAVY }}
              >
                Podio
              </span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { rank: '1º', team: champion, color: GOLD, label: 'Campeón' },
                { rank: '2º', team: subcampeon, color: '#9ca3af', label: 'Subcampeón' },
                { rank: '3º', team: tercero, color: '#cd7f32', label: '3.er puesto' },
                { rank: '4º', team: cuarto, color: '#cbd5e1', label: '4.º puesto' },
              ].map((p) => (
                <div
                  key={p.rank}
                  className="flex flex-col items-center text-center rounded-xl py-2.5 px-1.5 bg-slate-50"
                  style={{
                    border: `1px solid ${p.team ? p.color : 'rgba(15,23,42,0.06)'}`,
                  }}
                >
                  <span
                    className="text-[10px] font-black"
                    style={{ color: p.team ? NAVY : '#94a3b8' }}
                  >
                    {p.rank}
                  </span>
                  {p.team ? (
                    <>
                      <div className="my-1">
                        <FlagImg
                          codigo={p.team.codigo_bandera}
                          nombre={p.team.nombre}
                          size={22}
                        />
                      </div>
                      <span
                        className="text-[10px] font-bold leading-tight"
                        style={{ color: NAVY, wordBreak: 'break-word' }}
                      >
                        {p.team.nombre}
                      </span>
                    </>
                  ) : (
                    <span className="text-[9px] italic text-slate-300 mt-1">—</span>
                  )}
                  <span
                    className="text-[8px] font-bold uppercase tracking-wider mt-1"
                    style={{ color: '#94a3b8' }}
                  >
                    {p.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </>)}

      {showAwards && (<>
      {/* Extras */}
      <div className="px-4 pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest text-white"
            style={{ background: '#004d40' }}
          >
            Individual Awards
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <PlayerSelect
          label="Pichichi · Máximo goleador"
          icon={<Target size={18} />}
          iconColor={RED}
          jugadores={jugadores}
          equipos={equipoById}
          value={pichichiId}
          onChange={onPichichiChange}
          placeholder="Buscar por nombre o selección…"
        />

        <PlayerSelect
          label="MVP del torneo"
          icon={<Star size={18} />}
          iconColor={BLUE}
          jugadores={jugadores}
          equipos={equipoById}
          value={mvpId}
          onChange={onMvpChange}
          placeholder="Buscar por nombre o selección…"
        />

        <PlayerSelect
          label="Guante de Oro · Mejor portero"
          icon={<Shirt size={18} />}
          iconColor="#1a56db"
          jugadores={jugadores}
          equipos={equipoById}
          value={guanteOroId}
          onChange={onGuanteOroChange}
          placeholder="Buscar portero…"
          posicionFilter={['portero']}
        />

        <PlayerSelect
          label="Mejor jugador joven"
          icon={<Sparkles size={18} />}
          iconColor="#7c3aed"
          jugadores={jugadores}
          equipos={equipoById}
          value={jovenId}
          onChange={onJovenChange}
          placeholder="Buscar por nombre o selección…"
        />
      </div>

      {/* WORLD CUP BEST XI */}
      <div className="px-4 pt-5 pb-2 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest text-white"
            style={{ background: '#004d40' }}
          >
            World Cup Best XI
          </span>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
            4-3-3
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-snug">
          Elige tu once ideal del torneo. Toca una posición y busca el jugador.
        </p>
        <BestXIBuilder
          bestXI={bestXI}
          onChange={onBestXIChange}
          jugadores={jugadores}
          equipos={equipoById}
        />
      </div>
      </>)}
    </div>
  )
}

// Round headers row — must mirror the bracket column widths exactly.
function RoundColHeaders() {
  const blocks: { label: string; w: number; isConn?: boolean }[] = [
    { label: 'R32', w: COL_W },
    { label: '', w: CONN_W, isConn: true },
    { label: 'Octavos', w: COL_W },
    { label: '', w: CONN_W, isConn: true },
    { label: 'Cuartos', w: COL_W },
    { label: '', w: CONN_W, isConn: true },
    { label: 'Semis', w: COL_W },
    { label: 'Final', w: CENTER_W },
    { label: 'Semis', w: COL_W },
    { label: '', w: CONN_W, isConn: true },
    { label: 'Cuartos', w: COL_W },
    { label: '', w: CONN_W, isConn: true },
    { label: 'Octavos', w: COL_W },
    { label: '', w: CONN_W, isConn: true },
    { label: 'R32', w: COL_W },
  ]
  return (
    <div className="flex items-stretch mb-1">
      {blocks.map((b, i) =>
        b.isConn ? (
          <div key={i} style={{ width: b.w }} />
        ) : (
          <div key={i} style={{ width: b.w }} className="px-0.5">
            <RoundHeader>{b.label}</RoundHeader>
          </div>
        ),
      )}
    </div>
  )
}

// Try local /fifa26-logo.png, fall back to a styled inline mark.
function FifaLogo({ size = 40 }: { size?: number }) {
  const [ok, setOk] = useState(true)
  if (ok) {
    return (
      <Image
        src="/fifa26-logo.png"
        alt="FIFA World Cup 26"
        width={size}
        height={size}
        className="object-contain"
        onError={() => setOk(false)}
        unoptimized
      />
    )
  }
  return (
    <div
      className="rounded-md flex items-center justify-center"
      style={{
        background: GOLD,
        width: size,
        height: size,
      }}
    >
      <span
        className="font-black"
        style={{ color: NAVY, fontSize: Math.round(size * 0.35) }}
      >
        26
      </span>
    </div>
  )
}

// Confetti que se dispara cuando se completa la final en modo paso a paso.
function Confetti() {
  const pieces = useMemo(() => {
    const palette = ['#FFD100', '#C9A84C', '#65ffd9', '#004d40', '#E8192C', '#ffffff']
    return Array.from({ length: 80 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      cx: (Math.random() - 0.5) * 220,
      delay: Math.random() * 0.8,
      dur: 2.4 + Math.random() * 2.2,
      color: palette[i % palette.length],
      w: 6 + Math.round(Math.random() * 6),
      h: 10 + Math.round(Math.random() * 8),
    }))
  }, [])
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 60 }}
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.w,
            height: p.h,
            ['--cx' as string]: `${p.cx}px`,
            ['--cd' as string]: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}

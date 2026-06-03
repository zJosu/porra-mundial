'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Trophy,
  Crown,
  Target,
  Star,
  AlertCircle,
  MoveHorizontal,
  Medal,
} from 'lucide-react'
import {
  ROUND_ORDER,
  buildR32Matches,
  seedLabel,
  type Round,
} from './bracket'
import { PlayerSelect, type Jugador, type EquipoLite } from './PlayerSelect'

type ClasifSnap = { grupo: string; equipo_id: number; posicion: number }
type TercerosSnap = { equipo_id: number; posicion: number }
export type BracketWinners = Map<string, number>

type Match = {
  slot: number
  teamA: number | null
  teamB: number | null
  labelA: string
  labelB: string
}

// ---- geometry ----
// Each round has a "box" that's vertically aligned with the right pair from the previous round.
// Box height doubles each round (+gap). Card height stays 52 px.
const CARD_H = 56
const GAP = 18
const COL_W = 138
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
const NAVY = '#0a1628'
const GOLD = '#FFD100'
const GREEN = '#00A651'
const RED = '#E8192C'
const BLUE = '#004FA3'

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
  equipos,
  variant = 'default',
}: {
  match: Match
  ronda: Round
  winnerId: number | null
  onPick: (teamId: number) => void
  equipos: Map<number, EquipoLite>
  variant?: 'default' | 'final' | 'p3'
}) {
  const bothSet = match.teamA != null && match.teamB != null
  const teamA = match.teamA != null ? equipos.get(match.teamA) ?? null : null
  const teamB = match.teamB != null ? equipos.get(match.teamB) ?? null : null

  const isFinal = variant === 'final'
  const isP3 = variant === 'p3'

  const Row = ({
    team,
    teamId,
    placeholder,
    selected,
  }: {
    team: EquipoLite | null
    teamId: number | null
    placeholder: string
    selected: boolean
  }) => {
    const selectedBg = isFinal ? GOLD : isP3 ? '#cd7f32' : GREEN
    const selectedText = isFinal || isP3 ? NAVY : '#fff'
    return (
      <button
        type="button"
        disabled={!team}
        onClick={() => teamId != null && onPick(teamId)}
        className={`flex-1 min-w-0 flex items-center gap-1.5 px-2 transition-all duration-150 disabled:cursor-not-allowed ${
          selected
            ? 'font-black'
            : team
              ? 'text-slate-800 hover:bg-slate-50'
              : 'text-slate-400'
        }`}
        style={
          selected
            ? { background: selectedBg, color: selectedText }
            : undefined
        }
      >
        {team ? (
          <>
            <FlagImg codigo={team.codigo_bandera} nombre={team.nombre} />
            <span className="text-[11px] font-bold truncate">{team.nombre}</span>
          </>
        ) : (
          <>
            <div className="w-[16px] h-[11px] rounded-[2px] bg-slate-100" />
            <span className="text-[9.5px] italic truncate text-slate-400">
              {placeholder}
            </span>
          </>
        )}
      </button>
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
      />
      <div className="h-px" style={{ background: 'rgba(15,23,42,0.08)' }} />
      <Row
        team={teamB}
        teamId={match.teamB}
        placeholder={match.labelB}
        selected={winnerId != null && winnerId === match.teamB}
      />
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
  equipos,
  label,
}: {
  matches: Match[]
  ronda: Round
  boxH: number
  winners: BracketWinners
  onPick: (slot: number, teamId: number) => void
  equipos: Map<number, EquipoLite>
  label?: string
}) {
  return (
    <div className="flex flex-col" style={{ width: COL_W }}>
      {label != null ? <RoundHeader>{label}</RoundHeader> : <div style={{ height: HEADER_H + 8 }} />}
      {matches.map((m, i) => (
        <div
          key={`${ronda}-${m.slot}`}
          className="flex items-center"
          style={{ height: boxH, marginTop: i === 0 ? 0 : GAP }}
        >
          <MatchCard
            match={m}
            ronda={ronda}
            winnerId={winners.get(`${ronda}:${m.slot}`) ?? null}
            onPick={(teamId) => onPick(m.slot, teamId)}
            equipos={equipos}
          />
        </div>
      ))}
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
  campeonId,
  pichichiId,
  mvpId,
  onCampeonChange,
  onPichichiChange,
  onMvpChange,
}: {
  equipos: EquipoLite[]
  jugadores: Jugador[]
  clasif: ClasifSnap[]
  terceros: TercerosSnap[]
  winners: BracketWinners
  onWinnersChange: (next: BracketWinners) => void
  campeonId: number | null
  pichichiId: number | null
  mvpId: number | null
  onCampeonChange: (id: number | null) => void
  onPichichiChange: (id: number | null) => void
  onMvpChange: (id: number | null) => void
}) {
  const equipoById = useMemo(() => new Map(equipos.map((e) => [e.id, e])), [equipos])

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
        const a = winners.get(`${prev}:${prevMatches[s].slot}`) ?? null
        const b = winners.get(`${prev}:${prevMatches[s + 1].slot}`) ?? null
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
    const sf1Winner = sf1 ? winners.get(`SF:${sf1.slot}`) ?? null : null
    const sf2Winner = sf2 ? winners.get(`SF:${sf2.slot}`) ?? null : null
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
  }, [clasif, terceros, winners])

  // Cascade invalidation: if a winner is no longer in its match, remove it.
  useEffect(() => {
    let changed = false
    const next = new Map(winners)
    for (const r of ROUND_ORDER) {
      for (const m of rounds[r]) {
        const key = `${r}:${m.slot}`
        const w = next.get(key)
        if (w == null) continue
        if (w !== m.teamA && w !== m.teamB) {
          next.delete(key)
          changed = true
        }
      }
    }
    if (changed) onWinnersChange(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rounds])

  const finalMatch = rounds.F[0]
  const p3Match = rounds.P3[0]
  const finalWinnerId = finalMatch ? winners.get(`F:${finalMatch.slot}`) ?? null : null
  const subcampeonId =
    finalMatch && finalWinnerId != null
      ? finalWinnerId === finalMatch.teamA
        ? finalMatch.teamB
        : finalMatch.teamA
      : null
  const p3WinnerId = p3Match ? winners.get(`P3:${p3Match.slot}`) ?? null : null
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

  const r32Ready = clasif.length === 48 && terceros.length === 12

  const setWinner = (ronda: Round, slot: number, teamId: number) => {
    const next = new Map(winners)
    next.set(`${ronda}:${slot}`, teamId)
    onWinnersChange(next)
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

  const champion = finalWinnerId != null ? equipoById.get(finalWinnerId) : null
  const subcampeon = subcampeonId != null ? equipoById.get(subcampeonId) : null
  const tercero = p3WinnerId != null ? equipoById.get(p3WinnerId) : null
  const cuarto = p3LoserId != null ? equipoById.get(p3LoserId) : null

  return (
    <div className="pb-2">
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
          {/* Scroll hint */}
          {hint && (
            <div className="relative z-10 flex justify-end px-4 pt-2">
              <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                <MoveHorizontal size={11} />
                <span>Desliza para ver todo</span>
              </div>
            </div>
          )}

          {/* Round headers + bracket in a single flex row — headers live inside each column so they never drift */}
          <div
            ref={scrollerRef}
            className="relative z-10 overflow-x-auto overflow-y-hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div
              className="flex items-start px-3 pt-3 pb-4"
            >
              {/* LEFT BRACKET */}
              <RoundColumn
                matches={leftR32}
                ronda="R32"
                boxH={BOX_H.R32}
                winners={winners}
                onPick={(slot, teamId) => setWinner('R32', slot, teamId)}
                equipos={equipoById}
                label="R32"
              />
              <Connectors count={4} boxH={BOX_H.R16} prevBoxH={BOX_H.R32} side="left" />
              <RoundColumn
                matches={leftR16}
                ronda="R16"
                boxH={BOX_H.R16}
                winners={winners}
                onPick={(slot, teamId) => setWinner('R16', slot, teamId)}
                equipos={equipoById}
                label="Octavos"
              />
              <Connectors count={2} boxH={BOX_H.QF} prevBoxH={BOX_H.R16} side="left" />
              <RoundColumn
                matches={leftQF}
                ronda="QF"
                boxH={BOX_H.QF}
                winners={winners}
                onPick={(slot, teamId) => setWinner('QF', slot, teamId)}
                equipos={equipoById}
                label="Cuartos"
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
                      winnerId={winners.get(`SF:${leftSF.slot}`) ?? null}
                      onPick={(teamId) => setWinner('SF', leftSF.slot, teamId)}
                      equipos={equipoById}
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
                      equipos={equipoById}
                      variant="final"
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
                        equipos={equipoById}
                        variant="p3"
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
                      winnerId={winners.get(`SF:${rightSF.slot}`) ?? null}
                      onPick={(teamId) => setWinner('SF', rightSF.slot, teamId)}
                      equipos={equipoById}
                    />
                  )}
                </div>
              </div>
              <Connectors count={1} boxH={BOX_H.SF} prevBoxH={BOX_H.QF} side="right" />
              <RoundColumn
                matches={rightQF}
                ronda="QF"
                boxH={BOX_H.QF}
                winners={winners}
                onPick={(slot, teamId) => setWinner('QF', slot, teamId)}
                equipos={equipoById}
                label="Cuartos"
              />
              <Connectors count={2} boxH={BOX_H.QF} prevBoxH={BOX_H.R16} side="right" />
              <RoundColumn
                matches={rightR16}
                ronda="R16"
                boxH={BOX_H.R16}
                winners={winners}
                onPick={(slot, teamId) => setWinner('R16', slot, teamId)}
                equipos={equipoById}
                label="Octavos"
              />
              <Connectors count={4} boxH={BOX_H.R16} prevBoxH={BOX_H.R32} side="right" />
              <RoundColumn
                matches={rightR32}
                ronda="R32"
                boxH={BOX_H.R32}
                winners={winners}
                onPick={(slot, teamId) => setWinner('R32', slot, teamId)}
                equipos={equipoById}
                label="R32"
              />
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

      {/* Extras */}
      <div className="px-4 pt-5 space-y-3">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest text-white"
            style={{ background: RED }}
          >
            Premios individuales
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
      </div>
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

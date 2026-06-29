'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Trophy, Target, Star, Shirt, Sparkles, Check, X as XIcon, Lock, Info, Shield, Pencil, Save, Search, LayoutGrid } from 'lucide-react'
import { CuadroStep, type BracketWinners, type BracketScores } from '../predicciones/CuadroStep'
import type { PhasePoints } from './scoring'
import { XI_SLOTS, type XISlot } from './xi-slots'
import { saveOfficialAwards, saveOfficialBestXI } from '@/app/actions/admin'

// ─── Shared types (exported for page.tsx) ─────────────────────────────────────

export type PartidoUI = {
  id: number
  fecha: string
  grupo: string
  jornada: number
  goles_local_oficial: number | null
  goles_visitante_oficial: number | null
  local: { id: number; nombre: string; codigo_bandera: string }
  visitante: { id: number; nombre: string; codigo_bandera: string }
  pred?: { resultado: 'L' | 'X' | 'V'; goles_local: number | null; goles_visitante: number | null }
  puntos: 3 | 1 | 0 | null
}

export type GrupoFila = {
  equipo_id: number; nombre: string; codigo_bandera: string
  pj: number; g: number; e: number; p: number
  gf: number; gc: number; dg: number; puntos: number
}

export type GrupoUI = { grupo: string; filas: GrupoFila[] }

export type JugadorLite = {
  id: number; nombre: string; apellidos: string
  posicion: string | null; numero_dorsal: number | null
  foto_url: string | null
  equipo: { nombre: string; codigo_bandera: string } | null
}

export type AwardResult = {
  key: 'pichichi' | 'mvp' | 'guante' | 'joven'
  label: string
  icon: 'target' | 'star' | 'shirt' | 'sparkles'
  iconColor: string
  oficial: JugadorLite | null
  miPick: JugadorLite | null
  puntos: number
  maxPuntos: number
}

/** Per-group comparison for the Clasificación tab. */
export type ClasifGroupUI = {
  grupo: string
  pts: 0 | 1 | 2 | 5
  tipo: 'exacto' | 'top2' | 'bottom2' | 'miss' | 'sin_pick' | 'pendiente'
  actual: { equipo_id: number; nombre: string; codigo_bandera: string }[]   // 4 items
  pick: ({ equipo_id: number; nombre: string; codigo_bandera: string } | null)[] // 4 items
}

export type MatchBreakdown = { exactos: number; acertados1x2: number; fallos: number; sinPick: number }
export type ClasifBreakdownUI = { exactos: number; top2: number; bottom2: number; fallos: number; pendientes: number }

// ─── Best XI ─────────────────────────────────────────────────────────────────

export { XI_SLOTS }
export type { XISlot }

const XI_LAYOUT: { slot: XISlot; x: number; y: number; label: string }[] = [
  { slot: 'EI',  label: 'EI', x: 15, y: 18 },
  { slot: 'DC',  label: 'DC', x: 50, y: 14 },
  { slot: 'ED',  label: 'ED', x: 85, y: 18 },
  { slot: 'MC1', label: 'MC', x: 25, y: 42 },
  { slot: 'MC2', label: 'MC', x: 50, y: 52 },
  { slot: 'MC3', label: 'MC', x: 75, y: 42 },
  { slot: 'LI',  label: 'LI', x: 12, y: 71 },
  { slot: 'DF1', label: 'DF', x: 37, y: 71 },
  { slot: 'DF2', label: 'DF', x: 63, y: 71 },
  { slot: 'LD',  label: 'LD', x: 88, y: 71 },
  { slot: 'GK',  label: 'PT', x: 50, y: 88 },
]

const XI_SLOT_POS: Record<XISlot, 'portero' | 'defensa' | 'centrocampista' | 'delantero'> = {
  GK: 'portero', LD: 'defensa', DF1: 'defensa', DF2: 'defensa', LI: 'defensa',
  MC1: 'centrocampista', MC2: 'centrocampista', MC3: 'centrocampista',
  ED: 'delantero', DC: 'delantero', EI: 'delantero',
}

export type BestXIInfo = {
  oficial: Record<string, JugadorLite | null>
  mio: Record<string, JugadorLite | null>
  aciertos: number
  full: boolean
  pts: number
}

// ─── Admin payload (premios edit) ────────────────────────────────────────────

export type AdminJugador = {
  id: number; nombre: string; apellidos: string; posicion: string | null
  numero_dorsal: number | null; foto_url: string | null; equipo_id: number
}

export type AdminEquipo = { id: number; nombre: string; codigo_bandera: string }

export type AdminPremiosData = {
  jugadores: AdminJugador[]
  equipos: AdminEquipo[]
  oficiales: {
    pichichi_jugador_id: number | null
    mvp_jugador_id: number | null
    guante_oro_jugador_id: number | null
    joven_jugador_id: number | null
    campeon_equipo_id: number | null
    subcampeon_equipo_id: number | null
    tercer_puesto_id: number | null
    best_xi: Record<string, number>
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function FlagImg({ codigo, nombre, size = 20 }: { codigo: string; nombre: string; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${codigo.toLowerCase()}.png`}
      alt={nombre}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded object-cover shrink-0"
      style={{ width: size, height: Math.round(size * 0.67) }}
    />
  )
}

function PtsBadge({
  pts,
  max,
  size = 'sm',
}: {
  pts: number
  max?: number
  size?: 'sm' | 'lg'
}) {
  const earned = pts > 0
  const cls = size === 'lg'
    ? 'text-[12px] font-black px-2.5 py-1 rounded-full tabular-nums'
    : 'text-[10px] font-black px-2 py-0.5 rounded-full tabular-nums'
  if (pts === 0 && max != null) {
    return (
      <span className={cls} style={{ background: '#f1f5f9', color: '#94a3b8' }}>
        0 / +{max}
      </span>
    )
  }
  return (
    <span
      className={cls}
      style={{
        background: earned ? (pts >= 5 ? '#00A651' : pts >= 3 ? '#C9A84C' : pts >= 2 ? '#FFD100' : '#e5e7eb') : '#e5e7eb',
        color: earned ? (pts >= 5 ? 'white' : pts >= 2 ? '#7a5b00' : '#9ca3af') : '#9ca3af',
      }}
    >
      {earned ? `+${pts}` : '0'}
    </span>
  )
}

// ─── Score card ────────────────────────────────────────────────────────────────

function PhaseCell({
  label,
  pts,
  icon,
}: {
  label: string
  pts: number
  icon: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-xl px-3 py-2"
      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
    >
      <p className="text-[9px] font-black uppercase tracking-widest flex items-center gap-1" style={{ color: '#FFD100', opacity: 0.75 }}>
        {icon}{label}
      </p>
      <p className="text-lg font-black tabular-nums text-white">{pts}</p>
    </div>
  )
}

// ─── Match card (Phase 1) ─────────────────────────────────────────────────────

function MatchCard({ p, predLabel, noPredLabel }: { p: PartidoUI; predLabel: string; noPredLabel: string }) {
  const played = p.goles_local_oficial != null && p.goles_visitante_oficial != null
  return (
    <div className="bg-white rounded-2xl shadow-sm px-3.5 py-3">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide text-white"
          style={{ background: '#004d40' }}
        >
          Grupo {p.grupo} · J{p.jornada}
        </span>
        {p.puntos != null ? (
          <span
            className="text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums"
            style={{
              background: p.puntos === 3 ? '#00A651' : p.puntos === 1 ? '#FFD100' : '#e5e7eb',
              color: p.puntos === 3 ? 'white' : p.puntos === 1 ? '#7a5b00' : '#9ca3af',
            }}
          >
            {p.puntos === 0 ? '0' : `+${p.puntos}`}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <FlagImg codigo={p.local.codigo_bandera} nombre={p.local.nombre} />
          <span className="text-[12px] font-semibold text-gray-800 truncate">{p.local.nombre}</span>
        </div>
        <div className="px-2 text-center">
          {played ? (
            <span className="text-lg font-black text-gray-900 tabular-nums">
              {p.goles_local_oficial}–{p.goles_visitante_oficial}
            </span>
          ) : (
            <span className="text-[10px] font-bold text-gray-300 tracking-widest">VS</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 min-w-0 justify-end">
          <span className="text-[12px] font-semibold text-gray-800 truncate text-right">
            {p.visitante.nombre}
          </span>
          <FlagImg codigo={p.visitante.codigo_bandera} nombre={p.visitante.nombre} />
        </div>
      </div>

      {played && p.pred && (
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-500">
          <span className="opacity-60">{predLabel}</span>
          <span className="font-bold tabular-nums">
            {p.pred.goles_local ?? '–'}–{p.pred.goles_visitante ?? '–'}
            <span className="ml-1 text-gray-400">({p.pred.resultado})</span>
          </span>
        </div>
      )}
      {played && !p.pred && (
        <div className="mt-2.5 flex items-center gap-1 text-[10px] text-gray-400">
          <Lock size={9} /> {noPredLabel}
        </div>
      )}
    </div>
  )
}

// ─── Breakdown summary card ───────────────────────────────────────────────────

function BreakdownCard({ rows, total, phase }: {
  rows: { label: string; count: number; perItem: number; pts: number; accent: string }[]
  total: number
  phase: string
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">{phase} · desglose</p>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                style={{ background: r.pts > 0 ? r.accent + '22' : '#f1f5f9', color: r.pts > 0 ? r.accent : '#9ca3af' }}
              >
                ×{r.count}
              </span>
              <span className="text-gray-600 truncate">{r.label}</span>
            </div>
            <span className="font-bold tabular-nums shrink-0 ml-2" style={{ color: r.pts > 0 ? '#004d40' : '#94a3b8' }}>
              {r.pts > 0 ? `+${r.pts}` : '0'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
        <span className="text-[10px] font-bold text-gray-400">Total {phase}</span>
        <span className="text-base font-black tabular-nums" style={{ color: total > 0 ? '#004d40' : '#94a3b8' }}>
          {total} pts
        </span>
      </div>
    </div>
  )
}

// ─── Clasif group card (Phase 2) ──────────────────────────────────────────────

const TIPO_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  exacto:    { label: 'Clavado ×4 🎯', color: 'white',   bg: '#00A651' },
  top2:      { label: 'Top-2 ✓',        color: '#7a5b00', bg: '#FFD100' },
  bottom2:   { label: 'Eliminados ✓',   color: '#374151', bg: '#e5e7eb' },
  miss:      { label: 'Fallado',         color: '#9ca3af', bg: '#f1f5f9' },
  sin_pick:  { label: 'Sin predicción', color: '#9ca3af', bg: '#f1f5f9' },
  pendiente: { label: 'Grupo en curso', color: '#7a5b00', bg: '#fef3c7' },
}

function ClasifGroupCard({ g, predHeader }: { g: ClasifGroupUI; predHeader: string }) {
  const style = TIPO_LABEL[g.tipo]
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: '#004d40' }}>
        <span className="text-xs font-black text-white uppercase tracking-widest">Grupo {g.grupo}</span>
        <span
          className="text-[10px] font-black px-2 py-0.5 rounded-full"
          style={{ background: style.bg, color: style.color }}
        >
          {g.pts > 0 ? `+${g.pts}` : '0'} · {style.label}
        </span>
      </div>

      {/* Columns header */}
      <div className="grid grid-cols-[auto_1fr_1fr] gap-0 px-3 pt-2 pb-1">
        <div className="w-5" />
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Real</p>
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">{predHeader}</p>
      </div>

      {/* Rows */}
      <div className="px-3 pb-3 space-y-1">
        {[0, 1, 2, 3].map((i) => {
          const actualTeam = g.actual[i]
          const pickTeam = g.pick[i]
          const exact = pickTeam?.equipo_id === actualTeam?.equipo_id
          const inzone =
            !exact &&
            pickTeam != null &&
            ((i < 2 &&
              (g.actual[0].equipo_id === pickTeam.equipo_id ||
                g.actual[1].equipo_id === pickTeam.equipo_id)) ||
              (i >= 2 &&
                (g.actual[2].equipo_id === pickTeam.equipo_id ||
                  g.actual[3].equipo_id === pickTeam.equipo_id)))

          return (
            <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-1 items-center">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
                style={{ background: i < 2 ? 'rgba(0,77,64,0.1)' : '#f1f5f9', color: i < 2 ? '#004d40' : '#94a3b8' }}
              >
                {i + 1}
              </div>
              {/* Real */}
              <div className="flex items-center gap-1 min-w-0 px-1">
                {actualTeam && <FlagImg codigo={actualTeam.codigo_bandera} nombre={actualTeam.nombre} size={14} />}
                <span className="text-[11px] text-gray-700 truncate">{actualTeam?.nombre ?? '?'}</span>
              </div>
              {/* Pick */}
              <div
                className="flex items-center gap-1 min-w-0 px-1 py-0.5 rounded-lg"
                style={{
                  background: exact
                    ? 'rgba(0,166,81,0.1)'
                    : inzone
                      ? 'rgba(255,209,0,0.15)'
                      : 'transparent',
                }}
              >
                {pickTeam ? (
                  <>
                    <FlagImg codigo={pickTeam.codigo_bandera} nombre={pickTeam.nombre} size={14} />
                    <span className="text-[11px] truncate" style={{ color: exact ? '#00A651' : inzone ? '#7a5b00' : '#374151' }}>
                      {pickTeam.nombre}
                    </span>
                    {exact && <Check size={9} style={{ color: '#00A651' }} className="shrink-0" />}
                  </>
                ) : (
                  <span className="text-[10px] italic text-gray-300">—</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Award card (Phase 3) ─────────────────────────────────────────────────────

function PlayerCard({ player, highlight, caption }: {
  player: JugadorLite | null
  highlight?: boolean
  caption: string
}) {
  if (!player) {
    return (
      <div className="flex-1 rounded-xl bg-slate-50 px-3 py-3 border border-dashed border-slate-200">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{caption}</p>
        <p className="text-[11px] italic text-slate-300">—</p>
      </div>
    )
  }
  return (
    <div
      className="flex-1 rounded-xl px-3 py-3"
      style={{
        background: highlight ? 'rgba(0,166,81,0.08)' : '#f8fafc',
        border: highlight ? '1px solid rgba(0,166,81,0.4)' : '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{caption}</p>
      <div className="flex items-center gap-2">
        {player.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={player.foto_url} alt={`${player.nombre} ${player.apellidos}`}
            className="w-10 h-10 rounded-full object-cover bg-slate-200" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-slate-200" />
        )}
        <div className="min-w-0">
          <p className="text-[12px] font-black text-slate-900 leading-tight truncate">
            {player.nombre} {player.apellidos}
          </p>
          {player.equipo && (
            <div className="flex items-center gap-1 mt-0.5">
              <FlagImg codigo={player.equipo.codigo_bandera} nombre={player.equipo.nombre} size={12} />
              <span className="text-[9px] text-slate-500 truncate">{player.equipo.nombre}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Rules modal ──────────────────────────────────────────────────────────────

function ReglasPanel() {
  return (
    <div className="px-4 py-4">
      <div className="bg-white rounded-2xl shadow-sm px-5 py-5 space-y-4">
        <div className="pb-1">
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>
            FIFA World Cup 2026
          </p>
          <h2 className="text-lg font-black text-gray-900">Tabla de puntos</h2>
        </div>

        <RuleSection num="1" title="Fase de Grupos" subtitle="72 partidos · marcador exacto"
          rows={[
            { label: 'Resultado exacto (goles local y visitante)', pts: '+3', accent: '#00A651' },
            { label: '1X2 correcto, marcador erróneo', pts: '+1', accent: '#FFD100' },
            { label: 'Fallo', pts: '0', accent: '#94a3b8' },
          ]}
          total="Máx: 216 pts" />

        <RuleSection num="2" title="Clasificación" subtitle="12 grupos · solo cobras el tramo más alto"
          rows={[
            { label: 'Clavar el grupo entero (las 4 posiciones)', pts: '+5', accent: '#00A651' },
            { label: 'Acertar quién pasa (1.º y 2.º, orden libre)', pts: '+2', accent: '#FFD100' },
            { label: 'Acertar quién queda eliminado (3.º y 4.º)', pts: '+1', accent: '#94a3b8' },
            { label: 'Por cada uno de los 8 mejores terceros', pts: '+2', accent: '#C9A84C' },
          ]}
          total="Máx: 76 pts" />

        <RuleSection num="3" title="Premios Individuales" subtitle="Awards al final del torneo"
          rows={[
            { label: 'Bota de Oro (Pichichi)', pts: '+8', accent: '#C9A84C' },
            { label: 'Balón de Oro (MVP)', pts: '+8', accent: '#FFD100' },
            { label: 'Guante de Oro (mejor portero)', pts: '+5', accent: '#00A651' },
            { label: 'Mejor jugador joven', pts: '+5', accent: '#7c3aed' },
            { label: 'Best XI · por cada jugador acertado', pts: '+3', accent: '#94a3b8' },
            { label: 'Best XI completo (bonus)', pts: '+20', accent: '#00A651' },
          ]}
          total="Máx: 79 pts" />

        <RuleSection num="4" title="Knockout Stage" subtitle="32 equipos · fase eliminatoria"
          rows={[
            { label: 'Equipo que pasa (1/16 a semis, 30 partidos)', pts: '+1', accent: '#94a3b8' },
            { label: 'Octavos exacto (cruce correcto)', pts: '+1', accent: '#FFD100' },
            { label: 'Cuartos exacto (cruce correcto)', pts: '+2', accent: '#FFD100' },
            { label: 'Semis exacto (cruce correcto)', pts: '+4', accent: '#C9A84C' },
            { label: 'Campeón', pts: '+8', accent: '#00A651' },
            { label: 'Final exacta (ambos finalistas acertados)', pts: '+8', accent: '#00A651' },
            { label: 'Marcador exacto · por partido (31 en total)', pts: '+1', accent: '#7c3aed' },
          ]}
          total="Máx: 101 pts" />

        <div className="bg-slate-50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm font-bold text-gray-700">Total máximo</span>
          <span className="text-lg font-black" style={{ color: '#004d40' }}>472 pts</span>
        </div>
      </div>
    </div>
  )
}

function RuleSection({
  num, title, subtitle, rows, total,
}: {
  num: string; title: string; subtitle: string
  rows: { label: string; pts: string; accent: string }[]
  total: string
}) {
  return (
    <div className="bg-gray-50 rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ background: '#004d40' }}>
        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
          style={{ background: '#C9A84C', color: '#004d40' }}>
          {num}
        </span>
        <div>
          <span className="text-xs font-black text-white">{title}</span>
          <span className="text-[10px] text-white opacity-60 ml-2">{subtitle}</span>
        </div>
      </div>
      <ul className="px-3 py-2 divide-y divide-white">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2 py-1.5">
            <span className="flex-1 text-[11px] text-gray-700 leading-snug">{r.label}</span>
            <span className="text-[11px] font-black tabular-nums px-2 py-0.5 rounded-full shrink-0"
              style={{ background: r.accent + '22', color: r.accent === '#FFD100' ? '#7a5b00' : r.accent === '#94a3b8' ? '#64748b' : r.accent }}>
              {r.pts}
            </span>
          </li>
        ))}
      </ul>
      <div className="px-4 py-2 border-t border-white">
        <span className="text-[10px] font-bold text-gray-400">{total}</span>
      </div>
    </div>
  )
}

// ─── Best XI card (oficial vs mio en un campo de fútbol) ─────────────────────

function BestXIPlayerDot({ player, highlight, slot }: {
  player: JugadorLite | null
  highlight: boolean
  slot: { label: string; x: number; y: number }
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-14"
      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center border-2"
        style={{
          background: player ? '#fff' : 'rgba(255,255,255,0.15)',
          borderColor: highlight ? '#FFD100' : player ? '#fff' : 'rgba(255,255,255,0.4)',
          boxShadow: highlight ? '0 0 0 3px rgba(255,209,0,0.35)' : '0 1px 4px rgba(0,0,0,0.25)',
        }}
      >
        {player?.foto_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={player.foto_url} alt={player.apellidos} className="w-full h-full rounded-full object-cover" />
        ) : (
          <span className="text-[9px] font-black" style={{ color: player ? '#004d40' : 'rgba(255,255,255,0.7)' }}>
            {player ? player.apellidos.slice(0, 2).toUpperCase() : slot.label}
          </span>
        )}
      </div>
      {player && (
        <span
          className="mt-0.5 text-[8.5px] font-black truncate max-w-[58px] text-center"
          style={{
            color: highlight ? '#FFD100' : '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.7)',
          }}
        >
          {player.apellidos || player.nombre}
        </span>
      )}
    </div>
  )
}

function BestXIField({ players, highlightIds, label }: {
  players: Record<string, JugadorLite | null>
  highlightIds: Set<number>
  label: string
}) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1 text-center">{label}</p>
      <div
        className="relative rounded-xl overflow-hidden aspect-[2/3]"
        style={{
          background:
            'linear-gradient(180deg, #0f6b3a 0%, #0a5a30 50%, #084a27 100%)',
        }}
      >
        {/* Field stripes */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 40px)' }} />
        {/* Center line / circle */}
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/40" />
        <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        {/* Goals */}
        <div className="absolute left-1/2 top-0 w-1/3 h-3 -translate-x-1/2 border border-white/40 border-t-0" />
        <div className="absolute left-1/2 bottom-0 w-1/3 h-3 -translate-x-1/2 border border-white/40 border-b-0" />
        {/* Players */}
        {XI_LAYOUT.map((s) => {
          const p = players[s.slot] ?? null
          const hi = p != null && highlightIds.has(p.id)
          return <BestXIPlayerDot key={s.slot} player={p} highlight={hi} slot={s} />
        })}
      </div>
    </div>
  )
}

function BestXIFieldEditable({
  players, highlightIds, adminData, onSaved,
}: {
  players: Record<string, JugadorLite | null>
  highlightIds: Set<number>
  adminData: AdminPremiosData
  onSaved: (next: Record<string, number>) => void
}) {
  const [xi, setXi] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const [k, v] of Object.entries(players)) {
      if (v) init[k] = v.id
    }
    return init
  })
  const [activeSlot, setActiveSlot] = useState<XISlot | null>(null)
  const equipoMap = useMemo(() => new Map(adminData.equipos.map((e) => [e.id, e])), [adminData.equipos])

  const save = async (next: Record<string, number>) => {
    const fd = new FormData()
    fd.set('best_xi', JSON.stringify(next))
    await saveOfficialBestXI(fd)
    onSaved(next)
  }

  const clearActiveSlot = async () => {
    if (!activeSlot) return
    const next = { ...xi }
    delete next[activeSlot]
    setXi(next)
    setActiveSlot(null)
    await save(next)
  }

  const selectForActiveSlot = async (id: number | null) => {
    if (!activeSlot) return
    const next = { ...xi }
    if (id == null) {
      delete next[activeSlot]
    } else {
      // Remove the same player from any other slot before assigning.
      for (const [k, v] of Object.entries(next)) {
        if (v === id) delete next[k]
      }
      next[activeSlot] = id
    }
    setXi(next)
    setActiveSlot(null)
    await save(next)
  }

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Oficial</p>
        <span
          className="text-[9px] font-black"
          style={{ color: Object.keys(xi).length === 11 ? '#00A651' : '#92400e' }}
        >
          {Object.keys(xi).length}/11
        </span>
      </div>
      <div
        className="relative rounded-xl overflow-hidden aspect-[2/3]"
        style={{ background: 'linear-gradient(180deg, #0f6b3a 0%, #0a5a30 50%, #084a27 100%)' }}
      >
        {/* Field decorations */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 20px, rgba(255,255,255,0.08) 20px, rgba(255,255,255,0.08) 40px)' }} />
        <div className="absolute left-0 right-0 top-1/2 h-px bg-white/40" />
        <div className="absolute left-1/2 top-1/2 w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
        <div className="absolute left-1/2 top-0 w-1/3 h-3 -translate-x-1/2 border border-white/40 border-t-0" />
        <div className="absolute left-1/2 bottom-0 w-1/3 h-3 -translate-x-1/2 border border-white/40 border-b-0" />
        {/* Clickable slots */}
        {XI_LAYOUT.map((s) => {
          const pid = xi[s.slot] ?? null
          const p = pid != null ? (players[s.slot] ?? null) : null
          // Try to resolve from adminData if the player is newly set
          const j = pid != null
            ? adminData.jugadores.find((jj) => jj.id === pid) ?? null
            : null
          const display: JugadorLite | null = j
            ? { id: j.id, nombre: j.nombre, apellidos: j.apellidos, posicion: j.posicion,
                numero_dorsal: j.numero_dorsal, foto_url: j.foto_url,
                equipo: equipoMap.get(j.equipo_id)
                  ? { nombre: equipoMap.get(j.equipo_id)!.nombre, codigo_bandera: equipoMap.get(j.equipo_id)!.codigo_bandera }
                  : (p?.equipo ?? null) }
            : null
          const hi = display != null && highlightIds.has(display.id)
          const isActive = activeSlot === s.slot
          return (
            <div
              key={s.slot}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: isActive ? 20 : 1 }}
            >
              <button
                type="button"
                onClick={() => setActiveSlot(isActive ? null : s.slot)}
                className="flex flex-col items-center w-14 focus:outline-none"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
                  style={{
                    background: display ? '#fff' : 'rgba(255,255,255,0.15)',
                    borderColor: isActive ? '#FFD100' : hi ? '#FFD100' : display ? '#fff' : 'rgba(255,255,255,0.5)',
                    boxShadow: isActive
                      ? '0 0 0 3px rgba(255,209,0,0.6)'
                      : hi ? '0 0 0 3px rgba(255,209,0,0.35)' : '0 1px 4px rgba(0,0,0,0.25)',
                  }}
                >
                  {display?.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={display.foto_url} alt={display.apellidos} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-black" style={{ color: display ? '#004d40' : 'rgba(255,255,255,0.7)' }}>
                      {display ? display.apellidos.slice(0, 2).toUpperCase() : s.label}
                    </span>
                  )}
                </div>
                {display && (
                  <span
                    className="mt-0.5 text-[8.5px] font-black truncate max-w-[58px] text-center"
                    style={{ color: hi ? '#FFD100' : '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}
                  >
                    {display.apellidos || display.nombre}
                  </span>
                )}
              </button>
            </div>
          )
        })}
      </div>
      {/* Player picker for active slot (desktop/tablet) */}
      {activeSlot && (
        <div className="mt-2 p-2 rounded-xl border-2 border-amber-300 bg-amber-50 hidden sm:block">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">
              {activeSlot} — {XI_SLOT_POS[activeSlot]}
            </p>
            {xi[activeSlot] && (
              <button
                type="button"
                onClick={clearActiveSlot}
                className="text-[9px] font-bold text-red-400 hover:text-red-600"
              >
                Quitar
              </button>
            )}
          </div>
          <PlayerCombobox
            value={xi[activeSlot] ?? null}
            onChange={selectForActiveSlot}
            jugadores={adminData.jugadores}
            equipos={equipoMap}
            posFilter={XI_SLOT_POS[activeSlot]}
            placeholder={`Buscar ${XI_SLOT_POS[activeSlot]}…`}
          />
        </div>
      )}

      {/* Player picker for active slot (mobile bottom sheet) */}
      {activeSlot && (
        <div className="fixed inset-0 z-40 sm:hidden">
          <button
            type="button"
            aria-label="Cerrar selector"
            onClick={() => setActiveSlot(null)}
            className="absolute inset-0 bg-black/45"
          />
          <div className="absolute left-0 right-0 bottom-0 rounded-t-2xl border-t-2 border-amber-300 bg-amber-50 p-3 shadow-2xl">
            <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-amber-300/70" />
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider">
                {activeSlot} — {XI_SLOT_POS[activeSlot]}
              </p>
              <div className="flex items-center gap-3">
                {xi[activeSlot] && (
                  <button
                    type="button"
                    onClick={clearActiveSlot}
                    className="text-[10px] font-bold text-red-500"
                  >
                    Quitar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setActiveSlot(null)}
                  className="text-[10px] font-bold text-amber-700"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <PlayerCombobox
              value={xi[activeSlot] ?? null}
              onChange={selectForActiveSlot}
              jugadores={adminData.jugadores}
              equipos={equipoMap}
              posFilter={XI_SLOT_POS[activeSlot]}
              placeholder={`Buscar ${XI_SLOT_POS[activeSlot]}…`}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function BestXICard({
  info, isAdmin, adminData, xiLabel, noXiLabel,
}: {
  info: BestXIInfo
  isAdmin?: boolean
  adminData?: AdminPremiosData
  xiLabel: string
  noXiLabel: string
}) {
  // Local override for admin live edits (optimistic update, no reload needed)
  const [localOficialXI, setLocalOficialXI] = useState<Record<string, number> | null>(null)

  // Resolve displayOficial: prefer local override, resolving ids from adminData
  const displayOficial = useMemo<Record<string, JugadorLite | null>>(() => {
    if (!localOficialXI || !adminData) return info.oficial
    const equipoMap = new Map(adminData.equipos.map((e) => [e.id, e]))
    const out: Record<string, JugadorLite | null> = {}
    for (const slot of XI_SLOTS) {
      const id = localOficialXI[slot] ?? null
      if (id == null) { out[slot] = null; continue }
      const j = adminData.jugadores.find((jj) => jj.id === id) ?? null
      const eq = j ? equipoMap.get(j.equipo_id) : null
      out[slot] = j
        ? { id: j.id, nombre: j.nombre, apellidos: j.apellidos, posicion: j.posicion,
            numero_dorsal: j.numero_dorsal, foto_url: j.foto_url,
            equipo: eq ? { nombre: eq.nombre, codigo_bandera: eq.codigo_bandera } : null }
        : null
    }
    return out
  }, [localOficialXI, adminData, info.oficial])

  const oficialIds = useMemo(() => {
    const s = new Set<number>()
    for (const v of Object.values(displayOficial)) if (v) s.add(v.id)
    return s
  }, [displayOficial])

  const mineIds = new Set<number>()
  for (const v of Object.values(info.mio)) if (v) mineIds.add(v.id)
  const aciertosSet = new Set<number>()
  for (const id of oficialIds) if (mineIds.has(id)) aciertosSet.add(id)

  const oficialDefinido = oficialIds.size === 11
  const mioDefinido = mineIds.size === 11

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Shield size={14} style={{ color: '#004d40' }} />
          <span className="text-xs font-black text-gray-800">Best XI</span>
        </div>
        {oficialDefinido && mioDefinido ? (
          <span
            className="text-[10px] font-black px-2 py-0.5 rounded-full"
            style={{
              background: aciertosSet.size > 0 ? '#00A651' : '#f1f5f9',
              color: aciertosSet.size > 0 ? '#fff' : '#9ca3af',
            }}
          >
            {aciertosSet.size}/11 · {aciertosSet.size > 0 ? `+${aciertosSet.size * 3 + (aciertosSet.size === 11 ? 20 : 0)}` : '0'} pts
          </span>
        ) : (
          <span className="text-[9.5px] font-bold text-gray-400 italic">
            {!oficialDefinido ? 'XI oficial sin completar' : noXiLabel}
          </span>
        )}
      </div>
      <div className="p-3 flex gap-2">
        {isAdmin && adminData ? (
          <BestXIFieldEditable
            players={displayOficial}
            highlightIds={aciertosSet}
            adminData={adminData}
            onSaved={(next) => setLocalOficialXI(next)}
          />
        ) : (
          <BestXIField players={displayOficial} highlightIds={aciertosSet} label="Oficial" />
        )}
        <BestXIField players={info.mio} highlightIds={aciertosSet} label={xiLabel} />
      </div>
      {oficialDefinido && mioDefinido && (
        <div className="px-3 pb-3 flex items-center justify-center gap-1.5">
          {aciertosSet.size === 11 ? (
            <><Check size={12} style={{ color: '#00A651' }} /><span className="text-[10px] font-bold" style={{ color: '#00A651' }}>¡XI completo! +20 bonus</span></>
          ) : aciertosSet.size > 0 ? (
            <span className="text-[10px] font-bold text-gray-500">{aciertosSet.size} aciertos × +3 = +{aciertosSet.size * 3} pts</span>
          ) : (
            <><XIcon size={12} className="text-red-400" /><span className="text-[10px] font-bold text-red-400">Ningún jugador acertado</span></>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Player priority lists (shown first when no search query) ────────────────
// Keys are normalized substrings matched against `${nombre} ${apellidos}` normalised.

const PRIORITY_BY_POS: Record<string, string[]> = {
  delantero: [
    'ronaldo', 'messi', 'neymar', 'mbappe', 'yamal', 'vinicius', 'raphinha',
    'haaland', 'salah', 'kane', 'lewandowski', 'osimhen', 'benzema',
    'dembele', 'saka', 'pulisic', 'martinelli', 'coman', 'gnabry',
    'werner', 'asensio', 'ferran torres', 'griezmann', 'lukaku',
    'firmino', 'son', 'havertz', 'richarlison', 'rodrygo', 'savinho',
  ],
  centrocampista: [
    'pedri', 'vitinha', 'bellingham', 'modric', 'de bruyne', 'foden',
    'gavi', 'kroos', 'camavinga', 'tchouameni', 'rodri', 'valverde',
    'bernardo silva', 'kimmich', 'goretzka', 'ruiz', 'kovacic',
    'thuram', 'rabiot', 'verratti', 'zielinski', 'calhanoglu',
    'szoboszlai', 'musiala', 'wirtz', 'guler', 'dani olmo', 'reijnders',
  ],
  defensa: [
    'cubarsi', 'dias', 'van dijk', 'militao', 'rudiger', 'alaba',
    'theo hernandez', 'cancelo', 'acuna', 'trent', 'stone',
    'konate', 'upamecano', 'gvardiol', 'dumfries', 'maguire',
    'laporte', 'eric garcia', 'danilo', 'tah', 'kounde', 'timber',
    'carvajal', 'hakimi', 'grimaldo', 'mendy', 'robertson',
  ],
  portero: [
    'joan garcia', 'neuer', 'maignan', 'alisson', 'ter stegen',
    'ederson', 'courtois', 'oblak', 'szczesny', 'onana',
    'raya', 'flekken', 'cech', 'navas', 'schmeichel',
  ],
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

function playerPriority(j: AdminJugador, posFilter: string | undefined): number {
  const full = norm(`${j.nombre} ${j.apellidos}`)
  const list = posFilter ? (PRIORITY_BY_POS[posFilter] ?? []) : [
    ...PRIORITY_BY_POS.delantero,
    ...PRIORITY_BY_POS.centrocampista,
    ...PRIORITY_BY_POS.defensa,
    ...PRIORITY_BY_POS.portero,
  ]
  const idx = list.findIndex((fragment) => full.includes(norm(fragment)))
  return idx === -1 ? list.length + full.charCodeAt(0) : idx
}

// ─── Admin: player combobox ───────────────────────────────────────────────────

function PlayerCombobox({
  value,
  onChange,
  jugadores,
  equipos,
  posFilter,
  placeholder,
}: {
  value: number | null
  onChange: (id: number | null) => void
  jugadores: AdminJugador[]
  equipos: Map<number, AdminEquipo>
  posFilter?: 'portero' | 'defensa' | 'centrocampista' | 'delantero'
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const filtered = useMemo(() => {
    const base = posFilter ? jugadores.filter((j) => j.posicion === posFilter) : jugadores
    const qn = norm(q.trim())
    if (!qn) {
      return [...base]
        .sort((a, b) => playerPriority(a, posFilter) - playerPriority(b, posFilter))
        .slice(0, 60)
    }
    return base.filter((j) => {
      const full = norm(`${j.nombre} ${j.apellidos}`)
      const eq = equipos.get(j.equipo_id)
      const eqn = eq ? norm(eq.nombre) : ''
      return full.includes(qn) || eqn.includes(qn)
    })
      .sort((a, b) => playerPriority(a, posFilter) - playerPriority(b, posFilter))
      .slice(0, 60)
  }, [jugadores, equipos, posFilter, q])

  const selected = value != null ? jugadores.find((j) => j.id === value) ?? null : null
  const selectedTeam = selected ? equipos.get(selected.equipo_id) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-left hover:border-gray-300"
      >
        {selected ? (
          <>
            {selected.foto_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={selected.foto_url} alt="" className="w-7 h-7 rounded-full object-cover bg-slate-200" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-gray-800 truncate">{selected.nombre} {selected.apellidos}</p>
              {selectedTeam && (
                <div className="flex items-center gap-1">
                  <FlagImg codigo={selectedTeam.codigo_bandera} nombre={selectedTeam.nombre} size={11} />
                  <span className="text-[9px] text-gray-500 truncate">{selectedTeam.nombre}</span>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
              className="text-gray-400 hover:text-red-500 p-1"
              aria-label="Quitar"
            >
              <XIcon size={12} />
            </button>
          </>
        ) : (
          <>
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
              <Search size={12} className="text-gray-400" />
            </div>
            <span className="flex-1 text-[11px] text-gray-400 italic">{placeholder ?? 'Buscar jugador…'}</span>
          </>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-2 py-1.5 border-b border-gray-100">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre o selección…"
              className="w-full text-[12px] px-2 py-1.5 rounded-md bg-gray-50 outline-none focus:ring-2 focus:ring-[#FFD100]"
            />
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-[11px] text-gray-400 italic text-center">Sin resultados</p>
            )}
            {filtered.map((j) => {
              const eq = equipos.get(j.equipo_id)
              return (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => { onChange(j.id); setOpen(false); setQ('') }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
                >
                  {j.foto_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={j.foto_url} alt="" className="w-7 h-7 rounded-full object-cover bg-slate-200" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-slate-200" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-gray-800 truncate">{j.nombre} {j.apellidos}</p>
                    <div className="flex items-center gap-1">
                      {eq && <FlagImg codigo={eq.codigo_bandera} nombre={eq.nombre} size={11} />}
                      <span className="text-[9px] text-gray-500 truncate">
                        {eq?.nombre ?? '—'}{j.posicion ? ` · ${j.posicion}` : ''}
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

function TeamCombobox({
  value, onChange, equipos, placeholder,
}: {
  value: number | null
  onChange: (id: number | null) => void
  equipos: AdminEquipo[]
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])
  const selected = value != null ? equipos.find((e) => e.id === value) ?? null : null
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-gray-200 bg-white text-left hover:border-gray-300"
      >
        {selected ? (
          <>
            <FlagImg codigo={selected.codigo_bandera} nombre={selected.nombre} size={14} />
            <span className="flex-1 text-[11px] font-black text-gray-800 truncate">{selected.nombre}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
              className="text-gray-400 hover:text-red-500 p-1"
              aria-label="Quitar"
            >
              <XIcon size={12} />
            </button>
          </>
        ) : (
          <span className="flex-1 text-[11px] text-gray-400 italic">{placeholder ?? 'Elegir equipo…'}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 mt-1 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 max-h-64 overflow-y-auto">
          {equipos.map((eq) => (
            <button
              key={eq.id}
              type="button"
              onClick={() => { onChange(eq.id); setOpen(false) }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left hover:bg-gray-50 border-b border-gray-50 last:border-0"
            >
              <FlagImg codigo={eq.codigo_bandera} nombre={eq.nombre} size={14} />
              <span className="text-[11px] font-bold text-gray-700 truncate">{eq.nombre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AdminPremiosEditor({ data }: { data: AdminPremiosData }) {
  const [open, setOpen] = useState(false)
  const [pichichi, setPichichi] = useState<number | null>(data.oficiales.pichichi_jugador_id)
  const [mvp, setMvp] = useState<number | null>(data.oficiales.mvp_jugador_id)
  const [guante, setGuante] = useState<number | null>(data.oficiales.guante_oro_jugador_id)
  const [joven, setJoven] = useState<number | null>(data.oficiales.joven_jugador_id)
  const [campeon, setCampeon] = useState<number | null>(data.oficiales.campeon_equipo_id)
  const [subcampeon, setSubcampeon] = useState<number | null>(data.oficiales.subcampeon_equipo_id)
  const [tercero, setTercero] = useState<number | null>(data.oficiales.tercer_puesto_id)
  const [xi, setXi] = useState<Record<string, number>>(() => ({ ...(data.oficiales.best_xi ?? {}) }))
  const [xiSlot, setXiSlot] = useState<XISlot | null>(null)
  const equipoMap = useMemo(() => new Map(data.equipos.map((e) => [e.id, e])), [data.equipos])

  const xiCount = Object.values(xi).filter((v) => typeof v === 'number' && v > 0).length

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
      >
        <div className="flex items-center gap-2">
          <Pencil size={14} style={{ color: '#92400e' }} />
          <span className="text-xs font-black uppercase tracking-widest" style={{ color: '#92400e' }}>
            Admin · Editar premios oficiales
          </span>
        </div>
        <span className="text-[10px] font-bold" style={{ color: '#92400e' }}>
          {open ? 'Ocultar' : 'Mostrar'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Premios individuales */}
          <form action={saveOfficialAwards} className="bg-white rounded-xl p-3 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Premios individuales</p>

            <AdminField label="Bota de Oro (Pichichi)" name="pichichi_jugador_id" value={pichichi}>
              <PlayerCombobox value={pichichi} onChange={setPichichi} jugadores={data.jugadores} equipos={equipoMap} placeholder="Buscar pichichi…" />
            </AdminField>
            <AdminField label="Balón de Oro (MVP)" name="mvp_jugador_id" value={mvp}>
              <PlayerCombobox value={mvp} onChange={setMvp} jugadores={data.jugadores} equipos={equipoMap} placeholder="Buscar MVP…" />
            </AdminField>
            <AdminField label="Guante de Oro" name="guante_oro_jugador_id" value={guante}>
              <PlayerCombobox value={guante} onChange={setGuante} jugadores={data.jugadores} equipos={equipoMap} posFilter="portero" placeholder="Buscar portero…" />
            </AdminField>
            <AdminField label="Mejor Jugador Joven" name="joven_jugador_id" value={joven}>
              <PlayerCombobox value={joven} onChange={setJoven} jugadores={data.jugadores} equipos={equipoMap} placeholder="Buscar joven…" />
            </AdminField>

            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-3 mb-1">Podio</p>
            <AdminField label="Campeón" name="campeon_equipo_id" value={campeon}>
              <TeamCombobox value={campeon} onChange={setCampeon} equipos={data.equipos} placeholder="Equipo campeón…" />
            </AdminField>
            <AdminField label="Subcampeón" name="subcampeon_equipo_id" value={subcampeon}>
              <TeamCombobox value={subcampeon} onChange={setSubcampeon} equipos={data.equipos} placeholder="Subcampeón…" />
            </AdminField>
            <AdminField label="3.er puesto" name="tercer_puesto_id" value={tercero}>
              <TeamCombobox value={tercero} onChange={setTercero} equipos={data.equipos} placeholder="Tercer puesto…" />
            </AdminField>

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black text-white"
              style={{ background: '#004d40' }}
            >
              <Save size={12} /> Guardar premios
            </button>
            <p className="text-[10px] text-gray-500 italic text-center">
              Al guardar se actualiza para todos y se recalculan puntos automáticamente.
            </p>
          </form>

          {/* Best XI editor */}
          <form action={saveOfficialBestXI} className="bg-white rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Best XI oficial</p>
              <span className="text-[10px] font-bold" style={{ color: xiCount === 11 ? '#00A651' : '#92400e' }}>
                {xiCount}/11
              </span>
            </div>
            <input type="hidden" name="best_xi" value={JSON.stringify(xi)} />

            <div className="grid grid-cols-2 gap-2">
              {XI_LAYOUT.map((s) => {
                const id = xi[s.slot] ?? null
                const j = id != null ? data.jugadores.find((p) => p.id === id) ?? null : null
                const eq = j ? equipoMap.get(j.equipo_id) : null
                return (
                  <button
                    key={s.slot}
                    type="button"
                    onClick={() => setXiSlot(xiSlot === s.slot ? null : s.slot)}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left ${xiSlot === s.slot ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white'}`}
                  >
                    <span className="text-[9px] font-black text-gray-400 w-7">{s.label}</span>
                    {j ? (
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-gray-800 truncate">{j.apellidos || j.nombre}</p>
                        {eq && <div className="flex items-center gap-1"><FlagImg codigo={eq.codigo_bandera} nombre={eq.nombre} size={10} /><span className="text-[8px] text-gray-500 truncate">{eq.nombre}</span></div>}
                      </div>
                    ) : (
                      <span className="text-[10px] italic text-gray-400 flex-1">vacío</span>
                    )}
                  </button>
                )
              })}
            </div>

            {xiSlot && (
              <div className="mt-2 p-2 rounded-lg border border-amber-200 bg-amber-50/40">
                <p className="text-[10px] font-bold text-amber-700 mb-1.5">
                  Elegir jugador para <span className="uppercase">{xiSlot}</span> ({XI_SLOT_POS[xiSlot]})
                </p>
                <PlayerCombobox
                  value={xi[xiSlot] ?? null}
                  onChange={(id) => {
                    setXi((prev) => {
                      const next: Record<string, number> = {}
                      for (const [k, v] of Object.entries(prev)) {
                        if (id != null && v === id) continue
                        if (k === xiSlot) continue
                        next[k] = v
                      }
                      if (id != null) next[xiSlot] = id
                      return next
                    })
                  }}
                  jugadores={data.jugadores}
                  equipos={equipoMap}
                  posFilter={XI_SLOT_POS[xiSlot]}
                  placeholder={`Jugador para ${xiSlot}…`}
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-black text-white"
              style={{ background: '#004d40' }}
            >
              <Save size={12} /> Guardar Best XI
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

function AdminField({
  label, name, value, children,
}: {
  label: string; name: string; value: number | null; children: React.ReactNode
}) {
  return (
    <div>
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">{label}</label>
      <input type="hidden" name={name} value={value ?? ''} />
      {children}
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

const AWARD_ICONS = { target: Target, star: Star, shirt: Shirt, sparkles: Sparkles }

export function ResultadosClient({
  partidos,
  grupos,
  clasifGroups,
  awards,
  phasePoints,
  matchBreakdown,
  clasifBreakdown,
  hayPicks,
  bestXI,
  isAdmin,
  adminData,
  viewingSelf = true,
  viewedName = 'Tu',
  bracketWinners,
  equiposForBracket,
  realBracket,
  koMatchResults,
  koBreakdown,
}: {
  partidos: PartidoUI[]
  grupos: GrupoUI[]
  clasifGroups: ClasifGroupUI[]
  awards: AwardResult[]
  phasePoints: PhasePoints
  matchBreakdown: MatchBreakdown
  clasifBreakdown: ClasifBreakdownUI
  hayPicks: boolean
  bestXI: BestXIInfo
  isAdmin: boolean
  adminData?: AdminPremiosData
  viewingSelf?: boolean
  viewedName?: string
  bracketWinners?: Record<string, number>
  equiposForBracket?: { id: number; nombre: string; codigo_bandera: string }[]
  realBracket?: Record<string, number>
  koMatchResults?: {
    key: string; gl: number; gv: number
    localId: number; localNombre: string; localBandera: string
    visitanteId: number; visitanteNombre: string; visitanteBandera: string
    userGl: number | null; userGv: number | null; pts: number | null
    bracketUserWinnerId: number | null
    bracketRealWinnerId: number | null
    bracketBase: number
    bracketExact: number
  }[]
  koBreakdown?: { base: number; exact: number; champion: number; exactScores: number }
}) {
  const [tab, setTab] = useState<'grupos' | 'clasif' | 'premios' | 'reglas' | 'cuadro'>('grupos')

  const predLabel = viewingSelf ? 'Tu predicción' : `Predicción de ${viewedName}`
  const noPredLabel = viewingSelf ? 'Sin pronóstico' : `${viewedName} no pronosticó`
  const pickLabel = viewingSelf ? 'Tu pick' : `Pick de ${viewedName}`
  const noPickLabel = viewingSelf ? 'Sin pick' : 'Sin pick'
  const xiLabel = viewingSelf ? 'Tu XI' : `XI de ${viewedName}`
  const noXiLabel = viewingSelf ? 'No has elegido XI' : `${viewedName} no ha elegido XI`
  const clasifSectionLabel = viewingSelf
    ? 'Clasificación real vs tu predicción'
    : `Clasificación real vs predicción de ${viewedName}`

  const total = phasePoints.grupos + phasePoints.clasif + phasePoints.awards + phasePoints.knockout

  // Day grouping for Fase de Grupos tab
  const byDay = new Map<string, PartidoUI[]>()
  for (const p of partidos) {
    const k = p.fecha.slice(0, 10)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(p)
  }
  const days = [...byDay.keys()].sort()

  const dayPoints = new Map<string, { pts: number; played: boolean }>()
  for (const [d, list] of byDay) {
    let pts = 0; let played = false
    for (const m of list) { if (m.puntos != null) { pts += m.puntos; played = true } }
    dayPoints.set(d, { pts, played })
  }

  const TABS = [
    { k: 'grupos' as const, label: 'Partidos' },
    { k: 'clasif' as const, label: 'Clasif.' },
    { k: 'premios' as const, label: 'Premios' },
    { k: 'cuadro' as const, label: 'Cuadro' },
    { k: 'reglas' as const, label: '', icon: Info },
  ]

  return (
    <>
      {/* ── Score card ── */}
      {hayPicks && (
        <div className="px-4 pt-4">
          <div
            className="mx-auto max-w-[540px] rounded-2xl px-5 py-4 text-white"
            style={{
              background: 'linear-gradient(160deg, #111 0%, #1a1a1a 100%)',
              border: '1px solid rgba(201,168,76,0.25)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
            }}
          >
            {/* Equation row */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {/* addend 1: grupos */}
              <span className="text-2xl font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {phasePoints.grupos}
              </span>
              <span className="text-base font-bold" style={{ color: 'rgba(201,168,76,0.5)' }}>+</span>
              {/* addend 2: clasif */}
              <span className="text-2xl font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {phasePoints.clasif}
              </span>
              <span className="text-base font-bold" style={{ color: 'rgba(201,168,76,0.5)' }}>+</span>
              {/* addend 3: premios */}
              <span className="text-2xl font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {phasePoints.awards}
              </span>
              <span className="text-base font-bold" style={{ color: 'rgba(201,168,76,0.5)' }}>+</span>
              {/* addend 4: cuadro (bracket + exact KO) */}
              <span className="text-2xl font-black tabular-nums" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {phasePoints.knockout}
              </span>
              {/* equals + total */}
              <span className="text-xl font-bold mx-1" style={{ color: '#C9A84C' }}>=</span>
              <span className="flex items-end gap-1.5">
                <span
                  className="text-5xl font-black tabular-nums leading-none"
                  style={{ color: '#C9A84C', textShadow: '0 0 24px rgba(201,168,76,0.35)' }}
                >
                  {total}
                </span>
                <span className="text-lg font-black leading-none mb-1" style={{ color: '#C9A84C', opacity: 0.95 }}>
                  Pts.
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab bar ── */}
      <div className="px-4 pt-4 sticky top-32 md:top-0 z-10" style={{ background: '#f9fafb' }}>
        <div className="bg-white rounded-2xl shadow-sm p-1.5 flex gap-1 items-center">
          {TABS.map((t) => {
            const active = tab === t.k
            const Icon = t.icon
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                style={{
                  background: active ? '#004d40' : 'transparent',
                  color: active ? 'white' : '#94a3b8',
                }}
                title={Icon ? 'Tabla de puntos' : undefined}
              >
                {Icon ? <Icon size={16} /> : t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Tab: Partidos ── */}
      {tab === 'grupos' && (
        <div className="px-4 py-4 space-y-4">
          {/* Breakdown */}
          <BreakdownCard
            phase="Partidos"
            total={phasePoints.grupos + phasePoints.knockout}
            rows={[
              { label: 'Marcadores exactos × +3', count: matchBreakdown.exactos, perItem: 3, pts: matchBreakdown.exactos * 3, accent: '#00A651' },
              { label: 'Acertados 1X2 × +1', count: matchBreakdown.acertados1x2, perItem: 1, pts: matchBreakdown.acertados1x2, accent: '#FFD100' },
              { label: 'Fallados / sin pick', count: matchBreakdown.fallos + matchBreakdown.sinPick, perItem: 0, pts: 0, accent: '#94a3b8' },
            ]}
          />
          {/* Matches by day */}
          {days.length === 0 && <p className="text-center text-sm text-gray-400 py-6">No hay partidos.</p>}
          {days.map((day) => {
            const matches = byDay.get(day)!
            const label = new Date(day + 'T00:00:00Z').toLocaleDateString('es-ES', {
              weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
            })
            const sub = dayPoints.get(day)!
            return (
              <div key={day}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest capitalize">{label}</span>
                  <div className="flex-1 h-px bg-gray-100" />
                  {sub.played && (
                    <span
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums"
                      style={{ background: sub.pts > 0 ? 'rgba(0,77,64,0.1)' : '#f1f5f9', color: sub.pts > 0 ? '#004d40' : '#94a3b8' }}
                    >
                      +{sub.pts} pts
                    </span>
                  )}
                </div>
                <div className="space-y-2.5">
                  {matches.map((p) => <MatchCard key={p.id} p={p} predLabel={predLabel} noPredLabel={noPredLabel} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Tab: Clasificación ── */}
      {tab === 'clasif' && (
        <div className="px-4 py-4 space-y-4">
          {/* Breakdown */}
          <BreakdownCard
            phase="Clasificación"
            total={phasePoints.clasif}
            rows={[
              { label: 'Grupos clavados (×4 pos.) × +5', count: clasifBreakdown.exactos, perItem: 5, pts: clasifBreakdown.exactos * 5, accent: '#00A651' },
              { label: 'Top-2 acertados × +2', count: clasifBreakdown.top2, perItem: 2, pts: clasifBreakdown.top2 * 2, accent: '#FFD100' },
              { label: 'Eliminados acertados × +1', count: clasifBreakdown.bottom2, perItem: 1, pts: clasifBreakdown.bottom2, accent: '#C9A84C' },
              { label: 'Grupos pendientes (sin finalizar)', count: clasifBreakdown.pendientes, perItem: 0, pts: 0, accent: '#7a5b00' },
              { label: 'Grupos fallados / sin predicción', count: clasifBreakdown.fallos, perItem: 0, pts: 0, accent: '#94a3b8' },
            ]}
          />
          {/* Also show actual group standings as reference */}
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">{clasifSectionLabel}</p>
          {clasifGroups.map((g) => <ClasifGroupCard key={g.grupo} g={g} predHeader={viewingSelf ? 'Tu predicción' : `${viewedName}`} />)}
        </div>
      )}

      {/* ── Tab: Premios ── */}
      {tab === 'premios' && (
        <div className="px-4 py-4 space-y-4">
          {/* Admin editor (only visible for admin) */}
          {isAdmin && adminData && (
            <AdminPremiosEditor data={adminData} />
          )}
          {/* Breakdown */}
          <BreakdownCard
            phase="Premios"
            total={phasePoints.awards}
            rows={[
              { label: 'Pichichi acertado × +8', count: awards.find(a => a.key === 'pichichi')?.puntos ? 1 : 0, perItem: 8, pts: awards.find(a => a.key === 'pichichi')?.puntos ?? 0, accent: '#C9A84C' },
              { label: 'MVP acertado × +8', count: awards.find(a => a.key === 'mvp')?.puntos ? 1 : 0, perItem: 8, pts: awards.find(a => a.key === 'mvp')?.puntos ?? 0, accent: '#FFD100' },
              { label: 'Guante de Oro × +5', count: awards.find(a => a.key === 'guante')?.puntos ? 1 : 0, perItem: 5, pts: awards.find(a => a.key === 'guante')?.puntos ?? 0, accent: '#00A651' },
              { label: 'Mejor joven × +5', count: awards.find(a => a.key === 'joven')?.puntos ? 1 : 0, perItem: 5, pts: awards.find(a => a.key === 'joven')?.puntos ?? 0, accent: '#7c3aed' },
              { label: `Best XI · ${bestXI.aciertos}/11 × +3`, count: bestXI.aciertos, perItem: 3, pts: bestXI.aciertos * 3, accent: '#004d40' },
              { label: 'Best XI completo (bonus)', count: bestXI.full ? 1 : 0, perItem: 20, pts: bestXI.full ? 20 : 0, accent: '#00A651' },
            ]}
          />
          {/* Award cards */}
          {awards.map((a) => {
            const Icon = AWARD_ICONS[a.icon]
            const acertado = a.puntos > 0
            const hasPick = a.miPick != null
            return (
              <div key={a.key} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Icon size={14} style={{ color: a.iconColor }} />
                    <span className="text-xs font-black text-gray-800">{a.label}</span>
                  </div>
                  {hasPick ? (
                    acertado ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full text-white" style={{ background: '#00A651' }}>
                        +{a.puntos}
                      </span>
                    ) : (
                      <PtsBadge pts={0} max={a.maxPuntos} />
                    )
                  ) : null}
                </div>
                <div className="p-3 flex gap-2">
                  <PlayerCard player={a.oficial} highlight={acertado} caption="Oficial" />
                  <PlayerCard player={a.miPick} highlight={acertado} caption={hasPick ? pickLabel : noPickLabel} />
                </div>
                {hasPick && a.miPick && a.oficial && (
                  <div className="px-3 pb-3 flex items-center justify-center gap-1.5">
                    {acertado ? (
                      <><Check size={12} style={{ color: '#00A651' }} /><span className="text-[10px] font-bold" style={{ color: '#00A651' }}>¡Acertado!</span></>
                    ) : (
                      <><XIcon size={12} className="text-red-400" /><span className="text-[10px] font-bold text-red-400">No acertaste</span></>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {/* Best XI */}
          <BestXICard info={bestXI} isAdmin={isAdmin} adminData={adminData} xiLabel={xiLabel} noXiLabel={noXiLabel} />
        </div>
      )}

      {/* ── Tab: Tabla de puntos ── */}
      {tab === 'reglas' && <ReglasPanel />}

      {/* ── Tab: Cuadro ── */}
      {tab === 'cuadro' && (
        <div className="py-4">
          {/* Breakdown */}
          <div className="px-4 mb-4">
            <BreakdownCard
              phase="Cuadro"
              total={phasePoints.knockout}
              rows={[
                { label: 'Ganadores acertados (cuadro)', count: koBreakdown ? koBreakdown.base : 0, perItem: 1, pts: koBreakdown?.base ?? 0, accent: '#004d40' },
                { label: 'Bonus equipos exactos', count: koBreakdown ? koBreakdown.exact : 0, perItem: 1, pts: koBreakdown?.exact ?? 0, accent: '#FFD100' },
                { label: 'Campeón acertado ×+8', count: koBreakdown?.champion ? 1 : 0, perItem: 8, pts: koBreakdown?.champion ?? 0, accent: '#C9A84C' },
                { label: 'Marcadores exactos KO ×+1', count: koBreakdown?.exactScores ?? 0, perItem: 1, pts: koBreakdown?.exactScores ?? 0, accent: '#00A651' },
              ]}
            />
          </div>

          {/* Real bracket — simple round-by-round card */}
          {realBracket && equiposForBracket && Object.keys(realBracket).length > 0 && (() => {
            const equipoById = new Map(equiposForBracket.map((e) => [e.id, e]))
            const ROUND_ORDER_DISPLAY = ['R32', 'R16', 'QF', 'SF', 'P3', 'F']
            const ROUND_LABEL_DISPLAY: Record<string, string> = { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', P3: '3.er puesto', F: 'Campeón' }
            return (
              <div className="px-4 mb-4">
                <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Cuadro real · avances</p>
                  {ROUND_ORDER_DISPLAY.map((round) => {
                    const entries = Object.entries(realBracket)
                      .filter(([k]) => k.startsWith(round + ':'))
                      .sort(([a], [b]) => Number(a.split(':')[1]) - Number(b.split(':')[1]))
                    if (entries.length === 0) return null
                    return (
                      <div key={round} className="mb-2.5 last:mb-0">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{ROUND_LABEL_DISPLAY[round] ?? round}</p>
                        <div className="space-y-1">
                          {entries.map(([key, teamId]) => {
                            const team = equipoById.get(teamId)
                            return team ? (
                              <div key={key} className="flex items-center gap-2">
                                <FlagImg codigo={team.codigo_bandera} nombre={team.nombre} size={14} />
                                <span className="text-[12px] font-bold text-gray-800">{team.nombre}</span>
                                <span className="ml-auto text-[9px] font-black text-emerald-600">AVANZA</span>
                              </div>
                            ) : null
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* KO match results: bracket winner + exact score per match */}
          {koMatchResults && koMatchResults.length > 0 && (
            <div className="px-4 pb-4 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Partidos KO</p>
              {koMatchResults.map((m) => {
                const bracketPts = m.bracketBase + m.bracketExact
                const hasBracketData = m.bracketRealWinnerId != null
                const userPickedLocal = m.bracketUserWinnerId === m.localId
                const userPickedVisitante = m.bracketUserWinnerId === m.visitanteId
                const userPickNombre = userPickedLocal ? m.localNombre : userPickedVisitante ? m.visitanteNombre : null
                const userPickBandera = userPickedLocal ? m.localBandera : userPickedVisitante ? m.visitanteBandera : null
                return (
                  <div key={m.key} className="bg-white rounded-xl shadow-sm px-3 py-2.5 space-y-2">
                    {/* Official result */}
                    <div className="flex items-center gap-1.5">
                      <FlagImg codigo={m.localBandera} nombre={m.localNombre} size={13} />
                      <span className="text-[11px] font-bold text-gray-700 truncate">{m.localNombre}</span>
                      <span className="text-[11px] font-black text-gray-900 tabular-nums mx-1">{m.gl}–{m.gv}</span>
                      <span className="text-[11px] font-bold text-gray-700 truncate">{m.visitanteNombre}</span>
                      <FlagImg codigo={m.visitanteBandera} nombre={m.visitanteNombre} size={13} />
                    </div>
                    {/* Bracket winner row */}
                    {hasBracketData && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 shrink-0">Pasa</span>
                          {userPickNombre && userPickBandera ? (
                            <div className="flex items-center gap-1">
                              <FlagImg codigo={userPickBandera} nombre={userPickNombre} size={11} />
                              <span className="text-[10px] font-bold text-gray-600 truncate">{userPickNombre}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] italic text-gray-300">sin pick</span>
                          )}
                        </div>
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                          style={{ background: bracketPts > 0 ? '#004d40' : '#e5e7eb', color: bracketPts > 0 ? 'white' : '#9ca3af' }}
                        >
                          {bracketPts > 0 ? `+${bracketPts}` : '0'}
                        </span>
                      </div>
                    )}
                    {/* Exact score row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 shrink-0">Marcador</span>
                        {m.userGl != null ? (
                          <span className="text-[10px] font-bold text-gray-600 tabular-nums">{m.userGl}–{m.userGv}</span>
                        ) : (
                          <span className="text-[10px] italic text-gray-300">sin pick</span>
                        )}
                      </div>
                      {m.pts != null && (
                        <span
                          className="text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                          style={{ background: m.pts === 1 ? '#00A651' : '#e5e7eb', color: m.pts === 1 ? 'white' : '#9ca3af' }}
                        >
                          {m.pts === 1 ? '+1' : '0'}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* User's predicted bracket */}
          {bracketWinners && equiposForBracket && Object.keys(bracketWinners).length > 0 ? (
            <>
              <div className="px-4 mb-1 mt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Tu cuadro</p>
              </div>
              <CuadroStep
                equipos={equiposForBracket}
                jugadores={[]}
                clasif={[]}
                terceros={[]}
                winners={new Map(Object.entries(bracketWinners).map(([k, v]) => [k, v])) as BracketWinners}
                onWinnersChange={() => {}}
                scores={new Map() as BracketScores}
                onScoresChange={() => {}}
                showScores={false}
                campeonId={null}
                pichichiId={null}
                mvpId={null}
                guanteOroId={null}
                jovenId={null}
                bestXI={{}}
                onCampeonChange={() => {}}
                onPichichiChange={() => {}}
                onMvpChange={() => {}}
                onGuanteOroChange={() => {}}
                onJovenChange={() => {}}
                onBestXIChange={() => {}}
                showBracket={true}
                showAwards={false}
                readOnly={true}
              />
            </>
          ) : (
            <p className="text-center text-sm text-gray-400 py-6">No hay cuadro enviado.</p>
          )}
        </div>
      )}

      <div className="h-8" />
    </>
  )
}

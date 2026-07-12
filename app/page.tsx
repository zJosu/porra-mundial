import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { Globe, MapPin, Clock, ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { saveOfficialMatchResult } from './actions/admin'
import { isAdminEmail } from '@/utils/supabase/admin'

type Partido = {
  id: number
  fecha: string
  grupo: string | null
  jornada: number        // for knockout: stores bracket_slot (1–16 for R32, etc.)
  sede: string | null
  estado: string
  fase: string | null   // 'R32' | 'R16' | 'QF' | 'SF' | 'P3' | 'F'
  equipo_local_id: number
  equipo_visitante_id: number
  equipo_local: { nombre: string; codigo_bandera: string } | null
  equipo_visitante: { nombre: string; codigo_bandera: string } | null
  goles_local_oficial: number | null
  goles_visitante_oficial: number | null
}

const FASE_LABEL: Record<string, string> = {
  R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos',
  SF: 'Semifinales', P3: '3.er puesto', F: 'Final',
}

type UserPred = {
  resultado: 'L' | 'X' | 'V'
  goles_local: number | null
  goles_visitante: number | null
}

function signoFromGoles(gl: number, gv: number): 'L' | 'X' | 'V' {
  if (gl > gv) return 'L'
  if (gl < gv) return 'V'
  return 'X'
}

function computePoints(
  actualL: number | null,
  actualV: number | null,
  pred: UserPred | undefined,
): 3 | 1 | 0 | null {
  if (actualL == null || actualV == null) return null
  if (!pred) return null
  if (
    pred.goles_local != null &&
    pred.goles_visitante != null &&
    pred.goles_local === actualL &&
    pred.goles_visitante === actualV
  ) return 3
  return pred.resultado === signoFromGoles(actualL, actualV) ? 1 : 0
}

function FlagImg({ codigo, nombre, size = 20 }: { codigo: string; nombre: string; size?: number }) {
  const src = `https://flagcdn.com/w40/${codigo.toLowerCase()}.png`
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={nombre}
      width={size}
      height={Math.round(size * 0.67)}
      className="rounded object-cover shrink-0"
      style={{ width: size, height: Math.round(size * 0.67) }}
    />
  )
}

const TZ = 'Europe/Madrid'

function formatHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

function dayKey(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ })
}

function todayMadrid(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

function pickDefaultDay(allDays: string[]): string | null {
  if (allDays.length === 0) return null
  const today = todayMadrid()
  // If there are matches today, show today
  if (allDays.includes(today)) return today
  // Otherwise show the nearest upcoming day
  const upcoming = allDays.find((d) => d > today)
  return upcoming ?? allDays[allDays.length - 1]
}

function dayRelativeLabel(day: string): string | null {
  const now = Date.now()
  const today = new Date(now).toLocaleDateString('en-CA', { timeZone: TZ })
  const yesterday = new Date(now - 86400000).toLocaleDateString('en-CA', { timeZone: TZ })
  const tomorrow = new Date(now + 86400000).toLocaleDateString('en-CA', { timeZone: TZ })
  if (day === today) return 'Hoy'
  if (day === yesterday) return 'Ayer'
  if (day === tomorrow) return 'Mañana'
  return null
}

function formatDayLabel(day: string): string {
  const relative = dayRelativeLabel(day)
  if (relative) return relative
  const d = new Date(day + 'T12:00:00Z')
  return d.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TZ,
  })
}

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ day?: string }>
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const params = (await searchParams) ?? {}

  const { data: { user } } = await supabase.auth.getUser()
  const isAdmin = !!user && isAdminEmail(user.email)

  const [
    { data: partidos },
    { data: extrasRow },
    { data: usuariosData },
    { data: extrasAllData },
    { data: koPredsTodosRaw },
    { data: equiposData },
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select(`
        id, fecha, grupo, jornada, sede, estado, fase,
        goles_local_oficial, goles_visitante_oficial,
        equipo_local_id, equipo_visitante_id,
        equipo_local:equipo_local_id(nombre, codigo_bandera),
        equipo_visitante:equipo_visitante_id(nombre, codigo_bandera)
      `)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true })
      .limit(1000),
    user
      ? supabase
          .from('predicciones_extras')
          .select('campeon_equipo_id, pichichi_jugador_id')
          .eq('usuario_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('usuarios').select('id, nombre').order('nombre')
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('predicciones_extras').select('usuario_id, campeon_equipo_id, pichichi_jugador_id')
      : Promise.resolve({ data: null }),
    supabase.from('predicciones_marcadores_ko').select('usuario_id, ronda, slot, goles_local, goles_visitante'),
    supabase.from('equipos').select('id, nombre, codigo_bandera'),
  ])

  // Lookup de cualquier equipo por id (para mostrar picks aunque no hayan avanzado)
  const equipoById = new Map<number, { nombre: string; codigo_bandera: string }>()
  for (const e of (equiposData ?? []) as { id: number; nombre: string; codigo_bandera: string }[]) {
    equipoById.set(e.id, { nombre: e.nombre, codigo_bandera: e.codigo_bandera })
  }

  // Fetch ALL users' KO predictions using admin client (bypasses RLS)
  // They are only revealed on the home page once the official result is entered
  const adminSupabase = createAdminClient()
  const [{ data: koPredsTodosAdmin }, { data: realBracketRaw }, { data: bracketAllRaw }] = await Promise.all([
    adminSupabase.from('predicciones_marcadores_ko').select('usuario_id, ronda, slot, goles_local, goles_visitante'),
    adminSupabase.from('resultados_bracket').select('ronda, slot, ganador_equipo_id'),
    adminSupabase.from('predicciones_bracket').select('usuario_id, ronda, slot, ganador_equipo_id'),
  ])
  const koPredsTodos = koPredsTodosAdmin ?? koPredsTodosRaw ?? []

  // Real bracket winners by key
  type BracketResultRow = { ronda: string; slot: number; ganador_equipo_id: number }
  const bracketRealByKey = new Map<string, number>()
  for (const r of (realBracketRaw ?? []) as BracketResultRow[]) {
    bracketRealByKey.set(`${r.ronda}:${r.slot}`, r.ganador_equipo_id)
  }
  // All users' bracket picks by userId → key
  type BracketPickRow = { usuario_id: string; ronda: string; slot: number; ganador_equipo_id: number }
  const bracketByUserByKey = new Map<string, Map<string, number>>()
  for (const r of (bracketAllRaw ?? []) as BracketPickRow[]) {
    if (!bracketByUserByKey.has(r.usuario_id)) bracketByUserByKey.set(r.usuario_id, new Map())
    bracketByUserByKey.get(r.usuario_id)!.set(`${r.ronda}:${r.slot}`, r.ganador_equipo_id)
  }

  // Usuarios que han enviado porra
  const submittedIds = new Set(
    ((extrasAllData ?? []) as { usuario_id: string; campeon_equipo_id: number | null; pichichi_jugador_id: number | null }[])
      .filter((e) => e.campeon_equipo_id != null || e.pichichi_jugador_id != null)
      .map((e) => e.usuario_id),
  )
  const submittedUsers = ((usuariosData ?? []) as { id: string; nombre: string }[])
    .filter((u) => submittedIds.has(u.id))

  // Fetch predicciones de TODOS los usuarios que han enviado
  const { data: allPredsRaw } = submittedIds.size > 0
    ? await supabase
        .from('predicciones')
        .select('usuario_id, partido_id, resultado, goles_local, goles_visitante')
        .in('usuario_id', [...submittedIds])
    : { data: null }

  type PredEntry = { userId: string; nombre: string; pred: UserPred }
  const nombreById = new Map(submittedUsers.map((u) => [u.id, u.nombre]))
  const allPredsByMatch = new Map<number, PredEntry[]>()
  for (const r of (allPredsRaw ?? []) as { usuario_id: string; partido_id: number; resultado: string; goles_local: number | null; goles_visitante: number | null }[]) {
    if (!allPredsByMatch.has(r.partido_id)) allPredsByMatch.set(r.partido_id, [])
    allPredsByMatch.get(r.partido_id)!.push({
      userId: r.usuario_id,
      nombre: nombreById.get(r.usuario_id) ?? r.usuario_id,
      pred: { resultado: r.resultado as 'L' | 'X' | 'V', goles_local: r.goles_local, goles_visitante: r.goles_visitante },
    })
  }
  // Orden: usuario propio primero, luego alfabético
  for (const entries of allPredsByMatch.values()) {
    entries.sort((a, b) => {
      if (user && a.userId === user.id) return -1
      if (user && b.userId === user.id) return 1
      return a.nombre.localeCompare(b.nombre)
    })
  }

  // Predicciones del usuario actual (para el subtotal del día y el badge)
  const myPredsByMatch = new Map<number, UserPred>()
  if (user) {
    for (const [matchId, entries] of allPredsByMatch) {
      const mine = entries.find((e) => e.userId === user.id)
      if (mine) myPredsByMatch.set(matchId, mine.pred)
    }
  }

  const porraEnviada = !!(extrasRow?.campeon_equipo_id ?? extrasRow?.pichichi_jugador_id)

  // KO exact score predictions for all users
  type KOPredEntry = { userId: string; nombre: string; gl: number; gv: number }
  const allKoPredsByKey = new Map<string, KOPredEntry[]>()
  for (const r of koPredsTodos as { usuario_id: string; ronda: string; slot: number; goles_local: number; goles_visitante: number }[]) {
    const key = `${r.ronda}:${r.slot}`
    if (!allKoPredsByKey.has(key)) allKoPredsByKey.set(key, [])
    allKoPredsByKey.get(key)!.push({
      userId: r.usuario_id,
      nombre: nombreById.get(r.usuario_id) ?? r.usuario_id,
      gl: r.goles_local,
      gv: r.goles_visitante,
    })
  }
  // Sort: own user first, then alphabetical
  for (const entries of allKoPredsByKey.values()) {
    entries.sort((a, b) => {
      if (user && a.userId === user.id) return -1
      if (user && b.userId === user.id) return 1
      return a.nombre.localeCompare(b.nombre)
    })
  }

  const all = ((partidos as unknown as Partido[]) ?? [])
  const byDay = new Map<string, Partido[]>()
  for (const p of all) {
    const k = dayKey(p.fecha)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(p)
  }
  const days = [...byDay.keys()].sort()
  const nowDate = new Date()

  const requestedDay = params.day && byDay.has(params.day) ? params.day : null
  const currentDay = requestedDay ?? pickDefaultDay(days)
  const currentIdx = currentDay ? days.indexOf(currentDay) : -1
  const prevDay = currentIdx > 0 ? days[currentIdx - 1] : null
  const nextDay = currentIdx >= 0 && currentIdx < days.length - 1 ? days[currentIdx + 1] : null

  const dayMatches = currentDay ? byDay.get(currentDay) ?? [] : []

  // Daily subtotal (solo del usuario propio)
  let daySubtotal = 0
  let daySubtotalShown = false
  for (const m of dayMatches) {
    if (m.grupo != null) {
      const pts = computePoints(m.goles_local_oficial, m.goles_visitante_oficial, myPredsByMatch.get(m.id))
      if (pts != null) { daySubtotal += pts; daySubtotalShown = true }
    } else if (m.fase != null && user) {
      const key = `${m.fase}:${m.jornada}`
      const mine = allKoPredsByKey.get(key)?.find((e) => e.userId === user.id)
      if (mine && m.goles_local_oficial != null && m.goles_visitante_oficial != null) {
        const pts = mine.gl === m.goles_local_oficial && mine.gv === m.goles_visitante_oficial ? 1 : 0
        daySubtotal += pts; daySubtotalShown = true
      }
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-40 relative overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/leo.png" alt="Jugadores del Mundial" className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{display:'block',filter:'brightness(1.22)'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.45) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Globe size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>World Cup 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">La clika</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      {/* CTA porra */}
      {user && !porraEnviada && (
        <div className="px-4 pt-4">
          <Link
            href="/predicciones"
            className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-white active:scale-[0.98] transition-transform"
            style={{ background: 'linear-gradient(135deg, #004d40 0%, #00897b 100%)' }}
          >
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest opacity-70 mb-0.5">FIFA World Cup 2026</p>
              <p className="text-base font-black leading-tight">¿Quieres hacer tu porra?</p>
              <p className="text-[11px] opacity-70 mt-0.5">Rellena tus predicciones antes de que empiece</p>
            </div>
            <ChevronRight size={22} className="shrink-0 opacity-80" />
          </Link>
        </div>
      )}

      {/* Day navigator */}
      {currentDay ? (
        <div className="px-4 pt-4">
          <div className="bg-white rounded-2xl shadow-sm flex items-stretch">
            <DayNavButton href={prevDay ? `/?day=${prevDay}` : null} dir="prev" />
            <div className="flex-1 px-2 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">
                <CalendarDays size={11} />
                <span>Día {currentIdx + 1} / {days.length}</span>
              </div>
              <p className="text-sm font-black text-gray-900 capitalize leading-tight">
                {formatDayLabel(currentDay)}
              </p>
              {dayRelativeLabel(currentDay) && (
                <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
                  {new Date(currentDay + 'T12:00:00Z').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ })}
                </p>
              )}
              {daySubtotalShown && (
                <p className="text-[10px] font-bold mt-0.5" style={{color:'#004d40'}}>
                  Tu día: +{daySubtotal} pts
                </p>
              )}
            </div>
            <DayNavButton href={nextDay ? `/?day=${nextDay}` : null} dir="next" />
          </div>
        </div>
      ) : (
        <div className="px-4 pt-10 text-center">
          <p className="text-sm text-gray-400">No hay partidos.</p>
        </div>
      )}

      {/* Matches for the day */}
      {currentDay && (
        <div className="px-4 py-4 space-y-2.5">
          {dayMatches.map((p) => {
            const isKO = p.grupo == null && p.fase != null
            const played = p.goles_local_oficial != null && p.goles_visitante_oficial != null
            const started = new Date(p.fecha) <= nowDate
            // Group stage
            const myPred = !isKO ? myPredsByMatch.get(p.id) : undefined
            const myPuntos = !isKO ? computePoints(p.goles_local_oficial, p.goles_visitante_oficial, myPred) : null
            const allEntries = !isKO ? (allPredsByMatch.get(p.id) ?? []) : []
            // Knockout
            const koKey = isKO ? `${p.fase}:${p.jornada}` : ''
            const allKOEntries = isKO ? (allKoPredsByKey.get(koKey) ?? []) : []
            const myKOPred = isKO ? allKOEntries.find((e) => e.userId === user?.id) : undefined
            const myKOPuntos = isKO && myKOPred && played
              ? (myKOPred.gl === p.goles_local_oficial && myKOPred.gv === p.goles_visitante_oficial ? 1 : 0)
              : null
            // Reveal everyone's KO predictions once the match starts OR once you've
            // submitted your own prediction for this match.
            const revealKO = isKO && (started || myKOPred != null)
            const local = p.equipo_local
            const visitante = p.equipo_visitante
            if (!local || !visitante) return null
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm px-4 py-3.5"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide text-white" style={{background: isKO ? '#1d4ed8' : '#004d40'}}>
                    {isKO ? (FASE_LABEL[p.fase!] ?? p.fase) : `Grupo ${p.grupo} · J${p.jornada}`}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {(myPuntos != null || myKOPuntos != null) && (
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums"
                        style={(() => {
                          const p = myPuntos ?? myKOPuntos ?? 0
                          return {
                            background: p >= 3 ? '#00A651' : p === 1 ? '#FFD100' : '#e5e7eb',
                            color: p >= 3 ? 'white' : p === 1 ? '#7a5b00' : '#9ca3af',
                          }
                        })()}
                      >
                        {(myPuntos ?? myKOPuntos ?? 0) === 0 ? '0' : `+${myPuntos ?? myKOPuntos}`}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] text-gray-400">
                      <Clock size={10} />
                      {formatHora(p.fecha)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-1 w-[38%]">
                    <FlagImg codigo={local.codigo_bandera} nombre={local.nombre} />
                    <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
                      {local.nombre}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-0.5">
                    {played ? (
                      <span className="text-xl font-black text-gray-900 tabular-nums">
                        {p.goles_local_oficial} – {p.goles_visitante_oficial}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-gray-300 tracking-widest">VS</span>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1 w-[38%]">
                    <FlagImg codigo={visitante.codigo_bandera} nombre={visitante.nombre} />
                    <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
                      {visitante.nombre}
                    </span>
                  </div>
                </div>

                {p.sede && (
                  <div className="flex items-center justify-center gap-1 mt-2.5">
                    <MapPin size={10} className="text-gray-300 shrink-0" />
                    <span className="text-[10px] text-gray-400 truncate">{p.sede}</span>
                  </div>
                )}

                {/* Predicciones de todos — group stage */}
                {!isKO && allEntries.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    {allEntries.map(({ userId, nombre, pred }) => {
                      const pts = computePoints(p.goles_local_oficial, p.goles_visitante_oficial, pred)
                      const isMe = userId === user?.id
                      return (
                        <div key={userId} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold truncate flex-1" style={{ color: isMe ? '#004d40' : '#6b7280' }}>
                            {isMe ? 'tú' : nombre}
                          </span>
                          <span className="text-[10px] font-bold tabular-nums text-gray-600 shrink-0">
                            {pred.goles_local ?? '–'}–{pred.goles_visitante ?? '–'}
                          </span>
                          {pts != null && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                              style={{ background: pts === 3 ? '#00A651' : pts === 1 ? '#FFD100' : '#e5e7eb', color: pts === 3 ? 'white' : pts === 1 ? '#7a5b00' : '#9ca3af' }}>
                              {pts === 0 ? '0' : `+${pts}`}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Predicciones de todos — knockout exact scores + bracket winner */}
                {isKO && allKOEntries.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    {allKOEntries.filter(e => revealKO || e.userId === user?.id).map(({ userId, nombre, gl, gv }) => {
                      const isMe = userId === user?.id
                      const exactPts = played ? (gl === p.goles_local_oficial && gv === p.goles_visitante_oficial ? 1 : 0) : null
                      const userBracketPick = bracketByUserByKey.get(userId)?.get(koKey) ?? null
                      const realWinner = bracketRealByKey.get(koKey) ?? null
                      const bracketPts = realWinner != null ? (userBracketPick === realWinner ? 1 : 0) : null
                      const bracketPickLocal = userBracketPick === p.equipo_local_id
                      const bracketPickVisit = userBracketPick === p.equipo_visitante_id
                      const advanced = bracketPickLocal || bracketPickVisit
                      // Equipo elegido: local/visitante si avanzó, si no lo buscamos igualmente
                      const pickedTeam = bracketPickLocal
                        ? local
                        : bracketPickVisit
                          ? visitante
                          : userBracketPick != null
                            ? equipoById.get(userBracketPick) ?? null
                            : null
                      const bracketNombre = pickedTeam?.nombre ?? null
                      const bracketBandera = pickedTeam?.codigo_bandera ?? null
                      return (
                        <div key={userId} className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold truncate flex-1 min-w-0" style={{ color: isMe ? '#004d40' : '#6b7280' }}>
                            {isMe ? 'tú' : nombre}
                          </span>
                          {/* bracket pick */}
                          {bracketNombre && bracketBandera && (
                            <div className={`flex items-center gap-1 shrink-0 ${advanced ? '' : 'opacity-40'}`}>
                              <FlagImg codigo={bracketBandera} nombre={bracketNombre} size={10} />
                              {bracketPts != null && (
                                <span className="text-[9px] font-black px-1 py-0.5 rounded-full tabular-nums"
                                  style={{ background: bracketPts > 0 ? '#1d4ed8' : '#e5e7eb', color: bracketPts > 0 ? 'white' : '#9ca3af' }}>
                                  {bracketPts > 0 ? '+1' : '0'}
                                </span>
                              )}
                            </div>
                          )}
                          {/* exact score */}
                          <span className="text-[10px] font-bold tabular-nums text-gray-500 shrink-0">{gl}–{gv}</span>
                          {exactPts != null && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                              style={{ background: exactPts === 1 ? '#00A651' : '#e5e7eb', color: exactPts === 1 ? 'white' : '#9ca3af' }}>
                              {exactPts === 0 ? '0' : '+1'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {isAdmin && (
                  <form action={saveOfficialMatchResult} className="mt-3 pt-3 border-t border-gray-100">
                    <input type="hidden" name="partido_id" value={p.id} />
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">Oficial</span>
                      <input
                        type="number"
                        name="goles_local_oficial"
                        min={0}
                        max={99}
                        defaultValue={p.goles_local_oficial ?? ''}
                        placeholder="0"
                        className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-sm font-black tabular-nums text-center text-gray-800"
                      />
                      <span className="text-sm font-black text-gray-400">-</span>
                      <input
                        type="number"
                        name="goles_visitante_oficial"
                        min={0}
                        max={99}
                        defaultValue={p.goles_visitante_oficial ?? ''}
                        placeholder="0"
                        className="w-14 rounded-lg border border-gray-200 px-2 py-1 text-sm font-black tabular-nums text-center text-gray-800"
                      />
                      <button
                        type="submit"
                        className="ml-auto rounded-lg px-3 py-1.5 text-[11px] font-black text-white"
                        style={{ background: '#004d40' }}
                      >
                        Guardar
                      </button>
                    </div>
                    {isKO && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 shrink-0">Pasa</span>
                        <select
                          name="ganador_id"
                          defaultValue=""
                          className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-medium text-gray-800 bg-white"
                        >
                          <option value="">Auto (por marcador)</option>
                          <option value={p.equipo_local_id}>{local.nombre}</option>
                          <option value={p.equipo_visitante_id}>{visitante.nombre}</option>
                        </select>
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-gray-400">
                      {isKO
                        ? 'En caso de empate (ET/penaltis), selecciona quién pasa.'
                        : 'Al guardar se actualiza para todos y se recalculan puntos automáticamente.'}
                    </p>
                  </form>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="h-6" />
    </div>
  )
}

function DayNavButton({ href, dir }: { href: string | null; dir: 'prev' | 'next' }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight
  const disabled = !href
  const className = 'w-12 flex items-center justify-center'
  if (disabled) {
    return (
      <div className={className} aria-disabled>
        <Icon size={20} className="text-gray-200" />
      </div>
    )
  }
  return (
    <Link
      href={href}
      className={`${className} active:bg-gray-50 transition-colors`}
      style={{ color: '#004d40' }}
    >
      <Icon size={20} />
    </Link>
  )
}

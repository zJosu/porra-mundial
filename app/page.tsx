import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Globe, MapPin, Clock, ChevronRight, ChevronLeft, CalendarDays } from 'lucide-react'
import Link from 'next/link'
import { saveOfficialMatchResult } from './actions/admin'
import { isAdminEmail } from '@/utils/supabase/admin'

type Partido = {
  id: number
  fecha: string
  grupo: string
  jornada: number
  sede: string
  estado: string
  equipo_local: { nombre: string; codigo_bandera: string }
  equipo_visitante: { nombre: string; codigo_bandera: string }
  goles_local_oficial: number | null
  goles_visitante_oficial: number | null
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

function FlagImg({ codigo, nombre }: { codigo: string; nombre: string }) {
  const src = `https://flagcdn.com/w40/${codigo.toLowerCase()}.png`
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={nombre}
      width={40}
      height={27}
      className="rounded object-cover"
      style={{ width: 40, height: 27 }}
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
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select(`
        id, fecha, grupo, jornada, sede, estado,
        goles_local_oficial, goles_visitante_oficial,
        equipo_local:equipo_local_id(nombre, codigo_bandera),
        equipo_visitante:equipo_visitante_id(nombre, codigo_bandera)
      `)
      .not('grupo', 'is', null)
      .order('fecha', { ascending: true })
      .order('id', { ascending: true })
      .limit(1000),
    user
      ? supabase
          .from('predicciones_extras')
          .select('pichichi_jugador_id')
          .eq('usuario_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('usuarios').select('id, nombre').order('nombre')
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('predicciones_extras').select('usuario_id, pichichi_jugador_id')
      : Promise.resolve({ data: null }),
  ])

  // Usuarios que han enviado porra
  const submittedIds = new Set(
    ((extrasAllData ?? []) as { usuario_id: string; pichichi_jugador_id: number | null }[])
      .filter((e) => e.pichichi_jugador_id != null)
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

  const porraEnviada = !!extrasRow?.pichichi_jugador_id

  const all = ((partidos as unknown as Partido[]) ?? [])
  const byDay = new Map<string, Partido[]>()
  for (const p of all) {
    const k = dayKey(p.fecha)
    if (!byDay.has(k)) byDay.set(k, [])
    byDay.get(k)!.push(p)
  }
  const days = [...byDay.keys()].sort()

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
    const pts = computePoints(m.goles_local_oficial, m.goles_visitante_oficial, myPredsByMatch.get(m.id))
    if (pts != null) {
      daySubtotal += pts
      daySubtotalShown = true
    }
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-40 relative overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial" className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{display:'block'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
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
            const myPred = myPredsByMatch.get(p.id)
            const myPuntos = computePoints(p.goles_local_oficial, p.goles_visitante_oficial, myPred)
            const allEntries = allPredsByMatch.get(p.id) ?? []
            const played = p.goles_local_oficial != null && p.goles_visitante_oficial != null
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl shadow-sm px-4 py-3.5"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide text-white" style={{background:'#004d40'}}>
                    Grupo {p.grupo} · J{p.jornada}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {myPuntos != null && (
                      <span
                        className="text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums"
                        style={{
                          background: myPuntos === 3 ? '#00A651' : myPuntos === 1 ? '#FFD100' : '#e5e7eb',
                          color: myPuntos === 1 ? '#7a5b00' : myPuntos === 3 ? 'white' : '#9ca3af',
                        }}
                      >
                        {myPuntos === 0 ? '0' : `+${myPuntos}`}
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
                    <FlagImg codigo={p.equipo_local.codigo_bandera} nombre={p.equipo_local.nombre} />
                    <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
                      {p.equipo_local.nombre}
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
                    <FlagImg codigo={p.equipo_visitante.codigo_bandera} nombre={p.equipo_visitante.nombre} />
                    <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
                      {p.equipo_visitante.nombre}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1 mt-2.5">
                  <MapPin size={10} className="text-gray-300 shrink-0" />
                  <span className="text-[10px] text-gray-400 truncate">{p.sede}</span>
                </div>

                {/* Predicciones de todos */}
                {allEntries.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    {allEntries.map(({ userId, nombre, pred }) => {
                      const pts = computePoints(p.goles_local_oficial, p.goles_visitante_oficial, pred)
                      const isMe = userId === user?.id
                      return (
                        <div key={userId} className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold truncate flex-1"
                            style={{ color: isMe ? '#004d40' : '#6b7280' }}
                          >
                            {isMe ? 'tú' : nombre}
                          </span>
                          <span className="text-[10px] font-bold tabular-nums text-gray-600 shrink-0">
                            {pred.goles_local ?? '–'}–{pred.goles_visitante ?? '–'}
                          </span>
                          {pts != null && (
                            <span
                              className="text-[9px] font-black px-1.5 py-0.5 rounded-full tabular-nums shrink-0"
                              style={{
                                background: pts === 3 ? '#00A651' : pts === 1 ? '#FFD100' : '#e5e7eb',
                                color: pts === 3 ? 'white' : pts === 1 ? '#7a5b00' : '#9ca3af',
                              }}
                            >
                              {pts === 0 ? '0' : `+${pts}`}
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
                    <p className="mt-1 text-[10px] text-gray-400">
                      Al guardar se actualiza para todos y se recalculan puntos automáticamente.
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

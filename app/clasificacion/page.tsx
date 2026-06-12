import { ListOrdered, Trophy, Target } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { matchPoints, awardsPoints, classificationGroupPoints, signoFromGoles } from '@/app/resultados/scoring'

type PartidoRow = {
  id: number
  grupo: string | null
  equipo_local_id: number
  equipo_visitante_id: number
  goles_local_oficial: number | null
  goles_visitante_oficial: number | null
}

type ClasifPickRow = { usuario_id: string; grupo: string; equipo_id: number; posicion: number }

type PrediccionRow = {
  usuario_id: string
  partido_id: number
  resultado: 'L' | 'X' | 'V'
  goles_local: number | null
  goles_visitante: number | null
}

type ExtrasRow = {
  usuario_id: string
  pichichi_jugador_id: number | null
  mvp_jugador_id: number | null
  guante_oro_jugador_id: number | null
  joven_jugador_id: number | null
}

type OficialRow = {
  pichichi_jugador_id: number | null
  mvp_jugador_id: number | null
  guante_oro_jugador_id: number | null
  joven_jugador_id: number | null
}

type UsuarioRow = { id: string; nombre: string }

type Fila = {
  id: string
  nombre: string
  total: number
  desglose: { partidos: number; clasif: number; premios: number; aciertosExactos: number; acertados1x2: number }
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function ClasificacionPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: usuariosData },
    { data: extrasData },
    { data: prediccionesData },
    { data: partidosData },
    { data: oficialData },
    { data: clasifPicksData },
  ] = await Promise.all([
    supabase.from('usuarios').select('id, nombre'),
    supabase.from('predicciones_extras').select('usuario_id, pichichi_jugador_id, mvp_jugador_id, guante_oro_jugador_id, joven_jugador_id'),
    supabase.from('predicciones').select('usuario_id, partido_id, resultado, goles_local, goles_visitante').limit(10000),
    supabase.from('partidos').select('id, grupo, equipo_local_id, equipo_visitante_id, goles_local_oficial, goles_visitante_oficial').limit(1000),
    supabase
      .from('resultados_oficiales')
      .select('pichichi_jugador_id, mvp_jugador_id, guante_oro_jugador_id, joven_jugador_id')
      .eq('id', 1)
      .maybeSingle(),
    supabase.from('clasificaciones_grupos').select('usuario_id, grupo, equipo_id, posicion').limit(5000),
  ])

  const usuarios = (usuariosData ?? []) as UsuarioRow[]
  const extras = (extrasData ?? []) as ExtrasRow[]
  const predicciones = (prediccionesData ?? []) as PrediccionRow[]
  const partidos = (partidosData ?? []) as PartidoRow[]
  const oficial = (oficialData ?? null) as OficialRow | null
  const clasifPicks = (clasifPicksData ?? []) as ClasifPickRow[]

  const submittedIds = new Set(
    extras.filter((e) => e.pichichi_jugador_id != null).map((e) => e.usuario_id),
  )

  // Compute actual group standings for Phase 2
  const actualByGroup = new Map<string, Map<number, { g: number; e: number; p: number; gf: number; gc: number; pts: number }>>() 
  for (const p of partidos.filter(p => p.grupo != null)) {
    if (!actualByGroup.has(p.grupo!)) actualByGroup.set(p.grupo!, new Map())
    const grp = actualByGroup.get(p.grupo!)!
    for (const id of [p.equipo_local_id, p.equipo_visitante_id]) {
      if (!grp.has(id)) grp.set(id, { g: 0, e: 0, p: 0, gf: 0, gc: 0, pts: 0 })
    }
    if (p.goles_local_oficial == null || p.goles_visitante_oficial == null) continue
    const home = grp.get(p.equipo_local_id)!; const away = grp.get(p.equipo_visitante_id)!
    home.gf += p.goles_local_oficial; home.gc += p.goles_visitante_oficial
    away.gf += p.goles_visitante_oficial; away.gc += p.goles_local_oficial
    const sgn = signoFromGoles(p.goles_local_oficial, p.goles_visitante_oficial)
    if (sgn === 'L') { home.g++; home.pts += 3; away.p++ }
    else if (sgn === 'V') { away.g++; away.pts += 3; home.p++ }
    else { home.e++; away.e++; home.pts++; away.pts++ }
  }
  const actualOrder = new Map<string, number[]>()
  for (const [grupo, teams] of actualByGroup) {
    const sorted = [...teams.entries()].sort((a, b) =>
      b[1].pts - a[1].pts || (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc) || b[1].gf - a[1].gf
    )
    actualOrder.set(grupo, sorted.map(([id]) => id))
  }

  // Solo se otorgan puntos de un grupo cuando los 6 partidos están finalizados.
  const playedByGroup = new Map<string, number>()
  for (const p of partidos) {
    if (!p.grupo) continue
    if (p.goles_local_oficial == null || p.goles_visitante_oficial == null) continue
    playedByGroup.set(p.grupo, (playedByGroup.get(p.grupo) ?? 0) + 1)
  }
  const closedGroups = new Set<string>()
  for (const [grupo, n] of playedByGroup) if (n >= 6) closedGroups.add(grupo)

  // Group clasif picks by user
  const clasifPicksByUser = new Map<string, ClasifPickRow[]>()
  for (const p of clasifPicks) {
    if (!clasifPicksByUser.has(p.usuario_id)) clasifPicksByUser.set(p.usuario_id, [])
    clasifPicksByUser.get(p.usuario_id)!.push(p)
  }

  const partidoById = new Map<number, PartidoRow>()
  for (const p of partidos) partidoById.set(p.id, p)

  const extrasByUser = new Map<string, ExtrasRow>()
  for (const e of extras) extrasByUser.set(e.usuario_id, e)

  const predsByUser = new Map<string, PrediccionRow[]>()
  for (const pr of predicciones) {
    if (!predsByUser.has(pr.usuario_id)) predsByUser.set(pr.usuario_id, [])
    predsByUser.get(pr.usuario_id)!.push(pr)
  }

  const filas: Fila[] = usuarios
    .filter((u) => submittedIds.has(u.id))
    .map((u) => {
      let puntosPartidos = 0
      let aciertosExactos = 0
      let acertados1x2 = 0

      const userPreds = predsByUser.get(u.id) ?? []
      for (const pr of userPreds) {
        const off = partidoById.get(pr.partido_id)
        if (!off || off.grupo == null) continue
        const pts = matchPoints(
          { goles_local: off.goles_local_oficial, goles_visitante: off.goles_visitante_oficial },
          { resultado: pr.resultado, goles_local: pr.goles_local, goles_visitante: pr.goles_visitante },
        )
        if (pts == null) continue
        puntosPartidos += pts
        if (pts === 3) aciertosExactos++
        else if (pts === 1) acertados1x2++
      }

      const ex = extrasByUser.get(u.id)
      const aw = awardsPoints(
        oficial,
        ex ? { pichichi_jugador_id: ex.pichichi_jugador_id, mvp_jugador_id: ex.mvp_jugador_id, guante_oro_jugador_id: ex.guante_oro_jugador_id, joven_jugador_id: ex.joven_jugador_id } : null,
      )

      // Phase 2: classification
      const userClasifPicks = clasifPicksByUser.get(u.id) ?? []
      const clasifRes = classificationGroupPoints(userClasifPicks, actualOrder, closedGroups)
      const puntosClasif = clasifRes.reduce((s, r) => s + r.pts, 0)

      return {
        id: u.id,
        nombre: u.nombre,
        total: puntosPartidos + puntosClasif + aw.total,
        desglose: {
          partidos: puntosPartidos,
          clasif: puntosClasif,
          premios: aw.total,
          aciertosExactos,
          acertados1x2,
        },
      }
    })

  filas.sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre))

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-40 relative overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/cris-leo-ney.png"
          alt="Jugadores del Mundial"
          className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center"
          style={{ display: 'block' }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)',
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <ListOrdered size={13} style={{ color: '#C9A84C' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: '#C9A84C' }}
            >
              FIFA WORLD CUP 2026
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Clasificación</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      <div className="px-4 py-5">
        {filas.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: '#f0e8c8' }}
            >
              <Trophy size={28} style={{ color: '#C9A84C' }} />
            </div>
            <p className="text-gray-500 text-sm font-medium">Aún no hay participantes</p>
            <p className="text-gray-400 text-xs max-w-xs">
              Cuando alguien envíe su porra aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filas.map((p, i) => {
              const pos = i + 1
              const isMe = p.id === user?.id
              const medal = MEDAL[pos]
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl shadow-sm px-4 py-3"
                  style={
                    isMe
                      ? { boxShadow: '0 0 0 2px #004d40', background: 'rgba(0,77,64,0.03)' }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 shrink-0 flex items-center justify-center">
                      {medal ? (
                        <span className="text-lg">{medal}</span>
                      ) : (
                        <span className="text-[13px] font-black tabular-nums text-gray-400">{pos}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {p.nombre}
                        {isMe && (
                          <span
                            className="ml-1.5 text-[10px] font-black uppercase tracking-wide"
                            style={{ color: '#004d40' }}
                          >
                            (tú)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 flex-wrap">
                        <span className="flex items-center gap-0.5">
                          <Target size={9} /> {p.desglose.aciertosExactos} exactos
                        </span>
                        <span className="opacity-60">·</span>
                        <span>{p.desglose.acertados1x2} 1X2</span>
                        {p.desglose.clasif > 0 && (
                          <>
                            <span className="opacity-60">·</span>
                            <span style={{ color: '#004d40' }}>+{p.desglose.clasif} clasif</span>
                          </>
                        )}
                        {p.desglose.premios > 0 && (
                          <>
                            <span className="opacity-60">·</span>
                            <span style={{ color: '#b58a1f' }}>+{p.desglose.premios} premios</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <span
                        className="text-lg font-black tabular-nums"
                        style={{ color: p.total > 0 ? '#004d40' : '#cbd5e1' }}
                      >
                        {p.total}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="h-6" />
    </div>
  )
}

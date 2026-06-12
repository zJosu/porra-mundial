import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Swords } from 'lucide-react'
import { matchPoints, signoFromGoles, awardsPoints, classificationGroupPoints } from './scoring'
import { XI_SLOTS } from './xi-slots'
import { isAdminEmail } from '@/utils/supabase/admin'
import { UserPredictionsSelect } from '@/components/UserPredictionsSelect'
import {
  ResultadosClient,
  type PartidoUI,
  type GrupoUI,
  type GrupoFila,
  type AwardResult,
  type JugadorLite,
  type ClasifGroupUI,
  type MatchBreakdown,
  type ClasifBreakdownUI,
  type BestXIInfo,
  type AdminPremiosData,
} from './ResultadosClient'

type Resultado = 'L' | 'X' | 'V'

type PartidoRow = {
  id: number
  fecha: string
  grupo: string | null
  jornada: number
  fase: string | null
  goles_local_oficial: number | null
  goles_visitante_oficial: number | null
  equipo_local_id: number
  equipo_visitante_id: number
  equipo_local: { id: number; nombre: string; codigo_bandera: string; grupo: string | null } | null
  equipo_visitante: { id: number; nombre: string; codigo_bandera: string; grupo: string | null } | null
}

type PrediccionRow = {
  partido_id: number
  resultado: Resultado
  goles_local: number | null
  goles_visitante: number | null
}

type JugadorRow = {
  id: number; nombre: string; apellidos: string; posicion: string | null
  numero_dorsal: number | null; foto_url: string | null
  equipo: { nombre: string; codigo_bandera: string } | null
}

type ClasifPickRow = { grupo: string; equipo_id: number; posicion: number }

function jugadorLite(j: JugadorRow | null | undefined): JugadorLite | null {
  if (!j) return null
  return {
    id: j.id, nombre: j.nombre, apellidos: j.apellidos, posicion: j.posicion,
    numero_dorsal: j.numero_dorsal, foto_url: j.foto_url,
    equipo: j.equipo ? { nombre: j.equipo.nombre, codigo_bandera: j.equipo.codigo_bandera } : null,
  }
}

export default async function ResultadosPage({
  searchParams,
}: {
  searchParams?: Promise<{ u?: string }>
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  const params = (await searchParams) ?? {}

  // Lista de usuarios que han enviado porra (extras con pichichi no null)
  const [
    { data: usuariosData },
    { data: extrasAllData },
  ] = user
    ? await Promise.all([
        supabase.from('usuarios').select('id, nombre').order('nombre'),
        supabase.from('predicciones_extras').select('usuario_id, pichichi_jugador_id'),
      ])
    : [{ data: null }, { data: null }]

  const submittedIds = new Set(
    ((extrasAllData ?? []) as { usuario_id: string; pichichi_jugador_id: number | null }[])
      .filter((e) => e.pichichi_jugador_id != null)
      .map((e) => e.usuario_id),
  )
  const submittedUsers = ((usuariosData ?? []) as { id: string; nombre: string }[])
    .filter((u) => submittedIds.has(u.id))

  const requestedUserId = user && params.u && submittedIds.has(params.u) ? params.u : null
  const viewedUserId = requestedUserId ?? user?.id ?? null
  const viewingSelf = viewedUserId === user?.id
  const viewedUser = submittedUsers.find((u) => u.id === viewedUserId) ?? null
  const viewedName = viewingSelf ? 'Tu' : (viewedUser?.nombre ?? 'Sin datos')

  const [
    { data: partidosRaw },
    { data: oficialRaw },
    { data: misPredsRaw },
    { data: misExtrasRaw },
    { data: misClasifRaw },
  ] = await Promise.all([
    supabase
      .from('partidos')
      .select(`id, fecha, grupo, jornada, fase, goles_local_oficial, goles_visitante_oficial,
        equipo_local_id, equipo_visitante_id,
        equipo_local:equipo_local_id(id, nombre, codigo_bandera, grupo),
        equipo_visitante:equipo_visitante_id(id, nombre, codigo_bandera, grupo)`)
      .order('fecha', { ascending: true }).order('id', { ascending: true }).limit(1000),
    supabase
      .from('resultados_oficiales')
      .select(`pichichi_jugador_id, mvp_jugador_id, guante_oro_jugador_id, joven_jugador_id, best_xi,
        campeon_equipo_id, subcampeon_equipo_id, tercer_puesto_id,
        pichichi:pichichi_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)),
        mvp:mvp_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)),
        guante:guante_oro_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)),
        joven:joven_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera))`)
      .eq('id', 1).maybeSingle(),
    viewedUserId
      ? supabase.from('predicciones').select('partido_id, resultado, goles_local, goles_visitante').eq('usuario_id', viewedUserId)
      : Promise.resolve({ data: null }),
    viewedUserId
      ? supabase.from('predicciones_extras')
          .select(`pichichi_jugador_id, mvp_jugador_id, guante_oro_jugador_id, joven_jugador_id, best_xi,
            pichichi:pichichi_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)),
            mvp:mvp_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)),
            guante:guante_oro_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)),
            joven:joven_jugador_id(id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera))`)
          .eq('usuario_id', viewedUserId).maybeSingle()
      : Promise.resolve({ data: null }),
    viewedUserId
      ? supabase.from('clasificaciones_grupos').select('grupo, equipo_id, posicion').eq('usuario_id', viewedUserId)
      : Promise.resolve({ data: null }),
  ])

  const partidos = (partidosRaw ?? []) as unknown as PartidoRow[]
  const grupoMatches = partidos.filter((p) => p.grupo != null)

  // ── Phase 1: match points ────────────────────────────────────────────────────
  const predsByMatch = new Map<number, PrediccionRow>()
  for (const p of (misPredsRaw ?? []) as PrediccionRow[]) predsByMatch.set(p.partido_id, p)

  let puntosPartidos = 0; let exactos = 0; let acertados1x2 = 0; let fallos = 0; let sinPick = 0
  const partidosUI: PartidoUI[] = grupoMatches.map((p) => {
    const local = p.equipo_local!; const visit = p.equipo_visitante!
    const pred = predsByMatch.get(p.id)
    const off = { goles_local: p.goles_local_oficial, goles_visitante: p.goles_visitante_oficial }
    const userPred = pred ? { resultado: pred.resultado, goles_local: pred.goles_local, goles_visitante: pred.goles_visitante } : undefined
    const pts = matchPoints(off, userPred)
    if (pts != null) {
      puntosPartidos += pts
      if (pts === 3) exactos++
      else if (pts === 1) acertados1x2++
      else fallos++
    } else if (off.goles_local != null) {
      sinPick++ // official result exists but no prediction
    }
    return {
      id: p.id, fecha: p.fecha, grupo: p.grupo!, jornada: p.jornada,
      goles_local_oficial: p.goles_local_oficial, goles_visitante_oficial: p.goles_visitante_oficial,
      local: { id: local.id, nombre: local.nombre, codigo_bandera: local.codigo_bandera },
      visitante: { id: visit.id, nombre: visit.nombre, codigo_bandera: visit.codigo_bandera },
      pred: pred ? { resultado: pred.resultado, goles_local: pred.goles_local, goles_visitante: pred.goles_visitante } : undefined,
      puntos: pts,
    }
  })

  const matchBreakdown: MatchBreakdown = { exactos, acertados1x2, fallos, sinPick }

  // ── Actual group standings ───────────────────────────────────────────────────
  const teamIdx = new Map<number, GrupoFila>()
  const teamsByGrupo = new Map<string, GrupoFila[]>()

  for (const p of grupoMatches) {
    for (const t of [p.equipo_local, p.equipo_visitante]) {
      if (!t || !t.grupo || teamIdx.has(t.id)) continue
      const row: GrupoFila = { equipo_id: t.id, nombre: t.nombre, codigo_bandera: t.codigo_bandera, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, puntos: 0 }
      teamIdx.set(t.id, row)
      if (!teamsByGrupo.has(t.grupo)) teamsByGrupo.set(t.grupo, [])
      teamsByGrupo.get(t.grupo)!.push(row)
    }
  }
  for (const p of grupoMatches) {
    if (p.goles_local_oficial == null || p.goles_visitante_oficial == null) continue
    const home = teamIdx.get(p.equipo_local_id); const away = teamIdx.get(p.equipo_visitante_id)
    if (!home || !away) continue
    home.pj++; away.pj++
    home.gf += p.goles_local_oficial; home.gc += p.goles_visitante_oficial
    away.gf += p.goles_visitante_oficial; away.gc += p.goles_local_oficial
    const sgn = signoFromGoles(p.goles_local_oficial, p.goles_visitante_oficial)
    if (sgn === 'L') { home.g++; home.puntos += 3; away.p++ }
    else if (sgn === 'V') { away.g++; away.puntos += 3; home.p++ }
    else { home.e++; away.e++; home.puntos++; away.puntos++ }
  }
  for (const row of teamIdx.values()) row.dg = row.gf - row.gc

  const grupos: GrupoUI[] = [...teamsByGrupo.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([grupo, filas]) => ({
      grupo,
      filas: [...filas].sort((a, b) => b.puntos - a.puntos || b.dg - a.dg || b.gf - a.gf || a.nombre.localeCompare(b.nombre)),
    }))

  // ── Phase 2: classification points ──────────────────────────────────────────
  const actualOrder = new Map<string, number[]>()
  for (const g of grupos) actualOrder.set(g.grupo, g.filas.map((f) => f.equipo_id))

  // Solo se otorgan puntos de un grupo cuando los 6 partidos están finalizados.
  const playedByGroup = new Map<string, number>()
  for (const p of grupoMatches) {
    if (!p.grupo) continue
    if (p.goles_local_oficial == null || p.goles_visitante_oficial == null) continue
    playedByGroup.set(p.grupo, (playedByGroup.get(p.grupo) ?? 0) + 1)
  }
  const closedGroups = new Set<string>()
  for (const [grupo, n] of playedByGroup) if (n >= 6) closedGroups.add(grupo)

  const clasifPicks = (misClasifRaw ?? []) as ClasifPickRow[]
  const clasifResults = classificationGroupPoints(clasifPicks, actualOrder, closedGroups)

  const puntosClasif = clasifResults.reduce((s, r) => s + r.pts, 0)
  const clasifBreakdown: ClasifBreakdownUI = {
    exactos: clasifResults.filter((r) => r.tipo === 'exacto').length,
    top2: clasifResults.filter((r) => r.tipo === 'top2').length,
    bottom2: clasifResults.filter((r) => r.tipo === 'bottom2').length,
    fallos: clasifResults.filter((r) => r.tipo === 'miss' || r.tipo === 'sin_pick').length,
    pendientes: clasifResults.filter((r) => r.tipo === 'pendiente').length,
  }

  // Build per-group comparison UI data
  const pickMap = new Map<string, Map<number, number>>()
  for (const p of clasifPicks) {
    if (!pickMap.has(p.grupo)) pickMap.set(p.grupo, new Map())
    pickMap.get(p.grupo)!.set(p.posicion, p.equipo_id)
  }

  const clasifGroups: ClasifGroupUI[] = grupos.map((g) => {
    const res = clasifResults.find((r) => r.grupo === g.grupo) ?? { pts: 0 as const, tipo: 'sin_pick' as const }
    const userPicksForGroup = pickMap.get(g.grupo)
    const pick = [1, 2, 3, 4].map((pos) => {
      const id = userPicksForGroup?.get(pos)
      if (!id) return null
      const info = teamIdx.get(id)
      return info ? { equipo_id: id, nombre: info.nombre, codigo_bandera: info.codigo_bandera } : null
    })
    return {
      grupo: g.grupo,
      pts: res.pts,
      tipo: res.tipo,
      actual: g.filas.map((f) => ({ equipo_id: f.equipo_id, nombre: f.nombre, codigo_bandera: f.codigo_bandera })),
      pick,
    }
  })

  // ── Phase 3: awards ──────────────────────────────────────────────────────────
  const off = (oficialRaw ?? null) as {
    pichichi: JugadorRow | null; mvp: JugadorRow | null; guante: JugadorRow | null; joven: JugadorRow | null
    pichichi_jugador_id: number | null; mvp_jugador_id: number | null
    guante_oro_jugador_id: number | null; joven_jugador_id: number | null
    best_xi: Record<string, number> | null
    campeon_equipo_id: number | null; subcampeon_equipo_id: number | null; tercer_puesto_id: number | null
  } | null

  const mine = (misExtrasRaw ?? null) as {
    pichichi: JugadorRow | null; mvp: JugadorRow | null; guante: JugadorRow | null; joven: JugadorRow | null
    pichichi_jugador_id: number | null; mvp_jugador_id: number | null
    guante_oro_jugador_id: number | null; joven_jugador_id: number | null
    best_xi: Record<string, number> | null
  } | null

  const aPts = awardsPoints(
    off ? { pichichi_jugador_id: off.pichichi_jugador_id, mvp_jugador_id: off.mvp_jugador_id, guante_oro_jugador_id: off.guante_oro_jugador_id, joven_jugador_id: off.joven_jugador_id, best_xi: off.best_xi } : null,
    mine ? { pichichi_jugador_id: mine.pichichi_jugador_id, mvp_jugador_id: mine.mvp_jugador_id, guante_oro_jugador_id: mine.guante_oro_jugador_id, joven_jugador_id: mine.joven_jugador_id, best_xi: mine.best_xi } : null,
  )

  const awards: AwardResult[] = [
    { key: 'pichichi', label: 'Bota de Oro (Pichichi)', icon: 'target', iconColor: '#C9A84C', oficial: jugadorLite(off?.pichichi), miPick: jugadorLite(mine?.pichichi), puntos: aPts.pichichi, maxPuntos: 8 },
    { key: 'mvp', label: 'Balón de Oro (MVP)', icon: 'star', iconColor: '#FFD100', oficial: jugadorLite(off?.mvp), miPick: jugadorLite(mine?.mvp), puntos: aPts.mvp, maxPuntos: 8 },
    { key: 'guante', label: 'Guante de Oro', icon: 'shirt', iconColor: '#00A651', oficial: jugadorLite(off?.guante), miPick: jugadorLite(mine?.guante), puntos: aPts.guante, maxPuntos: 5 },
    { key: 'joven', label: 'Mejor Jugador Joven', icon: 'sparkles', iconColor: '#7c3aed', oficial: jugadorLite(off?.joven), miPick: jugadorLite(mine?.joven), puntos: aPts.joven, maxPuntos: 5 },
  ]

  // ── Best XI lookup (player info for both official and mine, by id) ──────────
  const xiIds = new Set<number>()
  if (off?.best_xi) for (const v of Object.values(off.best_xi)) if (typeof v === 'number') xiIds.add(v)
  if (mine?.best_xi) for (const v of Object.values(mine.best_xi)) if (typeof v === 'number') xiIds.add(v)

  const { data: xiJugadoresRaw } = xiIds.size > 0
    ? await supabase
        .from('jugadores')
        .select('id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo:equipo_id(nombre, codigo_bandera)')
        .in('id', [...xiIds])
    : { data: null }

  const xiLookup = new Map<number, JugadorLite>()
  for (const j of (xiJugadoresRaw ?? []) as unknown as JugadorRow[]) {
    const lite = jugadorLite(j)
    if (lite) xiLookup.set(lite.id, lite)
  }

  const bestXIOficial: Record<string, JugadorLite | null> = {}
  const bestXIMio: Record<string, JugadorLite | null> = {}
  for (const slot of XI_SLOTS) {
    const oid = off?.best_xi?.[slot]
    const mid = mine?.best_xi?.[slot]
    bestXIOficial[slot] = oid ? xiLookup.get(oid) ?? null : null
    bestXIMio[slot] = mid ? xiLookup.get(mid) ?? null : null
  }
  const bestXIInfo: BestXIInfo = {
    oficial: bestXIOficial,
    mio: bestXIMio,
    aciertos: aPts.bestXIAciertos,
    full: aPts.bestXIFull,
    pts: aPts.bestXI,
  }

  // ── Admin payload (only loaded for admin) ───────────────────────────────────
  const isAdmin = !!user && isAdminEmail(user.email)
  let adminData: AdminPremiosData | undefined
  if (isAdmin) {
    const [{ data: jugadoresAllPage1 }, { data: jugadoresAllPage2 }, { data: equiposAll }] = await Promise.all([
      supabase
        .from('jugadores')
        .select('id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo_id')
        .order('apellidos', { ascending: true })
        .range(0, 749),
      supabase
        .from('jugadores')
        .select('id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo_id')
        .order('apellidos', { ascending: true })
        .range(750, 1499),
      supabase.from('equipos').select('id, nombre, codigo_bandera').order('nombre'),
    ])
    adminData = {
      jugadores: [...(jugadoresAllPage1 ?? []), ...(jugadoresAllPage2 ?? [])] as AdminPremiosData['jugadores'],
      equipos: (equiposAll ?? []) as AdminPremiosData['equipos'],
      oficiales: {
        pichichi_jugador_id: off?.pichichi_jugador_id ?? null,
        mvp_jugador_id: off?.mvp_jugador_id ?? null,
        guante_oro_jugador_id: off?.guante_oro_jugador_id ?? null,
        joven_jugador_id: off?.joven_jugador_id ?? null,
        campeon_equipo_id: off?.campeon_equipo_id ?? null,
        subcampeon_equipo_id: off?.subcampeon_equipo_id ?? null,
        tercer_puesto_id: off?.tercer_puesto_id ?? null,
        best_xi: (off?.best_xi as Record<string, number>) ?? {},
      },
    }
  }

  const hayPicks = !!user && (predsByMatch.size > 0 || mine != null || clasifPicks.length > 0)

  return (
    <div className="min-h-full pb-24">
      <div className="sticky top-0 z-40 relative overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial"
          className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{ display: 'block' }} />
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)' }} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Swords size={13} style={{ color: '#C9A84C' }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#C9A84C' }}>FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Resultados</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      {!user && (
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-gray-500">Inicia sesión para ver tus puntos.</p>
        </div>
      )}

      {user && submittedUsers.length > 1 && viewedUserId && (
        <div className="px-4 pt-4">
          <UserPredictionsSelect
            users={submittedUsers}
            currentId={viewedUserId}
            selfId={user.id}
            label="Datos de"
          />
        </div>
      )}

      {user && (
        <ResultadosClient
          partidos={partidosUI}
          grupos={grupos}
          clasifGroups={clasifGroups}
          awards={awards}
          phasePoints={{ grupos: puntosPartidos, clasif: puntosClasif, awards: aPts.total, knockout: 0 }}
          matchBreakdown={matchBreakdown}
          clasifBreakdown={clasifBreakdown}
          hayPicks={hayPicks}
          bestXI={bestXIInfo}
          isAdmin={isAdmin}
          adminData={adminData}
          viewingSelf={viewingSelf}
          viewedName={viewedName}
        />
      )}
    </div>
  )
}

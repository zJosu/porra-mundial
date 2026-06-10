import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Target } from 'lucide-react'
import { PrediccionesWizard } from './PrediccionesWizard'
import type { PartidoUI, PrediccionExistente } from './PredictionForm'
import type { EquipoInfo, PartidoInfo } from './standings'
import type { Jugador } from './PlayerSelect'

type PartidoRow = {
  id: number
  fecha: string
  grupo: string | null
  jornada: number | null
  sede: string | null
  equipo_local_id: number
  equipo_visitante_id: number
  equipo_local: { nombre: string; codigo_bandera: string } | null
  equipo_visitante: { nombre: string; codigo_bandera: string } | null
}

export default async function PrediccionesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const jugadoresSelect = 'id, nombre, apellidos, posicion, numero_dorsal, foto_url, equipo_id'
  const [
    { data: equiposRaw },
    { data: partidosRaw },
    { data: prediRaw },
    { data: clasifRaw },
    { data: tercerosRaw },
    { data: jugadoresPage1 },
    { data: jugadoresPage2 },
    { data: bracketRaw },
    { data: extrasRaw },
  ] = await Promise.all([
    supabase.from('equipos').select('id, nombre, codigo_bandera, grupo').order('nombre'),
    supabase
      .from('partidos')
      .select(`
        id, fecha, grupo, jornada, sede,
        equipo_local_id, equipo_visitante_id,
        equipo_local:equipo_local_id(nombre, codigo_bandera),
        equipo_visitante:equipo_visitante_id(nombre, codigo_bandera)
      `)
      .order('fecha', { ascending: true }),
    supabase.from('predicciones').select('partido_id, resultado, goles_local, goles_visitante').eq('usuario_id', user.id),
    supabase
      .from('clasificaciones_grupos')
      .select('grupo, equipo_id, posicion')
      .eq('usuario_id', user.id),
    supabase
      .from('ranking_terceros')
      .select('equipo_id, posicion')
      .eq('usuario_id', user.id),
    supabase
      .from('jugadores')
      .select(jugadoresSelect)
      .order('apellidos', { ascending: true })
      .range(0, 749),
    supabase
      .from('jugadores')
      .select(jugadoresSelect)
      .order('apellidos', { ascending: true })
      .range(750, 1499),
    supabase
      .from('predicciones_bracket')
      .select('ronda, slot, ganador_equipo_id')
      .eq('usuario_id', user.id),
    supabase
      .from('predicciones_extras')
      .select('campeon_equipo_id, pichichi_jugador_id, mvp_jugador_id, guante_oro_jugador_id, joven_jugador_id, best_xi')
      .eq('usuario_id', user.id)
      .maybeSingle(),
  ])

  const jugadoresRaw = [...(jugadoresPage1 ?? []), ...(jugadoresPage2 ?? [])]

  const equipos: EquipoInfo[] = (equiposRaw ?? []).map((e) => ({
    id: e.id as number,
    nombre: e.nombre as string,
    codigo_bandera: e.codigo_bandera as string,
    grupo: e.grupo as string,
  }))

  const partidosRows = (partidosRaw as unknown as PartidoRow[]) ?? []

  const partidos: PartidoUI[] = partidosRows
    .filter((p) => p.equipo_local && p.equipo_visitante)
    .map((p) => ({
      id: p.id,
      fecha: p.fecha,
      grupo: p.grupo ?? '',
      jornada: p.jornada ?? 0,
      sede: p.sede ?? '',
      local: p.equipo_local!,
      visitante: p.equipo_visitante!,
    }))

  const partidosInfo: PartidoInfo[] = partidosRows.map((p) => ({
    id: p.id,
    grupo: p.grupo ?? '',
    equipo_local_id: p.equipo_local_id,
    equipo_visitante_id: p.equipo_visitante_id,
  }))

  const predicciones: PrediccionExistente[] = (prediRaw ?? []).map((r) => ({
    partido_id: r.partido_id as number,
    resultado: r.resultado as 'L' | 'X' | 'V',
    goles_local: (r.goles_local as number | null) ?? null,
    goles_visitante: (r.goles_visitante as number | null) ?? null,
  }))

  const clasifSaved = (clasifRaw ?? []).map((r) => ({
    grupo: r.grupo as string,
    equipo_id: r.equipo_id as number,
    posicion: r.posicion as number,
  }))

  const tercerosSaved = (tercerosRaw ?? []).map((r) => ({
    equipo_id: r.equipo_id as number,
    posicion: r.posicion as number,
  }))

  const jugadores: Jugador[] = (jugadoresRaw ?? []).map((j) => ({
    id: j.id as number,
    nombre: (j.nombre as string) ?? '',
    apellidos: (j.apellidos as string) ?? '',
    posicion: (j.posicion as string | null) ?? null,
    numero_dorsal: (j.numero_dorsal as number | null) ?? null,
    foto_url: (j.foto_url as string | null) ?? null,
    equipo_id: j.equipo_id as number,
  }))

  const bracketSaved = (bracketRaw ?? []).map((b) => ({
    ronda: b.ronda as 'R32' | 'R16' | 'QF' | 'SF' | 'F',
    slot: b.slot as number,
    ganador_equipo_id: b.ganador_equipo_id as number,
  }))

  const extrasSaved = {
    campeon_equipo_id: (extrasRaw?.campeon_equipo_id as number | null) ?? null,
    pichichi_jugador_id: (extrasRaw?.pichichi_jugador_id as number | null) ?? null,
    mvp_jugador_id: (extrasRaw?.mvp_jugador_id as number | null) ?? null,
    guante_oro_jugador_id: (extrasRaw?.guante_oro_jugador_id as number | null) ?? null,
    joven_jugador_id: (extrasRaw?.joven_jugador_id as number | null) ?? null,
    best_xi: (extrasRaw?.best_xi as Record<string, number> | null) ?? {},
  }

  // Porra enviada = pichichi seleccionado (campeón está oculto mientras no haya cuadro)
  const porraEnviada = !!extrasRaw?.pichichi_jugador_id

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-40 h-32 md:h-auto relative overflow-hidden bg-black">
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial" className="w-full h-full object-cover object-top block md:h-auto md:max-h-[300px] md:object-contain md:object-center" style={{display:'block'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Target size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Mi porra</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      <PrediccionesWizard
        userId={user.id}
        partidos={partidos}
        equipos={equipos}
        partidosInfo={partidosInfo}
        iniciales={predicciones}
        clasifSaved={clasifSaved}
        tercerosSaved={tercerosSaved}
        jugadores={jugadores}
        bracketSaved={bracketSaved}
        extrasSaved={extrasSaved}
        porraEnviada={porraEnviada}
      />
    </div>
  )
}

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Target } from 'lucide-react'
import { KnockoutWizard } from './KnockoutWizard'
import { ExactScoresSection } from './ExactScoresSection'
import type { EquipoInfo } from './standings'

export default async function PrediccionesPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: equiposRaw },
    { data: bracketRaw },
    { data: marcadoresRaw },
    { data: realBracketRaw },
    { data: koPartidosRaw },
  ] = await Promise.all([
    supabase.from('equipos').select('id, nombre, codigo_bandera, grupo').order('nombre'),
    supabase
      .from('predicciones_bracket')
      .select('ronda, slot, ganador_equipo_id, goles_local, goles_visitante')
      .eq('usuario_id', user.id),
    supabase
      .from('predicciones_marcadores_ko')
      .select('ronda, slot, goles_local, goles_visitante')
      .eq('usuario_id', user.id),
    createAdminClient().from('resultados_bracket').select('ronda, slot, ganador_equipo_id'),
    supabase
      .from('partidos')
      .select('equipo_local_id, equipo_visitante_id, fecha')
      .is('grupo', null),
  ])

  const equipos: EquipoInfo[] = (equiposRaw ?? []).map((e) => ({
    id: e.id as number,
    nombre: e.nombre as string,
    codigo_bandera: e.codigo_bandera as string,
    grupo: e.grupo as string,
  }))

  const bracketSaved = (bracketRaw ?? []).map((b) => ({
    ronda: b.ronda as 'R32' | 'R16' | 'QF' | 'SF' | 'P3' | 'F',
    slot: b.slot as number,
    ganador_equipo_id: b.ganador_equipo_id as number,
    goles_local: (b.goles_local as number | null) ?? null,
    goles_visitante: (b.goles_visitante as number | null) ?? null,
  }))

  const porraEnviada = bracketSaved.length > 0

  // Build locked scores map for ExactScoresSection
  const lockedScores: Record<string, { gl: number; gv: number }> = {}
  for (const m of (marcadoresRaw ?? []) as { ronda: string; slot: number; goles_local: number; goles_visitante: number }[]) {
    lockedScores[`${m.ronda}:${m.slot}`] = { gl: m.goles_local, gv: m.goles_visitante }
  }

  // Build real bracket map (official results) for resolving R16+ teams
  const realBracket: Record<string, number> = {}
  for (const r of (realBracketRaw ?? []) as { ronda: string; slot: number; ganador_equipo_id: number }[]) {
    realBracket[`${r.ronda}:${r.slot}`] = r.ganador_equipo_id
  }

  const knockoutPartidos = (koPartidosRaw ?? []) as {
    equipo_local_id: number; equipo_visitante_id: number; fecha: string
  }[]

  return (
    <div className="min-h-full">
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

      <KnockoutWizard
        userId={user.id}
        equipos={equipos}
        bracketSaved={bracketSaved}
        porraEnviada={porraEnviada}
      />

      <ExactScoresSection
        equipos={equipos}
        lockedScores={lockedScores}
        realBracket={realBracket}
        knockoutPartidos={knockoutPartidos}
      />
    </div>
  )
}

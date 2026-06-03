import { Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

type Jugador = {
  id: number
  nombre: string
  apellidos: string
  posicion: string
  club: string | null
  foto_url: string | null
}

type Equipo = {
  id: number
  nombre: string
  codigo_bandera: string
  jugadores: Jugador[]
}

const POS_ORDER = ['portero', 'defensa', 'centrocampista', 'delantero']
const POS_LABEL: Record<string, string> = {
  portero: 'Porteros',
  defensa: 'Defensas',
  centrocampista: 'Centrocampistas',
  delantero: 'Delanteros',
}

function PlayerCard({ jugador }: { jugador: Jugador }) {
  const initials = `${jugador.nombre[0]}${jugador.apellidos[0]}`.toUpperCase()
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-400">
        {jugador.foto_url ? (
          <img
            src={jugador.foto_url}
            alt={`${jugador.nombre} ${jugador.apellidos}`}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
          {jugador.nombre} {jugador.apellidos}
        </p>
        {jugador.club && (
          <p className="text-xs text-gray-400 truncate">{jugador.club}</p>
        )}
      </div>
    </div>
  )
}

export default async function PlantillasPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: rawEquipos } = await supabase
    .from('equipos')
    .select('id, nombre, codigo_bandera, jugadores(id, equipo_id, nombre, apellidos, posicion, club, foto_url)')
    .order('nombre')

  const equiposConJugadores: Equipo[] = (rawEquipos ?? [])
    .map(e => ({
      id: e.id,
      nombre: e.nombre,
      codigo_bandera: e.codigo_bandera,
      jugadores: (e.jugadores ?? []) as Jugador[],
    }))
    .filter(e => e.jugadores.length > 0)

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="sticky top-0 z-40 relative overflow-hidden bg-black">
        {/* Imagen completa, respeta su ratio 16:9 — en desktop se limita a 300px */}
        <img
          src="/cris-leo-ney.png"
          alt="Jugadores del Mundial"
          className="w-full h-auto block md:max-h-[300px] md:w-full md:object-contain md:object-center"
          style={{display:'block'}}
        />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Users size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Plantillas</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      {/* Lista de equipos */}
      <div className="divide-y divide-gray-100">
        {equiposConJugadores.map(equipo => (
          <details key={equipo.id} className="group">
            <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer select-none hover:bg-gray-50 transition-colors list-none">
              <img
                src={`https://flagcdn.com/w40/${equipo.codigo_bandera.toLowerCase()}.png`}
                alt={equipo.nombre}
                className="w-8 h-auto rounded-sm shadow-sm"
              />
              <span className="flex-1 font-semibold text-gray-900">{equipo.nombre}</span>
              <span className="text-xs text-gray-400 mr-1">{equipo.jugadores.length} jug.</span>
              <svg className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>

            <div className="px-4 pb-4 bg-gray-50/50">
              {POS_ORDER.map(pos => {
                const grupo = equipo.jugadores.filter(j => j.posicion === pos)
                if (!grupo.length) return null
                return (
                  <div key={pos} className="mt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{color:'#004d40'}}>
                      {POS_LABEL[pos]}
                    </p>
                    <div className="divide-y divide-gray-100">
                      {grupo.map(j => <PlayerCard key={j.id} jugador={j} />)}
                    </div>
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}

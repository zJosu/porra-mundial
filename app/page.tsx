import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { Globe, MapPin, Clock } from 'lucide-react'

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
      style={{width:40, height:27}}
    />
  )
}

function formatFecha(iso: string): { dia: string; hora: string } {
  const d = new Date(iso)
  const dia = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  const hora = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC'
  return { dia, hora }
}

function groupByDay(partidos: Partido[]) {
  const map = new Map<string, Partido[]>()
  for (const p of partidos) {
    const key = p.fecha.slice(0, 10) // YYYY-MM-DD
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return map
}

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: partidos } = await supabase
    .from('partidos')
    .select(`
      id, fecha, grupo, jornada, sede, estado,
      goles_local_oficial, goles_visitante_oficial,
      equipo_local:equipo_local_id(nombre, codigo_bandera),
      equipo_visitante:equipo_visitante_id(nombre, codigo_bandera)
    `)
    .eq('estado', 'pendiente')
    .order('fecha', { ascending: true })
    .limit(30)

  const byDay = groupByDay((partidos as unknown as Partido[]) ?? [])
  const days = [...byDay.keys()]

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="relative overflow-hidden bg-black">
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial" className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{display:'block'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Globe size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>Mundial 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">La clika</h1>
          <p className="text-sm mt-0.5 font-medium text-gray-300">Próximos partidos · Fase de Grupos</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      {/* Matches by day */}
      <div className="px-4 py-5 space-y-6">
        {days.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-10">No hay partidos pendientes.</p>
        )}
        {days.map((day) => {
          const matches = byDay.get(day)!
          const fecha = new Date(day + 'T00:00:00Z')
          const label = fecha.toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
          })

          return (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest capitalize">
                  {label}
                </span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* Match cards */}
              <div className="space-y-2.5">
                {matches.map((p) => {
                  const { hora } = formatFecha(p.fecha)
                  return (
                    <div
                      key={p.id}
                      className="bg-white rounded-2xl shadow-sm px-4 py-3.5 active:scale-[0.98] transition-transform"
                    >
                      {/* Top row: grupo + hora */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide text-white" style={{background:'#004FA3'}}>
                          Grupo {p.grupo} · J{p.jornada}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Clock size={10} />
                          {hora}
                        </span>
                      </div>

                      {/* Teams row */}
                      <div className="flex items-center justify-between gap-2">
                        {/* Local */}
                        <div className="flex flex-col items-center gap-1 w-[38%]">
                          <FlagImg codigo={p.equipo_local.codigo_bandera} nombre={p.equipo_local.nombre} />
                          <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
                            {p.equipo_local.nombre}
                          </span>
                        </div>

                        {/* Score / VS */}
                        <div className="flex flex-col items-center gap-0.5">
                          {p.goles_local_oficial !== null ? (
                            <span className="text-xl font-black text-gray-900">
                              {p.goles_local_oficial} – {p.goles_visitante_oficial}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-gray-300 tracking-widest">VS</span>
                          )}
                        </div>

                        {/* Visitante */}
                        <div className="flex flex-col items-center gap-1 w-[38%]">
                          <FlagImg codigo={p.equipo_visitante.codigo_bandera} nombre={p.equipo_visitante.nombre} />
                          <span className="text-[11px] font-semibold text-gray-800 text-center leading-tight">
                            {p.equipo_visitante.nombre}
                          </span>
                        </div>
                      </div>

                      {/* Sede */}
                      <div className="flex items-center justify-center gap-1 mt-2.5">
                        <MapPin size={10} className="text-gray-300 shrink-0" />
                        <span className="text-[10px] text-gray-400 truncate">{p.sede}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-6" />
    </div>
  )
}

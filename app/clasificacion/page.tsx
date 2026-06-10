import { ListOrdered, Trophy } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

type Participante = {
  id: string
  nombre: string
  puntos_totales: number | null
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function ClasificacionPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all users who have submitted (pichichi seleccionado = porra enviada)
  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, puntos_totales')
    .in(
      'id',
      (
        await supabase
          .from('predicciones_extras')
          .select('usuario_id')
          .not('pichichi_jugador_id', 'is', null)
      ).data?.map((r) => r.usuario_id) ?? [],
    )
    .order('puntos_totales', { ascending: false, nullsFirst: false })

  const participantes: Participante[] = (data ?? []) as Participante[]

  // Sort: by puntos_totales desc, nulls last, then by nombre
  participantes.sort((a, b) => {
    const pa = a.puntos_totales ?? -1
    const pb = b.puntos_totales ?? -1
    if (pb !== pa) return pb - pa
    return a.nombre.localeCompare(b.nombre)
  })

  return (
    <div className="min-h-full">
      <div className="sticky top-0 z-40 relative overflow-hidden bg-black">
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial" className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{display:'block'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <ListOrdered size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Clasificación</h1>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      <div className="px-4 py-5">
        {participantes.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'#f0e8c8'}}>
              <Trophy size={28} style={{color:'#C9A84C'}} />
            </div>
            <p className="text-gray-500 text-sm font-medium">Aún no hay participantes</p>
            <p className="text-gray-400 text-xs max-w-xs">Cuando alguien envíe su porra aparecerá aquí.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {participantes.map((p, i) => {
              const pos = i + 1
              const isMe = p.id === user?.id
              const medal = MEDAL[pos]
              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl shadow-sm px-4 py-3 flex items-center gap-3"
                  style={isMe ? { boxShadow: '0 0 0 2px #004d40', background: 'rgba(0,77,64,0.03)' } : undefined}
                >
                  {/* Position */}
                  <div className="w-7 shrink-0 flex items-center justify-center">
                    {medal ? (
                      <span className="text-lg">{medal}</span>
                    ) : (
                      <span className="text-[13px] font-black tabular-nums text-gray-400">{pos}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white text-sm font-black uppercase"
                    style={{ background: isMe ? '#004d40' : '#64748b' }}
                  >
                    {p.nombre.slice(0, 1).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {p.nombre}
                      {isMe && <span className="ml-1.5 text-[10px] font-black uppercase tracking-wide" style={{color:'#004d40'}}>(tú)</span>}
                    </p>
                  </div>

                  {/* Points */}
                  <div className="shrink-0 text-right">
                    <span
                      className="text-lg font-black tabular-nums"
                      style={{ color: (p.puntos_totales ?? 0) > 0 ? '#004d40' : '#cbd5e1' }}
                    >
                      {p.puntos_totales ?? 0}
                    </span>
                    <span className="text-[10px] text-gray-400 ml-0.5">pts</span>
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

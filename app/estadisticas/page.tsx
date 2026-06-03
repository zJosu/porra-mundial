import { BarChart3 } from 'lucide-react'

export default function EstadisticasPage() {
  return (
    <div className="min-h-full">
      <div className="relative overflow-hidden bg-black">
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial" className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{display:'block'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <BarChart3 size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Estadísticas</h1>
          <p className="text-sm mt-0.5 font-medium text-gray-300">Datos y análisis del torneo</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      <div className="px-4 py-10 flex flex-col items-center gap-3 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{background:'#f0e8c8'}}>
          <BarChart3 size={28} style={{color:'#C9A84C'}} />
        </div>
        <p className="text-gray-500 text-sm font-medium">Disponible cuando empiece el torneo</p>
        <p className="text-gray-400 text-xs max-w-xs">
          Goleadores, asistencias, tarjetas, aciertos de la porra y mucho más.
        </p>
      </div>
    </div>
  )
}

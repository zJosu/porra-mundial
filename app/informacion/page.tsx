import { Info, MapPin, Calendar, Users } from 'lucide-react'

const infoItems = [
  {
    icon: Calendar,
    title: 'Fechas del torneo',
    desc: '11 de junio – 19 de julio de 2026',
  },
  {
    icon: MapPin,
    title: 'Sedes',
    desc: 'USA, Canadá y México · 16 ciudades',
  },
  {
    icon: Users,
    title: 'Equipos participantes',
    desc: '48 selecciones · 12 grupos de 4',
  },
]

export default function InformacionPage() {
  return (
    <div className="min-h-full">
      <div className="relative overflow-hidden bg-black">
        <img src="/cris-leo-ney.png" alt="Jugadores del Mundial" className="w-full h-auto block md:max-h-[300px] md:object-contain md:object-center" style={{display:'block'}} />
        <div className="absolute inset-0 pointer-events-none" style={{background:'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 40%, rgba(0,0,0,0) 100%)'}} />
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Info size={13} style={{color:'#C9A84C'}} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{color:'#C9A84C'}}>FIFA WORLD CUP 2026</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Información</h1>
          <p className="text-sm mt-0.5 font-medium text-gray-300">Reglas de la porra y datos del torneo</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-10 h-[4px] fifa-rainbow" />
      </div>

      <div className="px-4 py-5 space-y-3">
        {infoItems.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-2xl shadow-sm px-4 py-4 flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{background:'#f0e8c8'}}>
              <Icon size={18} style={{color:'#C9A84C'}} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}

        <div className="bg-[#f5edcc] rounded-2xl px-4 py-4 mt-4">
          <p className="text-xs font-semibold mb-1" style={{color:'#005C29'}}>Reglas de la porra</p>
          <p className="text-xs leading-relaxed" style={{color:'#3a3010'}}>
            Las reglas del sistema de puntuación y participación se publicarán próximamente.
          </p>
        </div>
      </div>
    </div>
  )
}

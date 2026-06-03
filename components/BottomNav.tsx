'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Target, ListOrdered, Swords, Users, Info } from 'lucide-react'

const navItems = [
  { href: '/', label: 'Inicio', icon: Trophy },
  { href: '/predicciones', label: 'Porra', icon: Target },
  { href: '/clasificacion', label: 'Clasif.', icon: ListOrdered },
  { href: '/resultados', label: 'Result.', icon: Swords },
  { href: '/plantillas', label: 'Equipos', icon: Users },
  { href: '/informacion', label: 'Info', icon: Info },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#111] md:hidden" style={{boxShadow:'0 -1px 0 0 #2a2a2a'}}>
      {/* Rainbow stripe on top */}
      <div className="h-[3px] fifa-rainbow" />
      <div className="flex h-14 safe-area-pb">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
              style={isActive ? {color:'#C9A84C'} : {color:'#4a4a4a'}}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              <span className="text-[9px] font-medium truncate max-w-[52px] text-center leading-tight">
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

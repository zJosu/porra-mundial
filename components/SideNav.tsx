'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Trophy, Target, ListOrdered, Swords, Users, BarChart3, Info, LogOut, ShieldCheck } from 'lucide-react'
import { signOut } from '@/app/actions/auth'

const navItems = [
  { href: '/', label: 'Inicio', icon: Trophy },
  { href: '/predicciones', label: 'Mi porra', icon: Target },
  { href: '/clasificacion', label: 'Clasificación', icon: ListOrdered },
  { href: '/resultados', label: 'Resultados', icon: Swords },
  { href: '/plantillas', label: 'Plantillas', icon: Users },
  { href: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  { href: '/informacion', label: 'Información', icon: Info },
]

export function SideNav({ userEmail, isAdmin }: { userEmail?: string; isAdmin?: boolean }) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen bg-[#111] border-r border-[#2a2a2a] sticky top-0 shrink-0 overflow-hidden">
      {/* Rainbow stripe at top */}
      <div className="h-[4px] fifa-rainbow shrink-0" />

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#2a2a2a]">
        <Image
          src="/fifa26-logo.jpg"
          alt="FIFA World Cup 26"
          width={42}
          height={42}
          className="object-contain shrink-0"
          unoptimized
        />
        <div className="leading-none">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{color:'#C9A84C'}}>
            FIFA World Cup 26
          </p>
          <p className="text-base font-black mt-0.5" style={{color:'#f4f0e8'}}>La clika</p>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#1e1a00]'
                  : 'text-[#888] hover:bg-[#1e1e1e] hover:text-[#f4f0e8]'
              }`}
              style={isActive ? {color:'#C9A84C'} : {}}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </Link>
          )
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              pathname === '/admin' ? 'bg-[#1e1a00]' : 'text-[#666] hover:bg-[#1e1e1e] hover:text-[#f4f0e8]'
            }`}
            style={pathname === '/admin' ? {color:'#C9A84C'} : {}}
          >
            <ShieldCheck size={18} strokeWidth={pathname === '/admin' ? 2.5 : 1.8} />
            Admin
          </Link>
        )}
      </nav>

      {/* Footer: user + logout */}
      <div className="px-3 py-4 border-t border-[#2a2a2a]">
        {userEmail && (
          <div className="flex items-center gap-2.5 px-2 mb-3">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[#111] text-[11px] font-bold shrink-0" style={{background:'#C9A84C'}}>
              {userEmail[0].toUpperCase()}
            </div>
            <p className="text-xs text-[#888] truncate">{userEmail}</p>
          </div>
        )}
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-[#666] hover:bg-[#1e1e1e] hover:text-[#f4f0e8] transition-colors"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </form>
      </div>
    </aside>
  )
}

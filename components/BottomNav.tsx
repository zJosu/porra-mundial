'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Target, ListOrdered, Swords, Users, UserCircle, LogOut, ShieldCheck, X, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { signOut } from '@/app/actions/auth'

const navItems = [
  { href: '/', label: 'Inicio', icon: Trophy },
  { href: '/predicciones', label: 'Porra', icon: Target },
  { href: '/clasificacion', label: 'Clasif.', icon: ListOrdered },
  { href: '/resultados', label: 'Result.', icon: Swords },
  { href: '/plantillas', label: 'Equipos', icon: Users },
]

export function BottomNav({ userEmail, isAdmin }: { userEmail?: string; isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
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
          {/* Cuenta */}
          <button
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors"
            style={{color: open ? '#C9A84C' : '#4a4a4a'}}
          >
            <UserCircle size={20} strokeWidth={open ? 2.5 : 1.8} />
            <span className="text-[9px] font-medium leading-tight">Cuenta</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-[60] md:hidden"
          style={{background: 'rgba(0,0,0,0.6)'}}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Bottom sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[70] md:hidden rounded-t-2xl bg-[#111] transition-transform duration-300"
        style={{
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
          borderTop: '1px solid #2a2a2a',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#333]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a]">
          <span className="text-[10px] font-black uppercase tracking-widest" style={{color:'#C9A84C'}}>Mi cuenta</span>
          <button onClick={() => setOpen(false)} className="text-[#666] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Email */}
        <div className="px-5 py-4 flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{background:'#1e1a00', border: '1.5px solid #C9A84C'}}
          >
            <UserCircle size={22} style={{color:'#C9A84C'}} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{userEmail ?? '—'}</p>
            {isAdmin && (
              <span className="text-[10px] font-semibold" style={{color:'#C9A84C'}}>Administrador</span>
            )}
          </div>
        </div>

        {/* Admin link */}
        {isAdmin && (
          <div className="px-4 pb-2">
            <Link
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-[#1e1e1e]"
              style={{color:'#888'}}
            >
              <ShieldCheck size={18} strokeWidth={1.8} />
              Panel de administrador
            </Link>
          </div>
        )}

        {/* Cambiar contraseña */}
        <div className="px-4 pb-2">
          <Link
            href="/perfil/cambiar-password"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all hover:bg-[#1e1e1e]"
            style={{color:'#888'}}
          >
            <KeyRound size={18} strokeWidth={1.8} />
            Cambiar contraseña
          </Link>
        </div>

        {/* Logout */}
        <div className="px-4 pb-6">
          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all hover:bg-[#2a0a0a]"
              style={{color:'#f87171'}}
            >
              <LogOut size={18} strokeWidth={1.8} />
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </>
  )
}

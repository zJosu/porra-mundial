'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import { ChevronDown, Users } from 'lucide-react'

type User = { id: string; nombre: string }

export function UserPredictionsSelect({
  users,
  currentId,
  selfId,
  paramName = 'u',
  label = 'Predicciones de',
}: {
  users: User[]
  currentId: string
  selfId: string | null
  paramName?: string
  label?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value
    const sp = new URLSearchParams(searchParams.toString())
    if (selfId && next === selfId) sp.delete(paramName)
    else sp.set(paramName, next)
    const qs = sp.toString()
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname)
    })
  }

  return (
    <div
      className="flex items-center gap-2 rounded-2xl bg-white shadow-sm px-3 py-2"
      style={{ border: '1px solid rgba(0,0,0,0.04)' }}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(0,77,64,0.08)', color: '#004d40' }}
      >
        <Users size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 leading-tight">
          {label}
        </p>
        <div className="relative">
          <select
            value={currentId}
            onChange={handleChange}
            disabled={isPending}
            className="w-full appearance-none bg-transparent text-sm font-black text-gray-900 outline-none pr-5 truncate disabled:opacity-50"
            style={{ color: '#004d40' }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.nombre}
                {selfId && u.id === selfId ? ' (tú)' : ''}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#004d40' }}
          />
        </div>
      </div>
    </div>
  )
}

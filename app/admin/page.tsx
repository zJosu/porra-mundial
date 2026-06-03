import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { listParticipants } from '@/app/actions/admin'
import { AddParticipantForm } from './AddParticipantForm'
import { ShieldCheck, Users } from 'lucide-react'

export default async function AdminPage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  const adminEmail = process.env.ADMIN_EMAIL ?? ''
  if (!user || user.email !== adminEmail) redirect('/')

  const participants = await listParticipants()

  return (
    <div className="min-h-full">
      {/* Header */}
      <div style={{ background: '#004d40' }} className="px-4 pt-8 pb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <ShieldCheck size={13} style={{ color: '#FFD100' }} />
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#FFD100' }}>
            Panel de administración
          </span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">Admin</h1>
        <p className="text-sm mt-0.5 font-medium text-gray-400">Gestión de participantes</p>
      </div>
      <div className="h-[4px] fifa-rainbow" />

      <div className="px-4 py-5 space-y-5 max-w-lg">
        {/* Add participant form */}
        <AddParticipantForm />

        {/* Participants list */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} style={{ color: '#004d40' }} />
            <h2 className="text-base font-bold text-gray-800">
              Participantes ({participants.length})
            </h2>
          </div>

          {participants.length === 0 ? (
            <p className="text-sm text-gray-400">Aún no hay participantes registrados.</p>
          ) : (
            <div className="space-y-2">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.nombre || p.email}</p>
                    {p.nombre && <p className="text-xs text-gray-400">{p.email}</p>}
                  </div>
                  <span className="text-sm font-bold tabular-nums" style={{ color: '#004d40' }}>
                    {p.puntos_totales ?? 0} pts
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

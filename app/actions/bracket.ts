'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export type BracketInput = {
  ronda: 'R32' | 'R16' | 'QF' | 'SF' | 'P3' | 'F'
  slot: number
  ganador_equipo_id: number
}

export type ExtrasInput = {
  campeon_equipo_id: number | null
  pichichi_jugador_id: number | null
  mvp_jugador_id: number | null
  guante_oro_jugador_id: number | null
  joven_jugador_id: number | null
  best_xi: Record<string, number> | null
}

export async function saveBracket(
  bracket: BracketInput[],
  extras: ExtrasInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  // Wipe + insert bracket atomically (per user).
  const del = await supabase.from('predicciones_bracket').delete().eq('usuario_id', user.id)
  if (del.error) return { ok: false, error: del.error.message }

  if (bracket.length > 0) {
    const rows = bracket.map((b) => ({
      usuario_id: user.id,
      ronda: b.ronda,
      slot: b.slot,
      ganador_equipo_id: b.ganador_equipo_id,
    }))
    const ins = await supabase.from('predicciones_bracket').insert(rows)
    if (ins.error) return { ok: false, error: ins.error.message }
  }

  // Upsert extras
  const up = await supabase
    .from('predicciones_extras')
    .upsert(
      {
        usuario_id: user.id,
        campeon_equipo_id: extras.campeon_equipo_id,
        pichichi_jugador_id: extras.pichichi_jugador_id,
        mvp_jugador_id: extras.mvp_jugador_id,
        guante_oro_jugador_id: extras.guante_oro_jugador_id,
        joven_jugador_id: extras.joven_jugador_id,
        best_xi: extras.best_xi ?? {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id' },
    )
  if (up.error) return { ok: false, error: up.error.message }

  return { ok: true }
}

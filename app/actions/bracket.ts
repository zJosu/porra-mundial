'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { HARDCODED_R32 } from '@/app/predicciones/bracket'

export type BracketInput = {
  ronda: 'R32' | 'R16' | 'QF' | 'SF' | 'P3' | 'F'
  slot: number
  ganador_equipo_id: number
  goles_local?: number | null
  goles_visitante?: number | null
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
      goles_local: b.goles_local ?? null,
      goles_visitante: b.goles_visitante ?? null,
    }))
    const ins = await supabase.from('predicciones_bracket').insert(rows)
    if (ins.error) return { ok: false, error: ins.error.message }
  }

  // Upsert extras — only include non-null fields so existing data (e.g. pichichi)
  // is never overwritten with null when saving from the knockout wizard.
  const extrasRow: Record<string, unknown> = {
    usuario_id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (extras.campeon_equipo_id != null) extrasRow.campeon_equipo_id = extras.campeon_equipo_id
  if (extras.pichichi_jugador_id != null) extrasRow.pichichi_jugador_id = extras.pichichi_jugador_id
  if (extras.mvp_jugador_id != null) extrasRow.mvp_jugador_id = extras.mvp_jugador_id
  if (extras.guante_oro_jugador_id != null) extrasRow.guante_oro_jugador_id = extras.guante_oro_jugador_id
  if (extras.joven_jugador_id != null) extrasRow.joven_jugador_id = extras.joven_jugador_id
  if (extras.best_xi != null) extrasRow.best_xi = extras.best_xi

  const up = await supabase
    .from('predicciones_extras')
    .upsert(extrasRow, { onConflict: 'usuario_id' })
  if (up.error) return { ok: false, error: up.error.message }

  return { ok: true }
}

// ─── Save exact score prediction for a knockout match ─────────────────────────

const VALID_RONDAS = ['R32', 'R16', 'QF', 'SF', 'P3', 'F'] as const
type KORonda = (typeof VALID_RONDAS)[number]

export async function saveExactScore(
  ronda: KORonda,
  slot: number,
  goles_local: number,
  goles_visitante: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  if (!VALID_RONDAS.includes(ronda)) return { ok: false, error: 'Ronda inválida' }
  if (!Number.isInteger(slot) || slot < 1 || slot > 16) return { ok: false, error: 'Slot inválido' }
  if (!Number.isInteger(goles_local) || goles_local < 0 || goles_local > 99) return { ok: false, error: 'Goles inválidos' }
  if (!Number.isInteger(goles_visitante) || goles_visitante < 0 || goles_visitante > 99) return { ok: false, error: 'Goles inválidos' }

  // Already submitted?
  const { data: existing } = await supabase
    .from('predicciones_marcadores_ko')
    .select('usuario_id')
    .eq('usuario_id', user.id)
    .eq('ronda', ronda)
    .eq('slot', slot)
    .maybeSingle()
  if (existing) return { ok: false, error: 'Ya enviaste esta predicción' }

  // Resolve the two teams in this match to check match start time
  let teamA: number | null = null
  let teamB: number | null = null

  if (ronda === 'R32') {
    const m = HARDCODED_R32[slot - 1]
    teamA = m?.teamA ?? null
    teamB = m?.teamB ?? null
  } else {
    const prevMap: Record<string, { pr: string; sA: number; sB: number }> = {
      R16: { pr: 'R32', sA: (slot - 1) * 2 + 1, sB: (slot - 1) * 2 + 2 },
      QF:  { pr: 'R16', sA: (slot - 1) * 2 + 1, sB: (slot - 1) * 2 + 2 },
      SF:  { pr: 'QF',  sA: (slot - 1) * 2 + 1, sB: (slot - 1) * 2 + 2 },
      P3:  { pr: 'SF',  sA: 1, sB: 2 },
      F:   { pr: 'SF',  sA: 1, sB: 2 },
    }
    const prev = prevMap[ronda]
    if (prev) {
      const { data: rows } = await createAdminClient()
        .from('resultados_bracket')
        .select('slot, ganador_equipo_id')
        .eq('ronda', prev.pr)
        .in('slot', [prev.sA, prev.sB])
      teamA = (rows ?? []).find((r) => r.slot === prev.sA)?.ganador_equipo_id ?? null
      teamB = (rows ?? []).find((r) => r.slot === prev.sB)?.ganador_equipo_id ?? null
    }
  }

  // Check match has not started (look up in partidos by teams)
  if (teamA != null && teamB != null) {
    const { data: partido } = await supabase
      .from('partidos')
      .select('fecha')
      .is('grupo', null)
      .or(
        `and(equipo_local_id.eq.${teamA},equipo_visitante_id.eq.${teamB}),` +
        `and(equipo_local_id.eq.${teamB},equipo_visitante_id.eq.${teamA})`,
      )
      .maybeSingle()
    if (partido?.fecha && new Date(partido.fecha) <= new Date()) {
      return { ok: false, error: 'El partido ya ha empezado' }
    }
  }

  const { error } = await supabase
    .from('predicciones_marcadores_ko')
    .insert({ usuario_id: user.id, ronda, slot, goles_local, goles_visitante })
  if (error) return { ok: false, error: error.message }

  return { ok: true }
}

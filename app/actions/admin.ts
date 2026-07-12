'use server'

import { createAdminClient, isAdminEmail } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { KO_SCHEDULE, KO_ROUND_SLOTS, koFeeders, type Round } from '@/app/predicciones/bracket'

// Normalize a player name into a slug password
// "Lionel Messi" → "lionel_messi"
// "Pedri González" → "pedri_gonzalez"
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove diacritics
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export type ParticipantResult =
  | { ok: true; email: string; jugador: string; password: string }
  | { ok: false; error: string }

export async function createParticipant(email: string): Promise<ParticipantResult> {
  if (!email?.includes('@')) return { ok: false, error: 'Email inválido' }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) {
    return { ok: false, error: 'No autorizado' }
  }

  const admin = createAdminClient()

  // Pick a random player
  const { data: players, error: playersErr } = await admin
    .from('jugadores')
    .select('nombre, apellidos')
    .limit(2000)
  if (playersErr || !players?.length) {
    return { ok: false, error: 'No hay jugadores en la base de datos. Ejecuta el seed primero.' }
  }
  const player = players[Math.floor(Math.random() * players.length)]
  const jugadorNombre = `${player.nombre} ${player.apellidos}`
  const password = toSlug(jugadorNombre)

  // Create auth user (email confirmed, no verification email)
  const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authErr) {
    if (authErr.message.includes('already registered') || authErr.message.includes('already been registered')) {
      return { ok: false, error: 'Ese email ya está registrado.' }
    }
    return { ok: false, error: authErr.message }
  }

  return { ok: true, email, jugador: jugadorNombre, password }
}

export async function listParticipants() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return []

  const admin = createAdminClient()
  const { data } = await admin.from('usuarios').select('id, email, nombre, puntos_totales').order('puntos_totales', { ascending: false })
  return data ?? []
}

type AdminClient = ReturnType<typeof createAdminClient>

// Rounds derived from earlier results, in dependency order (each feeds the next).
const KO_SYNC_ORDER: Round[] = ['R16', 'QF', 'SF', 'P3', 'F']

// Keep the knockout `partidos` rows in sync with the official bracket winners:
// as teams advance, place each next-round match (with its scheduled kickoff) so it
// shows up automatically on the home page. Handles result corrections by refreshing
// team pairings and cascading the invalidation to later rounds.
async function syncKnockoutPartidos(admin: AdminClient): Promise<void> {
  const { data: brRows } = await admin
    .from('resultados_bracket')
    .select('ronda, slot, ganador_equipo_id')
  const winners = new Map<string, number>()
  for (const r of (brRows ?? []) as { ronda: string; slot: number; ganador_equipo_id: number }[]) {
    winners.set(`${r.ronda}:${r.slot}`, r.ganador_equipo_id)
  }

  type KoRow = {
    id: number; fase: string; jornada: number
    equipo_local_id: number; equipo_visitante_id: number
    goles_local_oficial: number | null; goles_visitante_oficial: number | null
  }
  const { data: koRows } = await admin
    .from('partidos')
    .select('id, fase, jornada, equipo_local_id, equipo_visitante_id, goles_local_oficial, goles_visitante_oficial')
    .is('grupo', null)
  const existing = new Map<string, KoRow>()
  for (const r of (koRows ?? []) as KoRow[]) existing.set(`${r.fase}:${r.jornada}`, r)

  const invalidateResult = async (ronda: string, slot: number) => {
    if (winners.has(`${ronda}:${slot}`)) {
      await admin.from('resultados_bracket').delete().eq('ronda', ronda).eq('slot', slot)
      winners.delete(`${ronda}:${slot}`)
    }
  }

  // Process rounds in dependency order so cascades (from an edited earlier result)
  // propagate correctly through the mutable `winners` map.
  for (const ronda of KO_SYNC_ORDER) {
    for (let slot = 1; slot <= KO_ROUND_SLOTS[ronda]; slot++) {
      const key = `${ronda}:${slot}`
      const [teamA, teamB] = koFeeders(ronda, slot, winners)
      const sched = KO_SCHEDULE[key]
      const cur = existing.get(key)
      const ready = teamA != null && teamB != null && sched != null

      if (!ready) {
        // Not decided yet (or no date): remove a previously-placed match if it has no result.
        if (cur) {
          const hasResult = cur.goles_local_oficial != null && cur.goles_visitante_oficial != null
          if (!hasResult) {
            await admin.from('partidos').delete().eq('id', cur.id)
            await invalidateResult(ronda, slot)
            existing.delete(key)
          }
        }
        continue
      }

      if (!cur) {
        await admin.from('partidos').insert({
          equipo_local_id: teamA,
          equipo_visitante_id: teamB,
          fecha: sched!.fecha,
          fase: ronda,
          jornada: slot,
          grupo: null,
          sede: null,
          estado: 'pendiente',
          goles_local_oficial: null,
          goles_visitante_oficial: null,
        })
      } else if (cur.equipo_local_id !== teamA || cur.equipo_visitante_id !== teamB) {
        // A feeder result changed: refresh the pairing, wipe its (now stale) official
        // result and bracket winner so later rounds cascade on subsequent iterations.
        await admin.from('partidos').update({
          equipo_local_id: teamA,
          equipo_visitante_id: teamB,
          fecha: sched!.fecha,
          goles_local_oficial: null,
          goles_visitante_oficial: null,
          estado: 'pendiente',
        }).eq('id', cur.id)
        await invalidateResult(ronda, slot)
      }
    }
  }
}

export async function saveOfficialMatchResult(formData: FormData): Promise<void> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdminEmail(user.email)) {
    return
  }

  const idRaw = String(formData.get('partido_id') ?? '').trim()
  const glRaw = String(formData.get('goles_local_oficial') ?? '').trim()
  const gvRaw = String(formData.get('goles_visitante_oficial') ?? '').trim()
  const ganadorRaw = String(formData.get('ganador_id') ?? '').trim()
  const ganadorIdOverride = ganadorRaw !== '' ? Number(ganadorRaw) : null

  const partidoId = Number(idRaw)
  if (!Number.isInteger(partidoId) || partidoId <= 0) {
    return
  }

  const hasGl = glRaw !== ''
  const hasGv = gvRaw !== ''
  if (hasGl !== hasGv) {
    return
  }

  let golesLocal: number | null = null
  let golesVisitante: number | null = null

  if (hasGl && hasGv) {
    golesLocal = Number(glRaw)
    golesVisitante = Number(gvRaw)
    if (
      !Number.isInteger(golesLocal) ||
      !Number.isInteger(golesVisitante) ||
      golesLocal < 0 ||
      golesVisitante < 0 ||
      golesLocal > 99 ||
      golesVisitante > 99
    ) {
      return
    }
  }

  const admin = createAdminClient()
  const estado = golesLocal == null || golesVisitante == null ? 'pendiente' : 'finalizado'

  const { error } = await admin
    .from('partidos')
    .update({
      goles_local_oficial: golesLocal,
      goles_visitante_oficial: golesVisitante,
      estado,
    })
    .eq('id', partidoId)

  if (error) return

  // For KO matches: keep resultados_bracket in sync
  const { data: partido } = await admin
    .from('partidos')
    .select('grupo, fase, jornada, equipo_local_id, equipo_visitante_id')
    .eq('id', partidoId)
    .maybeSingle()

  if (partido && partido.grupo == null && partido.fase) {
    if (golesLocal != null && golesVisitante != null) {
      const isDraw = golesLocal === golesVisitante
      let winnerId: number | null = null
      if (!isDraw) {
        winnerId = golesLocal > golesVisitante ? partido.equipo_local_id : partido.equipo_visitante_id
      } else if (
        ganadorIdOverride != null &&
        Number.isInteger(ganadorIdOverride) &&
        (ganadorIdOverride === partido.equipo_local_id || ganadorIdOverride === partido.equipo_visitante_id)
      ) {
        winnerId = ganadorIdOverride
      }
      if (winnerId != null) {
        await admin.from('resultados_bracket').upsert(
          { ronda: partido.fase, slot: partido.jornada, ganador_equipo_id: winnerId },
          { onConflict: 'ronda,slot' },
        )
      }
    } else {
      await admin.from('resultados_bracket')
        .delete().eq('ronda', partido.fase).eq('slot', partido.jornada)
    }

    // Advancing a team may unlock the next round's match(es) — place them now.
    await syncKnockoutPartidos(admin)
  }

  revalidatePath('/')
  revalidatePath('/clasificacion')
  revalidatePath('/resultados')
}

// ─── Premios oficiales (Pichichi, MVP, Guante, Joven, Campeón, Subcampeón, 3.º) ──

function parseOptId(raw: unknown): number | null {
  const s = String(raw ?? '').trim()
  if (s === '' || s === '0') return null
  const n = Number(s)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function saveOfficialAwards(formData: FormData): Promise<void> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return

  const payload = {
    id: 1,
    pichichi_jugador_id: parseOptId(formData.get('pichichi_jugador_id')),
    mvp_jugador_id: parseOptId(formData.get('mvp_jugador_id')),
    guante_oro_jugador_id: parseOptId(formData.get('guante_oro_jugador_id')),
    joven_jugador_id: parseOptId(formData.get('joven_jugador_id')),
    campeon_equipo_id: parseOptId(formData.get('campeon_equipo_id')),
    subcampeon_equipo_id: parseOptId(formData.get('subcampeon_equipo_id')),
    tercer_puesto_id: parseOptId(formData.get('tercer_puesto_id')),
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('resultados_oficiales')
    .upsert(payload, { onConflict: 'id' })
  if (error) return

  revalidatePath('/')
  revalidatePath('/clasificacion')
  revalidatePath('/resultados')
}

export async function saveOfficialBestXI(formData: FormData): Promise<void> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdminEmail(user.email)) return

  const raw = String(formData.get('best_xi') ?? '').trim()
  let parsed: Record<string, number> = {}
  if (raw !== '') {
    try {
      const obj = JSON.parse(raw) as unknown
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
          if (typeof v === 'number' && Number.isInteger(v) && v > 0) parsed[k] = v
          else if (v == null) continue
          else return
        }
      } else return
    } catch {
      return
    }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('resultados_oficiales')
    .upsert({ id: 1, best_xi: parsed }, { onConflict: 'id' })
  if (error) return

  revalidatePath('/')
  revalidatePath('/clasificacion')
  revalidatePath('/resultados')
}

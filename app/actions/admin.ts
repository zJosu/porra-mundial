'use server'

import { createAdminClient, isAdminEmail } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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

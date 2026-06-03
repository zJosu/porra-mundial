'use server'

import { createAdminClient } from '@/utils/supabase/admin'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

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

  const adminEmail = process.env.ADMIN_EMAIL ?? ''
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== adminEmail) {
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
  const adminEmail = process.env.ADMIN_EMAIL ?? ''
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== adminEmail) return []

  const admin = createAdminClient()
  const { data } = await admin.from('usuarios').select('id, email, nombre, puntos_totales').order('puntos_totales', { ascending: false })
  return data ?? []
}

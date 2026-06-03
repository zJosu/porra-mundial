'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export type ClasifInput = {
  grupo: string
  equipo_id: number
  posicion: number // 1-4
}

export type TercerosInput = {
  equipo_id: number
  posicion: number // 1-12
}

export type SaveClasifResult = { ok: true } | { ok: false; error: string }

export async function saveClasificacion(
  clasif: ClasifInput[],
  terceros: TercerosInput[],
): Promise<SaveClasifResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  // Validate clasificacion: exactly 48 rows, 4 per group, positions 1-4 unique within group
  if (clasif.length !== 48) return { ok: false, error: 'Faltan equipos en la clasificación' }
  const byGroup = new Map<string, Set<number>>()
  for (const c of clasif) {
    if (!Number.isInteger(c.equipo_id) || c.posicion < 1 || c.posicion > 4) {
      return { ok: false, error: 'Datos inválidos en la clasificación' }
    }
    if (!byGroup.has(c.grupo)) byGroup.set(c.grupo, new Set())
    const s = byGroup.get(c.grupo)!
    if (s.has(c.posicion)) return { ok: false, error: `Posiciones duplicadas en grupo ${c.grupo}` }
    s.add(c.posicion)
  }
  if (byGroup.size !== 12) return { ok: false, error: 'Deben ser 12 grupos' }

  // Validate terceros: exactly 12, positions 1-12 unique
  if (terceros.length !== 12) return { ok: false, error: 'Deben rankearse los 12 terceros' }
  const posSet = new Set<number>()
  for (const t of terceros) {
    if (!Number.isInteger(t.equipo_id) || t.posicion < 1 || t.posicion > 12) {
      return { ok: false, error: 'Datos inválidos en terceros' }
    }
    if (posSet.has(t.posicion)) return { ok: false, error: 'Posiciones duplicadas en terceros' }
    posSet.add(t.posicion)
  }

  // Replace user's clasificacion (delete + insert)
  const { error: delErr } = await supabase
    .from('clasificaciones_grupos')
    .delete()
    .eq('usuario_id', user.id)
  if (delErr) return { ok: false, error: delErr.message }

  const { error: insErr } = await supabase.from('clasificaciones_grupos').insert(
    clasif.map((c) => ({
      usuario_id: user.id,
      grupo: c.grupo,
      equipo_id: c.equipo_id,
      posicion: c.posicion,
    })),
  )
  if (insErr) return { ok: false, error: insErr.message }

  // Replace terceros ranking
  const { error: delT } = await supabase
    .from('ranking_terceros')
    .delete()
    .eq('usuario_id', user.id)
  if (delT) return { ok: false, error: delT.message }

  const { error: insT } = await supabase.from('ranking_terceros').insert(
    terceros.map((t) => ({
      usuario_id: user.id,
      equipo_id: t.equipo_id,
      posicion: t.posicion,
    })),
  )
  if (insT) return { ok: false, error: insT.message }

  revalidatePath('/predicciones')
  return { ok: true }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export type Resultado = 'L' | 'X' | 'V'

export type PrediccionInput = {
  partido_id: number
  resultado: Resultado
}

export type SaveResult =
  | { ok: true; guardadas: number; bloqueadas: number }
  | { ok: false; error: string }

const VALID: ReadonlySet<Resultado> = new Set(['L', 'X', 'V'])

export async function savePredicciones(items: PrediccionInput[]): Promise<SaveResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const clean: PrediccionInput[] = []
  for (const it of items) {
    if (!Number.isInteger(it.partido_id)) continue
    if (!VALID.has(it.resultado)) continue
    clean.push({ partido_id: it.partido_id, resultado: it.resultado })
  }
  if (!clean.length) return { ok: false, error: 'Sin predicciones válidas' }

  // Server-side check: ignore matches whose kickoff already passed.
  const ids = clean.map((c) => c.partido_id)
  const { data: partidos, error: errPart } = await supabase
    .from('partidos')
    .select('id, fecha')
    .in('id', ids)
  if (errPart) return { ok: false, error: errPart.message }

  const now = Date.now()
  const editable = new Set(
    (partidos ?? [])
      .filter((p) => new Date(p.fecha).getTime() > now)
      .map((p) => p.id),
  )

  const allowed = clean.filter((c) => editable.has(c.partido_id))
  const bloqueadas = clean.length - allowed.length

  if (!allowed.length) {
    return { ok: false, error: 'Todos los partidos ya han comenzado' }
  }

  const rows = allowed.map((c) => ({
    usuario_id: user.id,
    partido_id: c.partido_id,
    resultado: c.resultado,
  }))

  const { error } = await supabase
    .from('predicciones')
    .upsert(rows, { onConflict: 'usuario_id,partido_id' })

  if (error) return { ok: false, error: error.message }

  revalidatePath('/predicciones')
  revalidatePath('/')
  return { ok: true, guardadas: allowed.length, bloqueadas }
}

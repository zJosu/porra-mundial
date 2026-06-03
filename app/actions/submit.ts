'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { savePredicciones, type PrediccionInput } from './predicciones'
import { saveClasificacion, type ClasifInput, type TercerosInput } from './clasificacion'
import { saveBracket, type BracketInput, type ExtrasInput } from './bracket'

export type SubmitPayload = {
  predicciones: PrediccionInput[]
  clasificacion: ClasifInput[]
  terceros: TercerosInput[]
  bracket: BracketInput[]
  extras: ExtrasInput
}

export type SubmitResult =
  | { ok: true; guardadas: number; bloqueadas: number }
  | { ok: false; error: string }

export async function submitPorraCompleta(payload: SubmitPayload): Promise<SubmitResult> {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'No autenticado' }

  const p1 = await savePredicciones(payload.predicciones)
  if (!p1.ok) return { ok: false, error: `Pronósticos: ${p1.error}` }

  const p2 = await saveClasificacion(payload.clasificacion, payload.terceros)
  if (!p2.ok) return { ok: false, error: `Clasificación: ${p2.error}` }

  const p3 = await saveBracket(payload.bracket, payload.extras)
  if (!p3.ok) return { ok: false, error: `Cuadro: ${p3.error}` }

  revalidatePath('/predicciones')
  revalidatePath('/')
  return { ok: true, guardadas: p1.guardadas, bloqueadas: p1.bloqueadas }
}

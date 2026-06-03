'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signOut() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  redirect('/login')
}

// Jugadores de España, Portugal, Brasil y Francia — los más conocidos
const PLAYERS = [
  // España
  'Yamal', 'Pedri', 'Gavi', 'Rodri', 'Morata', 'NicoWilliams', 'Carvajal',
  'Laporte', 'LeNormand', 'Balde', 'Fabian', 'DaniOlmo', 'Ferran', 'Simon',
  // Portugal
  'Cristiano', 'Bruno', 'Bernardo', 'Leao', 'Cancelo', 'Dalot', 'Vitinha',
  'JoaoFelix', 'PedroNeto', 'JoaoNeves', 'Palinha', 'Ruben',
  // Brasil
  'Vinicius', 'Rodrygo', 'Endrick', 'Richarlison', 'Raphinha', 'Martinelli',
  'Paqueta', 'Casemiro', 'Militao', 'Marquinhos', 'Alisson', 'Gerson',
  // Francia
  'Mbappe', 'Griezmann', 'Dembele', 'Thuram', 'Kante', 'Camavinga',
  'Tchouameni', 'Upamecano', 'Maignan', 'Saliba',
]

function generatePassword(): string {
  const player = PLAYERS[Math.floor(Math.random() * PLAYERS.length)]
  const num = Math.floor(Math.random() * 89) + 10
  return `${player}${num}`
}

export async function createAccount(
  email: string,
): Promise<{ ok: boolean; error?: string; password?: string }> {
  const admin = createAdminClient()
  const password = generatePassword()

  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return { ok: false, error: 'Ese email ya tiene cuenta. Usa el formulario de login.' }
    }
    return { ok: false, error: 'Error al crear la cuenta. Inténtalo de nuevo.' }
  }

  // TODO: para enviar la contraseña por email, añade RESEND_API_KEY al .env.local
  // y usa el paquete `resend` aquí para mandar un correo con `password`.

  return { ok: true, password }
}

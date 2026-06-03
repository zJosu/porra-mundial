/**
 * Busca fotos de jugadores vía Wikipedia REST API y actualiza foto_url en Supabase.
 * Wikipedia tiene fotos de prácticamente todos los futbolistas internacionales.
 *
 * Uso: node scripts/fetch-player-photos.mjs
 */

import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const WP_HEADERS = {
  'User-Agent': 'PorraMundial/1.0 (football pool app; contact@example.com)',
  'Accept': 'application/json',
}

// Genera variantes del nombre para buscar en Wikipedia
function variants(nombre, apellidos) {
  const n = nombre.trim()
  const a = apellidos.trim()
  return [
    `${n} ${a}`,        // Lionel Messi
    `${a} ${n}`,        // Messi Lionel
    a,                   // Messi
    `${a} (footballer)`, // Kane (footballer)
    `${a} (soccer)`,
  ]
}

async function fetchWikipediaThumbnail(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`
  try {
    const res = await fetch(url, { headers: WP_HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    // Solo usar si la página es de una persona (no desambiguación)
    if (data.type === 'disambiguation') return null
    return data.thumbnail?.source ?? null
  } catch {
    return null
  }
}

async function searchWikipedia(nombre, apellidos) {
  for (const v of variants(nombre, apellidos)) {
    const url = await fetchWikipediaThumbnail(v)
    if (url) return url
    await sleep(80) // respetamos a Wikimedia
  }
  // Último recurso: búsqueda por texto
  try {
    const q = `${nombre} ${apellidos} footballer`
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json&origin=*`
    const res = await fetch(searchUrl, { headers: WP_HEADERS })
    if (!res.ok) return null
    const data = await res.json()
    const results = data?.query?.search ?? []
    for (const r of results) {
      const url = await fetchWikipediaThumbnail(r.title)
      if (url) return url
      await sleep(80)
    }
  } catch { /* ignorar */ }
  return null
}

async function main() {
  console.log('🔍 Buscando fotos vía Wikipedia...\n')

  const { data: jugadores, error } = await supabase
    .from('jugadores')
    .select('id, nombre, apellidos')
    .is('foto_url', null)
    .order('id')

  if (error) throw error
  console.log(`  → ${jugadores.length} jugadores sin foto\n`)

  let found = 0
  let notFound = 0

  for (let i = 0; i < jugadores.length; i++) {
    const { id, nombre, apellidos } = jugadores[i]
    const fotoUrl = await searchWikipedia(nombre, apellidos)

    if (fotoUrl) {
      await supabase.from('jugadores').update({ foto_url: fotoUrl }).eq('id', id)
      console.log(`  ✓ [${i+1}/${jugadores.length}] ${nombre} ${apellidos}`)
      found++
    } else {
      console.log(`  · [${i+1}/${jugadores.length}] ${nombre} ${apellidos} — sin foto`)
      notFound++
    }
  }

  console.log(`\n✅ Fotos encontradas: ${found} / ${jugadores.length}`)
  console.log(`   Sin foto: ${notFound}`)
}

main().catch(e => { console.error(e); process.exit(1) })

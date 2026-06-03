/**
 * Fetch player photos from EA Sports FC CDN (ut.res.ea.com) via SoFIFA player IDs.
 * Uses a custom DNS resolver (1.1.1.1) inside the Node process to bypass corporate DNS.
 * Fallback chain: EA CDN → cdn.sofifa.net → Wikipedia thumbnail.
 *
 * Usage: node scripts/fetch-photos-ea.mjs
 */

import { readFileSync } from 'fs'
import https from 'node:https'
import { Resolver } from 'node:dns/promises'
import { createClient } from '@supabase/supabase-js'

// ─── Config ──────────────────────────────────────────────────────────────────

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ─── Custom DNS (bypasses corporate DNS that blocks gaming domains) ───────────

const dnsResolver = new Resolver()
dnsResolver.setServers(['1.1.1.1', '8.8.8.8'])

const dnsCache = new Map()
function customLookup(hostname, _opts, callback) {
  if (dnsCache.has(hostname)) return callback(null, dnsCache.get(hostname), 4)
  dnsResolver.resolve4(hostname)
    .then(addrs => { dnsCache.set(hostname, addrs[0]); callback(null, addrs[0], 4) })
    .catch(err => callback(err))
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

/**
 * HTTPS GET with custom DNS, no body compression, follows one redirect.
 * Returns { status, body } or null on error.
 */
function httpsGet(url, extraHeaders = {}, redirectCount = 0) {
  return new Promise((resolve) => {
    let parsed
    try { parsed = new URL(url) } catch { return resolve(null) }

    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'Host': parsed.hostname,
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      },
      lookup: customLookup,
    }, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirectCount < 3) {
        res.resume()
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : `https://${parsed.hostname}${res.headers.location}`
        return resolve(httpsGet(next, extraHeaders, redirectCount + 1))
      }
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
      res.on('error', () => resolve(null))
    })
    req.on('error', () => resolve(null))
    req.setTimeout(15000, () => { req.destroy(); resolve(null) })
    req.end()
  })
}

/**
 * HTTPS HEAD with custom DNS. Returns status code or 0 on error.
 */
function httpsHead(url) {
  return new Promise((resolve) => {
    let parsed
    try { parsed = new URL(url) } catch { return resolve(0) }

    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'HEAD',
      headers: {
        'Host': parsed.hostname,
        'User-Agent': BROWSER_UA,
      },
      lookup: customLookup,
    }, res => { res.resume(); resolve(res.statusCode) })
    req.on('error', () => resolve(0))
    req.setTimeout(10000, () => { req.destroy(); resolve(0) })
    req.end()
  })
}

// ─── SoFIFA search → player ID ────────────────────────────────────────────────

/**
 * Search sofifa.com for a player, return their numeric EA/SoFIFA ID.
 * Falls back to futwiz.com if sofifa returns 403.
 */
async function searchEaId(nombre, apellidos) {
  const q = `${nombre} ${apellidos}`.trim()

  // Primary: sofifa.com
  const res = await httpsGet(
    `https://sofifa.com/players?keyword=${encodeURIComponent(q)}&type=all`,
  )
  if (res && res.status === 200) {
    const m = res.body.match(/href="\/player\/(\d+)\//)
    if (m) return parseInt(m[1])
  }

  // Fallback: futwiz.com
  const res2 = await httpsGet(
    `https://www.futwiz.com/en/fc26/players?search=${encodeURIComponent(q)}`,
  )
  if (res2 && res2.status === 200) {
    const m2 = res2.body.match(/\/en\/fc26\/player\/(\d+)\//)
    if (m2) return parseInt(m2[1])
  }

  return null
}

// ─── CDN URL builders ─────────────────────────────────────────────────────────

/**
 * EA Sports CDN URL (best quality — dedicated card asset, transparent background).
 * e.g. ID=158023 → https://ut.res.ea.com/p/eafc26/items/players/p158023.png
 */
const eaCdnUrl = id => `https://ut.res.ea.com/p/eafc26/items/players/p${id}.png`

/**
 * SoFIFA CDN URL (same face photo, works from any network).
 * e.g. ID=158023 → https://cdn.sofifa.net/players/158/023/26_120.png
 */
function sofifaCdnUrl(id) {
  const p = String(id).padStart(6, '0')
  return `https://cdn.sofifa.net/players/${p.slice(0, 3)}/${p.slice(3)}/26_120.png`
}

// ─── Wikipedia fallback ───────────────────────────────────────────────────────

async function searchWikipedia(nombre, apellidos) {
  const WP = { 'User-Agent': 'PorraMundial/1.0 (contact@example.com)', 'Accept': 'application/json' }
  const candidates = [
    `${nombre} ${apellidos}`,
    apellidos,
    `${apellidos} (footballer)`,
    `${apellidos} (soccer)`,
  ].filter(Boolean)

  for (const c of candidates) {
    try {
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(c.replace(/ /g, '_'))}`,
        { headers: WP }
      )
      if (!r.ok) continue
      const d = await r.json()
      if (d.type !== 'disambiguation' && d.thumbnail?.source) return d.thumbnail.source
    } catch { /* ignore */ }
    await sleep(80)
  }
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏆 Buscando fotos EA Sports FC / SoFIFA CDN...\n')

  // Test DNS + decide which CDN to use
  let useEaCdn = false
  try {
    const ipEa = await dnsResolver.resolve4('ut.res.ea.com')
    console.log(`  ✓ DNS 1.1.1.1: ut.res.ea.com → ${ipEa[0]}`)
    const statusEa = await httpsHead(eaCdnUrl(158023))
    useEaCdn = statusEa === 200
    console.log(`  ${useEaCdn ? '✓' : '·'} EA CDN (ut.res.ea.com) → HTTP ${statusEa}`)
  } catch {
    console.log('  · EA CDN no accesible, usando cdn.sofifa.net')
  }

  try {
    const ipSoFIFA = await dnsResolver.resolve4('cdn.sofifa.net')
    console.log(`  ✓ DNS 1.1.1.1: cdn.sofifa.net → ${ipSoFIFA[0]}`)
  } catch (e) {
    console.error(`  ✗ cdn.sofifa.net no resuelve: ${e.message}`)
    process.exit(1)
  }

  console.log(`\n  Modo fotos: ${useEaCdn ? 'EA Sports CDN (eafc26)' : 'cdn.sofifa.net'}\n`)

  // Load players without foto_url
  const { data: jugadores, error } = await supabase
    .from('jugadores')
    .select('id, nombre, apellidos')
    .is('foto_url', null)
    .order('id')

  if (error) throw error
  console.log(`  → ${jugadores.length} jugadores sin foto\n`)

  let eaCount = 0
  let wikiCount = 0
  let noPhoto = 0

  for (let i = 0; i < jugadores.length; i++) {
    const { id, nombre, apellidos } = jugadores[i]
    const label = `[${String(i + 1).padStart(4)}/${jugadores.length}] ${nombre} ${apellidos}`

    // 1. Search EA/SoFIFA ID
    const eaId = await searchEaId(nombre, apellidos)
    await sleep(300)

    if (eaId) {
      // Try EA CDN first, then SoFIFA CDN
      let fotoUrl = null
      if (useEaCdn) {
        const url = eaCdnUrl(eaId)
        if (await httpsHead(url) === 200) fotoUrl = url
      }
      if (!fotoUrl) {
        // Try fc26, then fc25 as fallback
        for (const version of ['26', '25']) {
          const p = String(eaId).padStart(6, '0')
          const url = `https://cdn.sofifa.net/players/${p.slice(0, 3)}/${p.slice(3)}/${version}_120.png`
          if (await httpsHead(url) === 200) { fotoUrl = url; break }
        }
      }
      if (fotoUrl) {
        await supabase.from('jugadores').update({ foto_url: fotoUrl }).eq('id', id)
        console.log(`  ✓ EA   ${label} (id=${eaId})`)
        eaCount++
        continue
      }
    }

    // 2. Fallback: Wikipedia
    const wikiUrl = await searchWikipedia(nombre, apellidos)
    if (wikiUrl) {
      await supabase.from('jugadores').update({ foto_url: wikiUrl }).eq('id', id)
      console.log(`  ~ WP   ${label}`)
      wikiCount++
    } else {
      console.log(`  · ---  ${label}`)
      noPhoto++
    }

    await sleep(150)
  }

  console.log('\n──────────── RESUMEN ────────────')
  console.log(`  EA/SoFIFA CDN : ${eaCount}`)
  console.log(`  Wikipedia     : ${wikiCount}`)
  console.log(`  Sin foto      : ${noPhoto}`)
  console.log(`  TOTAL         : ${eaCount + wikiCount + noPhoto}`)
  console.log('─────────────────────────────────')
}

main().catch(e => { console.error(e); process.exit(1) })

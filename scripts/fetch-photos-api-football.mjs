/**
 * Fetch player photos from API-Football (api-sports.io) and update foto_url in Supabase.
 *
 * Strategy:
 *  1. Build API team ID map via /teams?league=1&season=2022 (1 req)
 *  2. Search any teams not in the 2022 WC individually (up to 16 req)
 *  3. GET /players/squads?team={id} for all 48 national teams (48 req)
 *  4. Fuzzy match API player names against our DB (by apellidos + team)
 *  5. Update foto_url in Supabase
 *
 * Total requests: ~65  (well within 100/day free plan limit)
 *
 * Usage: node scripts/fetch-photos-api-football.mjs
 */

import { readFileSync } from 'fs'
import https from 'node:https'
import { Resolver } from 'node:dns/promises'
import { createClient } from '@supabase/supabase-js'

// ─── Env & Supabase ───────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const API_KEY = env.API_FOOTBALL_KEY
if (!API_KEY) { console.error('❌ Falta API_FOOTBALL_KEY en .env.local'); process.exit(1) }

const sleep = ms => new Promise(r => setTimeout(r, ms))

// ─── DNS bypass (1.1.1.1) + HTTPS helper ─────────────────────────────────────
const resolver = new Resolver()
resolver.setServers(['1.1.1.1', '8.8.8.8'])
const ipCache = new Map()
async function resolveIp(host) {
  if (!ipCache.has(host)) ipCache.set(host, (await resolver.resolve4(host))[0])
  return ipCache.get(host)
}

async function apiGet(path) {
  const host = 'v3.football.api-sports.io'
  const ip = await resolveIp(host)
  return new Promise((res) => {
    const req = https.request(
      { host: ip, port: 443, path, method: 'GET', servername: host,
        headers: { 'Host': host, 'x-apisports-key': API_KEY } },
      r => {
        const chunks = []
        r.on('data', c => chunks.push(c))
        r.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf8')
            res({ status: r.statusCode, data: JSON.parse(body) })
          } catch (e) { res({ err: 'json:' + e.message }) }
        })
      }
    )
    req.on('error', e => res({ err: e.message }))
    req.setTimeout(15000, () => { req.destroy(); res({ err: 'timeout' }) })
    req.end()
  })
}

// ─── Our 48 teams: code → { name for search, supabase equipo_id } ─────────────
// Country name used for API name matching (flexible — normalized anyway)
const TEAMS = {
  'mx':     { search: 'Mexico',               dbId: 1  },
  'za':     { search: 'South Africa',         dbId: 2  },
  'kr':     { search: 'South Korea',          dbId: 3  },
  'cz':     { search: 'Czech Republic',       dbId: 4  },
  'ca':     { search: 'Canada',               dbId: 5  },
  'ba':     { search: 'Bosnia',               dbId: 6  },
  'qa':     { search: 'Qatar',                dbId: 7  },
  'ch':     { search: 'Switzerland',          dbId: 8  },
  'br':     { search: 'Brazil',               dbId: 9  },
  'ma':     { search: 'Morocco',              dbId: 10 },
  'ht':     { search: 'Haiti',                dbId: 11 },
  'gb-sct': { search: 'Scotland',             dbId: 12 },
  'us':     { search: 'USA',                  dbId: 13 },
  'py':     { search: 'Paraguay',             dbId: 14 },
  'au':     { search: 'Australia',            dbId: 15 },
  'tr':     { search: 'Turkey',               dbId: 16 },
  'de':     { search: 'Germany',              dbId: 17 },
  'cw':     { search: 'Curacao',              dbId: 18 },
  'ci':     { search: 'Ivory Coast',          dbId: 19 },
  'ec':     { search: 'Ecuador',              dbId: 20 },
  'nl':     { search: 'Netherlands',          dbId: 21 },
  'jp':     { search: 'Japan',                dbId: 22 },
  'se':     { search: 'Sweden',               dbId: 23 },
  'tn':     { search: 'Tunisia',              dbId: 24 },
  'be':     { search: 'Belgium',              dbId: 25 },
  'eg':     { search: 'Egypt',                dbId: 26 },
  'ir':     { search: 'Iran',                 dbId: 27 },
  'nz':     { search: 'New Zealand',          dbId: 28 },
  'es':     { search: 'Spain',                dbId: 29 },
  'cv':     { search: 'Cape Verde',           dbId: 30 },
  'sa':     { search: 'Saudi Arabia',         dbId: 31 },
  'uy':     { search: 'Uruguay',              dbId: 32 },
  'fr':     { search: 'France',               dbId: 33 },
  'sn':     { search: 'Senegal',              dbId: 34 },
  'iq':     { search: 'Iraq',                 dbId: 35 },
  'no':     { search: 'Norway',               dbId: 36 },
  'ar':     { search: 'Argentina',            dbId: 37 },
  'dz':     { search: 'Algeria',              dbId: 38 },
  'at':     { search: 'Austria',              dbId: 39 },
  'jo':     { search: 'Jordan',               dbId: 40 },
  'pt':     { search: 'Portugal',             dbId: 41 },
  'cd':     { search: 'DR Congo',             dbId: 42 },
  'uz':     { search: 'Uzbekistan',           dbId: 43 },
  'co':     { search: 'Colombia',             dbId: 44 },
  'gb-eng': { search: 'England',              dbId: 45 },
  'hr':     { search: 'Croatia',              dbId: 46 },
  'gh':     { search: 'Ghana',                dbId: 47 },
  'pa':     { search: 'Panama',               dbId: 48 },
}

// ─── Name normalization for fuzzy matching ────────────────────────────────────
function normalize(str) {
  return (str || '')
    .normalize('NFD')               // decompose accents: é → e + ́
    .replace(/[\u0300-\u036f]/g, '') // remove accent marks
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')   // symbols → space
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * API returns names like "L. Messi", "K. Mbappé", "Neymar Jr", "Vinícius Jr."
 * Extract meaningful last-name tokens for matching.
 */
function extractLastName(apiName) {
  const n = normalize(apiName)
  // Remove leading "X." initial pattern
  return n.replace(/^[a-z]\.\s*/, '').trim()
}

// ─── Step 1: Build API team ID map ────────────────────────────────────────────
async function buildTeamIdMap() {
  console.log('\n📋 Paso 1: Buscando IDs de equipos en API-Football...')

  // Bulk: teams from 2022 WC (1 request)
  const res = await apiGet('/teams?league=1&season=2022')
  if (res.err) throw new Error('Error en /teams?league=1&season=2022: ' + res.err)

  const wcTeams = res.data.response || []
  console.log(`  → ${wcTeams.length} equipos encontrados en WC 2022`)

  // Build name → apiId map from WC 2022
  const nameToApiId = new Map()
  for (const t of wcTeams) {
    nameToApiId.set(normalize(t.team.name), t.team.id)
  }

  // Match each of our teams
  const apiIdMap = {} // code → apiTeamId
  const notFound = []

  for (const [code, info] of Object.entries(TEAMS)) {
    const searchNorm = normalize(info.search)
    // Try exact or partial match
    let found = nameToApiId.get(searchNorm)
    if (!found) {
      // Try partial containment
      for (const [name, id] of nameToApiId) {
        if (name.includes(searchNorm) || searchNorm.includes(name)) { found = id; break }
      }
    }
    if (found) {
      apiIdMap[code] = found
    } else {
      notFound.push(code)
    }
  }

  console.log(`  → ${Object.keys(apiIdMap).length} equipos mapeados`)
  if (notFound.length) console.log(`  → ${notFound.length} sin mapear: ${notFound.join(', ')}`)

  // Step 2: Search individually for teams not in 2022 WC
  for (const code of notFound) {
    const info = TEAMS[code]
    await sleep(6500)
    const r = await apiGet(`/teams?name=${encodeURIComponent(info.search)}`)
    if (r.err) { console.log(`  ⚠️  ${code} (${info.search}): ${r.err}`); continue }
    const teams = (r.data.response || []).filter(t => t.team.national === true || t.team.type === 'National')
    const allTeams = r.data.response || []
    const searchIn = teams.length > 0 ? teams : allTeams
    // Find best match by name
    for (const t of searchIn) {
      const tn = normalize(t.team.name)
      if (tn.includes(normalize(info.search)) || normalize(info.search).includes(tn)) {
        apiIdMap[code] = t.team.id
        console.log(`  ✓ ${code} → ${t.team.name} (id=${t.team.id})`)
        break
      }
    }
    if (!apiIdMap[code]) {
      // Fallback: take the first result
      if (allTeams.length > 0) {
        apiIdMap[code] = allTeams[0].team.id
        console.log(`  ~ ${code} → ${allTeams[0].team.name} (id=${allTeams[0].team.id}) [fallback]`)
      } else {
        console.log(`  ✗ ${code} (${info.search}): no encontrado`)
      }
    }
  }

  return apiIdMap
}

// ─── Step 2: Fetch squad photos for all teams ─────────────────────────────────
async function fetchSquadPhotos(apiIdMap) {
  console.log('\n📸 Paso 2: Descargando plantillas con fotos...')

  // Map: { dbEquipoId → [ { apiName, photo } ] }
  const squadByTeam = {}

  const codes = Object.keys(TEAMS)
  for (let i = 0; i < codes.length; i++) {
    const code = codes[i]
    const dbId = TEAMS[code].dbId
    const apiId = apiIdMap[code]

    if (!apiId) {
      console.log(`  ⚠️  [${i+1}/48] ${code}: sin API ID, skip`)
      continue
    }

    await sleep(6500)
    const r = await apiGet(`/players/squads?team=${apiId}`)
    if (r.err) { console.log(`  ✗ [${i+1}/48] ${code}: ${r.err}`); continue }

    // Detect rate-limit (API returns errors object with empty response)
    if (r.data.errors && Object.keys(r.data.errors).length > 0) {
      const errMsg = JSON.stringify(r.data.errors)
      console.log(`  ⚠️  Rate limit o error API [${code}]: ${errMsg}`)
      if (errMsg.includes('rate limit')) { await sleep(60000); } // espera 1 min
    }

    const players = r.data.response?.[0]?.players || []
    squadByTeam[dbId] = players.map(p => ({
      apiName: p.name,
      photo: p.photo,
      apiId: p.id,
    }))

    console.log(`  ✓ [${String(i+1).padStart(2)}/48] ${code.padEnd(6)} → ${players.length} jugadores`)
  }

  return squadByTeam
}

// ─── Step 3: Match API players to DB players and update ──────────────────────
async function matchAndUpdate(squadByTeam) {
  console.log('\n🔗 Paso 3: Emparejando con jugadores en BD y actualizando fotos...')

  // Load all players from Supabase (only those without photo)
  const { data: jugadores, error } = await supabase
    .from('jugadores')
    .select('id, nombre, apellidos, equipo_id')
    .is('foto_url', null)
    .order('equipo_id')
  if (error) throw error
  console.log(`  → ${jugadores.length} jugadores sin foto en BD\n`)

  let matched = 0
  let unmatched = 0

  for (const jugador of jugadores) {
    const { id, nombre, apellidos, equipo_id } = jugador
    const squad = squadByTeam[equipo_id]
    if (!squad || squad.length === 0) { unmatched++; continue }

    const apNorm = normalize(apellidos)
    const nomNorm = normalize(nombre)

    let bestPlayer = null
    let bestScore = 0

    for (const apiPlayer of squad) {
      const last = extractLastName(apiPlayer.apiName)

      // Score: how well does the API last name match our apellidos
      let score = 0
      if (last === apNorm) score = 3                          // exact match
      else if (last.includes(apNorm) || apNorm.includes(last)) score = 2  // partial
      else {
        // Check each word in apellidos against last
        const apWords = apNorm.split(' ')
        const lastWords = last.split(' ')
        const shared = apWords.filter(w => w.length > 2 && lastWords.includes(w))
        if (shared.length > 0) score = 1
      }

      // Bonus: first-name initial matches
      if (score > 0 && nomNorm.length > 0) {
        const apiFirstInitial = normalize(apiPlayer.apiName).charAt(0)
        if (apiFirstInitial === nomNorm.charAt(0)) score += 0.5
      }

      if (score > bestScore) { bestScore = score; bestPlayer = apiPlayer }
    }

    if (bestPlayer && bestScore >= 1) {
      await supabase.from('jugadores').update({ foto_url: bestPlayer.photo }).eq('id', id)
      console.log(`  ✓ ${nombre} ${apellidos} → "${bestPlayer.apiName}" (score=${bestScore})`)
      matched++
    } else {
      console.log(`  · ${nombre} ${apellidos} [equipo ${equipo_id}] — sin match`)
      unmatched++
    }
  }

  return { matched, unmatched }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏆 Fetch de fotos vía API-Football (api-sports.io)\n')

  // Check API status + remaining requests
  const status = await apiGet('/status')
  const sub = status.data?.response
  if (sub) {
    const rem = sub.requests?.limit_day - sub.requests?.current
    console.log(`  Plan: ${sub.subscription?.plan} | Requests restantes hoy: ${rem ?? '?'}`)
    if (rem !== undefined && rem < 70) {
      console.warn(`  ⚠️  Solo ${rem} requests disponibles. Puede que no alcance para las 48 plantillas.`)
    }
  }

  const apiIdMap = await buildTeamIdMap()
  const squadByTeam = await fetchSquadPhotos(apiIdMap)
  const { matched, unmatched } = await matchAndUpdate(squadByTeam)

  console.log('\n──────────── RESUMEN ────────────')
  console.log(`  Fotos añadidas  : ${matched}`)
  console.log(`  Sin match       : ${unmatched}`)
  console.log('─────────────────────────────────')
}

main().catch(e => { console.error(e); process.exit(1) })

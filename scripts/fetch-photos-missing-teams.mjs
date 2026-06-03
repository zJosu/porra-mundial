/**
 * Fetch player photos ONLY for the 8 teams that were added late and have no photos.
 * Uses ~10 API requests (vs ~65 for the full script).
 *
 * Teams: Portugal, Colombia, RD Congo, Uzbekistán, Inglaterra, Croacia, Ghana, Panamá
 *
 * Usage: node scripts/fetch-photos-missing-teams.mjs
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

// ─── DNS bypass + HTTPS helper ────────────────────────────────────────────────
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
          try { res({ status: r.statusCode, data: JSON.parse(Buffer.concat(chunks).toString('utf8')) })
          } catch (e) { res({ err: 'json:' + e.message }) }
        })
      }
    )
    req.on('error', e => res({ err: e.message }))
    req.setTimeout(15000, () => { req.destroy(); res({ err: 'timeout' }) })
    req.end()
  })
}

// ─── Only the 8 teams with missing photos ────────────────────────────────────
const MISSING_TEAMS = [
  { code: 'pt',     search: 'Portugal',     dbId: 41 },
  { code: 'cd',     search: 'DR Congo',     dbId: 42 },
  { code: 'uz',     search: 'Uzbekistan',   dbId: 43 },
  { code: 'co',     search: 'Colombia',     dbId: 44 },
  { code: 'gb-eng', search: 'England',      dbId: 45 },
  { code: 'hr',     search: 'Croatia',      dbId: 46 },
  { code: 'gh',     search: 'Ghana',        dbId: 47 },
  { code: 'pa',     search: 'Panama',       dbId: 48 },
]

// ─── Name normalization ───────────────────────────────────────────────────────
function normalize(str) {
  return (str || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}
function extractLastName(apiName) {
  return normalize(apiName).replace(/^[a-z]\.\s*/, '').trim()
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏆 Fetch de fotos — 8 equipos sin fotos\n')

  // Check quota
  const status = await apiGet('/status')
  const sub = status.data?.response
  if (sub) {
    const rem = sub.requests?.limit_day - sub.requests?.current
    console.log(`  Plan: ${sub.subscription?.plan} | Requests restantes hoy: ${rem ?? '?'}`)
    if (rem !== undefined && rem < 12) {
      console.error(`  ❌ Solo ${rem} requests disponibles, necesitamos ~10. Inténtalo mañana.`)
      process.exit(1)
    }
  }

  // Step 1: bulk team ID lookup (WC 2022)
  console.log('\n📋 Buscando IDs de equipos...')
  const bulkRes = await apiGet('/teams?league=1&season=2022')
  const wcTeams = bulkRes.data?.response || []
  const nameToApiId = new Map()
  for (const t of wcTeams) nameToApiId.set(normalize(t.team.name), t.team.id)

  const apiIdMap = {}
  const notFound = []

  for (const team of MISSING_TEAMS) {
    const sn = normalize(team.search)
    let found = nameToApiId.get(sn)
    if (!found) {
      for (const [name, id] of nameToApiId) {
        if (name.includes(sn) || sn.includes(name)) { found = id; break }
      }
    }
    if (found) {
      apiIdMap[team.code] = found
      console.log(`  ✓ ${team.search} → API id=${found}`)
    } else {
      notFound.push(team)
    }
  }

  // Individual search for teams not in WC 2022
  for (const team of notFound) {
    await sleep(6500)
    console.log(`  🔍 Buscando ${team.search} individualmente...`)
    const r = await apiGet(`/teams?name=${encodeURIComponent(team.search)}`)
    if (r.err) { console.log(`  ⚠️  ${team.search}: ${r.err}`); continue }
    const all = r.data.response || []
    const nationals = all.filter(t => t.team.national === true)
    const searchIn = nationals.length ? nationals : all
    for (const t of searchIn) {
      const tn = normalize(t.team.name)
      if (tn.includes(normalize(team.search)) || normalize(team.search).includes(tn)) {
        apiIdMap[team.code] = t.team.id
        console.log(`  ✓ ${team.search} → ${t.team.name} (id=${t.team.id})`)
        break
      }
    }
    if (!apiIdMap[team.code] && all.length > 0) {
      apiIdMap[team.code] = all[0].team.id
      console.log(`  ~ ${team.search} → ${all[0].team.name} (id=${all[0].team.id}) [fallback]`)
    }
  }

  // Step 2: Fetch squads
  console.log('\n📸 Descargando plantillas...')
  const squadByTeam = {}
  for (let i = 0; i < MISSING_TEAMS.length; i++) {
    const team = MISSING_TEAMS[i]
    const apiId = apiIdMap[team.code]
    if (!apiId) { console.log(`  ⚠️  ${team.search}: sin API ID`); continue }
    if (i > 0) await sleep(6500)
    const r = await apiGet(`/players/squads?team=${apiId}`)
    if (r.err) { console.log(`  ✗ ${team.search}: ${r.err}`); continue }
    if (r.data.errors && Object.keys(r.data.errors).length) {
      console.log(`  ⚠️  ${team.search}: ${JSON.stringify(r.data.errors)}`); continue
    }
    const players = r.data.response?.[0]?.players || []
    squadByTeam[team.dbId] = players.map(p => ({ apiName: p.name, photo: p.photo }))
    console.log(`  ✓ [${i+1}/8] ${team.search} → ${players.length} jugadores`)
  }

  // Step 3: Match & update
  console.log('\n🔗 Emparejando y actualizando fotos...')
  const { data: jugadores, error } = await supabase
    .from('jugadores')
    .select('id, nombre, apellidos, equipo_id')
    .is('foto_url', null)
    .in('equipo_id', MISSING_TEAMS.map(t => t.dbId))
  if (error) throw error
  console.log(`  → ${jugadores.length} jugadores sin foto\n`)

  let matched = 0, unmatched = 0
  for (const jug of jugadores) {
    const squad = squadByTeam[jug.equipo_id]
    if (!squad?.length) { unmatched++; continue }

    const apNorm = normalize(jug.apellidos)
    const nomNorm = normalize(jug.nombre)
    let best = null, bestScore = 0

    for (const ap of squad) {
      const last = extractLastName(ap.apiName)
      let score = 0
      if (last === apNorm) score = 3
      else if (last.includes(apNorm) || apNorm.includes(last)) score = 2
      else {
        const shared = apNorm.split(' ').filter(w => w.length > 2 && last.split(' ').includes(w))
        if (shared.length) score = 1
      }
      if (score > 0 && normalize(ap.apiName).charAt(0) === nomNorm.charAt(0)) score += 0.5
      if (score > bestScore) { bestScore = score; best = ap }
    }

    if (best && bestScore >= 1) {
      await supabase.from('jugadores').update({ foto_url: best.photo }).eq('id', jug.id)
      console.log(`  ✓ ${jug.nombre} ${jug.apellidos} → "${best.apiName}" (${bestScore})`)
      matched++
    } else {
      console.log(`  · ${jug.nombre} ${jug.apellidos} — sin match`)
      unmatched++
    }
  }

  console.log('\n──────────── RESUMEN ────────────')
  console.log(`  Fotos añadidas  : ${matched}`)
  console.log(`  Sin match       : ${unmatched}`)
  console.log('─────────────────────────────────')
}

main().catch(e => { console.error(e); process.exit(1) })

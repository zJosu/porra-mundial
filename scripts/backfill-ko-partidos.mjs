// One-time backfill: create the knockout `partidos` rows that are already unlocked
// by the official bracket winners. Mirrors syncKnockoutPartidos() in app/actions/admin.ts.
//
//   node scripts/backfill-ko-partidos.mjs
//
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const KO_ROUND_SLOTS = { R16: 8, QF: 4, SF: 2, P3: 1, F: 1 }
const KO_SYNC_ORDER = ['R16', 'QF', 'SF', 'P3', 'F']
const KO_SCHEDULE = {
  'R16:1': '2026-07-04T21:00:00+00:00',
  'R16:2': '2026-07-04T17:00:00+00:00',
  'R16:3': '2026-07-06T19:00:00+00:00',
  'R16:4': '2026-07-07T00:00:00+00:00',
  'R16:5': '2026-07-05T20:00:00+00:00',
  'R16:6': '2026-07-06T00:00:00+00:00',
  'R16:7': '2026-07-07T16:00:00+00:00',
  'R16:8': '2026-07-07T20:00:00+00:00',
  'QF:1': '2026-07-09T20:00:00+00:00',
  'QF:2': '2026-07-10T19:00:00+00:00',
  'QF:3': '2026-07-11T21:00:00+00:00',
  'QF:4': '2026-07-12T01:00:00+00:00',
  'SF:1': '2026-07-14T19:00:00+00:00',
  'SF:2': '2026-07-15T19:00:00+00:00',
  'P3:1': '2026-07-18T21:00:00+00:00',
  'F:1': '2026-07-19T19:00:00+00:00',
}

function sfLoser(sfSlot, winners) {
  const a = winners.get(`QF:${sfSlot * 2 - 1}`) ?? null
  const b = winners.get(`QF:${sfSlot * 2}`) ?? null
  const win = winners.get(`SF:${sfSlot}`) ?? null
  if (a == null || b == null || win == null) return null
  return win === a ? b : a
}
function koFeeders(ronda, slot, winners) {
  const w = (r, s) => winners.get(`${r}:${s}`) ?? null
  switch (ronda) {
    case 'R16': return [w('R32', slot * 2 - 1), w('R32', slot * 2)]
    case 'QF': return [w('R16', slot * 2 - 1), w('R16', slot * 2)]
    case 'SF': return [w('QF', slot * 2 - 1), w('QF', slot * 2)]
    case 'F': return [w('SF', 1), w('SF', 2)]
    case 'P3': return [sfLoser(1, winners), sfLoser(2, winners)]
    default: return [null, null]
  }
}

const { data: brRows } = await sb.from('resultados_bracket').select('ronda, slot, ganador_equipo_id')
const winners = new Map()
for (const r of brRows ?? []) winners.set(`${r.ronda}:${r.slot}`, r.ganador_equipo_id)

const { data: koRows } = await sb
  .from('partidos')
  .select('id, fase, jornada, equipo_local_id, equipo_visitante_id')
  .is('grupo', null)
const existing = new Map()
for (const r of koRows ?? []) existing.set(`${r.fase}:${r.jornada}`, r)

const { data: eq } = await sb.from('equipos').select('id, nombre')
const name = new Map((eq ?? []).map((e) => [e.id, e.nombre]))

for (const ronda of KO_SYNC_ORDER) {
  for (let slot = 1; slot <= KO_ROUND_SLOTS[ronda]; slot++) {
    const key = `${ronda}:${slot}`
    const [teamA, teamB] = koFeeders(ronda, slot, winners)
    const fecha = KO_SCHEDULE[key]
    if (teamA == null || teamB == null || !fecha) continue
    const cur = existing.get(key)
    if (!cur) {
      const { error } = await sb.from('partidos').insert({
        equipo_local_id: teamA,
        equipo_visitante_id: teamB,
        fecha,
        fase: ronda,
        jornada: slot,
        grupo: null,
        sede: null,
        estado: 'pendiente',
        goles_local_oficial: null,
        goles_visitante_oficial: null,
      })
      if (error) console.error('INSERT FAIL', key, error.message)
      else console.log('INSERT', key, name.get(teamA), 'vs', name.get(teamB), '@', fecha)
    } else if (cur.equipo_local_id !== teamA || cur.equipo_visitante_id !== teamB) {
      const { error } = await sb.from('partidos').update({
        equipo_local_id: teamA, equipo_visitante_id: teamB, fecha,
      }).eq('id', cur.id)
      if (error) console.error('UPDATE FAIL', key, error.message)
      else console.log('UPDATE', key, name.get(teamA), 'vs', name.get(teamB))
    } else {
      console.log('OK   ', key, name.get(teamA), 'vs', name.get(teamB))
    }
  }
}
console.log('Done.')

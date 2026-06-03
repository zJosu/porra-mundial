// Pure helpers to derive standings from 1X2 picks. Used both client and server.

export type Resultado = 'L' | 'X' | 'V'

export type EquipoInfo = {
  id: number
  nombre: string
  codigo_bandera: string
  grupo: string
}

export type PartidoInfo = {
  id: number
  grupo: string
  equipo_local_id: number
  equipo_visitante_id: number
}

export type FilaClasif = {
  equipo_id: number
  pj: number
  g: number
  e: number
  p: number
  puntos: number
}

// Compute raw standings from picks (no tiebreak; ties stay grouped by points).
// Result is per-group, sorted by points desc, then alphabetic by equipo_id (stable).
export function computeGroupStandings(
  equipos: EquipoInfo[],
  partidos: PartidoInfo[],
  picks: Map<number, Resultado>,
): Map<string, FilaClasif[]> {
  const byGrupo = new Map<string, FilaClasif[]>()
  const idx = new Map<number, FilaClasif>()

  for (const e of equipos) {
    const row: FilaClasif = { equipo_id: e.id, pj: 0, g: 0, e: 0, p: 0, puntos: 0 }
    idx.set(e.id, row)
    if (!byGrupo.has(e.grupo)) byGrupo.set(e.grupo, [])
    byGrupo.get(e.grupo)!.push(row)
  }

  for (const m of partidos) {
    const r = picks.get(m.id)
    if (!r) continue
    const home = idx.get(m.equipo_local_id)
    const away = idx.get(m.equipo_visitante_id)
    if (!home || !away) continue
    home.pj++
    away.pj++
    if (r === 'L') {
      home.g++
      home.puntos += 3
      away.p++
    } else if (r === 'V') {
      away.g++
      away.puntos += 3
      home.p++
    } else {
      home.e++
      home.puntos += 1
      away.e++
      away.puntos += 1
    }
  }

  for (const [, rows] of byGrupo) {
    rows.sort((a, b) => b.puntos - a.puntos || a.equipo_id - b.equipo_id)
  }
  return byGrupo
}

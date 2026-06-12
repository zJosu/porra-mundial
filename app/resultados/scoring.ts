// Scoring helpers — keep in sync with POINTS_TABLE.md.

import type { Resultado } from '@/app/predicciones/standings'

export type UserMatchPred = {
  resultado: Resultado
  goles_local: number | null
  goles_visitante: number | null
}

export type MatchOfficial = {
  goles_local: number | null
  goles_visitante: number | null
}

export function signoFromGoles(gl: number, gv: number): Resultado {
  if (gl > gv) return 'L'
  if (gl < gv) return 'V'
  return 'X'
}

/** Phase 1: +3 exact / +1 1X2 only / 0 miss / null if no data. */
export function matchPoints(
  off: MatchOfficial | undefined,
  pred: UserMatchPred | undefined,
): 3 | 1 | 0 | null {
  if (!off || off.goles_local == null || off.goles_visitante == null) return null
  if (!pred) return null
  if (
    pred.goles_local != null &&
    pred.goles_visitante != null &&
    pred.goles_local === off.goles_local &&
    pred.goles_visitante === off.goles_visitante
  ) {
    return 3
  }
  return pred.resultado === signoFromGoles(off.goles_local, off.goles_visitante) ? 1 : 0
}

// ─── Phase 2: Group classification ────────────────────────────────────────────

export type ClasifGroupResult = {
  grupo: string
  pts: 0 | 1 | 2 | 5
  tipo: 'exacto' | 'top2' | 'bottom2' | 'miss' | 'sin_pick' | 'pendiente'
}

/**
 * Phase 2 scoring per group.
 * actualOrder: Map<grupo, [pos1_equipo_id, pos2, pos3, pos4]>
 * userPicks: rows from clasificaciones_grupos
 * closedGroups: opcional. Si se pasa, los grupos NO incluidos en el set se reportan
 *               como `pendiente` (0 pts) — usado para no dar puntos hasta que se hayan
 *               jugado los 6 partidos del grupo.
 * Rules (higher tier wins, no stacking):
 *   +5 if all 4 positions exact
 *   +2 if top-2 as set correct (order irrelevant)
 *   +1 if bottom-2 as set correct
 */
export function classificationGroupPoints(
  userPicks: { grupo: string; equipo_id: number; posicion: number }[],
  actualOrder: Map<string, number[]>,
  closedGroups?: Set<string>,
): ClasifGroupResult[] {
  const picksByGrupo = new Map<string, Map<number, number>>()
  for (const p of userPicks) {
    if (!picksByGrupo.has(p.grupo)) picksByGrupo.set(p.grupo, new Map())
    picksByGrupo.get(p.grupo)!.set(p.posicion, p.equipo_id)
  }

  const results: ClasifGroupResult[] = []
  for (const [grupo, actual] of actualOrder) {
    if (closedGroups && !closedGroups.has(grupo)) {
      results.push({ grupo, pts: 0, tipo: 'pendiente' })
      continue
    }
    const picks = picksByGrupo.get(grupo)
    if (!picks || picks.size < 4) {
      results.push({ grupo, pts: 0, tipo: 'sin_pick' })
      continue
    }
    const user = [1, 2, 3, 4].map((pos) => picks.get(pos) ?? 0)

    if (user.every((id, i) => id === actual[i])) {
      results.push({ grupo, pts: 5, tipo: 'exacto' })
      continue
    }

    const aTop2 = new Set([actual[0], actual[1]])
    if (user[0] !== 0 && user[1] !== 0 && aTop2.has(user[0]) && aTop2.has(user[1])) {
      results.push({ grupo, pts: 2, tipo: 'top2' })
      continue
    }

    const aBot2 = new Set([actual[2], actual[3]])
    if (user[2] !== 0 && user[3] !== 0 && aBot2.has(user[2]) && aBot2.has(user[3])) {
      results.push({ grupo, pts: 1, tipo: 'bottom2' })
      continue
    }

    results.push({ grupo, pts: 0, tipo: 'miss' })
  }
  return results.sort((a, b) => a.grupo.localeCompare(b.grupo))
}

// ─── Phase 3: Individual Awards ───────────────────────────────────────────────

export type AwardPoints = {
  pichichi: 0 | 8
  mvp: 0 | 8
  guante: 0 | 5
  joven: 0 | 5
  bestXI: number      // 0..33 (11 × +3) + 20 si los 11 acertados → max 53
  bestXIAciertos: number
  bestXIFull: boolean
  total: number
}

export function awardsPoints(
  official: {
    pichichi_jugador_id: number | null
    mvp_jugador_id: number | null
    guante_oro_jugador_id: number | null
    joven_jugador_id: number | null
    best_xi?: Record<string, number> | null
  } | null,
  user: {
    pichichi_jugador_id: number | null
    mvp_jugador_id: number | null
    guante_oro_jugador_id: number | null
    joven_jugador_id: number | null
    best_xi?: Record<string, number> | null
  } | null,
): AwardPoints {
  const pichichi: 0 | 8 =
    official?.pichichi_jugador_id != null &&
    user?.pichichi_jugador_id === official.pichichi_jugador_id
      ? 8 : 0
  const mvp: 0 | 8 =
    official?.mvp_jugador_id != null &&
    user?.mvp_jugador_id === official.mvp_jugador_id
      ? 8 : 0
  const guante: 0 | 5 =
    official?.guante_oro_jugador_id != null &&
    user?.guante_oro_jugador_id === official.guante_oro_jugador_id
      ? 5 : 0
  const joven: 0 | 5 =
    official?.joven_jugador_id != null &&
    user?.joven_jugador_id === official.joven_jugador_id
      ? 5 : 0

  // Best XI: +3 por cada jugador en el XI oficial que el usuario también haya colocado
  // (en cualquier posición); +20 extra si los 11 oficiales están todos en el XI del usuario.
  let bestXIAciertos = 0
  let bestXIFull = false
  let bestXI = 0
  const offXI = official?.best_xi ?? null
  const userXI = user?.best_xi ?? null
  if (offXI && userXI) {
    const offIds = new Set(
      Object.values(offXI).filter((v): v is number => typeof v === 'number' && v > 0),
    )
    const userIds = new Set(
      Object.values(userXI).filter((v): v is number => typeof v === 'number' && v > 0),
    )
    if (offIds.size === 11) {
      for (const id of offIds) if (userIds.has(id)) bestXIAciertos++
      bestXI = bestXIAciertos * 3
      if (bestXIAciertos === 11) {
        bestXIFull = true
        bestXI += 20
      }
    }
  }

  return {
    pichichi,
    mvp,
    guante,
    joven,
    bestXI,
    bestXIAciertos,
    bestXIFull,
    total: pichichi + mvp + guante + joven + bestXI,
  }
}

// ─── Aggregated phase totals ───────────────────────────────────────────────────

export type PhasePoints = {
  grupos: number    // Phase 1
  clasif: number    // Phase 2
  awards: number    // Phase 3
  knockout: number  // Phase 4 (not yet active)
}

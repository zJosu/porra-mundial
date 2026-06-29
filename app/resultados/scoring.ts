// Scoring helpers — keep in sync with POINTS_TABLE.md.

import type { Resultado } from '@/app/predicciones/standings'
import { HARDCODED_R32 } from '@/app/predicciones/bracket'

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
  knockout: number  // Phase 4
}

// ─── Phase 4: Knockout bracket ────────────────────────────────────────────────

/** "ronda:slot" map key. */
function bKey(ronda: string, slot: number): string {
  return `${ronda}:${slot}`
}

/**
 * Resolve the two teams that participate in a given bracket match.
 * R32: fixed from HARDCODED_R32.
 * Later rounds: derived from the winners of the two preceding slots.
 */
function getMatchParticipants(
  ronda: string,
  slot: number,
  bracket: Map<string, number>,
): [number | null, number | null] {
  if (ronda === 'R32') {
    const m = HARDCODED_R32[slot - 1]
    return m ? [m.teamA, m.teamB] : [null, null]
  }
  if (ronda === 'R16') {
    return [
      bracket.get(bKey('R32', (slot - 1) * 2 + 1)) ?? null,
      bracket.get(bKey('R32', (slot - 1) * 2 + 2)) ?? null,
    ]
  }
  if (ronda === 'QF') {
    return [
      bracket.get(bKey('R16', (slot - 1) * 2 + 1)) ?? null,
      bracket.get(bKey('R16', (slot - 1) * 2 + 2)) ?? null,
    ]
  }
  if (ronda === 'SF') {
    return [
      bracket.get(bKey('QF', (slot - 1) * 2 + 1)) ?? null,
      bracket.get(bKey('QF', (slot - 1) * 2 + 2)) ?? null,
    ]
  }
  if (ronda === 'F') {
    return [bracket.get(bKey('SF', 1)) ?? null, bracket.get(bKey('SF', 2)) ?? null]
  }
  return [null, null]
}

function sameParticipants(
  u: [number | null, number | null],
  r: [number | null, number | null],
): boolean {
  if (u[0] == null || u[1] == null || r[0] == null || r[1] == null) return false
  return (u[0] === r[0] && u[1] === r[1]) || (u[0] === r[1] && u[1] === r[0])
}

export type BracketMatchScore = {
  ronda: string
  slot: number
  /** R32–SF: 1 if correct winner, else 0. F: 8 if champion correct, else 0. */
  base: number
  /** Extra pts for predicting both participants correctly: R16+1 / QF+2 / SF+4 / F+8. */
  exact: number
}

export type KnockoutScoreResult = {
  /** Correct-winner points for R32+R16+QF+SF (max 30). */
  base: number
  /** Exact-match bonuses R16+QF+SF+F (max 32). */
  exact: number
  /** 8 if predicted champion matches reality, else 0. */
  champion: number
  /** base + exact + champion (max 70). */
  total: number
  matches: BracketMatchScore[]
}

// Extra pts per round when winner is correct AND both participants match.
const EXACT_BONUS: Record<string, number | undefined> = { R16: 1, QF: 2, SF: 4 }

/**
 * Phase 4 – Knockout bracket scoring.
 *
 * @param userBracket  "ronda:slot" → predicted winner equipo_id (from predicciones_bracket)
 * @param realBracket  "ronda:slot" → official winner equipo_id (from resultados_bracket)
 *
 * Scoring rules (max 70 pts):
 *  - Base +1: correct advancing team for each of the 30 matches in R32–SF.
 *  - Exact bonus (only if base point earned AND both participants match reality):
 *      R16 +1 | QF +2 | SF +4
 *  - Champion: +8 if predicted winner of the Final is correct.
 *  - Final exact: +8 more if both finalists were also correctly predicted.
 */
export function bracketPoints(
  userBracket: Map<string, number>,
  realBracket: Map<string, number>,
): KnockoutScoreResult {
  const matches: BracketMatchScore[] = []
  let base = 0
  let exact = 0
  let champion = 0

  // ── R32, R16, QF, SF: base (+1) + optional exact bonus ───────────────────
  const baseRounds: { ronda: string; slots: number }[] = [
    { ronda: 'R32', slots: 16 },
    { ronda: 'R16', slots: 8 },
    { ronda: 'QF',  slots: 4 },
    { ronda: 'SF',  slots: 2 },
  ]

  for (const { ronda, slots } of baseRounds) {
    for (let slot = 1; slot <= slots; slot++) {
      const realWinner = realBracket.get(bKey(ronda, slot)) ?? null
      const userWinner = userBracket.get(bKey(ronda, slot)) ?? null
      const basePoint =
        realWinner != null && userWinner != null && userWinner === realWinner ? 1 : 0
      let exactBonus = 0
      if (basePoint === 1) {
        const bonus = EXACT_BONUS[ronda]
        if (bonus != null) {
          if (
            sameParticipants(
              getMatchParticipants(ronda, slot, userBracket),
              getMatchParticipants(ronda, slot, realBracket),
            )
          ) exactBonus = bonus
        }
      }
      base += basePoint
      exact += exactBonus
      matches.push({ ronda, slot, base: basePoint, exact: exactBonus })
    }
  }

  // ── Final: champion +8, exact finalists bonus +8 ─────────────────────────
  const realChamp = realBracket.get(bKey('F', 1)) ?? null
  const userChamp = userBracket.get(bKey('F', 1)) ?? null
  let fBase = 0
  let fExact = 0
  if (realChamp != null && userChamp != null && userChamp === realChamp) {
    fBase = 8
    champion = 8
    if (
      sameParticipants(
        getMatchParticipants('F', 1, userBracket),
        getMatchParticipants('F', 1, realBracket),
      )
    ) {
      fExact = 8
      exact += 8
    }
  }
  matches.push({ ronda: 'F', slot: 1, base: fBase, exact: fExact })

  return { base, exact, champion, total: base + exact + champion, matches }
}

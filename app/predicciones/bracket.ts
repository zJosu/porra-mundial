// Bracket helpers: derive R32 seeding from user's group standings + thirds order.
// We use a deterministic single-elimination layout (32 -> 16 -> 8 -> 4 -> 2 -> 1).
// Seeds 1..12  = group winners (in group letter order A..L).
// Seeds 13..24 = group runners-up (in group letter order A..L).
// Seeds 25..32 = top 8 thirds (in user's thirds ranking).
//
// R32 pairings use a balanced bracket so seeds 1 and 2 only meet in the final.

export type Round = 'R32' | 'R16' | 'QF' | 'SF' | 'P3' | 'F'
export const ROUND_ORDER: Round[] = ['R32', 'R16', 'QF', 'SF', 'P3', 'F']
export const ROUND_LABEL: Record<Round, string> = {
  R32: 'Treintaidosavos',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semifinales',
  P3: '3.er puesto',
  F: 'Final',
}
export const ROUND_SHORT: Record<Round, string> = {
  R32: '1/16',
  R16: 'Octavos',
  QF: 'Cuartos',
  SF: 'Semis',
  P3: '3º/4º',
  F: 'Final',
}
export const ROUND_SIZE: Record<Round, number> = {
  R32: 16,
  R16: 8,
  QF: 4,
  SF: 2,
  P3: 1,
  F: 1,
}

export type SeedSource =
  | { kind: 'W'; grupo: string }   // group winner
  | { kind: 'R'; grupo: string }   // runner-up
  | { kind: 'T'; rankIdx: number } // best third (1..8)

// Balanced 32-seed bracket: pairs (1,32),(16,17),(8,25),(9,24),(4,29),(13,20),(5,28),(12,21),
// then mirrored half: (2,31),(15,18),(7,26),(10,23),(3,30),(14,19),(6,27),(11,22)
export const R32_SEED_PAIRS: [number, number][] = [
  [1, 32], [16, 17], [8, 25], [9, 24], [4, 29], [13, 20], [5, 28], [12, 21],
  [2, 31], [15, 18], [7, 26], [10, 23], [3, 30], [14, 19], [6, 27], [11, 22],
]

export const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const

// Build the ordered list of 32 SeedSources (index 0 = seed 1, ... index 31 = seed 32).
export function buildSeeding(): SeedSource[] {
  const seeds: SeedSource[] = []
  for (const g of GRUPOS) seeds.push({ kind: 'W', grupo: g })
  for (const g of GRUPOS) seeds.push({ kind: 'R', grupo: g })
  for (let i = 1; i <= 8; i++) seeds.push({ kind: 'T', rankIdx: i })
  return seeds
}

// Resolve a SeedSource to an equipo_id given user's snapshots.
export function resolveSeed(
  s: SeedSource,
  clasif: { grupo: string; equipo_id: number; posicion: number }[],
  terceros: { equipo_id: number; posicion: number }[],
): number | null {
  if (s.kind === 'W') {
    return clasif.find((c) => c.grupo === s.grupo && c.posicion === 1)?.equipo_id ?? null
  }
  if (s.kind === 'R') {
    return clasif.find((c) => c.grupo === s.grupo && c.posicion === 2)?.equipo_id ?? null
  }
  return terceros.find((t) => t.posicion === s.rankIdx)?.equipo_id ?? null
}

export function seedLabel(s: SeedSource): string {
  if (s.kind === 'W') return `1º ${s.grupo}`
  if (s.kind === 'R') return `2º ${s.grupo}`
  return `3º #${s.rankIdx}`
}

// Build the 16 R32 matches as ordered pairs of resolved equipo_id (or null).
export function buildR32Matches(
  clasif: { grupo: string; equipo_id: number; posicion: number }[],
  terceros: { equipo_id: number; posicion: number }[],
): { slot: number; sourceA: SeedSource; sourceB: SeedSource; teamA: number | null; teamB: number | null }[] {
  const seeds = buildSeeding()
  return R32_SEED_PAIRS.map(([a, b], idx) => {
    const sourceA = seeds[a - 1]
    const sourceB = seeds[b - 1]
    return {
      slot: idx + 1,
      sourceA,
      sourceB,
      teamA: resolveSeed(sourceA, clasif, terceros),
      teamB: resolveSeed(sourceB, clasif, terceros),
    }
  })
}

// Given winners from a round (length N), produce next-round pairings (length N/2).
// We pair adjacent slots (winner of slot 1 vs winner of slot 2), preserving bracket order.
export function nextRoundPairs<T>(winners: (T | null)[]): { teamA: T | null; teamB: T | null }[] {
  const out: { teamA: T | null; teamB: T | null }[] = []
  for (let i = 0; i < winners.length; i += 2) {
    out.push({ teamA: winners[i] ?? null, teamB: winners[i + 1] ?? null })
  }
  return out
}

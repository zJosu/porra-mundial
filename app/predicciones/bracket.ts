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

// Hardcoded 2026 World Cup R32 bracket (group stage complete).
// Left half: slots 1-8  ·  Right half: slots 9-16
export const HARDCODED_R32: { teamA: number; teamB: number }[] = [
  { teamA: 17, teamB: 14 }, // Slot  1: ALE vs PAR
  { teamA: 33, teamB: 23 }, // Slot  2: FRA vs SUE
  { teamA:  2, teamB:  5 }, // Slot  3: RSA vs CAN
  { teamA: 21, teamB: 10 }, // Slot  4: PBA vs MAR
  { teamA: 41, teamB: 46 }, // Slot  5: POR vs CRO
  { teamA: 29, teamB: 39 }, // Slot  6: ESP vs AUT
  { teamA: 13, teamB:  6 }, // Slot  7: EEUU vs BIH
  { teamA: 25, teamB: 34 }, // Slot  8: BEL vs SEN
  { teamA:  9, teamB: 22 }, // Slot  9: BRA vs JPN
  { teamA: 19, teamB: 36 }, // Slot 10: CMA vs NOR  (ci=19, verificar)
  { teamA:  1, teamB: 20 }, // Slot 11: MEX vs ECU
  { teamA: 45, teamB: 42 }, // Slot 12: ING vs RDC
  { teamA: 37, teamB: 30 }, // Slot 13: ARG vs CAV
  { teamA: 15, teamB: 26 }, // Slot 14: AUS vs EGI
  { teamA:  8, teamB: 38 }, // Slot 15: SUI vs AGL
  { teamA: 44, teamB: 47 }, // Slot 16: COL vs GHA
]

// Build the 16 R32 matches using the hardcoded real bracket.
// The clasif/terceros args are kept for backward compatibility but are ignored.
export function buildR32Matches(
  _clasif: { grupo: string; equipo_id: number; posicion: number }[],
  _terceros: { equipo_id: number; posicion: number }[],
): { slot: number; sourceA: SeedSource; sourceB: SeedSource; teamA: number | null; teamB: number | null }[] {
  const dummy: SeedSource = { kind: 'W', grupo: 'A' }
  return HARDCODED_R32.map(({ teamA, teamB }, idx) => ({
    slot: idx + 1,
    sourceA: dummy,
    sourceB: dummy,
    teamA,
    teamB,
  }))
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

// ─── Knockout auto-advance: schedule + feeder resolution ──────────────────────
//
// As teams advance, next-round matches are placed automatically on the home page.
// The match's two teams are derived from the official bracket winners; the kickoff
// time comes from this hardcoded schedule.
//
// Times were provided in Europe/Madrid (CEST = UTC+2 in July) and are stored here
// already converted to UTC.

// Number of matches (slots) per knockout round.
export const KO_ROUND_SLOTS: Record<Round, number> = {
  R32: 16, R16: 8, QF: 4, SF: 2, P3: 1, F: 1,
}

// Kickoff times keyed by "ronda:slot". A round is only placed on the home page
// once its date is known here. (R32 rows are seeded separately in the DB.)
export const KO_SCHEDULE: Record<string, { fecha: string }> = {
  // Octavos de final (R16)
  'R16:1': { fecha: '2026-07-04T21:00:00+00:00' }, // Paraguay vs Francia    — 23:00 Madrid, sáb 4 jul
  'R16:2': { fecha: '2026-07-04T17:00:00+00:00' }, // Canadá vs Marruecos    — 19:00 Madrid, sáb 4 jul
  'R16:3': { fecha: '2026-07-06T19:00:00+00:00' }, // Portugal vs España     — 21:00 Madrid, lun 6 jul
  'R16:4': { fecha: '2026-07-07T00:00:00+00:00' }, // EEUU vs Bélgica        — 02:00 Madrid, mar 7 jul
  'R16:5': { fecha: '2026-07-05T20:00:00+00:00' }, // Brasil vs Noruega      — 22:00 Madrid, dom 5 jul
  'R16:6': { fecha: '2026-07-06T00:00:00+00:00' }, // México vs Inglaterra   — 02:00 Madrid, lun 6 jul
  'R16:7': { fecha: '2026-07-07T16:00:00+00:00' }, // Argentina vs Egipto    — 18:00 Madrid, mar 7 jul
  'R16:8': { fecha: '2026-07-07T20:00:00+00:00' }, // Suiza vs Colombia      — 22:00 Madrid, mar 7 jul
  // Cuartos de final (QF)
  'QF:1':  { fecha: '2026-07-09T20:00:00+00:00' }, // 22:00 Madrid, jue 9 jul
  'QF:2':  { fecha: '2026-07-10T19:00:00+00:00' }, // 21:00 Madrid, vie 10 jul
  'QF:3':  { fecha: '2026-07-11T21:00:00+00:00' }, // 23:00 Madrid, sáb 11 jul
  'QF:4':  { fecha: '2026-07-12T01:00:00+00:00' }, // 03:00 Madrid, dom 12 jul
  // Semifinales (SF)
  'SF:1':  { fecha: '2026-07-14T19:00:00+00:00' }, // 21:00 Madrid, mar 14 jul
  'SF:2':  { fecha: '2026-07-15T19:00:00+00:00' }, // 21:00 Madrid, mié 15 jul
  // 3.er puesto (P3)
  'P3:1':  { fecha: '2026-07-18T21:00:00+00:00' }, // 23:00 Madrid, sáb 18 jul
  // Final (F)
  'F:1':   { fecha: '2026-07-19T19:00:00+00:00' }, // 21:00 Madrid, dom 19 jul
}

// Loser of a semifinal slot, derived from its two feeder (QF) winners minus the SF winner.
function sfLoser(sfSlot: number, winners: Map<string, number>): number | null {
  const a = winners.get(`QF:${sfSlot * 2 - 1}`) ?? null
  const b = winners.get(`QF:${sfSlot * 2}`) ?? null
  const win = winners.get(`SF:${sfSlot}`) ?? null
  if (a == null || b == null || win == null) return null
  return win === a ? b : a
}

// Resolve the two participants of a knockout match from the official bracket winners.
// Returns [null, null] (or a partial) when a feeder result is not yet decided.
// The order matches the exact-score prediction convention (teamA = lower feeder slot).
export function koFeeders(
  ronda: Round,
  slot: number,
  winners: Map<string, number>,
): [number | null, number | null] {
  const w = (r: Round, s: number) => winners.get(`${r}:${s}`) ?? null
  switch (ronda) {
    case 'R16': return [w('R32', slot * 2 - 1), w('R32', slot * 2)]
    case 'QF':  return [w('R16', slot * 2 - 1), w('R16', slot * 2)]
    case 'SF':  return [w('QF', slot * 2 - 1), w('QF', slot * 2)]
    case 'F':   return [w('SF', 1), w('SF', 2)]
    case 'P3':  return [sfLoser(1, winners), sfLoser(2, winners)]
    default:    return [null, null]
  }
}

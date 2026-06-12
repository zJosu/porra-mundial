// Orden de prioridad de jugadores para los selectores (premios + Best XI).
// Coincide entre el wizard del usuario y el editor del admin.

export const PRIORITY_BY_POS: Record<string, string[]> = {
  delantero: [
    'ronaldo', 'messi', 'neymar', 'mbappe', 'yamal', 'vinicius', 'raphinha',
    'haaland', 'salah', 'kane', 'lewandowski', 'osimhen', 'benzema',
    'dembele', 'saka', 'pulisic', 'martinelli', 'coman', 'gnabry',
    'werner', 'asensio', 'ferran torres', 'griezmann', 'lukaku',
    'firmino', 'son', 'havertz', 'richarlison', 'rodrygo', 'savinho',
  ],
  centrocampista: [
    'pedri', 'vitinha', 'bellingham', 'modric', 'de bruyne', 'foden',
    'gavi', 'kroos', 'camavinga', 'tchouameni', 'rodri', 'valverde',
    'bernardo silva', 'kimmich', 'goretzka', 'ruiz', 'kovacic',
    'thuram', 'rabiot', 'verratti', 'zielinski', 'calhanoglu',
    'szoboszlai', 'musiala', 'wirtz', 'guler', 'dani olmo', 'reijnders',
  ],
  defensa: [
    'cubarsi', 'dias', 'van dijk', 'militao', 'rudiger', 'alaba',
    'theo hernandez', 'cancelo', 'acuna', 'trent', 'stone',
    'konate', 'upamecano', 'gvardiol', 'dumfries', 'maguire',
    'laporte', 'eric garcia', 'danilo', 'tah', 'kounde', 'timber',
    'carvajal', 'hakimi', 'grimaldo', 'mendy', 'robertson',
  ],
  portero: [
    'joan garcia', 'neuer', 'maignan', 'alisson', 'ter stegen',
    'ederson', 'courtois', 'oblak', 'szczesny', 'onana',
    'raya', 'flekken', 'cech', 'navas', 'schmeichel',
  ],
}

export const normalizeText = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

type PlayerLike = { nombre: string; apellidos: string | null; posicion: string | null }

/** Devuelve un score; cuanto más bajo, más arriba aparece. */
export function playerPriority(j: PlayerLike, posFilter?: string | null): number {
  const full = normalizeText(`${j.nombre} ${j.apellidos ?? ''}`)
  const list = posFilter
    ? (PRIORITY_BY_POS[posFilter] ?? [])
    : [
        ...PRIORITY_BY_POS.delantero,
        ...PRIORITY_BY_POS.centrocampista,
        ...PRIORITY_BY_POS.defensa,
        ...PRIORITY_BY_POS.portero,
      ]
  const idx = list.findIndex((fragment) => full.includes(normalizeText(fragment)))
  return idx === -1 ? list.length + (full.charCodeAt(0) || 0) : idx
}

/** Ordena de forma estable: primero los prioritarios, luego alfabético por apellido. */
export function sortByPriority<T extends PlayerLike>(jugadores: T[], posFilter?: string | null): T[] {
  return [...jugadores].sort((a, b) => {
    const pa = playerPriority(a, posFilter)
    const pb = playerPriority(b, posFilter)
    if (pa !== pb) return pa - pb
    const aa = normalizeText(a.apellidos ?? a.nombre)
    const bb = normalizeText(b.apellidos ?? b.nombre)
    return aa.localeCompare(bb)
  })
}

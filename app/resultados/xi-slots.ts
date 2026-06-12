// Shared constants for Best XI slots — safe to import from both Server and Client components.

export const XI_SLOTS = ['GK', 'LD', 'DF1', 'DF2', 'LI', 'MC1', 'MC2', 'MC3', 'ED', 'DC', 'EI'] as const
export type XISlot = (typeof XI_SLOTS)[number]

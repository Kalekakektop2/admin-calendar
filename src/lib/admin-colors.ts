/**
 * Ярко различающиеся цвета для админов в календаре.
 * Не похожи друг на друга (красный / синий / зелёный / оранжевый / фиолетовый…).
 */
export const ADMIN_COLOR_PALETTE = [
  '#E11D48', // малиново-красный
  '#2563EB', // синий
  '#16A34A', // зелёный
  '#EA580C', // оранжевый
  '#7C3AED', // фиолетовый
  '#0891B2', // бирюзовый
  '#CA8A04', // золотистый
  '#DB2777', // розовый
  '#4338CA', // индиго
  '#0D9488', // teal
  '#B45309', // коричнево-янтарный
  '#4F46E5', // яркий indigo
  '#DC2626', // красный
  '#059669', // изумруд
  '#9333EA', // пурпур
  '#0284C7', // голубой
] as const

export type AdminColor = (typeof ADMIN_COLOR_PALETTE)[number]

/** Следующий свободный цвет из палитры (не занятый usedColors) */
export function nextFreeAdminColor(usedColors: string[]): string {
  const used = new Set(usedColors.map(c => c.toLowerCase()))
  const free = ADMIN_COLOR_PALETTE.find(c => !used.has(c.toLowerCase()))
  return free || ADMIN_COLOR_PALETTE[usedColors.length % ADMIN_COLOR_PALETTE.length]
}

/** Раздать уникальные цвета всем админам по порядку */
export function assignDistinctColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => ADMIN_COLOR_PALETTE[i % ADMIN_COLOR_PALETTE.length])
}

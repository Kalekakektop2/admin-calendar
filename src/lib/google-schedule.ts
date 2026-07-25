export type ShiftType = 'day' | 'night'

export interface GoogleScheduleRow {
  shift_date: string
  admin_name: string
  shift_type: ShiftType
}

/** Парсит CSV (с учётом кавычек) в строки */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  const pushCell = () => {
    row.push(cell.trim())
    cell = ''
  }
  const pushRow = () => {
    if (row.some(c => c !== '')) rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        cell += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      pushCell()
    } else if (ch === '\n') {
      pushCell()
      pushRow()
    } else if (ch === '\r') {
      // skip
    } else {
      cell += ch
    }
  }
  pushCell()
  pushRow()
  return rows
}

/**
 * Формат графика клуба (лист Google Sheets):
 *   A          | B              | C        | D… (игнор)
 *   01.07.2026 | 09:00 - 21:00  | Диана    | выручка…
 *              | 21:00 - 09:00  | Влад     |
 *   02.07.2026 | 09:00 - 21:00  | Сергей   |
 *              | 21:00 - 09:00  | Макс П   |
 *
 * Берём только A, B, C (дата / интервал / имя).
 * Пустое имя, «П», «О» без имени — слот пропускаем.
 */
export function parseClubScheduleFromTable(table: string[][]): GoogleScheduleRow[] {
  const result: GoogleScheduleRow[] = []
  let currentDate: string | null = null

  for (const cols of table) {
    if (!cols || cols.length === 0) continue

    // Только A, B, C
    const colA = (cols[0] || '').replace(/\ufeff/g, '').trim()
    const colB = (cols[1] || '').trim()
    const colC = (cols[2] || '').trim()

    // Пропуск шапки / мусора
    if (/^дата/i.test(colA) || colA === '' && !colB) continue
    if (colA && !parseDateLoose(colA) && !colB.includes(':')) continue

    const dateFromA = parseDateLoose(colA)
    if (dateFromA) currentDate = dateFromA

    if (!currentDate) continue

    const shiftType = parseTimeRangeToType(colB)
    if (!shiftType) continue

    const name = cleanAdminName(colC)
    if (!name) continue

    result.push({
      shift_date: currentDate,
      admin_name: name,
      shift_type: shiftType,
    })
  }

  return result
}

/** dd.mm.yyyy, yyyy-mm-dd, иногда с хвостом «- 21:00» */
function parseDateLoose(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // 01.07.2026 или 01.07.2026- 21:00
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/)
  if (dmy) {
    const d = dmy[1].padStart(2, '0')
    const mo = dmy[2].padStart(2, '0')
    return `${dmy[3]}-${mo}-${d}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  const ymd = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/)
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`
  }

  return null
}

/** «09:00 - 21:00» → day, «21:00 - 09:00» → night */
function parseTimeRangeToType(raw: string): ShiftType | null {
  const s = raw.toLowerCase().replace(/\s+/g, ' ').trim()
  if (!s) return null

  // убрать возможные буквы П/О в конце интервала
  const cleaned = s.replace(/[по]\s*$/i, '').trim()

  if (
    cleaned.includes('09:00') && cleaned.includes('21:00') &&
    cleaned.indexOf('09') < cleaned.indexOf('21')
  ) {
    return 'day'
  }
  if (
    cleaned.includes('21:00') && cleaned.includes('09:00') &&
    cleaned.indexOf('21') < cleaned.indexOf('09')
  ) {
    return 'night'
  }
  // без минут
  if (/09\s*[-–—]\s*21/.test(cleaned) || /9\s*[-–—]\s*21/.test(cleaned)) return 'day'
  if (/21\s*[-–—]\s*09/.test(cleaned) || /21\s*[-–—]\s*9/.test(cleaned)) return 'night'

  if (['day', 'день', 'дневная', 'дн'].includes(cleaned)) return 'day'
  if (['night', 'ночь', 'ночная', 'ноч'].includes(cleaned)) return 'night'

  return null
}

/**
 * Имя из колонки C как есть: «Диана», «Влад», «Макс», «Макс П», «Макс О» —
 * это разные люди, суффиксы НЕ отрезаем.
 */
function cleanAdminName(raw: string): string | null {
  const s = raw.replace(/\s+/g, ' ').trim()
  if (!s) return null

  // Только код без имени
  if (/^[по]$/i.test(s)) return null
  if (/^(вых|выход|отгул|-|—|–)$/i.test(s)) return null

  // «09:00 - 21:00» попало в C — не имя
  if (/\d{1,2}:\d{2}/.test(s)) return null

  return s
}

/** Нормализация для сравнения (регистр/пробелы). Без урезания «П»/«О». */
export function normalizeAdminName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, ' ').trim()
}

/**
 * Главный парсер: формат клуба (A/B/C) + fallback на старый «дата,имя,тип».
 */
export function parseGoogleScheduleCsv(csvText: string): GoogleScheduleRow[] {
  const table = parseCsv(csvText)
  if (table.length === 0) return []

  // Сначала формат клуба (дата | 09:00-21:00 | Имя)
  const club = parseClubScheduleFromTable(table)
  if (club.length > 0) return club

  // Fallback: классические 3 колонки date,name,type
  return parseSimpleThreeColumn(table)
}

function parseSimpleThreeColumn(table: string[][]): GoogleScheduleRow[] {
  const result: GoogleScheduleRow[] = []
  const start = looksLikeHeader(table[0]) ? 1 : 0

  for (let r = start; r < table.length; r++) {
    const line = table[r]
    if (!line?.length) continue
    const date = parseDateLoose(line[0] || '')
    const name = cleanAdminName(line[1] || '')
    const type =
      parseTimeRangeToType(line[2] || '') ||
      parseTimeRangeToType(line[1] || '') ||
      null

    // date, type, name
    const name2 = cleanAdminName(line[2] || '')
    const typeFromB = parseTimeRangeToType(line[1] || '')

    if (date && typeFromB && name2) {
      result.push({ shift_date: date, admin_name: name2, shift_type: typeFromB })
      continue
    }
    if (date && name && type) {
      result.push({ shift_date: date, admin_name: name, shift_type: type })
    }
  }
  return result
}

function looksLikeHeader(row: string[] | undefined): boolean {
  if (!row) return false
  const j = row.join(' ').toLowerCase()
  return j.includes('дата') || j.includes('date') || j.includes('админ')
}

export function buildGoogleSheetCsvUrl(sheetId: string, gid = '0'): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

/** Таблица клуба по умолчанию (можно переопределить env) */
const DEFAULT_SHEET_ID = '1pHFJ02udAaFvCHw8yb42o4T7F0jqPpBVSMSPW_4F_z4'
const DEFAULT_SHEET_GID = '1289606171'

export function resolveGoogleScheduleCsvUrl(): string | null {
  const direct = process.env.GOOGLE_SCHEDULE_CSV_URL?.trim()
  if (direct) return direct

  // Env или встроенный ID вашей таблицы (чтобы работало без настройки Vercel)
  const sheetId =
    process.env.GOOGLE_SCHEDULE_SHEET_ID?.trim() || DEFAULT_SHEET_ID
  const gid =
    process.env.GOOGLE_SCHEDULE_SHEET_GID?.trim() || DEFAULT_SHEET_GID

  if (!sheetId) return null
  return buildGoogleSheetCsvUrl(sheetId, gid)
}

export function slotKey(userId: string, date: string, type: ShiftType): string {
  return `${userId}|${date}|${type}`
}

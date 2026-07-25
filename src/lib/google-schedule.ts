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

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .replace(/\ufeff/g, '')
    .trim()
}

function parseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // dd.mm.yyyy or dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/)
  if (m) {
    const d = m[1].padStart(2, '0')
    const mo = m[2].padStart(2, '0')
    return `${m[3]}-${mo}-${d}`
  }

  // Excel serial date (number)
  const n = Number(s)
  if (Number.isFinite(n) && n > 30000 && n < 60000) {
    const utc = new Date(Date.UTC(1899, 11, 30) + n * 86400000)
    const y = utc.getUTCFullYear()
    const mo = String(utc.getUTCMonth() + 1).padStart(2, '0')
    const d = String(utc.getUTCDate()).padStart(2, '0')
    return `${y}-${mo}-${d}`
  }

  return null
}

function parseShiftType(raw: string): ShiftType | null {
  const s = raw.toLowerCase().trim()
  if (!s) return null
  if (['day', 'd', 'день', 'дн', 'дневная', 'дневн', 'д'].includes(s)) return 'day'
  if (['night', 'n', 'ночь', 'ноч', 'ночная', 'ночн'].includes(s)) return 'night'
  return null
}

/**
 * Ожидаемые колонки (заголовки, порядок любой):
 * date | дата
 * name | admin | админ | имя | фИО
 * type | shift | смена | тип
 */
export function parseGoogleScheduleCsv(csvText: string): GoogleScheduleRow[] {
  const table = parseCsv(csvText)
  if (table.length < 2) return []

  const header = table[0].map(normalizeHeader)
  const findCol = (...names: string[]) => {
    for (const n of names) {
      const i = header.findIndex(h => h === n || h.includes(n))
      if (i >= 0) return i
    }
    return -1
  }

  let dateIdx = findCol('date', 'дата', 'день')
  let nameIdx = findCol('name', 'admin', 'админ', 'имя', 'фио', 'сотрудник')
  let typeIdx = findCol('type', 'shift', 'смена', 'тип')

  // Если заголовков нет — берём первые 3 колонки
  if (dateIdx < 0 || nameIdx < 0 || typeIdx < 0) {
    dateIdx = 0
    nameIdx = 1
    typeIdx = 2
  }

  const result: GoogleScheduleRow[] = []
  for (let r = 1; r < table.length; r++) {
    const line = table[r]
    if (!line || line.length === 0) continue

    const date = parseDate(line[dateIdx] || '')
    const name = (line[nameIdx] || '').trim()
    const type = parseShiftType(line[typeIdx] || '')

    if (!date || !name || !type) continue

    result.push({
      shift_date: date,
      admin_name: name,
      shift_type: type,
    })
  }

  return result
}

export function buildGoogleSheetCsvUrl(sheetId: string, gid = '0'): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`
}

export function resolveGoogleScheduleCsvUrl(): string | null {
  const direct = process.env.GOOGLE_SCHEDULE_CSV_URL?.trim()
  if (direct) return direct

  const sheetId = process.env.GOOGLE_SCHEDULE_SHEET_ID?.trim()
  if (!sheetId) return null

  const gid = process.env.GOOGLE_SCHEDULE_SHEET_GID?.trim() || '0'
  return buildGoogleSheetCsvUrl(sheetId, gid)
}

export function slotKey(userId: string, date: string, type: ShiftType): string {
  return `${userId}|${date}|${type}`
}

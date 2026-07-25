import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  parseGoogleScheduleCsv,
  resolveGoogleScheduleCsvUrl,
  slotKey,
  normalizeAdminName,
  type ShiftType,
} from '@/lib/google-schedule'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'manager') {
      return NextResponse.json({ error: 'Только руководитель' }, { status: 403 })
    }

    const csvUrl = resolveGoogleScheduleCsvUrl()
    if (!csvUrl) {
      return NextResponse.json(
        {
          error:
            'Не задан Google Sheet. Укажите GOOGLE_SCHEDULE_CSV_URL или GOOGLE_SCHEDULE_SHEET_ID в env (Vercel / .env.local).',
        },
        { status: 400 }
      )
    }

    const res = await fetch(csvUrl, {
      cache: 'no-store',
      headers: { 'User-Agent': 'admin-calendar-sync/1.0' },
    })

    if (!res.ok) {
      return NextResponse.json(
        {
          error: `Не удалось скачать таблицу Google (HTTP ${res.status}). Проверьте доступ: «Все, у кого есть ссылка» → Читатель, и правильный SHEET_ID / gid.`,
        },
        { status: 502 }
      )
    }

    const csvText = await res.text()
    if (csvText.includes('<!DOCTYPE html') || csvText.includes('<html')) {
      return NextResponse.json(
        {
          error:
            'Google вернул HTML вместо CSV. Откройте доступ к таблице по ссылке (Viewer) или используйте File → Share → Anyone with the link.',
        },
        { status: 502 }
      )
    }

    const googleRows = parseGoogleScheduleCsv(csvText)
    if (googleRows.length === 0) {
      return NextResponse.json(
        {
          error:
            'В таблице нет распознанных строк. Нужны колонки: дата | имя админа | тип (день/ночь). Первая строка — заголовки.',
          hint: 'Пример: 2026-07-26,Сергей,день',
        },
        { status: 400 }
      )
    }

    const { data: admins, error: adminsError } = await supabase
      .from('users')
      .select('id, full_name, username')
      .eq('role', 'admin')

    if (adminsError) throw adminsError

    // Только ТОЧНОЕ совпадение full_name или username.
    // «Макс» и «Макс П» / «Макс О» — разные люди (не склеиваем).
    const adminByName = new Map<string, string>()
    for (const a of admins || []) {
      if (a.full_name) {
        adminByName.set(normalizeAdminName(a.full_name), a.id)
      }
      if (a.username) {
        const u = normalizeAdminName(a.username)
        // username не перезаписывает full_name другого человека
        if (!adminByName.has(u)) adminByName.set(u, a.id)
      }
    }

    const resolveAdminId = (sheetName: string): string | null => {
      return adminByName.get(normalizeAdminName(sheetName)) || null
    }

    const unmatchedNames = new Set<string>()
    const desired = new Map<string, { user_id: string; shift_date: string; shift_type: ShiftType }>()

    for (const row of googleRows) {
      const userId = resolveAdminId(row.admin_name)
      if (!userId) {
        unmatchedNames.add(row.admin_name)
        continue
      }
      desired.set(slotKey(userId, row.shift_date, row.shift_type), {
        user_id: userId,
        shift_date: row.shift_date,
        shift_type: row.shift_type,
      })
    }

    // Блоки: руководитель убрал слот вручную — Google не ставит снова
    const { data: blocks } = await supabase
      .from('planned_shift_blocks')
      .select('user_id, shift_date, shift_type')

    const blocked = new Set(
      (blocks || []).map(b => slotKey(b.user_id, b.shift_date, b.shift_type as ShiftType))
    )

    const { data: existing, error: existingError } = await supabase
      .from('planned_shifts')
      .select('id, user_id, shift_date, shift_type, source, manual_override')

    if (existingError) throw existingError

    const existingByKey = new Map(
      (existing || []).map(s => [
        slotKey(s.user_id, s.shift_date, s.shift_type as ShiftType),
        s,
      ])
    )

    let added = 0
    let removed = 0
    let skippedManual = 0
    let skippedBlocked = 0
    let keptGoogle = 0

    // Добавить / сохранить google-слоты
    for (const [key, slot] of desired) {
      if (blocked.has(key)) {
        skippedBlocked++
        continue
      }

      const cur = existingByKey.get(key)
      if (cur) {
        // Ручная правка руководителя — не трогаем
        if (cur.manual_override || cur.source === 'manual') {
          skippedManual++
          continue
        }
        keptGoogle++
        continue
      }

      const { error: insertError } = await supabase.from('planned_shifts').insert({
        user_id: slot.user_id,
        shift_date: slot.shift_date,
        shift_type: slot.shift_type,
        source: 'google',
        manual_override: false,
      } as any)

      if (insertError) {
        // 23505 — уже есть (гонка / unique)
        if (insertError.code !== '23505') {
          console.error('insert planned_shifts', insertError)
        }
      } else {
        added++
      }
    }

    // Удалить google-смены, которых больше нет в таблице (но не manual)
    for (const s of existing || []) {
      const key = slotKey(s.user_id, s.shift_date, s.shift_type as ShiftType)
      if (s.manual_override || s.source === 'manual') {
        continue
      }
      if (s.source === 'google' && !desired.has(key)) {
        const { error: delError } = await supabase.from('planned_shifts').delete().eq('id', s.id)
        if (!delError) removed++
      }
    }

    return NextResponse.json({
      ok: true,
      stats: {
        rowsInSheet: googleRows.length,
        matchedSlots: desired.size,
        added,
        removed,
        skippedManual,
        skippedBlocked,
        keptGoogle,
        unmatchedNames: Array.from(unmatchedNames),
      },
      message:
        unmatchedNames.size > 0
          ? `Синхронизация выполнена. Не найдены админы: ${Array.from(unmatchedNames).join(', ')} (имя в таблице должно совпадать с full_name или username).`
          : 'Синхронизация выполнена. Ручные правки руководителя не изменены.',
    })
  } catch (error) {
    console.error('sync-google-schedule', error)
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  const csvUrl = resolveGoogleScheduleCsvUrl()
  return NextResponse.json({
    configured: Boolean(csvUrl),
    hasSheetId: Boolean(process.env.GOOGLE_SCHEDULE_SHEET_ID),
    hasCsvUrl: Boolean(process.env.GOOGLE_SCHEDULE_CSV_URL),
  })
}

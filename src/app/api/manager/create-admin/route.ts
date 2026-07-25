import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Создание админа через service role — сессия руководителя НЕ меняется.
 * Нужен SUPABASE_SERVICE_ROLE_KEY в env (Vercel / .env.local).
 */
export async function POST(request: Request) {
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

    const body = await request.json()
    const username = String(body.username || '').trim()
    const full_name = String(body.full_name || '').trim()
    const password = String(body.password || '')
    const color = String(body.color || '#3b82f6').trim() || '#3b82f6'

    if (!username || !full_name || password.length < 6) {
      return NextResponse.json(
        { error: 'Укажите имя, логин и пароль (минимум 6 символов)' },
        { status: 400 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !serviceKey) {
      return NextResponse.json(
        {
          error:
            'Не задан SUPABASE_SERVICE_ROLE_KEY. Добавьте service_role ключ в Vercel / .env.local (Project Settings → API → service_role). Без него signUp выкидывает руководителя из аккаунта.',
          code: 'NO_SERVICE_ROLE',
        },
        { status: 500 }
      )
    }

    const adminClient = createServiceClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const email = `${username.toLowerCase().replace(/\s+/g, '')}@dummy.club`

    // Проверка уникальности username
    const { data: existing } = await adminClient
      .from('users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email},full_name.eq.${full_name}`)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: 'Пользователь с таким логином, email или именем уже существует' },
        { status: 409 }
      )
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        username,
      },
    })

    if (authError) {
      return NextResponse.json(
        { error: authError.message || 'Ошибка Auth' },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Auth не вернул пользователя' }, { status: 500 })
    }

    const { error: userError } = await adminClient.from('users').insert({
      id: authData.user.id,
      email,
      full_name,
      username,
      role: 'admin',
      color,
    } as any)

    if (userError) {
      // Откат auth-пользователя, если запись в users не создалась
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: userError.message || 'Ошибка записи в users' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: authData.user.id,
        username,
        full_name,
        email,
      },
      message: 'Администратор создан. Сессия руководителя сохранена.',
    })
  } catch (error) {
    console.error('create-admin', error)
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

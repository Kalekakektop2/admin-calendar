import { requireRole } from '@/lib/auth'
import { UserRole } from '@/types/database'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireRole('manager' as UserRole)
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Не авторизован</h2>
          <p className="text-gray-600 dark:text-gray-400">Пожалуйста, войдите в систему</p>
        </div>
      </div>
    )
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Пользователь не найден</h2>
          <p className="text-gray-600 dark:text-gray-400">Обратитесь к администратору</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-3 gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <Link href="/manager" className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 hover:opacity-80">
                Админский календарь
              </Link>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 rounded">
                Руководитель
              </span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 hidden sm:block">
                {userData.full_name}
              </span>
              <ThemeToggle />
              <Link
                href="/logout"
                className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Выйти
              </Link>
            </div>
          </div>

          {/* Разделённое меню */}
          <div className="flex flex-wrap items-center gap-2 pb-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <Link
              href="/manager"
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Все смены за месяц
            </Link>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/manager/shift-calendar"
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
            >
              Календарь смен
            </Link>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-600">|</span>
            <Link
              href="/manager/closed-shifts"
              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors"
            >
              Закрытые смены
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}

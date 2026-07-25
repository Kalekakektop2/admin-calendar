import { requireAnyRole } from '@/lib/auth'
import { UserRole } from '@/types/database'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAnyRole('admin' as UserRole, 'manager' as UserRole)
  
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
    .select('full_name, role')
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

  const role = userData.role as string

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                Админский календарь
              </h1>
              <span className={`ml-2 sm:ml-4 px-2 py-1 text-xs font-medium rounded ${
                role === 'manager'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
              }`}>
                {role === 'manager' ? 'Руководитель' : 'Администратор'}
              </span>
              <Link href="/admin" className="ml-4 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Главная</Link>
              <Link href="/admin/my-shifts" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">Мои смены</Link>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
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
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}

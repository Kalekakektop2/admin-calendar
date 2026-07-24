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
  
  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user?.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Админский календарь
              </h1>
              <span className={`ml-4 px-2 py-1 text-xs font-medium rounded ${
                userData.role === 'manager' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-100'
              }`}>
                {userData.role === 'manager' ? 'Руководитель' : 'Администратор'}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {userData?.full_name}
              </span>
              <ThemeToggle />
              <Link
                href="/logout"
                className="text-sm text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Выйти
              </Link>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}

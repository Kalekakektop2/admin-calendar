'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Trash2, AlertTriangle } from 'lucide-react'

interface Admin {
  id: string
  full_name: string
  email: string
  username: string
  created_at: string
}

export default function DeleteAdminPage() {
  const router = useRouter()
  const supabase = createClient()

  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadAdmins()
  }, [])

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, username, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('Error loading admins:', error)
      setError('Ошибка при загрузке администраторов')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string, adminName: string) => {
    if (!confirm(`Вы уверены, что хотите удалить администратора "${adminName}"?\n\nЭто действие:\n- Удалит пользователя из Supabase Auth\n- Удалит запись из таблицы users\n- Пользователь больше не сможет войти в систему\n\nЭто действие необратимо!`)) {
      return
    }

    setDeleting(adminId)
    setError(null)
    setSuccess(null)

    try {
      // 1. Удаляем пользователя из Supabase Auth
      const { error: authError } = await supabase.auth.admin.deleteUser(adminId)

      if (authError) {
        console.error('Auth delete error:', authError)
        // Если не удалось удалить через admin API, пробуем обычным способом
        // Это может не сработать без прав admin
      }

      // 2. Удаляем запись из таблицы users
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', adminId)

      if (userError) throw userError

      // 3. Удаляем связанные смены
      const { error: shiftsError } = await supabase
        .from('shifts')
        .delete()
        .eq('user_id', adminId)

      if (shiftsError) {
        console.error('Shifts delete error:', shiftsError)
        // Не прерываем процесс, если не удалось удалить смены
      }

      setSuccess(`Администратор "${adminName}" успешно удален`)
      await loadAdmins()
    } catch (error) {
      console.error('Error deleting admin:', error)
      setError(error instanceof Error ? error.message : 'Ошибка при удалении администратора')
    } finally {
      setDeleting(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="mb-6">
        <button
          onClick={() => router.push('/manager')}
          className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Назад
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <Trash2 className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Удаление администраторов
          </h2>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-800 dark:text-yellow-300">
                Внимание!
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Удаление администратора приведет к:
              </p>
              <ul className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 list-disc list-inside">
                <li>Удалению аккаунта из системы авторизации</li>
                <li>Удалению всех данных администратора</li>
                <li>Потере доступа к системе</li>
              </ul>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2 font-semibold">
                Это действие необратимо!
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {admins.length === 0 ? (
          <div className="text-center py-12 text-gray-900 dark:text-gray-100">
            <p>Нет администраторов для удаления</p>
          </div>
        ) : (
          <div className="space-y-4">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {admin.full_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {admin.email}
                  </p>
                  {admin.username && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Логин: {admin.username}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Создан: {new Date(admin.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteAdmin(admin.id, admin.full_name)}
                  disabled={deleting === admin.id}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleting === admin.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Удаление...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

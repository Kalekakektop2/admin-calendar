'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function CreateAdminPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Используем фиктивный email (Supabase Auth требует email)
      const email = `${formData.username}@dummy.club`
      
      console.log('Creating admin with:', { username: formData.username, full_name: formData.full_name })
      
      // Создаем пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            username: formData.username,
          }
        }
      })

      console.log('Auth response:', { authData, authError })

      if (authError) {
        console.error('Auth error:', authError)
        console.error('Auth error message:', authError.message)
        console.error('Auth error details:', JSON.stringify(authError))
        throw new Error(authError.message || 'Ошибка при создании пользователя в Supabase Auth')
      }
      
      if (!authData.user) {
        console.error('No user data returned')
        throw new Error('Не удалось создать пользователя в Supabase Auth - нет данных пользователя')
      }

      console.log('User created in auth, ID:', authData.user.id)

      // Создаем запись в таблице users
      const { error: userError } = await supabase.from('users').insert({
        id: authData.user.id,
        email: email,
        full_name: formData.full_name,
        username: formData.username,
        role: 'admin',
      })

      console.log('User insert response:', { userError })

      if (userError) {
        console.error('User insert error:', userError)
        console.error('User insert error message:', userError.message)
        console.error('User insert error details:', JSON.stringify(userError))
        throw new Error(userError.message || 'Ошибка при создании записи в таблице users')
      }

      alert(`Администратор успешно создан!\nЛогин: ${formData.username}\nПароль: ${formData.password}`)
      router.push('/manager')
    } catch (error) {
      console.error('Error creating admin:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error keys:', error ? Object.keys(error) : 'null')
      
      let errorMessage = 'Ошибка при создании администратора'
      
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      } else if (typeof error === 'object' && error !== null) {
        // Обработка Supabase ошибки
        const supabaseError = error as any
        console.error('Supabase error details:', supabaseError)
        
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.error_description) {
          errorMessage = supabaseError.error_description
        } else if (supabaseError.error) {
          errorMessage = supabaseError.error
        } else {
          try {
            errorMessage = JSON.stringify(error)
          } catch (e) {
            errorMessage = 'Неизвестная ошибка (невозможно сериализовать)'
          }
        }
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">Создать администратора</h2>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Имя
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Логин
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Пароль
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
            <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Минимум 6 символов</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => router.push('/manager')}
              className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

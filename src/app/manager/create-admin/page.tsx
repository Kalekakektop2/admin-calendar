'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ADMIN_COLOR_PALETTE } from '@/lib/admin-colors'

export default function CreateAdminPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    password: '',
    color: '#3b82f6',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Через API + service role — сессия руководителя НЕ переключается на нового админа
      const res = await fetch('/api/manager/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username.trim(),
          full_name: formData.full_name.trim(),
          password: formData.password,
          color: formData.color,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при создании администратора')
      }

      alert(
        `Администратор успешно создан!\n\nИмя: ${formData.full_name}\nЛогин: ${formData.username}\nПароль: ${formData.password}\n\nВы остались в аккаунте руководителя.`
      )
      router.push('/manager')
      router.refresh()
    } catch (err) {
      console.error('Error creating admin:', err)
      setError(err instanceof Error ? err.message : 'Ошибка при создании администратора')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-4">
      <Link
        href="/manager"
        className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Создать администратора
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Создание через безопасный API — вы не выйдете из аккаунта руководителя.
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-4 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Имя (как в Google-графике)
            </label>
            <input
              type="text"
              required
              placeholder="Например: Макс П"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
            <p className="text-xs text-gray-500 mt-1">
              Должно совпадать с именем в таблице Google (Макс и Макс П — разные люди).
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Логин
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
            />
            <p className="text-xs text-gray-700 dark:text-gray-400 mt-1">Минимум 6 символов</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
              Цвет в календаре
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {ADMIN_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-9 h-9 rounded-lg border-2 shadow hover:scale-110 transition-transform ${
                    formData.color.toLowerCase() === color.toLowerCase()
                      ? 'border-gray-900 dark:border-white ring-2 ring-indigo-400'
                      : 'border-white'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-8 h-8 rounded-lg border shadow"
                style={{ backgroundColor: formData.color }}
              />
              <span className="text-xs text-gray-500">Выбрано: {formData.color}</span>
            </div>
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

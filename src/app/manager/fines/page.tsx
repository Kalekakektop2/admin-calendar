'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { AlertTriangle, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface Fine {
  id: string
  user_id: string
  amount: number
  fine_date: string
  date: string
  comment: string | null
  created_at: string
  users: {
    full_name: string
  }
}

interface Admin {
  id: string
  full_name: string
}

export default function FinesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [fines, setFines] = useState<Fine[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  
  const [formData, setFormData] = useState({
    user_id: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    comment: '',
  })

  useEffect(() => {
    loadFines()
    loadAdmins()
  }, [])

  const loadFines = async () => {
    try {
      const { data, error } = await supabase
        .from('fines')
        .select('*, users(full_name)')
        .order('fine_date', { ascending: false })

      if (error) {
        console.error('Error loading fines:', error)
        // Если таблица не существует, просто пустой массив
        if (error.code === '42P01') {
          setFines([])
        } else {
          throw error
        }
      } else {
        setFines(data || [])
      }
    } catch (error) {
      console.error('Error loading fines:', error)
      setFines([])
    } finally {
      setLoading(false)
    }
  }

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('role', 'admin')

      if (error) throw error
      setAdmins(data || [])
    } catch (error) {
      console.error('Error loading admins:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const amount = parseFloat(formData.amount)
      if (isNaN(amount) || amount <= 0) {
        alert('Введите корректную сумму')
        return
      }

      if (!formData.user_id) {
        alert('Выберите администратора')
        return
      }

      console.log('Попытка добавить штраф:', {
        user_id: formData.user_id,
        amount: amount,
        fine_date: formData.date,
        comment: formData.comment
      })

      const { error } = await supabase
        .from('fines')
        .insert({
          user_id: formData.user_id,
          amount: amount,
          fine_date: formData.date,
          comment: formData.comment || null,
        })

      if (error) {
        console.error('Error adding fine:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        if (error.code === '42P01') {
          alert('Таблица штрафов не существует. Пожалуйста, примените миграцию 004_fines.sql в Supabase.')
        } else if (error.code === '42501') {
          alert('Ошибка прав доступа. Убедитесь, что миграция применена корректно.')
        } else {
          alert(`Ошибка при добавлении штрафа: ${error.message} (Код: ${error.code})`)
        }
        return
      }

      // Reset form
      setFormData({
        user_id: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        comment: '',
      })
      setShowForm(false)
      
      await loadFines()
      alert('Штраф успешно добавлен!')
    } catch (error) {
      console.error('Error adding fine:', error)
      alert('Ошибка при добавлении штрафа')
    }
  }

  const handleDelete = async (fineId: string) => {
    if (!confirm('Удалить штраф?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('fines')
        .delete()
        .eq('id', fineId)

      if (error) throw error
      
      await loadFines()
      alert('Штраф успешно удален!')
    } catch (error) {
      console.error('Error deleting fine:', error)
      alert('Ошибка при удалении штрафа')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/manager')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            Управление штрафами
          </h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {showForm ? 'Отмена' : 'Добавить штраф'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Добавить штраф</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Администратор
              </label>
              <select
                required
                value={formData.user_id}
                onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              >
                <option value="">Выберите администратора</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Сумма штрафа
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Дата штрафа
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Комментарий
              </label>
              <textarea
                value={formData.comment}
                onChange={(e) => setFormData({...formData, comment: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="w-full sm:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Добавить штраф
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Администратор
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Сумма
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Комментарий
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {fines.map((fine) => (
                <tr key={fine.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {fine.users.full_name}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                    {formatCurrency(fine.amount)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {new Date(fine.fine_date).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 text-sm text-gray-900 dark:text-gray-100">
                    {fine.comment || '-'}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <button
                      onClick={() => handleDelete(fine.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {fines.length === 0 && (
          <div className="text-center py-12 text-gray-900 dark:text-gray-100">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-600" />
            <p className="mt-2 text-gray-900 dark:text-gray-100">Штрафов нет</p>
          </div>
        )}
      </div>
    </div>
  )
}

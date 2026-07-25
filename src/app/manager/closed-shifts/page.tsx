'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sun, Moon, Image as ImageIcon, ArrowLeft } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'

interface ClosedShift {
  id: string
  user_id: string
  shift_date: string
  total_revenue: number
  cash_balance: number
  card_revenue: number
  bonus_amount: number
  shift_type: 'day' | 'night'
  notes: string | null
  encashment: number | null
  advance: number | null
  meal_allowance: number | null
  created_at: string
  users: {
    full_name: string
    color: string
  }
}

interface ShiftPhoto {
  id: string
  photo_url: string
  description: string | null
}

export default function ClosedShiftsPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedShift, setSelectedShift] = useState<ClosedShift | null>(null)
  const [shiftPhotos, setShiftPhotos] = useState<ShiftPhoto[]>([])
  const [showPhotosModal, setShowPhotosModal] = useState(false)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)

  useEffect(() => {
    loadClosedShifts()
  }, [currentDate])

  const loadClosedShifts = async () => {
    try {
      setLoading(true)
      const startDate = format(monthStart, 'yyyy-MM-dd')
      const endDate = format(monthEnd, 'yyyy-MM-dd')

      // Получаем только те смены, которые были запланированы и уже сданы
      const { data: plannedData, error: plannedError } = await supabase
        .from('planned_shifts')
        .select('user_id, shift_date, shift_type')
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)

      if (plannedError) throw plannedError

      if (!plannedData || plannedData.length === 0) {
        setClosedShifts([])
        return
      }

      // Для каждой запланированной смены ищем соответствующую закрытую смену
      const closedShiftsList: ClosedShift[] = []

      for (const planned of plannedData) {
        // Определяем фактическую дату закрытия смены
        // День: 09:00-21:00 → дата как есть
        // Ночь: 21:00-09:00 → если закрыто после 09:00, то предыдущий день
        let shiftDateToFind = planned.shift_date

        const { data: shiftData, error: shiftError } = await supabase
          .from('shifts')
          .select(`
            *,
            users (
              full_name,
              color
            )
          `)
          .eq('user_id', planned.user_id)
          .eq('shift_date', shiftDateToFind)
          .eq('shift_type', planned.shift_type)
          .single()

        if (!shiftError && shiftData) {
          closedShiftsList.push(shiftData as any)
        }
      }

      // Сортируем по дате
      closedShiftsList.sort((a, b) => 
        new Date(b.shift_date).getTime() - new Date(a.shift_date).getTime()
      )

      setClosedShifts(closedShiftsList)
    } catch (error) {
      console.error('Error loading closed shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadShiftPhotos = async (shiftId: string) => {
    try {
      const { data, error } = await supabase
        .from('shift_photos')
        .select('id, photo_url, description')
        .eq('shift_id', shiftId)

      if (error) throw error
      setShiftPhotos(data || [])
      setShowPhotosModal(true)
    } catch (error) {
      console.error('Error loading photos:', error)
    }
  }

  const totalRevenue = closedShifts.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
  const totalCash = closedShifts.reduce((sum, s) => sum + (s.cash_balance || 0), 0)
  const totalBonus = closedShifts.reduce((sum, s) => sum + (s.bonus_amount || 0), 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <Link
            href="/manager"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад в главное меню
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Закрытые смены</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Только смены, которые были предварительно выставлены в «Календаре смен» и уже сданы администраторами.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold min-w-[180px] text-center">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </span>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Выручка за месяц</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Наличные</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(totalCash)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="text-sm text-gray-600 dark:text-gray-400">Бонусы</div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(totalBonus)}</div>
        </div>
      </div>

      {/* Таблица закрытых смен */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : closedShifts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Нет закрытых смен за выбранный месяц.<br />
            Сначала выставьте смены в «Календаре смен», затем администраторы должны их закрыть.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Админ</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Тип</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Выручка</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Наличные</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Аванс</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Бонус</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Фото</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {closedShifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm">
                      {format(
                        (() => {
                          const [y, m, d] = shift.shift_date.split('-').map(Number)
                          return new Date(y, m - 1, d)
                        })(),
                        'dd.MM.yyyy'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: shift.users?.color || '#3b82f6' }}
                        />
                        <span className="text-sm font-medium">{shift.users?.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        shift.shift_type === 'day' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' 
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                      }`}>
                        {shift.shift_type === 'day' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                        {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(shift.total_revenue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(shift.cash_balance)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-orange-600 dark:text-orange-400">
                      {formatCurrency(shift.advance ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm text-green-600 dark:text-green-400">
                      {formatCurrency(shift.bonus_amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setSelectedShift(shift)
                          loadShiftPhotos(shift.id)
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-xs">Фото</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка с фотографиями */}
      <Modal
        isOpen={showPhotosModal}
        onClose={() => {
          setShowPhotosModal(false)
          setSelectedShift(null)
          setShiftPhotos([])
        }}
        title={`Фотографии — ${selectedShift ? format(new Date(selectedShift.shift_date), 'dd.MM.yyyy') : ''}`}
      >
        {shiftPhotos.length === 0 ? (
          <p className="text-gray-500">Фотографии отсутствуют</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {shiftPhotos.map(photo => (
              <div key={photo.id} className="space-y-2">
                <a href={photo.photo_url} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={photo.photo_url} 
                    alt={photo.description || 'Фото смены'} 
                    className="w-full h-48 object-cover rounded-lg border dark:border-gray-700 hover:opacity-90 transition-opacity"
                  />
                </a>
                {photo.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">{photo.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, DollarSign, CreditCard, Wallet, Image as ImageIcon, ArrowLeft, Sun, Moon } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'

interface Shift {
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
  users?: {
    full_name: string
    color?: string
  }
}

interface ShiftPhoto {
  id: string
  photo_url: string
  description: string | null
}

export default function MyShiftsPage() {
  const supabase = createClient()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [allShifts, setAllShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyMine, setShowOnlyMine] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [shiftPhotos, setShiftPhotos] = useState<ShiftPhoto[]>([])
  const [showPhotosModal, setShowPhotosModal] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayShifts, setSelectedDayShifts] = useState<Shift[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    loadShifts()
  }, [])

  useEffect(() => {
    if (!currentUserId) return
    applyFilter(showOnlyMine, allShifts, currentUserId)
  }, [showOnlyMine, allShifts, currentUserId])

  const applyFilter = (onlyMine: boolean, data: Shift[], userId: string) => {
    setShifts(onlyMine ? data.filter(s => s.user_id === userId) : data)
  }

  const loadShifts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          users (
            full_name,
            color
          )
        `)
        .order('shift_date', { ascending: false })

      if (error) throw error

      setAllShifts(data || [])
      applyFilter(true, data || [], user.id)
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDisplayDate = (shift: Shift) => {
    if (shift.shift_type === 'night') {
      const d = new Date(shift.shift_date)
      d.setDate(d.getDate() - 1)
      return d
    }
    return new Date(shift.shift_date)
  }

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => isSameDay(getDisplayDate(shift), date))
  }

  const monthShifts = shifts.filter(shift => {
    const d = getDisplayDate(shift)
    return d >= monthStart && d <= monthEnd
  })

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

  const totalRevenue = monthShifts.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
  const totalCash = monthShifts.reduce((sum, s) => sum + (s.cash_balance || 0), 0)
  const totalBonus = monthShifts.reduce((sum, s) => sum + (s.bonus_amount || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад в главное меню
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Мои смены</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {showOnlyMine ? 'Показаны только ваши смены' : 'Показаны все смены всех администраторов'}
          </p>
        </div>
        <button
          onClick={() => setShowOnlyMine(!showOnlyMine)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          {showOnlyMine ? 'Показать все смены' : 'Показать только мои'}
        </button>
      </div>

      {/* Статистика за месяц */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4" /> Выручка за месяц
          </div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Wallet className="w-4 h-4" /> Наличные
          </div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(totalCash)}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <CreditCard className="w-4 h-4" /> Бонусы
          </div>
          <div className="text-2xl font-bold mt-1">{formatCurrency(totalBonus)}</div>
        </div>
      </div>

      {/* Календарь */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {format(currentDate, 'LLLL yyyy', { locale: ru })}
          </h2>
          <button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500">Загрузка...</div>
        ) : (
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {daysInMonth.map((date) => {
              const dayShifts = getShiftsForDate(date)
              const hasShifts = dayShifts.length > 0
              const isSelected = selectedDate && isSameDay(date, selectedDate)
              const isToday = isSameDay(date, new Date())

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  onClick={() => {
                    if (!hasShifts) return
                    setSelectedDate(date)
                    setSelectedDayShifts(dayShifts)
                  }}
                  disabled={!hasShifts}
                  className={`
                    min-h-[72px] sm:min-h-[90px] rounded-lg flex flex-col items-center p-1
                    ${hasShifts ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'text-gray-300 dark:text-gray-600 cursor-default'}
                    ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''}
                    ${isToday && !isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {format(date, 'd')}
                  </span>
                  {hasShifts && dayShifts.slice(0, 2).map((shift) => (
                    <div
                      key={shift.id}
                      className="text-[10px] w-full truncate text-center flex items-center justify-center gap-0.5 mt-0.5"
                      style={shift.users?.color ? { color: shift.users.color } : undefined}
                    >
                      {shift.shift_type === 'day' ? (
                        <Sun className="w-3 h-3 text-yellow-500 shrink-0" />
                      ) : (
                        <Moon className="w-3 h-3 text-indigo-500 shrink-0" />
                      )}
                      <span className="truncate text-gray-800 dark:text-gray-200">
                        {!showOnlyMine ? (shift.users?.full_name || 'Админ') : (shift.shift_type === 'day' ? 'День' : 'Ночь')}
                      </span>
                    </div>
                  ))}
                  {dayShifts.length > 2 && (
                    <span className="text-[10px] text-gray-500">+{dayShifts.length - 2}</span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Список смен выбранного дня */}
      {selectedDayShifts.length > 0 && selectedDate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Смены за {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
            </h3>
            <button
              onClick={() => {
                setSelectedDayShifts([])
                setSelectedDate(null)
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Скрыть
            </button>
          </div>
          <div className="divide-y dark:divide-gray-700">
            {selectedDayShifts.map(shift => (
              <div key={shift.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                      shift.shift_type === 'day'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                    }`}>
                      {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                    </span>
                    {!showOnlyMine && (
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {shift.users?.full_name}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Выручка: </span>
                      <span className="font-medium">{formatCurrency(shift.total_revenue)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Наличные: </span>
                      <span className="font-medium">{formatCurrency(shift.cash_balance)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Бонус: </span>
                      <span className="font-medium text-green-600">{formatCurrency(shift.bonus_amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Обед: </span>
                      <span className="font-medium">{formatCurrency(shift.meal_allowance ?? 100)}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedShift(shift)
                    loadShiftPhotos(shift.id)
                  }}
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <ImageIcon className="w-4 h-4" />
                  Фото
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Таблица всех смен месяца */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Список смен за месяц</h3>
        </div>
        {monthShifts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Смены не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Дата</th>
                  {!showOnlyMine && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Админ</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Тип</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Выручка</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Наличные</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Бонус</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Фото</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {monthShifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm">{format(getDisplayDate(shift), 'dd.MM.yyyy')}</td>
                    {!showOnlyMine && (
                      <td className="px-4 py-3 text-sm">{shift.users?.full_name || '—'}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        shift.shift_type === 'day'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                      }`}>
                        {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(shift.total_revenue)}</td>
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(shift.cash_balance)}</td>
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
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showPhotosModal}
        onClose={() => {
          setShowPhotosModal(false)
          setSelectedShift(null)
          setShiftPhotos([])
        }}
        title={`Фотографии — ${selectedShift ? format(getDisplayDate(selectedShift), 'dd.MM.yyyy') : ''}`}
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

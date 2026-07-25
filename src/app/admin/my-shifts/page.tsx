'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, ArrowLeft, Sun, Moon } from 'lucide-react'

interface PlannedShift {
  id: string
  user_id: string
  shift_date: string
  shift_type: 'day' | 'night'
  users?: {
    full_name: string
    color?: string
  }
}

export default function MyShiftsPage() {
  const supabase = createClient()
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([])
  const [loading, setLoading] = useState(true)
  const [showOnlyMine, setShowOnlyMine] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDayShifts, setSelectedDayShifts] = useState<PlannedShift[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    loadPlannedShifts()
  }, [currentDate])

  const loadPlannedShifts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const startDate = format(monthStart, 'yyyy-MM-dd')
      const endDate = format(monthEnd, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('planned_shifts')
        .select(`
          id,
          user_id,
          shift_date,
          shift_type,
          users (
            full_name,
            color
          )
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)
        .order('shift_date', { ascending: true })

      if (error) throw error
      setPlannedShifts((data as any) || [])
    } catch (error) {
      console.error('Error loading planned shifts:', error)
      setPlannedShifts([])
    } finally {
      setLoading(false)
    }
  }

  const filteredShifts = showOnlyMine
    ? plannedShifts.filter(s => s.user_id === currentUserId)
    : plannedShifts

  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return filteredShifts.filter(s => s.shift_date === dateStr)
  }

  const myCount = plannedShifts.filter(s => s.user_id === currentUserId).length
  const allCount = plannedShifts.length

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
            Смены, которые выставил руководитель (расписание).{' '}
            {showOnlyMine
              ? `Показаны только ваши (${myCount} за месяц)`
              : `Показаны все администраторы (${allCount} за месяц)`}
          </p>
        </div>
        <button
          onClick={() => {
            setShowOnlyMine(!showOnlyMine)
            setSelectedDayShifts([])
            setSelectedDate(null)
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          {showOnlyMine ? 'Показать всех админов' : 'Показать только мои'}
        </button>
      </div>

      {/* Календарь запланированных смен */}
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
                    min-h-[80px] sm:min-h-[100px] rounded-lg flex flex-col items-stretch p-1
                    ${hasShifts ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer' : 'text-gray-300 dark:text-gray-600 cursor-default'}
                    ${isSelected ? 'ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : ''}
                    ${isToday && !isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  `}
                >
                  <span className={`text-xs font-medium self-center ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {format(date, 'd')}
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className="text-[10px] px-1 py-0.5 rounded text-white truncate flex items-center gap-0.5"
                        style={{ backgroundColor: shift.users?.color || '#6366f1' }}
                        title={`${shift.users?.full_name || 'Админ'} — ${shift.shift_type === 'day' ? 'День' : 'Ночь'}`}
                      >
                        {shift.shift_type === 'day' ? (
                          <Sun className="w-2.5 h-2.5 shrink-0" />
                        ) : (
                          <Moon className="w-2.5 h-2.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {showOnlyMine
                            ? (shift.shift_type === 'day' ? 'День' : 'Ночь')
                            : (shift.users?.full_name || 'Админ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Детали выбранного дня */}
      {selectedDayShifts.length > 0 && selectedDate && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-900 dark:text-gray-100">
              Расписание на {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
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
              <div key={shift.id} className="p-4 flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: shift.users?.color || '#6366f1' }}
                />
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {shift.users?.full_name || 'Администратор'}
                  </div>
                  <div className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    {shift.shift_type === 'day' ? (
                      <>
                        <Sun className="w-3.5 h-3.5 text-yellow-500" />
                        День (09:00–21:00)
                      </>
                    ) : (
                      <>
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        Ночь (21:00–09:00)
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Список на месяц */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-gray-100">Список выставленных смен за месяц</h3>
        </div>
        {filteredShifts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {showOnlyMine
              ? 'Руководитель ещё не выставил вам смены на этот месяц'
              : 'Нет выставленных смен на этот месяц'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Администратор</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Тип</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredShifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(shift.shift_date + 'T12:00:00'), 'dd.MM.yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: shift.users?.color || '#6366f1' }}
                        />
                        {shift.users?.full_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${
                        shift.shift_type === 'day'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                      }`}>
                        {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

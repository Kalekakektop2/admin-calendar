'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, DollarSign, CreditCard, Wallet, TrendingUp, Users, Image as ImageIcon, Plus, BarChart3 } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
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
  created_at: string
  users: {
    full_name: string
    email: string
  }
}

interface ShiftPhoto {
  id: string
  shift_id: string
  photo_url: string
  description: string | null
  uploaded_at: string
}

interface DashboardStats {
  totalRevenue: number
  totalCash: number
  dayShifts: number
  nightShifts: number
  totalBonus: number
  shiftCount: number
  photoCount: number
}

export default function ManagerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [shiftPhotos, setShiftPhotos] = useState<ShiftPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCash: 0,
    dayShifts: 0,
    nightShifts: 0,
    totalBonus: 0,
    shiftCount: 0,
    photoCount: 0,
  })

  useEffect(() => {
    loadShifts()
    loadStats()
  }, [currentDate])

  const loadShifts = async () => {
    try {
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          users (
            full_name,
            email
          )
        `)
        .order('shift_date', { ascending: true })

      if (error) throw error
      
      // Фильтруем смены по отображаемой дате для ночных смен
      const filteredShifts = (data || []).filter(shift => {
        const shiftDate = new Date(shift.shift_date)
        if (shift.shift_type === 'night') {
          // Для ночных смен проверяем предыдущий день
          const previousDay = new Date(shiftDate)
          previousDay.setDate(previousDay.getDate() - 1)
          return previousDay >= startDate && previousDay <= endDate
        }
        return shiftDate >= startDate && shiftDate <= endDate
      })
      
      setShifts(filteredShifts)
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('total_revenue, cash_balance, bonus_amount, shift_type, shift_date, id')
        .order('shift_date', { ascending: true })

      if (shiftsError) throw shiftsError

      // Фильтруем смены по отображаемой дате для ночных смен
      const filteredShifts = (shiftsData || []).filter(shift => {
        const shiftDate = new Date(shift.shift_date)
        if (shift.shift_type === 'night') {
          // Для ночных смен проверяем предыдущий день
          const previousDay = new Date(shiftDate)
          previousDay.setDate(previousDay.getDate() - 1)
          return previousDay >= startDate && previousDay <= endDate
        }
        return shiftDate >= startDate && shiftDate <= endDate
      })

      // Получаем ID смен за текущий месяц для подсчета фотографий
      const shiftIds = filteredShifts.map(shift => shift.id)
      
      // Подсчитываем фотографии только для смен текущего месяца
      let photoCount = 0
      if (shiftIds.length > 0) {
        const { count, error: photoError } = await supabase
          .from('shift_photos')
          .select('*', { count: 'exact', head: true })
          .in('shift_id', shiftIds)

        if (photoError) throw photoError
        photoCount = count || 0
      }

      const totalRevenue = filteredShifts.reduce((sum, shift) => sum + shift.total_revenue, 0) || 0
      const totalCash = filteredShifts.reduce((sum, shift) => sum + shift.cash_balance, 0) || 0
      const dayShifts = filteredShifts.filter(shift => shift.shift_type === 'day').length || 0
      const nightShifts = filteredShifts.filter(shift => shift.shift_type === 'night').length || 0
      const totalBonus = filteredShifts.reduce((sum, shift) => sum + shift.bonus_amount, 0) || 0

      setStats({
        totalRevenue,
        totalCash,
        dayShifts,
        nightShifts,
        totalBonus,
        shiftCount: filteredShifts.length || 0,
        photoCount: photoCount || 0,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const loadShiftPhotos = async (shiftId: string) => {
    try {
      console.log('Loading photos for shift:', shiftId)
      const { data, error } = await supabase
        .from('shift_photos')
        .select('*')
        .eq('shift_id', shiftId)

      if (error) {
        console.error('Error loading photos:', error)
        throw error
      }
      
      console.log('Loaded photos:', data)
      setShiftPhotos(data || [])
    } catch (error) {
      console.error('Error loading photos:', error)
      setShiftPhotos([])
    }
  }

  const getShiftsForDate = (date: Date) => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.shift_date)
      // Если ночная смена, то для отображения в календаре используем предыдущий день
      if (shift.shift_type === 'night') {
        const previousDay = new Date(shiftDate)
        previousDay.setDate(previousDay.getDate() - 1)
        return isSameDay(previousDay, date)
      }
      return isSameDay(shiftDate, date)
    })
  }

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleDateClick = (date: Date) => {
    const dayShifts = getShiftsForDate(date)
    if (dayShifts.length > 0) {
      setSelectedDate(date)
      setSelectedShift(dayShifts[0])
      loadShiftPhotos(dayShifts[0].id)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Панель руководителя
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => router.push('/manager/monthly-reports')}
            className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Месячные отчеты
          </button>
          <button
            onClick={() => router.push('/manager/create-admin')}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Создать администратора
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Общая выручка"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Наличные"
          value={formatCurrency(stats.totalCash)}
          icon={Wallet}
        />
        <StatCard
          title="Премии"
          value={formatCurrency(stats.totalBonus)}
          icon={TrendingUp}
        />
        <StatCard
          title="Смены"
          value={`День: ${stats.dayShifts}, Ночь: ${stats.nightShifts}`}
          icon={Users}
        />
        <StatCard
          title="Всего фотографий"
          value={stats.photoCount}
          icon={ImageIcon}
        />
      </div>

      {/* Calendar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
          >
            <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
            {format(currentDate, 'MMMM yyyy', { locale: ru })}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
          >
            <ChevronRight className="w-5 h-5 text-gray-900 dark:text-gray-100" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
            <div key={day} className="text-center text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {daysInMonth.map((date) => {
            const dayShifts = getShiftsForDate(date)
            const hasShifts = dayShifts.length > 0
            const isSelected = selectedDate && isSameDay(date, selectedDate)

            return (
              <button
                key={date.toISOString()}
                onClick={() => handleDateClick(date)}
                disabled={!hasShifts}
                className={`
                  aspect-square rounded-lg flex flex-col items-center justify-center p-0.5 sm:p-1
                  ${hasShifts ? 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-gray-900 dark:text-gray-100' : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'}
                  ${isSelected ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 font-bold' : 'text-gray-900 dark:text-gray-100'}
                  ${!isSameMonth(date, currentDate) ? 'text-gray-300 dark:text-gray-600' : ''}
                `}
              >
                <span className="text-xs text-gray-900 dark:text-gray-100 font-medium">{format(date, 'd')}</span>
                {hasShifts && dayShifts.map((shift) => (
                  <div key={shift.id} className="text-xs text-gray-900 dark:text-gray-100 truncate w-full text-center">
                    {shift.users.full_name}
                  </div>
                ))}
              </button>
            )
          })}
        </div>
      </div>

      {/* Shift Details */}
      {selectedShift && (
        <Modal
          isOpen={!!selectedShift}
          onClose={() => {
            setSelectedShift(null)
            setSelectedDate(null)
            setShiftPhotos([])
          }}
          title={`Смена от ${format(selectedDate || new Date(selectedShift.shift_date), 'dd MMM yyyy', { locale: ru })}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">Администратор</p>
              <p className="font-semibold text-gray-900 dark:text-white">{selectedShift.users.full_name}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{selectedShift.users.email}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Выручка</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedShift.total_revenue)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Премия</p>
                <p className="font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedShift.bonus_amount)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Наличные</p>
                <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedShift.cash_balance)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <p className="text-xs text-gray-600 dark:text-gray-400">Тип смены</p>
                <p className="font-bold text-gray-900 dark:text-white">{selectedShift.shift_type === 'day' ? 'День' : 'Ночь'}</p>
              </div>
            </div>
          </div>

          {selectedShift.notes && (
            <div className="mb-6">
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Примечания</h4>
              <p className="text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 p-3 rounded">{selectedShift.notes}</p>
            </div>
          )}

          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-white">Фотофиксация ({shiftPhotos.length})</h4>
            {shiftPhotos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {shiftPhotos.map((photo) => (
                  <div key={photo.id} className="relative group">
                    <img
                      src={photo.photo_url}
                      alt="Shift photo"
                      className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(photo.photo_url, '_blank')}
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                      {format(new Date(photo.uploaded_at), 'HH:mm')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ImageIcon className="mx-auto h-12 w-12 text-gray-700 dark:text-gray-500" />
                <p className="mt-2 text-gray-900 dark:text-gray-100">Нет фотографий для этой смены</p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* All shifts for current month */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Все смены за месяц</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Администратор
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Тип смены
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Выручка
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Премия
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                Фото
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {shifts.map((shift) => {
              // Для ночных смен показываем предыдущий день в таблице
              const displayDate = shift.shift_type === 'night' 
                ? new Date(new Date(shift.shift_date).setDate(new Date(shift.shift_date).getDate() - 1))
                : new Date(shift.shift_date)
              
              return (
                <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {format(displayDate, 'dd MMM yyyy', { locale: ru })}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {shift.users.full_name}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(shift.total_revenue)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(shift.bonus_amount)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <button
                      onClick={() => {
                        setSelectedShift(shift)
                        setSelectedDate(displayDate)
                        loadShiftPhotos(shift.id)
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                    >
                      Посмотреть
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        {shifts.length === 0 && (
          <div className="text-center py-12 text-gray-700 dark:text-gray-300">
            <Users className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-600" />
            <p className="mt-2 text-gray-900 dark:text-gray-100">Нет смен за выбранный период</p>
          </div>
        )}
      </div>
    </div>
  )
}

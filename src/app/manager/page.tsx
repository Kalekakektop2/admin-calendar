'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, DollarSign, Wallet, TrendingUp, Users, Plus, BarChart3, Trash2, AlertTriangle } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
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
  users: {
    full_name: string
    email: string
  }
}

interface DashboardStats {
  totalRevenue: number
  totalCash: number
  dayShifts: number
  nightShifts: number
  totalBonus: number
  shiftCount: number
  photoCount: number
  currentCash: number
}

export default function ManagerPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalCash: 0,
    dayShifts: 0,
    nightShifts: 0,
    totalBonus: 0,
    shiftCount: 0,
    photoCount: 0,
    currentCash: 0,
  })

  useEffect(() => {
    loadShifts()
    loadStats()
  }, [currentDate])

  // Дата из БД (yyyy-MM-dd) → локальная дата без сдвига UTC
  const parseLocalDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  const loadShifts = async () => {
    try {
      const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      // Берём смены по shift_date (день и ночь хранят дату начала смены)
      const { data, error } = await supabase
        .from('shifts')
        .select(`
          *,
          users (
            full_name,
            email
          )
        `)
        .gte('shift_date', startStr)
        .lte('shift_date', endStr)
        .order('shift_date', { ascending: true })

      if (error) throw error
      setShifts(data || [])
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const startStr = format(startOfMonth(currentDate), 'yyyy-MM-dd')
      const endStr = format(endOfMonth(currentDate), 'yyyy-MM-dd')

      const { data: shiftsData, error: shiftsError } = await supabase
        .from('shifts')
        .select('total_revenue, cash_balance, bonus_amount, shift_type, shift_date, id, encashment')
        .gte('shift_date', startStr)
        .lte('shift_date', endStr)
        .order('shift_date', { ascending: true })

      if (shiftsError) throw shiftsError

      const filteredShifts = shiftsData || []

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
        photoCount = count ?? 0
      }

      const totalRevenue = filteredShifts.reduce((sum, shift) => sum + shift.total_revenue, 0) ?? 0
      const totalCash = filteredShifts.reduce((sum, shift) => sum + shift.cash_balance, 0) ?? 0
      const dayShifts = filteredShifts.filter(shift => shift.shift_type === 'day').length ?? 0
      const nightShifts = filteredShifts.filter(shift => shift.shift_type === 'night').length ?? 0
      const totalBonus = filteredShifts.reduce((sum, shift) => sum + shift.bonus_amount, 0) ?? 0
      
      // Сейчас в кассе = общее количество из "Наличные за смену" - инкассация
      const totalEncashment = filteredShifts.reduce((sum, shift) => sum + (shift.encashment ?? 0), 0) ?? 0
      const currentCash = totalCash - totalEncashment

      setStats({
        totalRevenue,
        totalCash,
        dayShifts,
        nightShifts,
        totalBonus,
        shiftCount: filteredShifts.length ?? 0,
        photoCount: photoCount ?? 0,
        currentCash,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

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
          <button
            onClick={() => router.push('/manager/fines')}
            className="w-full sm:w-auto bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            Штрафы
          </button>
          <button
            onClick={() => router.push('/manager/delete-admin')}
            className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Удалить администратора
          </button>
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Общая выручка"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Наличные за смену"
          value={formatCurrency(stats.totalCash)}
          icon={Wallet}
        />
        <StatCard
          title="Сейчас в кассе"
          value={formatCurrency(stats.currentCash)}
          icon={Wallet}
        />
        <StatCard
          title="Премии"
          value={formatCurrency(stats.totalBonus)}
          icon={TrendingUp}
        />
      </div>

      {/* All shifts for current month */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Все смены за месяц</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-semibold min-w-[140px] text-center text-gray-900 dark:text-gray-100">
              {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </span>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
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
                Аванс
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {shifts.map((shift) => {
              const displayDate = parseLocalDate(shift.shift_date)
              
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
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400 font-medium">
                    {formatCurrency(shift.advance ?? 0)}
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

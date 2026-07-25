'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, DollarSign, Wallet, TrendingUp, Users, Wallet as SalaryIcon } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { Modal } from '@/components/ui/modal'
import { formatCurrency } from '@/lib/utils'

interface AdminStats {
  id: string
  full_name: string
  email: string
  totalCash: number
  totalRevenue: number
  totalBonus: number
  shiftCount: number
  dayShifts: number
  nightShifts: number
  shifts?: Shift[]
}

interface Shift {
  id: string
  shift_date: string
  total_revenue: number
  cash_balance: number
  bonus_amount: number
  shift_type: 'day' | 'night'
  advance: number | null
  meal_allowance: number | null
  encashment: number | null
}

export default function MonthlyReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [adminStats, setAdminStats] = useState<AdminStats[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminStats | null>(null)
  const [shiftTypeFilter, setShiftTypeFilter] = useState<'all' | 'day' | 'night'>('all')

  useEffect(() => {
    loadAdminStats()
  }, [currentDate])

  const loadAdminStats = async () => {
    try {
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      // Получаем всех администраторов
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'admin')

      if (adminsError) throw adminsError

      // Для каждого администратора получаем статистику за месяц
      const stats: AdminStats[] = await Promise.all(
        admins.map(async (admin) => {
          const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('id, total_revenue, cash_balance, bonus_amount, shift_type, shift_date, advance, meal_allowance')
            .eq('user_id', admin.id)
            .gte('shift_date', startDate.toISOString().split('T')[0])
            .lte('shift_date', endDate.toISOString().split('T')[0])

          if (shiftsError) throw shiftsError

          // Фильтруем смены по отображаемой дате для ночных смен
          const filteredShifts = shifts?.filter(shift => {
            const shiftDate = new Date(shift.shift_date)
            if (shift.shift_type === 'night') {
              // Для ночных смен проверяем предыдущий день
              const previousDay = new Date(shiftDate)
              previousDay.setDate(previousDay.getDate() - 1)
              return previousDay >= startDate && previousDay <= endDate
            }
            return shiftDate >= startDate && shiftDate <= endDate
          }) || []

          const totalRevenue = filteredShifts.reduce((sum, shift) => sum + shift.total_revenue, 0) ?? 0
          const totalCash = filteredShifts.reduce((sum, shift) => sum + shift.cash_balance, 0) ?? 0
          const totalBonus = filteredShifts.reduce((sum, shift) => sum + shift.bonus_amount, 0) ?? 0
          const shiftCount = filteredShifts.length ?? 0
          const dayShifts = filteredShifts.filter(shift => shift.shift_type === 'day').length ?? 0
          const nightShifts = filteredShifts.filter(shift => shift.shift_type === 'night').length ?? 0

          return {
            id: admin.id,
            full_name: admin.full_name,
            email: admin.email,
            totalCash,
            totalRevenue,
            totalBonus,
            shiftCount,
            dayShifts,
            nightShifts,
            shifts: filteredShifts,
          }
        })
      )

      setAdminStats(stats)
    } catch (error) {
      console.error('Error loading admin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const previousMonth = () => setCurrentDate(subMonths(currentDate, 1))
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))

  const handleAdminClick = (admin: AdminStats, type: 'all' | 'day' | 'night') => {
    setSelectedAdmin(admin)
    setShiftTypeFilter(type)
  }

  const getFilteredShifts = () => {
    if (!selectedAdmin || !selectedAdmin.shifts) return []
    if (shiftTypeFilter === 'all') return selectedAdmin.shifts
    return selectedAdmin.shifts.filter(shift => shift.shift_type === shiftTypeFilter)
  }

  // Общая статистика по всем администраторам
  const totalStats = adminStats.reduce((acc, admin) => ({
    totalCash: acc.totalCash + admin.totalCash,
    totalRevenue: acc.totalRevenue + admin.totalRevenue,
    totalBonus: acc.totalBonus + admin.totalBonus,
    shiftCount: acc.shiftCount + admin.shiftCount,
  }), { totalCash: 0, totalRevenue: 0, totalBonus: 0, shiftCount: 0 })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/manager')}
          className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
        >
          ← Назад
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Месячные отчеты администраторов
        </h2>
        <div></div>
      </div>

      {/* Выбор месяца */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
            >
              <ChevronLeft className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            </button>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mx-4">
              {format(currentDate, 'MMMM yyyy', { locale: ru })}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-900 dark:text-gray-100"
            >
              <ChevronRight className="w-5 h-5 text-gray-900 dark:text-gray-100" />
            </button>
          </div>
          
          <button
            onClick={() => router.push('/manager/admin-salary')}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <SalaryIcon className="w-5 h-5" />
            Зарплата админа
          </button>
        </div>
      </div>

      {/* Общая статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Общая выручка"
          value={formatCurrency(totalStats.totalRevenue)}
          icon={DollarSign}
        />
        <StatCard
          title="Общая наличка"
          value={formatCurrency(totalStats.totalCash)}
          icon={Wallet}
        />
        <StatCard
          title="Премии"
          value={formatCurrency(totalStats.totalBonus)}
          icon={TrendingUp}
        />
      </div>

      {/* Отчеты по администраторам */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Отчеты по администраторам</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Администратор
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Дневных
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Ночных
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Всего смен
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Выручка
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Наличка
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Премия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {adminStats.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{admin.full_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleAdminClick(admin, 'day')}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      {admin.dayShifts}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleAdminClick(admin, 'night')}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      {admin.nightShifts}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleAdminClick(admin, 'all')}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 font-medium cursor-pointer"
                    >
                      {admin.shiftCount}
                    </button>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(admin.totalRevenue)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(admin.totalCash)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(admin.totalBonus)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {adminStats.length === 0 && (
          <div className="text-center py-12 text-gray-700 dark:text-gray-300">
            <Users className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-600" />
            <p className="mt-2 text-gray-900 dark:text-gray-100">Нет администраторов или смен за выбранный период</p>
          </div>
        )}
      </div>

      {/* Модальное окно с детальной статистикой */}
      {selectedAdmin && (
        <Modal
          isOpen={!!selectedAdmin}
          onClose={() => setSelectedAdmin(null)}
          title={`Смены: ${selectedAdmin.full_name} (${shiftTypeFilter === 'all' ? 'Все' : shiftTypeFilter === 'day' ? 'Дневные' : 'Ночные'})`}
        >
          <div className="space-y-4">
            {getFilteredShifts().length === 0 ? (
              <div className="text-center py-8 text-gray-900 dark:text-gray-100">
                <p>Нет смен выбранного типа</p>
              </div>
            ) : (
              <div className="space-y-3">
                {getFilteredShifts().map((shift) => {
                  const displayDate = shift.shift_type === 'night'
                    ? new Date(new Date(shift.shift_date).setDate(new Date(shift.shift_date).getDate() - 1))
                    : new Date(shift.shift_date)

                  return (
                    <div key={shift.id} className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {format(displayDate, 'dd MMM yyyy', { locale: ru })}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {shift.shift_type === 'day' ? 'Дневная смена' : 'Ночная смена'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Премия</p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {formatCurrency(shift.bonus_amount)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Выручка</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(shift.total_revenue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Наличные</p>
                          <p className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatCurrency(shift.cash_balance)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-between pt-4 border-t dark:border-gray-700">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Всего смен</p>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {getFilteredShifts().length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Общая выручка</p>
                <p className="font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(getFilteredShifts().reduce((sum, shift) => sum + shift.total_revenue, 0))}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Общая премия</p>
                <p className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(getFilteredShifts().reduce((sum, shift) => sum + shift.bonus_amount, 0))}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

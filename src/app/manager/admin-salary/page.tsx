'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns'
import { ru } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, DollarSign, Wallet, TrendingUp, Users, Utensils, ArrowLeft, Calendar } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface AdminSalary {
  id: string
  full_name: string
  email: string
  totalShifts: number
  dayShifts: number
  nightShifts: number
  shiftEarnings: number
  bonus: number
  mealAllowance: number
  advances: number
  fines: number
  totalSalary: number
}

export default function AdminSalaryPage() {
  const router = useRouter()
  const supabase = createClient()

  const [currentDate, setCurrentDate] = useState(new Date())
  const [adminSalaries, setAdminSalaries] = useState<AdminSalary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'first-half' | 'second-half'>('first-half')

  useEffect(() => {
    loadAdminSalaries()
  }, [currentDate, selectedPeriod])

  const loadAdminSalaries = async () => {
    try {
      const today = new Date()
      const currentDay = today.getDate()
      const isFirstHalfMonth = currentDay <= 15
      
      // Определяем период
      let startDate, endDate
      const currentMonth = currentDate
      
      if (selectedPeriod === 'first-half') {
        // До 15 числа
        startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
        endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 15)
      } else {
        // После 15 числа
        startDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 16)
        endDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)
      }

      // Получаем всех администраторов
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('role', 'admin')

      if (adminsError) throw adminsError

      // Для каждого администратора рассчитываем зарплату
      const salaries: AdminSalary[] = await Promise.all(
        admins.map(async (admin) => {
          // Получаем смены за период
          const { data: shifts, error: shiftsError } = await supabase
            .from('shifts')
            .select('id, total_revenue, cash_balance, bonus_amount, shift_type, shift_date, advance')
            .eq('user_id', admin.id)
            .gte('shift_date', startDate.toISOString().split('T')[0])
            .lte('shift_date', endDate.toISOString().split('T')[0])

          if (shiftsError) throw shiftsError

          // Фильтруем смены по отображаемой дате для ночных смен
          const filteredShifts = shifts?.filter(shift => {
            const shiftDate = new Date(shift.shift_date)
            if (shift.shift_type === 'night') {
              const previousDay = new Date(shiftDate)
              previousDay.setDate(previousDay.getDate() - 1)
              return previousDay >= startDate && previousDay <= endDate
            }
            return shiftDate >= startDate && shiftDate <= endDate
          }) || []

          const totalShifts = filteredShifts.length
          const dayShifts = filteredShifts.filter(shift => shift.shift_type === 'day').length
          const nightShifts = filteredShifts.filter(shift => shift.shift_type === 'night').length
          
          // Заработок за смены (дневная = 1500, ночная = 2200)
          const shiftEarnings = filteredShifts.reduce((sum, shift) => {
            return sum + (shift.shift_type === 'day' ? 1500 : 2200)
          }, 0)
          
          // Премия
          const bonus = filteredShifts.reduce((sum, shift) => sum + shift.bonus_amount, 0)
          
          // Обед (100₽ за каждую смену)
          const mealAllowance = totalShifts * 100
          
          // Авансы
          const advances = filteredShifts.reduce((sum, shift) => sum + (shift.advance || 0), 0)
          
          // Штрафы за период
          const { data: fines, error: finesError } = await supabase
            .from('fines')
            .select('amount')
            .eq('user_id', admin.id)
            .gte('fine_date', startDate.toISOString().split('T')[0])
            .lte('fine_date', endDate.toISOString().split('T')[0])

          if (finesError) throw finesError
          
          const finesAmount = fines?.reduce((sum, fine) => sum + fine.amount, 0) || 0
          
          // Общая зарплата = заработок за смены + премия + обед - авансы - штрафы
          const totalSalary = shiftEarnings + bonus + mealAllowance - advances - finesAmount

          return {
            id: admin.id,
            full_name: admin.full_name,
            email: admin.email,
            totalShifts,
            dayShifts,
            nightShifts,
            shiftEarnings,
            bonus,
            mealAllowance,
            advances,
            fines: finesAmount,
            totalSalary,
          }
        })
      )

      setAdminSalaries(salaries)
    } catch (error) {
      console.error('Error loading admin salaries:', error)
    } finally {
      setLoading(false)
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
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push('/manager/monthly-reports')}
          className="text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <ArrowLeft className="w-5 h-5 inline mr-2" />
          Назад
        </button>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Зарплата администраторов
        </h2>
        <div></div>
      </div>

      {/* Выбор месяца и периода */}
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
          
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedPeriod('first-half')}
              className={`px-4 py-2 rounded-lg ${
                selectedPeriod === 'first-half'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              1-15 число
            </button>
            <button
              onClick={() => setSelectedPeriod('second-half')}
              className={`px-4 py-2 rounded-lg ${
                selectedPeriod === 'second-half'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              16-31 число
            </button>
          </div>
        </div>
      </div>

      {/* Таблица зарплат */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 sm:p-6 border-b dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Расчет зарплаты</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Администратор
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Всего смен
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Дневных
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Ночных
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  За смены
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Премия
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Обед
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Аванс
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Штрафы
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Зарплата
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {adminSalaries.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{admin.full_name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {admin.totalShifts}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {admin.dayShifts}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {admin.nightShifts}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(admin.shiftEarnings)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                    {formatCurrency(admin.bonus)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-blue-600 dark:text-blue-400">
                    {formatCurrency(admin.mealAllowance)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-orange-600 dark:text-orange-400">
                    {formatCurrency(admin.advances)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400">
                    {formatCurrency(admin.fines)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(admin.totalSalary)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {adminSalaries.length === 0 && (
          <div className="text-center py-12 text-gray-900 dark:text-gray-100">
            <Users className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-600" />
            <p className="mt-2 text-gray-900 dark:text-gray-100">Нет данных за выбранный период</p>
          </div>
        )}
      </div>
    </div>
  )
}

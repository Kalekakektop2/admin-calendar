'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar, DollarSign, CreditCard, Wallet, TrendingUp, AlertTriangle, XCircle } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { Modal } from '@/components/ui/modal'
import { StatCard } from '@/components/ui/stat-card'
import { formatCurrency } from '@/lib/utils'

interface Shift {
  id: string
  shift_date: string
  total_revenue: number
  cash_balance: number
  card_revenue: number
  bonus_amount: number
  shift_type: 'day' | 'night'
  notes: string | null
  created_at: string
}

interface ShiftPhoto {
  id: string
  photo_url: string
  description: string | null
}

interface Fine {
  id: string
  user_id: string
  amount: number
  date: string
  comment: string | null
  created_at: string
}

export default function AdminPage() {
  const supabase = createClient()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null)
  const [shiftPhotos, setShiftPhotos] = useState<ShiftPhoto[]>([])
  const [admins, setAdmins] = useState<Array<{id: string, full_name: string}>>([])
  const [isManager, setIsManager] = useState(false)
  const [fines, setFines] = useState<Fine[]>([])
  const [showFinesModal, setShowFinesModal] = useState(false)
  
  // Stats state
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalCash: 0,
    totalBonus: 0,
    shiftEarnings: 0,
    estimatedEarnings: 0,
    currentCash: 0,
  })
  
  // Form state
  const [formData, setFormData] = useState({
    shift_date: format(new Date(), 'yyyy-MM-dd'),
    total_revenue: '',
    cash_balance: '',
    shift_type: 'day' as 'day' | 'night',
    user_id: '', // Для выбора администратора
    notes: '',
    encashment: '',
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadShifts()
    checkUserRole()
    loadAdmins()
    loadFines()
  }, [])

  // Устанавливаем user_id текущего пользователя при загрузке
  useEffect(() => {
    const setCurrentUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFormData(prev => ({ ...prev, user_id: user.id }))
      }
    }
    setCurrentUserId()
  }, [])

  const loadShifts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', user.id)
        .order('shift_date', { ascending: false })

      if (error) throw error
      setShifts(data || [])
      
      // Calculate stats
      const totalRevenue = data?.reduce((sum, shift) => sum + shift.total_revenue, 0) || 0
      const totalCash = data?.reduce((sum, shift) => sum + shift.cash_balance, 0) || 0
      const totalBonus = data?.reduce((sum, shift) => sum + shift.bonus_amount, 0) || 0
      
      // Расчет заработка за смены (дневная = 1500, ночная = 2200)
      const shiftEarnings = data?.reduce((sum, shift) => {
        return sum + (shift.shift_type === 'day' ? 1500 : 2200)
      }, 0) || 0
      
      // Расчет штрафов за текущий месяц
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
      const monthlyFines = fines
        .filter(fine => fine.date.startsWith(currentMonth))
        .reduce((sum, fine) => sum + fine.amount, 0)
      
      // Примерный заработок = заработок за смены + премия - штрафы
      const estimatedEarnings = shiftEarnings + totalBonus - monthlyFines
      
      // Сейчас в кассе = общее количество из "Наличные за смену" - инкассация
      const totalEncashment = data?.reduce((sum, shift) => sum + (shift.encashment || 0), 0) || 0
      const currentCash = totalCash - totalEncashment
      
      setStats({
        totalRevenue,
        totalCash,
        totalBonus,
        shiftEarnings,
        estimatedEarnings,
        currentCash,
      })
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadShiftPhotos = async (shiftId: string) => {
    try {
      const { data, error } = await supabase
        .from('shift_photos')
        .select('*')
        .eq('shift_id', shiftId)

      if (error) throw error
      setShiftPhotos(data || [])
    } catch (error) {
      console.error('Error loading photos:', error)
    }
  }

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error) throw error
      setIsManager(data?.role === 'manager')
    } catch (error) {
      console.error('Error checking user role:', error)
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

  const loadFines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('fines')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (error) {
        console.error('Error loading fines:', error)
        // Если таблица не существует, просто пустой массив
        if (error.code === '42P01') {
          setFines([])
        } else {
          setFines([])
        }
      } else {
        setFines(data || [])
      }
    } catch (error) {
      console.error('Error loading fines:', error)
      setFines([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Проверяем наличие фото
      if (photos.length === 0) {
        alert('Необходимо загрузить хотя бы одно фото')
        setUploading(false)
        return
      }

      // Проверяем, существует ли пользователь в таблице users
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', user.id)
        .single()

      if (userCheckError || !existingUser) {
        // Если пользователя нет, пробуем создать
        const { error: createUserError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Пользователь',
            role: 'admin',
          })

        if (createUserError) {
          console.error('Error creating user record:', createUserError)
          throw new Error(`Ошибка при создании профиля пользователя: ${createUserError.message}`)
        }
      }

      // Create shift - рассчитываем бонус на клиентской стороне
      const calculatedBonus = calculateBonus()
      
      // Определяем ID пользователя для смены
      const userId = isManager ? formData.user_id : user.id
      
      if (!userId) {
        throw new Error('Необходимо выбрать администратора')
      }
      
      // Валидация данных перед отправкой
      const totalRevenue = parseFloat(formData.total_revenue)
      const cashBalance = parseFloat(formData.cash_balance)
      
      if (isNaN(totalRevenue) || isNaN(cashBalance)) {
        throw new Error('Пожалуйста, введите корректные числовые значения')
      }
      
      if (isNaN(calculatedBonus)) {
        throw new Error('Ошибка расчета бонуса')
      }
      
      // Если ночная смена, то дата относится к следующему дню
      let shiftDate = formData.shift_date
      if (formData.shift_type === 'night') {
        const date = new Date(formData.shift_date)
        date.setDate(date.getDate() + 1)
        shiftDate = date.toISOString().split('T')[0]
      }
      
      console.log('Отправка данных:', {
        user_id: userId,
        shift_date: shiftDate,
        original_date: formData.shift_date,
        shift_type: formData.shift_type,
        total_revenue: totalRevenue,
        cash_balance: cashBalance,
        shift_type: formData.shift_type,
        bonus_amount: calculatedBonus,
        notes: formData.notes,
        encashment: parseFloat(formData.encashment) || 0
      })
      
      const { data: shift, error: shiftError } = await supabase
        .from('shifts')
        .insert({
          user_id: userId,
          shift_date: shiftDate,
          total_revenue: totalRevenue,
          cash_balance: cashBalance,
          card_revenue: 0, // Устанавливаем 0 по умолчанию
          shift_type: formData.shift_type,
          bonus_amount: calculatedBonus,
          notes: formData.notes || null,
          encashment: parseFloat(formData.encashment) || 0,
        })
        .select()
        .single()

      if (shiftError) {
        console.error('Shift insertion error:', shiftError)
        throw new Error(`Ошибка при создании смены: ${shiftError.message}`)
      }

      if (!shift) {
        throw new Error('Не удалось создать смену')
      }

      console.log('Смена создана:', shift)

      // Upload photos
      for (const photo of photos) {
        const fileExt = photo.name.split('.').pop()
        const fileName = `${user.id}/${shift.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('shift-photos')
          .upload(fileName, photo)

        if (uploadError) {
          console.error('Photo upload error:', uploadError)
          throw new Error(`Ошибка при загрузке фото: ${uploadError.message}`)
        }

        const { data: { publicUrl } } = supabase.storage
          .from('shift-photos')
          .getPublicUrl(fileName)

        const { error: photoInsertError } = await supabase.from('shift_photos').insert({
          shift_id: shift.id,
          photo_url: publicUrl,
          photo_path: fileName,
        })

        if (photoInsertError) {
          console.error('Photo record insertion error:', photoInsertError)
          throw new Error(`Ошибка при сохранении записи фото: ${photoInsertError.message}`)
        }
      }

      // Reset form
      setFormData({
        shift_date: format(new Date(), 'yyyy-MM-dd'),
        total_revenue: '',
        cash_balance: '',
        shift_type: 'day',
        user_id: '',
        notes: '',
        encashment: '',
      })
      setPhotos([])
      setShowForm(false)
      
      // Reload shifts
      await loadShifts()
      
      alert('Смена успешно сохранена!')
    } catch (error) {
      console.error('Error submitting shift:', error)
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(`Ошибка при сохранении смены: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  const calculateBonus = () => {
    const revenue = parseFloat(formData.total_revenue) || 0
    // Расчет бонуса: 15% от выручки
    const bonus = revenue * 0.15
    return parseFloat(bonus.toFixed(2))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
          Мои смены
        </h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showForm ? 'Отмена' : 'Закрыть смену'}
          </button>
          <button
            onClick={() => setShowFinesModal(true)}
            className="w-full sm:w-auto bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            Штрафы
          </button>
        </div>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          title="Заработано за смены"
          value={formatCurrency(stats.shiftEarnings)}
          icon={Calendar}
        />
        <StatCard
          title="Примерный заработок"
          value={formatCurrency(stats.estimatedEarnings)}
          icon={TrendingUp}
        />
      </div>

      {/* Штрафы */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Штрафы
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Всего штрафов: {fines.length}
          </span>
        </div>
        
        {fines.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Дата
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Сумма
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                    Комментарий
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {fines.map((fine) => (
                  <tr key={fine.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(fine.date).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                      {formatCurrency(fine.amount)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {fine.comment || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-900 dark:text-gray-100">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-600" />
            <p className="mt-2 text-gray-900 dark:text-gray-100">У вас нет штрафов</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Отчет за смену</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Дата смены
                </label>
                <input
                  type="date"
                  required
                  value={formData.shift_date}
                  onChange={(e) => setFormData({...formData, shift_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Общая выручка (₽)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.total_revenue}
                    onChange={(e) => setFormData({...formData, total_revenue: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Наличные в кассе (₽)
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.cash_balance}
                    onChange={(e) => setFormData({...formData, cash_balance: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Инкассация
                </label>
                <div className="relative">
                  <Wallet className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.encashment}
                    onChange={(e) => setFormData({...formData, encashment: e.target.value})}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                  Тип смены
                </label>
                <select
                  value={formData.shift_type}
                  onChange={(e) => setFormData({...formData, shift_type: e.target.value as 'day' | 'night'})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                >
                  <option value="day">День</option>
                  <option value="night">Ночь</option>
                </select>
              </div>

              {isManager && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                    Кто сдал смену
                  </label>
                  <select
                    required
                    value={formData.user_id}
                    onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
                  >
                    <option value="">Выберите администратора</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        {admin.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                Примечания
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Фотофиксация (обязательно)
              </label>
              <FileUpload
                onFilesChange={setPhotos}
                accept="image/*"
                maxSize={5 * 1024 * 1024}
                maxFiles={10}
              />
            </div>

            {formData.cash_balance && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex items-center">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Предварительная премия: {formatCurrency(calculateBonus())}
                  </span>
                </div>
              </div>
            )}

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
                disabled={uploading || photos.length === 0}
                className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? 'Сохранение...' : photos.length === 0 ? 'Загрузите фото' : 'Сохранить'}
              </button>
            </div>
            
            {photos.length === 0 && (
              <p className="text-sm text-red-600 text-center">
                ⚠️ Необходимо загрузить хотя бы одно фото для сохранения смены
              </p>
            )}
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Дата
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Выручка
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Наличные
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Тип смены
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Премия
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                  Действия
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
                    {formatCurrency(shift.total_revenue)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {formatCurrency(shift.cash_balance)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium">
                    {formatCurrency(shift.bonus_amount)}
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    <button
                      onClick={() => {
                        setSelectedShift(shift)
                        loadShiftPhotos(shift.id)
                      }}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                    >
                      Подробнее
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        
        {shifts.length === 0 && (
          <div className="text-center py-12 text-gray-900 dark:text-gray-100">
            <Calendar className="mx-auto h-12 w-12 text-gray-700 dark:text-gray-500" />
            <p className="mt-2 text-gray-900 dark:text-gray-100">У вас пока нет сохраненных смен</p>
          </div>
        )}
      </div>

      {selectedShift && (
        <Modal
          isOpen={!!selectedShift}
          onClose={() => setSelectedShift(null)}
          title={`Смена от ${format(
            selectedShift.shift_type === 'night' 
              ? new Date(new Date(selectedShift.shift_date).setDate(new Date(selectedShift.shift_date).getDate() - 1))
              : new Date(selectedShift.shift_date), 
            'dd MMM yyyy', { locale: ru })}`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <p className="text-sm text-gray-900 dark:text-gray-100">Общая выручка</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedShift.total_revenue)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <p className="text-sm text-gray-900 dark:text-gray-100">Наличные</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(selectedShift.cash_balance)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded">
              <p className="text-sm text-gray-900 dark:text-gray-100">Премия</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(selectedShift.bonus_amount)}</p>
            </div>
          </div>

              {selectedShift.notes && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2 text-gray-900 dark:text-gray-100">Примечания</h4>
                  <p className="text-gray-900 dark:text-gray-100">{selectedShift.notes}</p>
                </div>
              )}

              <div>
                <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Фотофиксация</h4>
                {shiftPhotos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shiftPhotos.map((photo) => (
                      <div key={photo.id} className="relative">
                        <img
                          src={photo.photo_url}
                          alt="Shift photo"
                          className="w-full h-48 object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-900 dark:text-gray-100">Нет фотографий</p>
                )}
              </div>
        </Modal>
      )}

      {/* Модальное окно штрафов */}
      {showFinesModal && (
        <Modal
          isOpen={showFinesModal}
          onClose={() => setShowFinesModal(false)}
          title="Штрафы за текущий месяц"
        >
          <div className="space-y-4">
            {fines.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Дата
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Сумма
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-900 dark:text-gray-100 uppercase tracking-wider">
                        Комментарий
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {fines
                      .filter(fine => fine.date.startsWith(new Date().toISOString().slice(0, 7)))
                      .map((fine) => (
                        <tr key={fine.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(fine.date).toLocaleDateString('ru-RU')}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 dark:text-red-400 font-medium">
                            {formatCurrency(fine.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            {fine.comment || '-'}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                <div className="mt-4 bg-red-50 dark:bg-red-900/20 p-4 rounded">
                  <p className="text-sm font-medium text-red-800 dark:text-red-400">
                    Всего штрафов за месяц: {formatCurrency(
                      fines
                        .filter(fine => fine.date.startsWith(new Date().toISOString().slice(0, 7)))
                        .reduce((sum, fine) => sum + fine.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-900 dark:text-gray-100">
                <AlertTriangle className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-600" />
                <p className="mt-2 text-gray-900 dark:text-gray-100">У вас нет штрафов за текущий месяц</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}

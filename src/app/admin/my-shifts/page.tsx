'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import { Calendar, DollarSign, CreditCard, Wallet, Image as ImageIcon } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
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
  encashment: number | null
  advance: number | null
  meal_allowance: number | null
  created_at: string
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

  useEffect(() => {
    loadShifts()
  }, [])

  const loadShifts = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .order('shift_date', { ascending: false })

      if (error) throw error

      setAllShifts(data || [])
      setShifts(showOnlyMine ? (data || []).filter(s => s.user_id === user.id) : (data || []))
    } catch (error) {
      console.error('Error loading shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFilter = () => {
    const newValue = !showOnlyMine
    setShowOnlyMine(newValue)
    if (newValue) {
      setShifts(allShifts.filter(s => s.user_id === currentUserId))
    } else {
      setShifts(allShifts)
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

  const totalRevenue = shifts.reduce((sum, s) => sum + (s.total_revenue || 0), 0)
  const totalCash = shifts.reduce((sum, s) => sum + (s.cash_balance || 0), 0)
  const totalBonus = shifts.reduce((sum, s) => sum + (s.bonus_amount || 0), 0)

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Мои смены</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {showOnlyMine ? 'Показаны только ваши смены' : 'Показаны все смены всех администраторов'}
          </p>
        </div>
        <button
          onClick={toggleFilter}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
        >
          {showOnlyMine ? 'Показать все смены' : 'Показать только мои'}
        </button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <DollarSign className="w-4 h-4" /> Выручка
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

      {/* Таблица смен */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : shifts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Смены не найдены</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Тип</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Выручка</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Наличные</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Карта</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Бонус</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400">Фото</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {shifts.map(shift => (
                  <tr key={shift.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm">{format(new Date(shift.shift_date), 'dd.MM.yyyy')}</td>
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
                    <td className="px-4 py-3 text-right font-mono text-sm">{formatCurrency(shift.card_revenue)}</td>
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
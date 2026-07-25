'use client'

import { useState, useEffect, type MouseEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sun, Moon, Edit2, Trash2, Users, ArrowLeft } from 'lucide-react'

interface Admin {
  id: string
  full_name: string
  email: string
  color: string
}

interface PlannedShift {
  id: string
  user_id: string
  shift_date: string
  shift_type: 'day' | 'night'
  users?: {
    full_name: string
    color: string
  }
}

export default function ShiftCalendarPage() {
  const supabase = createClient()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [admins, setAdmins] = useState<Admin[]>([])
  const [plannedShifts, setPlannedShifts] = useState<PlannedShift[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day')
  const [editingMode, setEditingMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [modalShifts, setModalShifts] = useState<PlannedShift[]>([])

  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  useEffect(() => {
    loadAdmins()
    loadPlannedShifts()
  }, [currentDate])

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, color')
        .eq('role', 'admin')
        .order('full_name')

      if (error) throw error
      setAdmins(data || [])
      
      // Автоматически выбираем первого админа
      if (data && data.length > 0 && !selectedAdmin) {
        setSelectedAdmin(data[0])
      }
    } catch (error) {
      console.error('Error loading admins:', error)
    }
  }

  const loadPlannedShifts = async () => {
    try {
      setLoading(true)
      const startDate = format(monthStart, 'yyyy-MM-dd')
      const endDate = format(monthEnd, 'yyyy-MM-dd')

      const { data, error } = await supabase
        .from('planned_shifts')
        .select(`
          *,
          users (
            full_name,
            color
          )
        `)
        .gte('shift_date', startDate)
        .lte('shift_date', endDate)

      if (error) throw error
      setPlannedShifts(data || [])
    } catch (error) {
      console.error('Error loading planned shifts:', error)
    } finally {
      setLoading(false)
    }
  }

  const getShiftsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return plannedShifts.filter(s => s.shift_date === dateStr)
  }

  const handleDayClick = async (date: Date) => {
    // В режиме редактирования цветов — только цвета, смены не ставим/не снимаем
    if (editingMode) {
      return
    }

    if (!selectedAdmin) {
      alert('Выберите администратора')
      return
    }

    const dateStr = format(date, 'yyyy-MM-dd')
    const existingShift = plannedShifts.find(
      s => s.shift_date === dateStr &&
           s.user_id === selectedAdmin.id &&
           s.shift_type === selectedShiftType
    )

    if (existingShift) {
      if (confirm(`Удалить смену «${selectedAdmin.full_name}» (${selectedShiftType === 'day' ? 'День' : 'Ночь'})?`)) {
        const { error } = await supabase.from('planned_shifts').delete().eq('id', existingShift.id)
        if (error) {
          alert(`Ошибка удаления: ${error.message}`)
          return
        }
        await loadPlannedShifts()
      }
    } else {
      try {
        const { error } = await supabase.from('planned_shifts').insert({
          user_id: selectedAdmin.id,
          shift_date: dateStr,
          shift_type: selectedShiftType,
        })

        if (error) {
          if (error.code === '23505') {
            alert('Эта смена уже запланирована')
          } else {
            alert(`Ошибка при создании смены: ${error.message}`)
          }
        } else {
          await loadPlannedShifts()
        }
      } catch (error) {
        console.error('Error creating planned shift:', error)
        alert('Ошибка при создании смены')
      }
    }
  }

  /** Клик по конкретной смене в ячейке — удалить именно её */
  const handleShiftChipClick = async (e: MouseEvent, shift: PlannedShift) => {
    e.stopPropagation()
    if (editingMode) return

    if (!confirm(`Удалить смену «${shift.users?.full_name || 'админ'}» (${shift.shift_type === 'day' ? 'День' : 'Ночь'})?`)) {
      return
    }

    const { error } = await supabase.from('planned_shifts').delete().eq('id', shift.id)
    if (error) {
      alert(`Ошибка удаления: ${error.message}`)
      return
    }
    await loadPlannedShifts()
    if (modalDate) {
      setModalShifts(getShiftsForDate(modalDate).sort((a, b) => {
        if (a.shift_type === b.shift_type) return 0
        return a.shift_type === 'day' ? -1 : 1
      }))
    }
  }

  const openDayModal = (date: Date) => {
    const shifts = getShiftsForDate(date).sort((a, b) => {
      // День сверху, ночь снизу
      if (a.shift_type === b.shift_type) return 0
      return a.shift_type === 'day' ? -1 : 1
    })
    setModalDate(date)
    setModalShifts(shifts)
    setShowModal(true)
  }

  const deletePlannedShift = async (shiftId: string) => {
    if (!confirm('Удалить запланированную смену?')) return

    try {
      const { error } = await supabase.from('planned_shifts').delete().eq('id', shiftId)
      if (error) {
        alert(`Ошибка удаления: ${error.message}`)
        return
      }
      await loadPlannedShifts()
      if (modalDate) {
        setModalShifts(getShiftsForDate(modalDate).sort((a, b) => {
          if (a.shift_type === b.shift_type) return 0
          return a.shift_type === 'day' ? -1 : 1
        }))
      }
    } catch (error) {
      console.error('Error deleting planned shift:', error)
    }
  }

  const updateAdminColor = async (adminId: string, newColor: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ color: newColor })
        .eq('id', adminId)

      if (error) throw error
      
      await loadAdmins()
      await loadPlannedShifts()
    } catch (error) {
      console.error('Error updating color:', error)
    }
  }

  const getDayShifts = (date: Date) => {
    return getShiftsForDate(date).filter(s => s.shift_type === 'day')
  }

  const getNightShifts = (date: Date) => {
    return getShiftsForDate(date).filter(s => s.shift_type === 'night')
  }

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Календарь смен</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Выставляйте смены администраторам. Нажмите на день, чтобы добавить/удалить смену.
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

      {/* Панель управления */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            {/* Выбор типа смены */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Тип смены
              </label>
              <div className="flex rounded-lg border dark:border-gray-600">
                <button
                  onClick={() => setSelectedShiftType('day')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-l-lg transition-colors ${
                    selectedShiftType === 'day'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Sun className="w-4 h-4" /> День
                </button>
                <button
                  onClick={() => setSelectedShiftType('night')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-r-lg transition-colors ${
                    selectedShiftType === 'night'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Moon className="w-4 h-4" /> Ночь
                </button>
              </div>
            </div>

            {/* Выбор администратора */}
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Администратор
              </label>
              <select
                value={selectedAdmin?.id || ''}
                onChange={(e) => {
                  const admin = admins.find(a => a.id === e.target.value)
                  setSelectedAdmin(admin || null)
                }}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {admins.map(admin => (
                  <option key={admin.id} value={admin.id}>{admin.full_name}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEditingMode(!editingMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              editingMode
                ? 'bg-red-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            <Edit2 className="w-4 h-4" />
            {editingMode ? 'Выход из режима цветов' : 'Редактировать цвета'}
          </button>
        </div>

        {/* Палитра админов с цветами */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Администраторы (цвета):</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded-full border-2 border-white shadow cursor-pointer"
                  style={{ backgroundColor: admin.color }}
                  onClick={() => setSelectedAdmin(admin)}
                />
                <span className={`text-sm ${selectedAdmin?.id === admin.id ? 'font-bold' : ''}`}>
                  {admin.full_name}
                </span>
                {editingMode && (
                  <input
                    type="color"
                    value={admin.color}
                    onChange={(e) => updateAdminColor(admin.id, e.target.value)}
                    className="w-8 h-8 p-0 border-0 cursor-pointer"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Календарь */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700">
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
              {day}
            </div>
          ))}

          {daysInMonth.map((day, index) => {
            const dayShifts = getDayShifts(day)
            const nightShifts = getNightShifts(day)
            const isToday = isSameDay(day, new Date())

            return (
              <div
                key={index}
                onClick={() => handleDayClick(day)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  openDayModal(day)
                }}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700 transition-colors ${
                  editingMode
                    ? 'cursor-default opacity-90'
                    : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                } ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-medium ${isToday ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {(dayShifts.length > 0 || nightShifts.length > 0) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDayModal(day)
                      }}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      <Users className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* День всегда сверху */}
                <div className="space-y-0.5 mb-1 min-h-[28px]">
                  {dayShifts.map(shift => (
                    <div
                      key={shift.id}
                      role="button"
                      onClick={(e) => handleShiftChipClick(e, shift)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-0.5 hover:ring-1 hover:ring-white/80"
                      style={{ backgroundColor: shift.users?.color || '#3b82f6' }}
                      title={`${shift.users?.full_name} — День. Клик — удалить`}
                    >
                      <Sun className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{shift.users?.full_name}</span>
                    </div>
                  ))}
                </div>

                {/* Ночь всегда снизу */}
                <div className="space-y-0.5 border-t border-gray-100 dark:border-gray-600 pt-1 min-h-[28px]">
                  {nightShifts.map(shift => (
                    <div
                      key={shift.id}
                      role="button"
                      onClick={(e) => handleShiftChipClick(e, shift)}
                      className="text-[10px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-0.5 opacity-90 hover:ring-1 hover:ring-white/80"
                      style={{ backgroundColor: shift.users?.color || '#3b82f6' }}
                      title={`${shift.users?.full_name} — Ночь. Клик — удалить`}
                    >
                      <Moon className="w-2.5 h-2.5 shrink-0" />
                      <span className="truncate">{shift.users?.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
        {editingMode ? (
          <p className="text-amber-600 dark:text-amber-400 font-medium">
            Режим цветов: постановка и удаление смен отключены. Меняйте только цвета админов.
          </p>
        ) : (
          <>
            <p>ЛКМ по пустому дню — поставить смену выбранного админа (день/ночь).</p>
            <p>ЛКМ по имени на смене — удалить именно эту смену. ПКМ / иконка — список дня.</p>
            <p>В ячейке: <strong>день сверху</strong>, <strong>ночь снизу</strong>.</p>
          </>
        )}
      </div>

      {/* Модальное окно со списком смен на день */}
      {showModal && modalDate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              {format(modalDate, 'dd MMMM yyyy', { locale: ru })}
            </h3>

            {modalShifts.length === 0 ? (
              <p className="text-gray-500">Нет запланированных смен</p>
            ) : (
              <div className="space-y-2">
                {modalShifts.map(shift => (
                  <div
                    key={shift.id}
                    className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-700"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: shift.users?.color }}
                      />
                      <div>
                        <div className="font-medium">{shift.users?.full_name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          {shift.shift_type === 'day' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                          {shift.shift_type === 'day' ? 'День' : 'Ночь'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deletePlannedShift(shift.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 w-full py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
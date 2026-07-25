'use client'

import { useState, useEffect, type MouseEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Sun, Moon, Edit2, Trash2, Users, ArrowLeft, RefreshCw, Palette } from 'lucide-react'
import { ADMIN_COLOR_PALETTE, assignDistinctColors } from '@/lib/admin-colors'

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
  source?: 'google' | 'manual'
  manual_override?: boolean
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
  /** 'all' = показать всех; uuid = фильтр + постановка смен этому админу */
  const [filterAdminId, setFilterAdminId] = useState<string>('all')
  const [selectedShiftType, setSelectedShiftType] = useState<'day' | 'night'>('day')
  const [editingMode, setEditingMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
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
    } catch (error) {
      console.error('Error loading admins:', error)
    }
  }

  const selectedAdmin =
    filterAdminId === 'all' ? null : admins.find(a => a.id === filterAdminId) || null

  /** Смены с учётом фильтра «Все админы» / один админ */
  const visibleShifts =
    filterAdminId === 'all'
      ? plannedShifts
      : plannedShifts.filter(s => s.user_id === filterAdminId)

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
    return visibleShifts.filter(s => s.shift_date === dateStr)
  }

  const handleDayClick = async (date: Date) => {
    // В режиме редактирования цветов — только цвета, смены не ставим/не снимаем
    if (editingMode) {
      return
    }

    if (filterAdminId === 'all' || !selectedAdmin) {
      alert('Выберите конкретного администратора в фильтре (не «Все админы»), чтобы поставить смену.')
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
        await removePlannedShift(existingShift)
      }
    } else {
      try {
        // Ручная постановка руководителем — Google не перезапишет
        const { error } = await supabase.from('planned_shifts').insert({
          user_id: selectedAdmin.id,
          shift_date: dateStr,
          shift_type: selectedShiftType,
          source: 'manual',
          manual_override: true,
        } as any)

        if (error) {
          if (error.code === '23505') {
            // Слот уже есть (например от Google) — помечаем как ручной override
            const { error: upError } = await supabase
              .from('planned_shifts')
              .update({ source: 'manual', manual_override: true } as any)
              .eq('user_id', selectedAdmin.id)
              .eq('shift_date', dateStr)
              .eq('shift_type', selectedShiftType)
            if (upError) {
              alert(`Ошибка: ${upError.message}`)
            } else {
              // Снимаем блок, если был
              await supabase
                .from('planned_shift_blocks')
                .delete()
                .eq('user_id', selectedAdmin.id)
                .eq('shift_date', dateStr)
                .eq('shift_type', selectedShiftType)
              await loadPlannedShifts()
            }
          } else {
            alert(`Ошибка при создании смены: ${error.message}`)
          }
        } else {
          // Если раньше блокровали этот слот — снимаем блок
          await supabase
            .from('planned_shift_blocks')
            .delete()
            .eq('user_id', selectedAdmin.id)
            .eq('shift_date', dateStr)
            .eq('shift_type', selectedShiftType)
          await loadPlannedShifts()
        }
      } catch (error) {
        console.error('Error creating planned shift:', error)
        alert('Ошибка при создании смены')
      }
    }
  }

  /** Удаление смены + блок для Google (чтобы не вернула смену обратно) */
  const removePlannedShift = async (shift: PlannedShift) => {
    const { error } = await supabase.from('planned_shifts').delete().eq('id', shift.id)
    if (error) {
      alert(`Ошибка удаления: ${error.message}`)
      return false
    }

    // Блокируем слот: Google-синк не поставит снова, пока руководитель сам не вернёт
    await supabase.from('planned_shift_blocks').upsert(
      {
        user_id: shift.user_id,
        shift_date: shift.shift_date,
        shift_type: shift.shift_type,
      } as any,
      { onConflict: 'user_id,shift_date,shift_type' }
    )

    await loadPlannedShifts()
    return true
  }

  /** Клик по конкретной смене в ячейке — удалить именно её */
  const handleShiftChipClick = async (e: MouseEvent, shift: PlannedShift) => {
    e.stopPropagation()
    if (editingMode) return

    if (!confirm(`Удалить смену «${shift.users?.full_name || 'админ'}» (${shift.shift_type === 'day' ? 'День' : 'Ночь'})?\n\nGoogle больше не вернёт эту смену, пока вы не поставите её снова вручную.`)) {
      return
    }

    await removePlannedShift(shift)
    if (modalDate) {
      setModalShifts(getShiftsForDate(modalDate).sort((a, b) => {
        if (a.shift_type === b.shift_type) return 0
        return a.shift_type === 'day' ? -1 : 1
      }))
    }
  }

  const syncFromGoogle = async () => {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/manager/sync-google-schedule', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setSyncMessage(data.error || 'Ошибка синхронизации')
        alert(data.error || 'Ошибка синхронизации')
        return
      }
      const s = data.stats || {}
      const msg =
        data.message ||
        `Добавлено: ${s.added ?? 0}, удалено из Google: ${s.removed ?? 0}, ручных не тронуто: ${s.skippedManual ?? 0}`
      setSyncMessage(msg)
      await loadPlannedShifts()
    } catch (e) {
      console.error(e)
      alert('Ошибка сети при синхронизации')
    } finally {
      setSyncing(false)
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

  const deletePlannedShift = async (shift: PlannedShift) => {
    if (!confirm('Удалить запланированную смену? Google не вернёт её, пока вы не поставите снова.')) return

    try {
      await removePlannedShift(shift)
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

  /** Разнести всем админам сильно разные цвета одним кликом */
  const autoAssignDistinctColors = async () => {
    if (admins.length === 0) return
    if (!confirm(`Назначить ${admins.length} админам разные яркие цвета автоматически?`)) return

    try {
      const colors = assignDistinctColors(admins.length)
      await Promise.all(
        admins.map((admin, i) =>
          supabase.from('users').update({ color: colors[i] }).eq('id', admin.id)
        )
      )
      await loadAdmins()
      await loadPlannedShifts()
      alert('Цвета обновлены')
    } catch (error) {
      console.error('Error auto-assigning colors:', error)
      alert('Не удалось назначить цвета')
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
            Расписание из Google + ручные правки. Ручные изменения руководителя Google не перезаписывает.
          </p>
          {syncMessage && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 max-w-xl">{syncMessage}</p>
          )}
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

            {/* Фильтр администратора */}
            <div className="flex-1 min-w-[220px]">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Фильтр: администратор
              </label>
              <select
                value={filterAdminId}
                onChange={(e) => setFilterAdminId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-gray-100"
              >
                <option value="all">Все админы</option>
                {admins.map(admin => (
                  <option key={admin.id} value={admin.id}>
                    {admin.full_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {filterAdminId === 'all'
                  ? 'Показаны все. Для постановки смены выберите админа.'
                  : `Показан: ${selectedAdmin?.full_name}. Клик по дню — смена для него.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={syncFromGoogle}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Синхронизация…' : 'Синк с Google'}
            </button>
            <button
              type="button"
              onClick={autoAssignDistinctColors}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
              title="Разным админам — разные яркие цвета"
            >
              <Palette className="w-4 h-4" />
              Авто-цвета
            </button>
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
        </div>

        {/* Палитра / быстрый фильтр */}
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">Быстрый фильтр:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterAdminId('all')}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                filterAdminId === 'all'
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Все админы
            </button>
            {admins.map(admin => (
              <button
                key={admin.id}
                type="button"
                onClick={() => setFilterAdminId(admin.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                  filterAdminId === admin.id
                    ? 'ring-2 ring-offset-1 ring-indigo-500 border-transparent text-white'
                    : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                }`}
                style={
                  filterAdminId === admin.id
                    ? { backgroundColor: admin.color || '#4f46e5' }
                    : undefined
                }
              >
                <span
                  className="w-3 h-3 rounded-full border border-white/50 shrink-0"
                  style={{ backgroundColor: admin.color || '#3b82f6' }}
                />
                <span className={filterAdminId === admin.id ? 'text-white' : 'text-gray-900 dark:text-gray-100'}>
                  {admin.full_name}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            На календаре: {filterAdminId === 'all' ? `все смены (${visibleShifts.length})` : `только ${selectedAdmin?.full_name || '…'} (${visibleShifts.length})`}
          </p>
        </div>

        {/* Быстрый выбор сильно разных цветов */}
        {editingMode && (
          <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                Выберите админа в фильтре и нажмите цвет — или «Авто-цвета» для всех сразу
              </p>
              <button
                type="button"
                onClick={autoAssignDistinctColors}
                className="text-sm px-3 py-1.5 rounded-lg bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 hover:bg-violet-200"
              >
                Раздать всем разные цвета
              </button>
            </div>

            {/* Общая палитра — клик задаёт цвет выбранному в фильтре админу */}
            <div className="flex flex-wrap gap-2">
              {ADMIN_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  title={color}
                  onClick={() => {
                    if (filterAdminId === 'all' || !selectedAdmin) {
                      alert('Сначала выберите конкретного админа в фильтре (не «Все админы»).')
                      return
                    }
                    updateAdminColor(selectedAdmin.id, color)
                  }}
                  className="w-9 h-9 rounded-lg border-2 border-white shadow-md hover:scale-110 transition-transform ring-1 ring-black/10"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            {/* По каждому админу — своя строка с пресетами */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-900/40"
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white shadow"
                    style={{ backgroundColor: admin.color || '#3b82f6' }}
                  />
                  <span className="text-sm font-medium min-w-[100px] text-gray-900 dark:text-gray-100">
                    {admin.full_name}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {ADMIN_COLOR_PALETTE.map((color) => (
                      <button
                        key={`${admin.id}-${color}`}
                        type="button"
                        title={color}
                        onClick={() => updateAdminColor(admin.id, color)}
                        className={`w-7 h-7 rounded-md border-2 shadow-sm hover:scale-110 transition-transform ${
                          (admin.color || '').toLowerCase() === color.toLowerCase()
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-white/80'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
                      className={`text-[10px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-0.5 hover:ring-1 hover:ring-white/80 ${
                        shift.manual_override || shift.source === 'manual' ? 'ring-1 ring-amber-300' : ''
                      }`}
                      style={{ backgroundColor: shift.users?.color || '#3b82f6' }}
                      title={`${shift.users?.full_name} — День (${shift.source === 'google' && !shift.manual_override ? 'Google' : 'вручную'}). Клик — удалить`}
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
                      className={`text-[10px] px-1.5 py-0.5 rounded text-white truncate flex items-center gap-0.5 opacity-90 hover:ring-1 hover:ring-white/80 ${
                        shift.manual_override || shift.source === 'manual' ? 'ring-1 ring-amber-300' : ''
                      }`}
                      style={{ backgroundColor: shift.users?.color || '#3b82f6' }}
                      title={`${shift.users?.full_name} — Ночь (${shift.source === 'google' && !shift.manual_override ? 'Google' : 'вручную'}). Клик — удалить`}
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
                      type="button"
                      onClick={() => deletePlannedShift(shift)}
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
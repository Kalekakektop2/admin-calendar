import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1 leading-tight">{value}</p>
          {trend && (
            <p className={cn(
              'text-sm mt-1 leading-tight',
              trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </p>
          )}
        </div>
        <div className="ml-4 flex items-center">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-full p-2 sm:p-3 flex items-center justify-center">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900 dark:text-gray-100" />
          </div>
        </div>
      </div>
    </div>
  )
}

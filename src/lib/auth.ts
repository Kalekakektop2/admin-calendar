import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { UserRole } from '@/types/database'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()
  
  if (error || !data) {
    return null
  }
  
  return data.role
}

export async function requireRole(role: UserRole) {
  const user = await requireAuth()
  const userRole = await getUserRole(user.id)
  
  if (userRole !== role) {
    redirect('/unauthorized')
  }
  
  return user
}

export async function requireAnyRole(...roles: UserRole[]) {
  const user = await requireAuth()
  const userRole = await getUserRole(user.id)
  
  if (!userRole || !roles.includes(userRole)) {
    redirect('/unauthorized')
  }
  
  return user
}

export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  const role = await getUserRole(user.id)
  return role === 'admin'
}

export async function isManager(): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false
  
  const role = await getUserRole(user.id)
  return role === 'manager'
}

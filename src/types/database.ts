export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'admin' | 'manager'
export type ShiftType = 'day' | 'night'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          username: string
          role: UserRole
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          username: string
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          username?: string
          role?: UserRole
          created_at?: string
          updated_at?: string
        }
      }
      shifts: {
        Row: {
          id: string
          user_id: string
          shift_date: string
          total_revenue: number
          cash_balance: number
          card_revenue: number
          bonus_amount: number
          shift_type: ShiftType
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          shift_date: string
          total_revenue: number
          cash_balance: number
          card_revenue: number
          bonus_amount?: number
          shift_type?: ShiftType
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          shift_date?: string
          total_revenue?: number
          cash_balance?: number
          card_revenue?: number
          bonus_amount?: number
          shift_type?: ShiftType
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      shift_photos: {
        Row: {
          id: string
          shift_id: string
          photo_url: string
          photo_path: string
          description: string | null
          uploaded_at: string
        }
        Insert: {
          id?: string
          shift_id: string
          photo_url: string
          photo_path: string
          description?: string | null
          uploaded_at?: string
        }
        Update: {
          id?: string
          shift_id?: string
          photo_url?: string
          photo_path?: string
          description?: string | null
          uploaded_at?: string
        }
      }
      bonus_config: {
        Row: {
          id: string
          bonus_percentage: number
          base_bonus_amount: number
          min_revenue_for_bonus: number
          max_bonus_amount: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          bonus_percentage: number
          base_bonus_amount: number
          min_revenue_for_bonus: number
          max_bonus_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          bonus_percentage?: number
          base_bonus_amount?: number
          min_revenue_for_bonus?: number
          max_bonus_amount?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      fines: {
        Row: {
          id: string
          user_id: string
          amount: number
          date: string
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          date: string
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          date?: string
          comment?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_shift_bonus: {
        Args: {
          p_total_revenue: number
        }
        Returns: number
      }
    }
    Enums: {
      user_role: UserRole
      shift_type: ShiftType
    }
  }
}

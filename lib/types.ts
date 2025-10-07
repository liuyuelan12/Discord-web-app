// User types
export interface User {
  id: number
  email: string
  password_hash: string
  expiry_date: string // ISO date string
  created_at: string
}

export interface Admin {
  id: number
  username: string
  password_hash: string
}

export type UserRole = 'admin' | 'user'

export interface Session {
  userId?: number
  email?: string
  role: UserRole
  expiryDate?: string
  [key: string]: unknown
}

export interface DiscordToken {
  id: number
  user_id: number
  token: string
  token_name?: string
  is_valid: boolean
  last_tested?: string
  user_info?: string // JSON string
  created_at: string
}

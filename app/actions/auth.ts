'use server'

import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { adminQueries, userQueries } from '@/lib/db'
import { createSession, deleteSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export interface LoginResult {
  success: boolean
  message: string
}

// Admin login
export async function loginAdmin(
  _prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const username = formData.get('username') as string
  const password = formData.get('password') as string

  if (!username || !password) {
    return { success: false, message: '请输入用户名和密码' }
  }

  const admin = adminQueries.findByUsername(username)

  if (!admin) {
    return { success: false, message: '用户名或密码错误' }
  }

  const isValidPassword = bcrypt.compareSync(password, admin.password_hash)

  if (!isValidPassword) {
    return { success: false, message: '用户名或密码错误' }
  }

  // Create session
  await createSession({
    userId: admin.id,
    role: 'admin',
  })

  redirect('/admin')
}

// User login
export async function loginUser(
  _prevState: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { success: false, message: '请输入邮箱地址和密码' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, message: '邮箱格式不正确' }
  }

  const user = userQueries.findByEmail(email)

  if (!user) {
    return { success: false, message: '邮箱或密码错误' }
  }

  // Verify password
  const isValidPassword = bcrypt.compareSync(password, user.password_hash)

  if (!isValidPassword) {
    return { success: false, message: '邮箱或密码错误' }
  }

  // Check if user account has expired
  if (userQueries.isExpired(user)) {
    return { success: false, message: '您的账号已过期，请联系管理员' }
  }

  // Create session
  await createSession({
    userId: user.id,
    email: user.email,
    role: 'user',
    expiryDate: user.expiry_date,
  })

  redirect('/dashboard')
}

// Logout
export async function logout() {
  await deleteSession()
  redirect('/login')
}

// Grant user access (admin only)
export interface GrantAccessResult {
  success: boolean
  message: string
}

export async function grantUserAccess(
  _prevState: GrantAccessResult | null,
  formData: FormData
): Promise<GrantAccessResult> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const duration = formData.get('duration') as string

  if (!email || !password || !duration) {
    return { success: false, message: '请填写所有字段' }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { success: false, message: '邮箱格式不正确' }
  }

  // Validate password length
  if (password.length < 6) {
    return { success: false, message: '密码至少需要6个字符' }
  }

  // Calculate expiry date
  const now = new Date()
  let expiryDate: Date

  switch (duration) {
    case '1day':
      expiryDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000)
      break
    case '3days':
      expiryDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      break
    case '1week':
      expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
    case '2weeks':
      expiryDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      break
    case '1month':
      expiryDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      break
    case '3months':
      expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
      break
    default:
      return { success: false, message: '无效的有效期' }
  }

  try {
    // Hash the password
    const passwordHash = bcrypt.hashSync(password, 10)

    // Check if user already exists
    const existingUser = userQueries.findByEmail(email)

    if (existingUser) {
      // Update existing user
      userQueries.update(email, passwordHash, expiryDate.toISOString())
      revalidatePath('/admin')
      return { success: true, message: '用户权限已更新' }
    } else {
      // Create new user
      userQueries.create(email, passwordHash, expiryDate.toISOString())
      revalidatePath('/admin')
      return { success: true, message: '用户授权成功' }
    }
  } catch (error) {
    console.error('Failed to grant access:', error)
    return { success: false, message: '授权失败，请重试' }
  }
}

// Revoke user access (admin only)
export async function revokeUserAccess(email: string) {
  try {
    userQueries.deleteByEmail(email)
    revalidatePath('/admin')
    return { success: true, message: '用户权限已撤销' }
  } catch (error) {
    console.error('Failed to revoke access:', error)
    return { success: false, message: '撤销失败，请重试' }
  }
}

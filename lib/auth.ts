import 'server-only'
import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { Session } from './types'
import { userQueries } from './db'

const secretKey = process.env.SESSION_SECRET || 'discord-bot-secret-key-change-in-production'
const encodedKey = new TextEncoder().encode(secretKey)

export async function createSession(session: Session) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  const sessionToken = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(encodedKey)

  const cookieStore = await cookies()
  cookieStore.set('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  })
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session')?.value

  if (!sessionToken) {
    return null
  }

  try {
    const { payload } = await jwtVerify(sessionToken, encodedKey)
    const session = payload as unknown as Session
    
    // 实时验证用户状态
    if (session.email) {
      if (session.role === 'user') {
        // 验证普通用户
        const user = userQueries.findByEmail(session.email)
        
        if (!user) {
          // 用户已被删除，返回 null（页面会处理重定向）
          return null
        }
        
        // 检查是否过期
        const expiryDate = new Date(user.expiry_date)
        if (expiryDate < new Date()) {
          // 用户已过期，返回 null（页面会处理重定向）
          return null
        }
      } else if (session.role === 'admin') {
        // 验证管理员（管理员用 username 而不是 email）
        // 这里不需要验证，因为 admin 不会被动态删除
        // 如果需要，可以添加 adminQueries 验证
      }
    }
    
    return session
  } catch (error) {
    console.error('Failed to verify session:', error)
    return null
  }
}

export async function deleteSession() {
  const cookieStore = await cookies()
  cookieStore.delete('session')
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession()
  return session !== null
}

export async function isAdmin(): Promise<boolean> {
  const session = await getSession()
  return session?.role === 'admin'
}

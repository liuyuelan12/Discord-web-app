import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import type { Session } from './lib/types'

const secretKey = process.env.SESSION_SECRET || 'discord-bot-secret-key-change-in-production'
const encodedKey = new TextEncoder().encode(secretKey)

async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey)
    const session = payload as unknown as Session
    
    // 只验证 JWT 有效性，不查询数据库
    // 实际的用户状态验证由 page 层的 getSession() 和 SessionMonitor 处理
    return session
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/login/admin', '/login/user']
  
  // Check if path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))
  
  // Get session token from cookies
  const sessionToken = request.cookies.get('session')?.value
  const session = sessionToken ? await verifySession(sessionToken) : null
  
  // If user is not authenticated and trying to access protected route
  if (!session && !isPublicPath) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    // 清除无效的 session cookie
    if (sessionToken) {
      response.cookies.delete('session')
    }
    return response
  }
  
  // If user is authenticated and trying to access login page
  if (session && isPublicPath) {
    // Redirect based on role
    if (session.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    } else {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }
  
  // If user is trying to access admin routes without admin role
  if (pathname.startsWith('/admin') && session?.role !== 'admin') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // If regular user is trying to access dashboard
  if (pathname.startsWith('/dashboard') && session?.role === 'admin') {
    return NextResponse.redirect(new URL('/admin', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

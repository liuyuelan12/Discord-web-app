'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function InvalidSessionRedirect() {
  const router = useRouter()

  useEffect(() => {
    // 清除 session cookie 并重定向
    const clearAndRedirect = async () => {
      try {
        await fetch('/api/logout', { method: 'POST' })
      } catch (error) {
        console.error('Logout error:', error)
      } finally {
        router.push('/login')
      }
    }

    clearAndRedirect()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-gray-600">正在重定向到登录页面...</p>
      </div>
    </div>
  )
}

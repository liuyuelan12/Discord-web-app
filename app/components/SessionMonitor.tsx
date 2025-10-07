'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface SessionMonitorProps {
  userEmail?: string
  role: 'admin' | 'user'
}

export default function SessionMonitor({ userEmail, role }: SessionMonitorProps) {
  const router = useRouter()

  useEffect(() => {
    // Only monitor regular users (not admins)
    if (role !== 'user' || !userEmail) {
      return
    }

    // Check user status every 10 seconds
    const checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/check-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: userEmail }),
        })

        const data = await response.json()

        if (!data.valid) {
          // User was revoked or expired, force reload to trigger middleware redirect
          window.location.href = '/login'
        }
      } catch (error) {
        console.error('Failed to check session:', error)
      }
    }, 10000) // Check every 10 seconds

    return () => clearInterval(checkInterval)
  }, [userEmail, role, router])

  return null // This component doesn't render anything
}

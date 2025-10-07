'use client'

import { useState, useTransition } from 'react'
import { revokeUserAccess } from '@/app/actions/auth'
import type { User } from '@/lib/types'

interface UserListProps {
  users: User[]
}

export default function UserList({ users }: UserListProps) {
  const [isPending, startTransition] = useTransition()
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null)

  const handleRevoke = (email: string) => {
    if (!confirm(`确定要撤销 ${email} 的访问权限吗？`)) {
      return
    }

    setRevokingEmail(email)
    startTransition(async () => {
      await revokeUserAccess(email)
      setRevokingEmail(null)
    })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const isExpired = (expiryDate: string) => {
    return new Date() > new Date(expiryDate)
  }

  const getRemainingTime = (expiryDate: string) => {
    const now = new Date()
    const expiry = new Date(expiryDate)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return '已过期'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) {
      return `剩余 ${days} 天`
    } else {
      return `剩余 ${hours} 小时`
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-16 h-16 text-gray-300 mx-auto mb-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        <p className="text-gray-500 font-medium">暂无授权用户</p>
        <p className="text-sm text-gray-400 mt-1">使用左侧表单添加新用户</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {users.map((user) => {
        const expired = isExpired(user.expiry_date)
        const isRevoking = revokingEmail === user.email

        return (
          <div
            key={user.id}
            className={`p-4 rounded-lg border transition ${
              expired
                ? 'bg-red-50 border-red-200'
                : 'bg-gray-50 border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      expired ? 'bg-red-500' : 'bg-green-500'
                    }`}
                  />
                  <p className="font-medium text-gray-900 truncate">
                    {user.email}
                  </p>
                </div>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>过期时间: {formatDate(user.expiry_date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span
                      className={
                        expired ? 'text-red-600 font-semibold' : 'text-green-600'
                      }
                    >
                      {getRemainingTime(user.expiry_date)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRevoke(user.email)}
                disabled={isPending || isRevoking}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-100 rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevoking ? '撤销中...' : '撤销'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

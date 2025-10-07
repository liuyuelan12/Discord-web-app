'use client'

import { useActionState } from 'react'
import { grantUserAccess } from '@/app/actions/auth'

export default function GrantAccessForm() {
  const [state, formAction, pending] = useActionState(grantUserAccess, null)

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          用户邮箱
        </label>
        <input
          type="email"
          id="email"
          name="email"
          required
          placeholder="user@example.com"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-gray-900"
          disabled={pending}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
          用户密码
        </label>
        <input
          type="password"
          id="password"
          name="password"
          required
          placeholder="设置用户密码"
          minLength={6}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-gray-900"
          disabled={pending}
        />
        <p className="text-xs text-gray-500 mt-1">密码至少6个字符</p>
      </div>

      <div>
        <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
          有效期
        </label>
        <select
          id="duration"
          name="duration"
          required
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition text-gray-900"
          disabled={pending}
        >
          <option value="">选择有效期...</option>
          <option value="1day">1 天</option>
          <option value="3days">3 天</option>
          <option value="1week">1 周</option>
          <option value="2weeks">2 周</option>
          <option value="1month">1 个月</option>
          <option value="3months">3 个月</option>
        </select>
      </div>

      {state?.message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            state.success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {state.success ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            <span className="font-medium">{state.message}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 px-4 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            处理中...
          </span>
        ) : (
          '授权访问'
        )}
      </button>
    </form>
  )
}

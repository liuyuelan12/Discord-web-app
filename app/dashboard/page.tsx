import { getSession } from '@/lib/auth'
import LogoutButton from '@/app/components/LogoutButton'
import SessionMonitor from '@/app/components/SessionMonitor'
import InvalidSessionRedirect from '@/app/components/InvalidSessionRedirect'

export default async function UserDashboard() {
  const session = await getSession()

  if (!session || session.role !== 'user') {
    // 使用客户端组件清除 cookie 并重定向
    return <InvalidSessionRedirect />
  }

  const expiryDate = session.expiryDate ? new Date(session.expiryDate) : null
  const now = new Date()
  const daysRemaining = expiryDate
    ? Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <>
      <SessionMonitor userEmail={session.email} role={session.role} />
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">用户面板</h1>
                  <p className="text-xs text-gray-500">{session.email}</p>
                </div>
              </div>
              
              {/* 导航链接 */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md"
                >
                  主页
                </a>
                <a
                  href="/dashboard/tokens"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded-md transition"
                >
                  Token 管理
                </a>
                <a
                  href="/dashboard/scrape"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded-md transition"
                >
                  消息爬取
                </a>
              </div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">欢迎回来！</h2>
              <p className="text-purple-100 text-lg">{session.email}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <p className="text-sm font-medium text-purple-100">账号有效期</p>
              <p className="text-3xl font-bold mt-1">{daysRemaining}</p>
              <p className="text-xs text-purple-100">天</p>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">账号信息</h3>
                <p className="text-sm text-gray-500">您的账号详情</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">邮箱地址</span>
                <span className="text-sm font-medium text-gray-900">{session.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">账号类型</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  普通用户
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">账号状态</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5"></span>
                  活跃
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">订阅信息</h3>
                <p className="text-sm text-gray-500">访问权限到期时间</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">到期日期</span>
                <span className="text-sm font-medium text-gray-900">
                  {expiryDate?.toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-sm text-gray-600">剩余天数</span>
                <span className={`text-sm font-bold ${daysRemaining <= 7 ? 'text-red-600' : 'text-green-600'}`}>
                  {daysRemaining} 天
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-gray-600">到期时间</span>
                <span className="text-sm font-medium text-gray-900">
                  {expiryDate?.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Warning if expiring soon */}
        {daysRemaining <= 7 && daysRemaining > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-8">
            <div className="flex gap-3">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">账号即将过期</h3>
                <p className="text-sm text-yellow-800">
                  您的账号将在 <strong>{daysRemaining}</strong> 天后过期。请联系管理员续期以继续使用服务。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Discord Bot Features */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Discord Bot 功能</h3>
              <p className="text-sm text-gray-600">使用以下功能管理您的 Discord 服务器</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <a href="/dashboard/tokens" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">Token 管理</h4>
              <p className="text-xs text-gray-600">管理 Discord User Tokens</p>
            </a>

            <a href="/dashboard/scrape" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">消息爬取</h4>
              <p className="text-xs text-gray-600">爬取 Discord 频道消息</p>
            </a>

            <a href="/dashboard/auto-post" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">秒删机器人</h4>
              <p className="text-xs text-gray-600">批量发送消息并自动删除</p>
            </a>

            <a href="/dashboard/simulate" className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">对话模拟</h4>
              <p className="text-xs text-gray-600">模拟真实对话，维护回复关系</p>
            </a>

            <div className="p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition cursor-pointer">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-1">命令管理</h4>
              <p className="text-xs text-gray-600">管理 Bot 命令</p>
            </div>
          </div>
        </div>
      </main>
      </div>
    </>
  )
}

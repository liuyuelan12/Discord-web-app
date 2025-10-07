import { getSession } from '@/lib/auth'
import { discordTokenQueries } from '@/lib/db'
import ScrapeManager from './ScrapeManager'
import InvalidSessionRedirect from '@/app/components/InvalidSessionRedirect'

export default async function ScrapePage() {
  const session = await getSession()

  if (!session || session.role !== 'user') {
    return <InvalidSessionRedirect />
  }

  const tokens = discordTokenQueries.getByUserId(session.userId!) as any[]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <a href="/dashboard" className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-700 transition">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </a>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">消息爬取</h1>
                  <p className="text-xs text-gray-500">爬取 Discord 频道消息历史</p>
                </div>
              </div>
              
              {/* 导航链接 */}
              <div className="hidden md:flex items-center gap-1">
                <a
                  href="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded-md transition"
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
                  className="px-3 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-md"
                >
                  消息爬取
                </a>
                <a
                  href="/dashboard/auto-post"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded-md transition"
                >
                  秒删机器人
                </a>
                <a
                  href="/dashboard/simulate"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-gray-50 rounded-md transition"
                >
                  对话模拟
                </a>
              </div>
            </div>
            
            {/* 官方群链接 */}
            <a
              href="https://t.me/TGBdianbao"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-3.146 14.337-3.146 14.337s-.569.996-1.344.996c-.413 0-.87-.287-1.154-.516-.413-.326-6.969-4.481-8.188-5.214-.18-.108-.569-.395-.569-.791 0-.287.18-.503.432-.611 2.771-1.169 12.512-5.214 12.512-5.214s.54-.179.9-.179c.18 0 .36.036.54.143.18.108.288.324.324.54.036.144.036.324.036.504 0 .108-.018.252-.036.396z"/>
              </svg>
              官方群
            </a>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ScrapeManager tokens={tokens} />
      </main>
    </div>
  )
}

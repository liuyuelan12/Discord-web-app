'use client'

import { useState } from 'react'

interface Token {
  id: number
  token: string
  token_name?: string
  is_valid: boolean
  user_info?: string
}

interface ScrapeManagerProps {
  tokens: Token[]
}

export default function ScrapeManager({ tokens }: ScrapeManagerProps) {
  const [selectedTokenId, setSelectedTokenId] = useState<number | ''>('')
  const [channelId, setChannelId] = useState('')
  const [messageLimit, setMessageLimit] = useState('100')
  const [isScraping, setIsScraping] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleScrape = async () => {
    if (!selectedTokenId || !channelId || !messageLimit) {
      alert('请填写所有字段')
      return
    }

    setIsScraping(true)
    setResult(null)

    try {
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenId: selectedTokenId,
          channelId,
          messageLimit: parseInt(messageLimit)
        })
      })

      const data = await response.json()
      setResult(data)

      if (data.success) {
        alert('消息爬取成功！')
      } else {
        alert(`爬取失败: ${data.error}\n${data.details || ''}`)
      }
    } catch (error) {
      console.error('Scrape error:', error)
      alert('爬取失败，请重试')
    } finally {
      setIsScraping(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 爬取表单 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-6">Discord 消息爬取</h2>

        {tokens.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p className="text-gray-500 font-medium">还没有添加任何Token</p>
            <p className="text-sm text-gray-400 mt-1">
              请先到 <a href="/dashboard/tokens" className="text-purple-600 hover:underline">Token 管理</a> 添加 Discord Token
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Token 选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择 Discord Token *
              </label>
              <select
                value={selectedTokenId}
                onChange={(e) => setSelectedTokenId(e.target.value ? parseInt(e.target.value) : '')}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                disabled={isScraping}
              >
                <option value="">请选择一个 Token...</option>
                {tokens.map((token) => {
                  const userInfo = token.user_info ? JSON.parse(token.user_info) : null
                  return (
                    <option key={token.id} value={token.id}>
                      {token.token_name || `Token ${token.id}`}
                      {userInfo && ` - ${userInfo.username}`}
                      {!token.is_valid && ' (未测试)'}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Channel ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                频道 ID 或 Discord URL *
              </label>
              <input
                type="text"
                value={channelId}
                onChange={(e) => {
                  const input = e.target.value.trim()
                  // 检测是否是 Discord URL: https://discord.com/channels/{guild_id}/{channel_id}
                  const urlMatch = input.match(/discord\.com\/channels\/\d+\/(\d+)/)
                  if (urlMatch) {
                    setChannelId(urlMatch[1])
                  } else {
                    setChannelId(input)
                  }
                }}
                placeholder="例如: 1234567890 或 https://discord.com/channels/xxx/xxx"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                disabled={isScraping}
              />
              <p className="text-xs text-gray-500 mt-1">
                💡 支持两种方式：
                <br />
                1. 直接粘贴 Discord URL (https://discord.com/channels/xxx/xxx)
                <br />
                2. 复制频道 ID (右键频道 → 复制 ID)
              </p>
            </div>

            {/* 消息数量 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                爬取消息数量 *
              </label>
              <input
                type="number"
                value={messageLimit}
                onChange={(e) => setMessageLimit(e.target.value)}
                min="1"
                max="10000"
                placeholder="100"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                disabled={isScraping}
              />
              <p className="text-xs text-gray-500 mt-1">
                建议范围: 100-1000，最大 10000
              </p>
            </div>

            {/* 开始爬取按钮 */}
            <button
              onClick={handleScrape}
              disabled={isScraping || !selectedTokenId || !channelId || !messageLimit}
              className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isScraping ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  正在爬取消息...
                </span>
              ) : (
                '开始爬取'
              )}
            </button>
          </div>
        )}
      </div>

      {/* 结果显示 */}
      {result && (
        <div className={`bg-white rounded-xl shadow-sm border p-6 ${result.success ? 'border-green-200' : 'border-red-200'}`}>
          <h3 className={`text-lg font-bold mb-4 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
            {result.success ? '✓ 爬取成功' : '✗ 爬取失败'}
          </h3>
          
          {result.success ? (
            <div className="space-y-4 text-sm">
              <p className="text-gray-700">
                <strong>输出目录:</strong> {result.outputDir}
              </p>
              
              {/* 下载按钮 */}
              <div className="flex gap-3">
                <a
                  href={`/api/scrape/download?path=${encodeURIComponent(result.relativePath || '')}`}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  下载爬取的数据
                </a>
              </div>

              {result.output && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Python 脚本输出:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto">
                    {result.output}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-red-700">
                <strong>错误:</strong> {result.error}
              </p>
              {result.details && (
                <p className="text-red-600">{result.details}</p>
              )}
              {result.stderr && (
                <div className="bg-red-50 rounded-lg p-4 mt-4">
                  <p className="text-xs font-semibold text-red-700 mb-2">错误详情:</p>
                  <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono overflow-x-auto">
                    {result.stderr}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-bold text-blue-900 mb-3">📖 使用说明</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <p><strong>1.</strong> 确保你已经添加并测试了 Discord Token</p>
          <p><strong>2.</strong> 在 Discord 中开启开发者模式: 设置 → 高级 → 开发者模式</p>
          <p><strong>3.</strong> 右键点击要爬取的频道，选择"复制 ID"</p>
          <p><strong>4.</strong> 将 Channel ID 粘贴到上方表单中</p>
          <p><strong>5.</strong> 选择要爬取的消息数量，点击"开始爬取"</p>
          <p><strong>6.</strong> 如果爬取的历史数据包含视频和图片，爬取时间可能超过20分钟，请耐心等待</p>
        </div>
      </div>
    </div>
  )
}

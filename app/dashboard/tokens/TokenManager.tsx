'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

interface Token {
  id: number
  token: string
  token_name?: string
  is_valid: boolean
  last_tested?: string
  user_info?: string
  created_at: string
}

interface TokenManagerProps {
  initialTokens: Token[]
}

export default function TokenManager({ initialTokens }: TokenManagerProps) {
  const router = useRouter()
  const [tokens, setTokens] = useState<Token[]>(initialTokens)
  const [isPending, startTransition] = useTransition()
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMode, setAddMode] = useState<'single' | 'batch'>('single')
  const [newToken, setNewToken] = useState('')
  const [newTokenName, setNewTokenName] = useState('')
  const [batchTokensJson, setBatchTokensJson] = useState('')
  const [testingToken, setTestingToken] = useState<number | null>(null)
  const [testingAll, setTestingAll] = useState(false)
  const [deletingAll, setDeletingAll] = useState(false)

  const handleAddToken = async () => {
    if (!newToken.trim()) {
      alert('请输入Token')
      return
    }

    try {
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: newToken, tokenName: newTokenName })
      })

      if (response.ok) {
        setNewToken('')
        setNewTokenName('')
        setShowAddForm(false)
        startTransition(() => {
          router.refresh()
        })
      } else {
        alert('添加Token失败')
      }
    } catch (error) {
      console.error('Add token error:', error)
      alert('添加Token失败')
    }
  }

  const handleBatchAddTokens = async () => {
    if (!batchTokensJson.trim()) {
      alert('请输入Token数组')
      return
    }

    try {
      // 解析 JSON
      const tokens = JSON.parse(batchTokensJson)
      
      if (!Array.isArray(tokens)) {
        alert('格式错误：必须是数组格式，例如 ["token1", "token2"]')
        return
      }

      // 批量添加
      let successCount = 0
      let failCount = 0

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        if (typeof token !== 'string' || !token.trim()) {
          failCount++
          continue
        }

        try {
          const response = await fetch('/api/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              token: token.trim(), 
              tokenName: `Token ${i + 1}` 
            })
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }

        // 避免触发 rate limit
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      alert(`批量添加完成！\n成功: ${successCount} 个\n失败: ${failCount} 个`)
      setBatchTokensJson('')
      setShowAddForm(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Batch add error:', error)
      alert('JSON 格式错误！请确保格式正确，例如：["token1", "token2", "token3"]')
    }
  }

  const handleTestToken = async (tokenId: number) => {
    setTestingToken(tokenId)
    try {
      const response = await fetch('/api/tokens/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenId })
      })

      const data = await response.json()

      if (data.valid) {
        alert(`Token有效！\n用户: ${data.userInfo.username}`)
      } else {
        alert(`Token无效: ${data.error}`)
      }

      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Test token error:', error)
      alert('测试失败')
    } finally {
      setTestingToken(null)
    }
  }

  const handleDeleteToken = async (tokenId: number) => {
    if (!confirm('确定要删除这个Token吗？')) {
      return
    }

    try {
      const response = await fetch(`/api/tokens?id=${tokenId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        startTransition(() => {
          router.refresh()
        })
      } else {
        alert('删除Token失败')
      }
    } catch (error) {
      console.error('Delete token error:', error)
      alert('删除Token失败')
    }
  }

  const handleTestAllTokens = async () => {
    if (initialTokens.length === 0) {
      alert('没有可测试的Token')
      return
    }

    if (!confirm(`确定要测试所有 ${initialTokens.length} 个 Token 吗？`)) {
      return
    }

    setTestingAll(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const token of initialTokens) {
        try {
          const response = await fetch('/api/tokens/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenId: token.id })
          })

          const data = await response.json()
          if (data.valid) {
            successCount++
          } else {
            failCount++
          }

          // 避免触发 rate limit
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch {
          failCount++
        }
      }

      alert(`测试完成！\n✅ 有效: ${successCount} 个\n❌ 无效: ${failCount} 个`)
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Test all tokens error:', error)
      alert('批量测试失败')
    } finally {
      setTestingAll(false)
    }
  }

  const handleDeleteAllTokens = async () => {
    if (initialTokens.length === 0) {
      alert('没有可删除的Token')
      return
    }

    if (!confirm(`⚠️ 危险操作！\n\n确定要删除所有 ${initialTokens.length} 个 Token 吗？\n\n此操作不可恢复！`)) {
      return
    }

    // 二次确认
    if (!confirm('再次确认：真的要删除所有 Token 吗？')) {
      return
    }

    setDeletingAll(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const token of initialTokens) {
        try {
          const response = await fetch(`/api/tokens?id=${token.id}`, {
            method: 'DELETE'
          })

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      alert(`删除完成！\n✅ 成功: ${successCount} 个\n❌ 失败: ${failCount} 个`)
      startTransition(() => {
        router.refresh()
      })
    } catch (error) {
      console.error('Delete all tokens error:', error)
      alert('批量删除失败')
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 添加Token按钮 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Discord User Tokens</h2>
            <a 
              href="https://docs.google.com/document/d/1nC1iel5yGMQTfYizPKOBqTHnVtgvBHFC4lmV45A4QgI/edit?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1 mt-1"
            >
              📖 如何获取 Discord Token？
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
          <div className="flex gap-2">
            {initialTokens.length > 0 && (
              <>
                <button
                  onClick={handleTestAllTokens}
                  disabled={testingAll}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testingAll ? '测试中...' : '🧪 测试所有'}
                </button>
                <button
                  onClick={handleDeleteAllTokens}
                  disabled={deletingAll}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingAll ? '删除中...' : '🗑️ 删除所有'}
                </button>
              </>
            )}
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition"
            >
              {showAddForm ? '取消' : '+ 添加Token'}
            </button>
          </div>
        </div>

        {/* 添加表单 */}
        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-4">
            {/* 模式切换 */}
            <div className="flex gap-2 border-b border-gray-200 pb-3">
              <button
                onClick={() => setAddMode('single')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  addMode === 'single'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                单个添加
              </button>
              <button
                onClick={() => setAddMode('batch')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  addMode === 'batch'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                批量添加 (JSON)
              </button>
            </div>

            {/* 单个添加表单 */}
            {addMode === 'single' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token 名称（可选）
                  </label>
                  <input
                    type="text"
                    value={newTokenName}
                    onChange={(e) => setNewTokenName(e.target.value)}
                    placeholder="例如：主账号、测试账号"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discord User Token *
                  </label>
                  <textarea
                    value={newToken}
                    onChange={(e) => setNewToken(e.target.value)}
                    placeholder="粘贴你的Discord User Token"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                </div>
                <button
                  onClick={handleAddToken}
                  disabled={!newToken.trim()}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  保存Token
                </button>
              </>
            ) : (
              /* 批量添加表单 */
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token 数组 (JSON 格式) *
                  </label>
                  <textarea
                    value={batchTokensJson}
                    onChange={(e) => setBatchTokensJson(e.target.value)}
                    placeholder={'[\n  "token1",\n  "token2",\n  "token3"\n]'}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    粘贴 JSON 数组格式的 tokens，每个 token 会自动命名为 "Token 1", "Token 2" 等
                  </p>
                </div>
                <button
                  onClick={handleBatchAddTokens}
                  disabled={!batchTokensJson.trim()}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  批量添加
                </button>
              </>
            )}
          </div>
        )}

        {/* Token列表 */}
        {initialTokens.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <p className="text-gray-500 font-medium">还没有添加任何Token</p>
            <p className="text-sm text-gray-400 mt-1">点击上方按钮添加你的第一个Discord Token</p>
          </div>
        ) : (
          <div className="space-y-3">
            {initialTokens.map((token) => {
              const userInfo = token.user_info ? JSON.parse(token.user_info) : null
              return (
                <div
                  key={token.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {token.token_name && (
                          <h3 className="font-semibold text-gray-900">{token.token_name}</h3>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            token.is_valid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {token.is_valid ? '✓ 有效' : '未测试'}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-gray-500 truncate mb-2">
                        {token.token.slice(0, 30)}...{token.token.slice(-10)}
                      </p>
                      {userInfo && (
                        <p className="text-sm text-gray-600">
                          用户: {userInfo.username} ({userInfo.id})
                        </p>
                      )}
                      {token.last_tested && (
                        <p className="text-xs text-gray-400 mt-1">
                          最后测试: {new Date(token.last_tested).toLocaleString('zh-CN')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleTestToken(token.id)}
                        disabled={testingToken === token.id}
                        className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50"
                      >
                        {testingToken === token.id ? '测试中...' : '测试'}
                      </button>
                      <button
                        onClick={() => handleDeleteToken(token.id)}
                        className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

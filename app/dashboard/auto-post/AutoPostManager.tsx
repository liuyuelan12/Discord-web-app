'use client'

import { useState, useEffect } from 'react'

interface Token {
  id: number
  token_name: string | null
  is_valid: boolean
  user_info: string | null
}

interface CSVFile {
  relativePath: string
  name: string
  size: number
}

interface AutoPostManagerProps {
  initialTokens: Token[]
}

export default function AutoPostManager({ initialTokens }: AutoPostManagerProps) {
  const [selectedTokenIds, setSelectedTokenIds] = useState<number[]>([])
  const [channelId, setChannelId] = useState('')
  const [csvFile, setCsvFile] = useState('')
  const [messageDelay, setMessageDelay] = useState('2')
  const [deleteDelay, setDeleteDelay] = useState('1')
  const [isPosting, setIsPosting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [csvFiles, setCsvFiles] = useState<CSVFile[]>([])
  const [loadingCsvFiles, setLoadingCsvFiles] = useState(true)
  const [currentProcessId, setCurrentProcessId] = useState<string | null>(null)
  
  // 上传相关状态
  const [uploadingCsv, setUploadingCsv] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [uploadedMediaFiles, setUploadedMediaFiles] = useState<string[]>([])
  const [useUploadedCsv, setUseUploadedCsv] = useState(false)
  const [folderName, setFolderName] = useState('')  // 文件夹名称
  
  // 待上传文件（选择后暂存）
  const [pendingCsvFile, setPendingCsvFile] = useState<File | null>(null)
  const [pendingMediaFiles, setPendingMediaFiles] = useState<File[]>([])

  // 加载 CSV 文件列表
  useEffect(() => {
    async function loadCsvFiles() {
      try {
        const response = await fetch('/api/csv-files')
        const data = await response.json()
        if (data.csvFiles) {
          setCsvFiles(data.csvFiles)
        }
      } catch (error) {
        console.error('Load CSV files error:', error)
      } finally {
        setLoadingCsvFiles(false)
      }
    }
    loadCsvFiles()
  }, [])

  const handleTokenToggle = (tokenId: number) => {
    setSelectedTokenIds(prev =>
      prev.includes(tokenId)
        ? prev.filter(id => id !== tokenId)
        : [...prev, tokenId]
    )
  }

  // 选择 CSV 文件（暂存，不立即上传）
  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPendingCsvFile(file)
    }
  }

  // 上传 CSV 文件
  const handleCsvUpload = async () => {
    if (!pendingCsvFile) {
      alert('请先选择 CSV 文件')
      return
    }

    if (!folderName.trim()) {
      alert('请先输入文件夹名称')
      return
    }

    setUploadingCsv(true)
    try {
      const formData = new FormData()
      formData.append('file', pendingCsvFile)
      formData.append('type', 'csv')
      formData.append('folderName', folderName.trim())

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setCsvFile(data.path)
        setUseUploadedCsv(true)
        setPendingCsvFile(null)  // 清空待上传文件
        alert(`✓ CSV 文件上传成功: ${data.originalName}\n保存在文件夹: ${data.folderName}`)
      } else {
        alert('上传失败: ' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('CSV upload error:', error)
      alert('上传失败')
    } finally {
      setUploadingCsv(false)
    }
  }

  // 选择媒体文件（暂存，不立即上传）
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setPendingMediaFiles(prev => [...prev, ...Array.from(files)])
    }
  }

  // 上传媒体文件
  const handleMediaUpload = async () => {
    if (pendingMediaFiles.length === 0) {
      alert('请先选择媒体文件')
      return
    }

    if (!folderName.trim()) {
      alert('请先输入文件夹名称')
      return
    }

    setUploadingMedia(true)
    try {
      const uploadedPaths: string[] = []

      for (const file of pendingMediaFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'media')
        formData.append('folderName', folderName.trim())

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const data = await response.json()

        if (data.success) {
          uploadedPaths.push(data.path)
        } else {
          alert(`文件 ${file.name} 上传失败: ${data.error}`)
        }
      }

      if (uploadedPaths.length > 0) {
        setUploadedMediaFiles(prev => [...prev, ...uploadedPaths])
        setPendingMediaFiles([])  // 清空待上传文件
        alert(`✓ 成功上传 ${uploadedPaths.length} 个媒体文件到文件夹: ${folderName}`)
      }
    } catch (error) {
      console.error('Media upload error:', error)
      alert('上传失败')
    } finally {
      setUploadingMedia(false)
    }
  }

  // 移除待上传的媒体文件
  const handleRemovePendingMedia = (index: number) => {
    setPendingMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  // 删除已上传的媒体文件
  const handleRemoveMedia = (path: string) => {
    setUploadedMediaFiles(prev => prev.filter(p => p !== path))
  }

  const handleStopPost = async () => {
    if (!currentProcessId) return

    if (!confirm('确认要停止当前任务吗？')) {
      return
    }

    try {
      const response = await fetch('/api/auto-post/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId: currentProcessId })
      })

      const data = await response.json()

      if (data.success) {
        alert('✓ 任务已停止')
        setIsPosting(false)
        setCurrentProcessId(null)
        setResult({
          success: false,
          error: '任务被手动停止'
        })
      } else {
        alert('停止失败: ' + (data.error || '未知错误'))
      }
    } catch (error) {
      console.error('Stop error:', error)
      alert('停止失败')
    }
  }

  const handleAutoPost = async () => {
    if (selectedTokenIds.length === 0 || !channelId || !csvFile) {
      alert('请填写所有字段')
      return
    }

    if (!confirm(`确认要开始秒删机器人吗？\n\n- 使用 ${selectedTokenIds.length} 个 Token\n- 目标频道: ${channelId}\n- CSV 文件: ${csvFile}\n- 消息间隔: ${messageDelay}秒\n- 删除延迟: ${deleteDelay}秒`)) {
      return
    }

    setIsPosting(true)
    setResult(null)

    try {
      const response = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenIds: selectedTokenIds,
          channelId,
          csvFile,
          messageDelay: parseFloat(messageDelay),
          deleteDelay: parseFloat(deleteDelay),
          mediaFiles: uploadedMediaFiles
        })
      })

      const data = await response.json()
      
      if (data.success && data.processId) {
        // 保存进程 ID
        setCurrentProcessId(data.processId)
        setResult({
          success: true,
          message: data.message || '任务已开始',
          note: data.note
        })
      } else {
        setResult(data)
        setIsPosting(false)
        setCurrentProcessId(null)
      }
    } catch (error) {
      console.error('Auto post error:', error)
      setResult({
        success: false,
        error: '请求失败',
        details: String(error)
      })
      setIsPosting(false)
      setCurrentProcessId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 主表单 */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">秒删机器人配置</h2>

        {initialTokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">还没有添加任何Token</p>
            <a href="/dashboard/tokens" className="text-purple-600 hover:text-purple-700 font-medium">
              前往添加 Token →
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Token 选择 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  选择 Discord Tokens * (可多选，轮流使用)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedTokenIds.length === initialTokens.length) {
                      // 全部已选中，清空选择
                      setSelectedTokenIds([])
                    } else {
                      // 全选
                      setSelectedTokenIds(initialTokens.map(t => t.id))
                    }
                  }}
                  disabled={isPosting}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
                >
                  {selectedTokenIds.length === initialTokens.length ? '取消全选' : '全选'}
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                {initialTokens.map((token) => {
                  const userInfo = token.user_info ? JSON.parse(token.user_info) : null
                  return (
                    <label
                      key={token.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTokenIds.includes(token.id)}
                        onChange={() => handleTokenToggle(token.id)}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        disabled={isPosting}
                      />
                      <span className="text-sm text-gray-900">
                        {token.token_name || `Token ${token.id}`}
                        {userInfo && ` - ${userInfo.username}`}
                        {!token.is_valid && ' (未测试)'}
                      </span>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                已选择 {selectedTokenIds.length} 个 Token
              </p>
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
                  const urlMatch = input.match(/discord\.com\/channels\/\d+\/(\d+)/)
                  if (urlMatch) {
                    setChannelId(urlMatch[1])
                  } else {
                    setChannelId(input)
                  }
                }}
                placeholder="例如: 1234567890 或 https://discord.com/channels/xxx/xxx"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                disabled={isPosting}
              />
            </div>

            {/* CSV 文件选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择 CSV 文件 *
              </label>
              
              {/* CSV 来源切换 */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setUseUploadedCsv(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    !useUploadedCsv
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={isPosting}
                >
                  从爬取的文件选择
                </button>
                <button
                  type="button"
                  onClick={() => setUseUploadedCsv(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    useUploadedCsv
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  disabled={isPosting}
                >
                  上传新文件
                </button>
              </div>

              {/* 上传模式下的文件夹名称输入 */}
              {useUploadedCsv && (
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    文件夹名称 * <span className="text-xs text-gray-500">（用于保存上传的文件，例如：FightID）</span>
                  </label>
                  <input
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    placeholder="例如：FightID"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    disabled={isPosting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    文件将保存到 scrape_data/{'{用户邮箱}'}/{folderName || '文件夹名称'}/
                  </p>
                </div>
              )}

              {!useUploadedCsv ? (
                // 从爬取的文件选择
                loadingCsvFiles ? (
                  <div className="text-gray-500 text-sm">加载文件列表...</div>
                ) : csvFiles.length === 0 ? (
                  <div className="text-gray-500 text-sm">
                    还没有爬取任何消息，请先
                    <a href="/dashboard/scrape" className="text-purple-600 hover:underline ml-1">
                      前往爬取
                    </a>
                  </div>
                ) : (
                  <select
                    value={csvFile}
                    onChange={(e) => setCsvFile(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    disabled={isPosting}
                  >
                    <option value="">请选择 CSV 文件...</option>
                    {csvFiles.map((file) => (
                      <option key={file.relativePath} value={file.relativePath}>
                        {file.relativePath} ({Math.round(file.size / 1024)}KB)
                      </option>
                    ))}
                  </select>
                )
              ) : (
                // 上传新 CSV 文件
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex-1 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 cursor-pointer transition text-center">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvSelect}
                        disabled={uploadingCsv || isPosting}
                        className="hidden"
                      />
                      <span className="text-sm text-gray-700">
                        📁 {pendingCsvFile ? `已选择: ${pendingCsvFile.name}` : '点击选择 CSV 文件'}
                      </span>
                    </label>
                    {pendingCsvFile && !csvFile && (
                      <button
                        onClick={handleCsvUpload}
                        disabled={uploadingCsv || isPosting}
                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                      >
                        {uploadingCsv ? '上传中...' : '上传'}
                      </button>
                    )}
                  </div>
                  {csvFile && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-green-800 flex-1">CSV 文件已上传</span>
                      <button
                        onClick={() => {
                          setCsvFile('')
                          setPendingCsvFile(null)
                        }}
                        className="text-red-600 hover:text-red-700 text-xs"
                        disabled={isPosting}
                      >
                        移除
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    支持 .csv 格式，最大 10MB
                  </p>
                </div>
              )}
            </div>

            {/* 媒体文件上传（可选） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                上传媒体文件（可选）
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex-1 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 cursor-pointer transition text-center">
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={handleMediaSelect}
                      disabled={uploadingMedia || isPosting}
                      className="hidden"
                    />
                    <span className="text-sm text-gray-700">
                      🖼️ 点击选择图片/视频（可多选）
                    </span>
                  </label>
                  {pendingMediaFiles.length > 0 && (
                    <button
                      onClick={handleMediaUpload}
                      disabled={uploadingMedia || isPosting}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition disabled:opacity-50"
                    >
                      {uploadingMedia ? '上传中...' : '上传'}
                    </button>
                  )}
                </div>
                
                {/* 待上传文件列表 */}
                {pendingMediaFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      待上传 {pendingMediaFiles.length} 个文件：
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {pendingMediaFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs"
                        >
                          <span className="flex-1 text-yellow-800 truncate">
                            {file.name}
                          </span>
                          <button
                            onClick={() => handleRemovePendingMedia(index)}
                            className="text-red-600 hover:text-red-700"
                            disabled={isPosting}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* 已上传文件列表 */}
                {uploadedMediaFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      已上传 {uploadedMediaFiles.length} 个文件：
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {uploadedMediaFiles.map((filePath, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-xs"
                        >
                          <span className="flex-1 text-green-800 truncate">
                            {filePath.split('/').pop()}
                          </span>
                          <button
                            onClick={() => handleRemoveMedia(filePath)}
                            className="text-red-600 hover:text-red-700"
                            disabled={isPosting}
                          >
                            删除
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  支持 jpg, png, gif, mp4, mov 格式，每个文件最大 50MB
                </p>
              </div>
            </div>

            {/* 延迟设置 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  消息间隔 (秒) *
                </label>
                <input
                  type="number"
                  value={messageDelay}
                  onChange={(e) => setMessageDelay(e.target.value)}
                  min="0.1"
                  step="0.1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  disabled={isPosting}
                />
                <p className="text-xs text-gray-500 mt-1">发送每条消息之间的等待时间</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  删除延迟 (秒) *
                </label>
                <input
                  type="number"
                  value={deleteDelay}
                  onChange={(e) => setDeleteDelay(e.target.value)}
                  min="0"
                  step="0.1"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                  disabled={isPosting}
                />
                <p className="text-xs text-gray-500 mt-1">发送后等待多久再删除（0=立即）</p>
              </div>
            </div>

            {/* 按钮组 */}
            <div className="flex gap-3">
              <button
                onClick={handleAutoPost}
                disabled={isPosting || selectedTokenIds.length === 0 || !channelId || !csvFile}
                className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPosting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    正在发帖...
                  </span>
                ) : (
                  '🚀 开始秒删机器人'
                )}
              </button>

              {isPosting && currentProcessId && (
                <button
                  onClick={handleStopPost}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
                >
                  ⛔ 停止
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 结果显示 */}
      {result && (
        <div className={`bg-white rounded-xl shadow-sm border p-6 ${result.success ? 'border-green-200' : 'border-red-200'}`}>
          <h3 className={`text-lg font-bold mb-4 ${result.success ? 'text-green-900' : 'text-red-900'}`}>
            {result.success ? '✓ 发帖完成' : '✗ 发帖失败'}
          </h3>
          
          {result.success ? (
            <div className="space-y-2 text-sm">
              {result.output && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">执行日志:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto max-h-96">
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
              {result.stdout && (
                <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">脚本输出:</p>
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono overflow-x-auto">
                    {result.stdout}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 使用说明 */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">📖 使用说明</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• CSV 文件应包含 "内容" 列（从爬取的消息导出）</li>
          <li>• 消息间隔建议设置10秒以上，避免触发 Discord 限制</li>
          <li>• 删除延迟为 0 时，消息发送后立即删除</li>
          <li>• 脚本会自动跳过空消息</li>
        </ul>
      </div>
    </div>
  )
}

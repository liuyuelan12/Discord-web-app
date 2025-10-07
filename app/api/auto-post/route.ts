import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { discordTokenQueries, userQueries } from '@/lib/db'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { processManager } from '@/lib/processManager'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { tokenIds, channelId, csvFile, messageDelay, deleteDelay, mediaFiles } = await request.json()

    // 验证参数
    if (!tokenIds || !Array.isArray(tokenIds) || tokenIds.length === 0) {
      return NextResponse.json({ error: '请至少选择一个 Token' }, { status: 400 })
    }

    if (!channelId) {
      return NextResponse.json({ error: '请输入频道 ID' }, { status: 400 })
    }

    if (!csvFile) {
      return NextResponse.json({ error: '请选择 CSV 文件' }, { status: 400 })
    }

    // 获取用户信息
    const user = userQueries.findByEmail(session.email!)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取 tokens
    const tokens: string[] = []
    for (const tokenId of tokenIds) {
      const tokenRecord = discordTokenQueries.getById(tokenId) as any
      if (tokenRecord && tokenRecord.user_id === session.userId) {
        tokens.push(tokenRecord.token)
      }
    }

    if (tokens.length === 0) {
      return NextResponse.json({ error: '没有有效的 Token' }, { status: 400 })
    }

    // 验证 CSV 文件路径 - 所有文件都在 scrape_data 下
    const userDirName = user.email.replace(/[@.]/g, '_')
    const csvPath = path.join(process.cwd(), 'scrape_data', userDirName, csvFile)

    if (!await fs.access(csvPath).then(() => true).catch(() => false)) {
      return NextResponse.json({ error: 'CSV 文件不存在' }, { status: 404 })
    }

    // 验证并处理媒体文件路径
    const mediaFilePaths: string[] = []
    if (mediaFiles && Array.isArray(mediaFiles)) {
      for (const mediaFile of mediaFiles) {
        const mediaPath = path.join(process.cwd(), 'scrape_data', userDirName, mediaFile)
        if (await fs.access(mediaPath).then(() => true).catch(() => false)) {
          mediaFilePaths.push(mediaPath)
        }
      }
    }

    // 创建临时 tokens 文件
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempTokenFile = path.join(tempDir, `autopost_tokens_${session.userId}_${Date.now()}.json`)
    await fs.writeFile(tempTokenFile, JSON.stringify(tokens), 'utf-8')

    // 使用 spawn 来获取进程对象
    const scriptPath = path.join(process.cwd(), 'script', 'auto_post_delete.py')
    const args = [
      scriptPath,
      '--token-file', tempTokenFile,
      '--channel', channelId,
      '--file', csvPath,
      '--delay', String(messageDelay || 2),
      '--delete-delay', String(deleteDelay || 1)
    ]

    const pythonProcess = spawn('python3', args, {
      cwd: path.join(process.cwd(), 'script')
    })

    // 注册进程到管理器
    const processId = processManager.registerProcess(session.userId!, pythonProcess, 'auto-post')

    // 后台处理进程输出和清理
    let stdout = ''
    let stderr = ''

    pythonProcess.stdout?.on('data', (data) => {
      stdout += data.toString()
      console.log('[Auto-post stdout]:', data.toString())
    })

    pythonProcess.stderr?.on('data', (data) => {
      stderr += data.toString()
      console.error('[Auto-post stderr]:', data.toString())
    })

    pythonProcess.on('exit', async (code) => {
      console.log(`[Auto-post] Process ${processId} exited with code ${code}`)
      // 删除临时文件
      await fs.unlink(tempTokenFile).catch(() => {})
    })

    // 立即返回，不等待进程完成
    return NextResponse.json({
      success: true,
      message: '秒删机器人已开始',
      processId,
      note: '任务正在后台执行，可以点击停止按钮终止'
    })
  } catch (error) {
    console.error('Auto post API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

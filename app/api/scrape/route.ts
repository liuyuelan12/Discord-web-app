import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { discordTokenQueries, userQueries } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs/promises'

const execPromise = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { tokenId, channelId, messageLimit } = await request.json()

    if (!tokenId || !channelId || !messageLimit) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 获取 token
    const tokenRecord = discordTokenQueries.getById(tokenId) as any

    if (!tokenRecord || tokenRecord.user_id !== session.userId) {
      return NextResponse.json({ error: 'Token不存在' }, { status: 404 })
    }

    // 获取用户信息
    const user = userQueries.findByEmail(session.email!)

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 创建输出目录
    const outputDir = path.join(process.cwd(), 'scrape_data', user.email.replace(/[@.]/g, '_'))
    await fs.mkdir(outputDir, { recursive: true })

    // 创建临时 token 文件
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempTokenFile = path.join(tempDir, `scrape_token_${tokenId}_${Date.now()}.json`)
    await fs.writeFile(tempTokenFile, JSON.stringify([tokenRecord.token]), 'utf-8')

    // 构建 Python 脚本命令
    const scriptPath = path.join(process.cwd(), 'script', 'scrape_discord_api.py')
    const command = `python3 "${scriptPath}" --token-file "${tempTokenFile}" -t 0 -c "${channelId}" -l ${messageLimit} -o "${outputDir}"`

    try {
      // 执行 Python 脚本
      const { stdout, stderr } = await execPromise(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        cwd: path.join(process.cwd(), 'script')
      })

      // 删除临时文件
      await fs.unlink(tempTokenFile).catch(() => {})

      // 提取相对路径（用于下载）
      // 从 Python 输出中提取：数据保存位置: /path/to/scrape_data/user_email/ServerName
      const saveLocationMatch = stdout.match(/数据保存位置:\s*(.+)/)
      let relativePath = ''
      
      if (saveLocationMatch) {
        const fullSavePath = saveLocationMatch[1].trim()
        // 提取 ServerName 目录（最后一个目录名）
        relativePath = path.basename(fullSavePath)
      } else {
        // 回退：使用输出目录的最后一个目录名
        relativePath = path.basename(outputDir)
      }

      return NextResponse.json({
        success: true,
        message: '消息爬取完成',
        output: stdout,
        outputDir,
        relativePath
      })
    } catch (error: any) {
      console.error('Scrape execution error:', error)
      
      // 删除临时文件
      await fs.unlink(tempTokenFile).catch(() => {})
      
      return NextResponse.json({
        success: false,
        error: '爬取失败',
        details: error.message,
        stderr: error.stderr
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Scrape API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { discordTokenQueries } from '@/lib/db'
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

    const { tokenId } = await request.json()

    if (!tokenId) {
      return NextResponse.json({ error: '缺少token ID' }, { status: 400 })
    }

    const tokenRecord = discordTokenQueries.getById(tokenId) as any

    if (!tokenRecord || tokenRecord.user_id !== session.userId) {
      return NextResponse.json({ error: 'Token不存在' }, { status: 404 })
    }

    // 创建临时 token 文件
    const tempDir = path.join(process.cwd(), 'temp')
    await fs.mkdir(tempDir, { recursive: true })
    const tempTokenFile = path.join(tempDir, `channels_${tokenId}_${Date.now()}.json`)
    await fs.writeFile(tempTokenFile, JSON.stringify([tokenRecord.token]), 'utf-8')

    try {
      // 调用 Python 脚本列出频道
      const scriptPath = path.join(process.cwd(), 'script', 'scrape_discord_api.py')
      const command = `python3 "${scriptPath}" --token-file "${tempTokenFile}" -t 0 --list`

      const { stdout, stderr } = await execPromise(command, {
        timeout: 30000,
        cwd: path.join(process.cwd(), 'script')
      })

      // 删除临时文件
      await fs.unlink(tempTokenFile).catch(() => {})

      // 解析输出获取频道列表
      const channels: any[] = []
      const lines = stdout.split('\n')
      
      for (const line of lines) {
        // 匹配新格式: "  📝 服务器名称     频道名称     (ID: 1234567890)"
        const match = line.match(/📝\s+(.+?)\s+(.+?)\s+\(ID:\s+(\d+)\)/)
        if (match) {
          channels.push({
            guild: match[1].trim(),
            name: match[2].trim(),
            id: match[3]
          })
        }
      }

      return NextResponse.json({
        success: true,
        channels
      })
    } catch (error: any) {
      console.error('Get channels error:', error)
      
      // 删除临时文件
      await fs.unlink(tempTokenFile).catch(() => {})
      
      return NextResponse.json({
        success: false,
        error: '获取频道列表失败: ' + (error.message || '未知错误')
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Channels API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

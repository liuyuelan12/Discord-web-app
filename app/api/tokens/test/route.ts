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

    // 使用 Python 脚本测试 token（已配置代理）
    try {
      const tempDir = path.join(process.cwd(), 'temp')
      await fs.mkdir(tempDir, { recursive: true })
      const tempTokenFile = path.join(tempDir, `token_${tokenId}_${Date.now()}.json`)
      await fs.writeFile(tempTokenFile, JSON.stringify([tokenRecord.token]), 'utf-8')

      // 调用 Python 测试脚本（默认使用代理，配置在 config.py）
      const scriptPath = path.join(process.cwd(), 'script', 'test_tokens.py')
      const command = `python3 "${scriptPath}" --token-file "${tempTokenFile}"`

      const { stdout, stderr } = await execPromise(command, {
        timeout: 30000, // 30秒超时
        cwd: path.join(process.cwd(), 'script')
      })

      // 删除临时文件
      await fs.unlink(tempTokenFile).catch(() => {})

      // 解析输出判断是否有效
      const isValid = stdout.includes('✅ 有效: 1') || stdout.includes('✅ 有效')
      
      if (isValid) {
        // 尝试从输出中提取用户信息
        const usernameMatch = stdout.match(/用户名:\s*(.+?)#/);
        const idMatch = stdout.match(/用户ID:\s*(\d+)/);
        const emailMatch = stdout.match(/邮箱:\s*(.+?)\n/);
        
        const userInfo = {
          username: usernameMatch ? usernameMatch[1].trim() : 'Unknown',
          id: idMatch ? idMatch[1] : 'Unknown',
          discriminator: '0',
          email: emailMatch ? emailMatch[1].trim() : 'N/A',
          verified: stdout.includes('已验证: 是'),
        }

        // 更新数据库
        discordTokenQueries.updateValidity(tokenId, true, JSON.stringify(userInfo))

        return NextResponse.json({
          valid: true,
          userInfo
        })
      } else {
        // Token无效
        discordTokenQueries.updateValidity(tokenId, false, undefined)
        return NextResponse.json({
          valid: false,
          error: 'Token无效或已过期'
        })
      }
    } catch (error: any) {
      console.error('Test token error:', error)
      return NextResponse.json({
        valid: false,
        error: '测试失败: ' + (error.message || '未知错误')
      })
    }
  } catch (error) {
    console.error('Test token API error:', error)
    return NextResponse.json({ error: '测试token失败' }, { status: 500 })
  }
}

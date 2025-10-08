import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { discordTokenQueries, userQueries } from '@/lib/db'
import type { DiscordToken } from '@/lib/types'
import fs from 'fs/promises'
import path from 'path'

// GET - 列出所有用户的tokens
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail') // 可选，过滤特定用户

    // 获取所有用户
    const users = userQueries.getAll()
    const tokensData: any[] = []

    for (const user of users) {
      // 如果指定了userEmail，只处理该用户
      if (userEmail && user.email !== userEmail) {
        continue
      }

      // 从数据库获取tokens
      const tokens = discordTokenQueries.getByUserId(user.id) as DiscordToken[]

      // 尝试从文件系统获取tokens
      const userDir = path.join(process.cwd(), 'tokens', user.email.replace(/[@.]/g, '_'))
      const tokensFilePath = path.join(userDir, 'tokens.json')
      
      let fileTokens: any[] = []
      try {
        const fileContent = await fs.readFile(tokensFilePath, 'utf-8')
        fileTokens = JSON.parse(fileContent)
      } catch {
        // 文件不存在或读取失败
      }

      tokensData.push({
        user: {
          id: user.id,
          email: user.email,
          expiryDate: user.expiry_date,
          isExpired: userQueries.isExpired(user)
        },
        dbTokens: tokens,
        fileTokens: fileTokens,
        tokenCount: tokens.length,
        hasTokenFile: fileTokens.length > 0
      })
    }

    return NextResponse.json({
      tokens: tokensData,
      totalUsers: tokensData.length,
      totalTokens: tokensData.reduce((sum, t) => sum + t.tokenCount, 0)
    })
  } catch (error) {
    console.error('List tokens error:', error)
    return NextResponse.json({ error: 'Failed to list tokens' }, { status: 500 })
  }
}

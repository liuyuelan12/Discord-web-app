import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { userQueries, discordTokenQueries } from '@/lib/db'
import type { DiscordToken } from '@/lib/types'
import fs from 'fs/promises'
import path from 'path'

// GET - 下载指定用户的tokens文件
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail')
    const format = searchParams.get('format') || 'json' // json 或 txt

    if (!userEmail) {
      return NextResponse.json({ error: 'User email is required' }, { status: 400 })
    }

    // 验证用户存在
    const user = userQueries.findByEmail(userEmail)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // 从数据库获取tokens
    const tokens = discordTokenQueries.getByUserId(user.id) as DiscordToken[]

    let fileContent: string
    let contentType: string
    let fileName: string

    if (format === 'txt') {
      // 纯文本格式，每行一个token
      fileContent = tokens.map(t => t.token).join('\n')
      contentType = 'text/plain'
      fileName = `${userEmail.replace(/[@.]/g, '_')}_tokens.txt`
    } else {
      // JSON格式
      fileContent = JSON.stringify(tokens, null, 2)
      contentType = 'application/json'
      fileName = `${userEmail.replace(/[@.]/g, '_')}_tokens.json`
    }

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': Buffer.byteLength(fileContent).toString(),
      },
    })
  } catch (error) {
    console.error('Download tokens error:', error)
    return NextResponse.json({ error: 'Failed to download tokens' }, { status: 500 })
  }
}

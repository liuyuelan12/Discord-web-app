import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { discordTokenQueries, userQueries } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

// GET - 获取用户的所有tokens
export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const tokens = discordTokenQueries.getByUserId(session.userId!)
    return NextResponse.json({ tokens })
  } catch (error) {
    console.error('Get tokens error:', error)
    return NextResponse.json({ error: '获取tokens失败' }, { status: 500 })
  }
}

// POST - 添加新token
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { token, tokenName } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token不能为空' }, { status: 400 })
    }

    // 保存到数据库
    const newToken = discordTokenQueries.create(session.userId!, token, tokenName)

    // 同时保存到文件系统
    try {
      const user = userQueries.findByEmail(session.email!)
      if (user) {
        // 创建用户目录
        const userDir = path.join(process.cwd(), 'tokens', user.email.replace(/[@.]/g, '_'))
        await fs.mkdir(userDir, { recursive: true })

        // 读取现有 tokens
        const tokensFilePath = path.join(userDir, 'tokens.json')
        let existingTokens: any[] = []
        try {
          const fileContent = await fs.readFile(tokensFilePath, 'utf-8')
          existingTokens = JSON.parse(fileContent)
        } catch {
          // 文件不存在，使用空数组
        }

        // 添加新 token
        existingTokens.push({
          id: (newToken as any).id,
          token: token,
          token_name: tokenName || null,
          created_at: new Date().toISOString()
        })

        // 保存到文件
        await fs.writeFile(tokensFilePath, JSON.stringify(existingTokens, null, 2), 'utf-8')
      }
    } catch (fileError) {
      console.error('Save token to file error:', fileError)
      // 文件保存失败不影响数据库操作
    }

    return NextResponse.json({ token: newToken }, { status: 201 })
  } catch (error) {
    console.error('Create token error:', error)
    return NextResponse.json({ error: '添加token失败' }, { status: 500 })
  }
}

// DELETE - 删除token
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tokenId = searchParams.get('id')

    if (!tokenId) {
      return NextResponse.json({ error: '缺少token ID' }, { status: 400 })
    }

    const id = parseInt(tokenId)

    // 从数据库删除
    discordTokenQueries.delete(id, session.userId!)

    // 同时从文件系统删除
    try {
      const user = userQueries.findByEmail(session.email!)
      if (user) {
        const userDir = path.join(process.cwd(), 'tokens', user.email.replace(/[@.]/g, '_'))
        const tokensFilePath = path.join(userDir, 'tokens.json')

        try {
          const fileContent = await fs.readFile(tokensFilePath, 'utf-8')
          let existingTokens: any[] = JSON.parse(fileContent)

          // 删除指定 ID 的 token
          existingTokens = existingTokens.filter(t => t.id !== id)

          // 保存更新后的 tokens
          await fs.writeFile(tokensFilePath, JSON.stringify(existingTokens, null, 2), 'utf-8')
        } catch {
          // 文件不存在，忽略
        }
      }
    } catch (fileError) {
      console.error('Delete token from file error:', fileError)
      // 文件删除失败不影响数据库操作
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete token error:', error)
    return NextResponse.json({ error: '删除token失败' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { userQueries } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'

export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = userQueries.findByEmail(session.email!)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 获取用户的scrape_data目录
    const userDirName = user.email.replace(/[@.]/g, '_')
    const userDataDir = path.join(process.cwd(), 'scrape_data', userDirName)

    // 检查目录是否存在
    try {
      await fs.access(userDataDir)
    } catch {
      return NextResponse.json({ csvFiles: [] })
    }

    // 递归搜索所有 CSV 文件
    const csvFiles: { relativePath: string; name: string; size: number }[] = []

    async function searchCSV(dir: string, relativePath: string = '') {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name

        if (entry.isDirectory()) {
          await searchCSV(fullPath, relPath)
        } else if (entry.name.endsWith('.csv')) {
          const stats = await fs.stat(fullPath)
          csvFiles.push({
            relativePath: relPath,
            name: entry.name,
            size: stats.size
          })
        }
      }
    }

    await searchCSV(userDataDir)

    return NextResponse.json({ csvFiles })
  } catch (error) {
    console.error('CSV files API error:', error)
    return NextResponse.json({ error: '获取文件列表失败' }, { status: 500 })
  }
}

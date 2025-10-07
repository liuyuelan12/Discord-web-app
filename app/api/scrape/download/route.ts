import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { userQueries } from '@/lib/db'
import archiver from 'archiver'
import path from 'path'
import fs from 'fs'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const outputPath = searchParams.get('path')

    if (!outputPath) {
      return NextResponse.json({ error: '缺少路径参数' }, { status: 400 })
    }

    // 验证路径属于当前用户
    const user = userQueries.findByEmail(session.email!)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const userDirName = user.email.replace(/[@.]/g, '_')
    const fullPath = path.join(process.cwd(), 'scrape_data', userDirName, outputPath)

    // 验证路径存在
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: '数据不存在' }, { status: 404 })
    }

    // 创建 zip 文件
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    const stream = new ReadableStream({
      start(controller) {
        archive.on('data', (chunk) => {
          controller.enqueue(chunk)
        })

        archive.on('end', () => {
          controller.close()
        })

        archive.on('error', (err) => {
          controller.error(err)
        })

        // 添加目录到 zip
        archive.directory(fullPath, false)
        archive.finalize()
      }
    })

    const filename = `${path.basename(fullPath)}.zip`

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json({ error: '下载失败' }, { status: 500 })
  }
}

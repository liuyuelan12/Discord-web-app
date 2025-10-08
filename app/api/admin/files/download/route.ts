import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

// GET - 下载指定文件
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 })
    }

    // 安全检查：确保路径在scrape_data目录内
    const scrapeDataDir = path.join(process.cwd(), 'scrape_data')
    const fullPath = path.join(scrapeDataDir, filePath)
    const normalizedPath = path.normalize(fullPath)

    if (!normalizedPath.startsWith(scrapeDataDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 403 })
    }

    // 读取文件
    const fileBuffer = await fs.readFile(normalizedPath)
    const fileName = path.basename(normalizedPath)

    // 确定Content-Type
    const ext = path.extname(fileName).toLowerCase()
    const contentTypes: { [key: string]: string } = {
      '.csv': 'text/csv',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
    }

    const contentType = contentTypes[ext] || 'application/octet-stream'

    // 将Buffer转换为Uint8Array
    const uint8Array = new Uint8Array(fileBuffer)

    return new Response(uint8Array, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download file error:', error)
    return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
  }
}

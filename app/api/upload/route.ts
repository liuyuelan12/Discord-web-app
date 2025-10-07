import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { userQueries } from '@/lib/db'
import path from 'path'
import fs from 'fs/promises'
import { writeFile } from 'fs/promises'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const user = userQueries.findByEmail(session.email!)
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('type') as string // 'csv' or 'media'
    const folderName = formData.get('folderName') as string // 用户指定的文件夹名称

    if (!file) {
      return NextResponse.json({ error: '请选择文件' }, { status: 400 })
    }

    if (!folderName || folderName.trim() === '') {
      return NextResponse.json({ error: '请输入文件夹名称' }, { status: 400 })
    }

    // 清理文件夹名称，只保留安全字符
    const safeFolderName = folderName.trim().replace(/[^a-zA-Z0-9_\u4e00-\u9fa5-]/g, '_')

    // 验证文件类型
    if (fileType === 'csv') {
      if (!file.name.endsWith('.csv')) {
        return NextResponse.json({ error: '只支持 CSV 文件' }, { status: 400 })
      }
    } else if (fileType === 'media') {
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webp']
      const ext = path.extname(file.name).toLowerCase()
      if (!allowedExtensions.includes(ext)) {
        return NextResponse.json({ 
          error: '只支持图片（jpg, jpeg, png, gif, webp）和视频（mp4, mov）文件' 
        }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: '无效的文件类型' }, { status: 400 })
    }

    // 文件大小限制：CSV 10MB，媒体 50MB
    const maxSize = fileType === 'csv' ? 10 * 1024 * 1024 : 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `文件大小超过限制（${fileType === 'csv' ? '10MB' : '50MB'}）` 
      }, { status: 400 })
    }

    // 创建用户目录结构：scrape_data/{用户邮箱}/{文件夹名称}/
    const userDirName = user.email.replace(/[@.]/g, '_')
    const userFolderPath = path.join(process.cwd(), 'scrape_data', userDirName, safeFolderName)
    
    // 根据文件类型确定保存路径
    const uploadDir = fileType === 'csv' 
      ? userFolderPath  // CSV 直接保存在文件夹根目录
      : path.join(userFolderPath, 'media')  // 媒体文件保存在 media 子文件夹
    
    await fs.mkdir(uploadDir, { recursive: true })

    // 生成文件名
    let fileName: string
    if (fileType === 'csv') {
      // CSV 文件使用固定名称或原文件名
      fileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    } else {
      // 媒体文件添加时间戳避免冲突
      const timestamp = Date.now()
      fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    }
    
    const filePath = path.join(uploadDir, fileName)

    // 保存文件
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // 返回相对路径供后续使用
    const relativePath = fileType === 'csv'
      ? path.join(safeFolderName, fileName)
      : path.join(safeFolderName, 'media', fileName)

    return NextResponse.json({
      success: true,
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      path: relativePath,
      folderName: safeFolderName,
      type: fileType
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '文件上传失败' }, { status: 500 })
  }
}

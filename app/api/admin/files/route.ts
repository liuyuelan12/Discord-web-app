import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import fs from 'fs/promises'
import path from 'path'

// GET - 列出所有用户上传的文件
export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userEmail = searchParams.get('userEmail') // 可选，过滤特定用户

    // 扫描 scrape_data 目录
    const scrapeDataDir = path.join(process.cwd(), 'scrape_data')
    const files: any[] = []

    try {
      const userDirs = await fs.readdir(scrapeDataDir)

      for (const userDir of userDirs) {
        const userDirPath = path.join(scrapeDataDir, userDir)
        const stats = await fs.stat(userDirPath)

        if (!stats.isDirectory()) continue

        // 如果指定了userEmail，只处理该用户
        if (userEmail && userDir !== userEmail.replace(/[@.]/g, '_')) {
          continue
        }

        // 扫描用户的文件夹
        const folders = await fs.readdir(userDirPath)

        for (const folder of folders) {
          const folderPath = path.join(userDirPath, folder)
          const folderStats = await fs.stat(folderPath)

          if (!folderStats.isDirectory()) continue

          // 扫描CSV文件
          const folderFiles = await fs.readdir(folderPath)
          for (const file of folderFiles) {
            const filePath = path.join(folderPath, file)
            const fileStats = await fs.stat(filePath)

            if (fileStats.isFile() && file.endsWith('.csv')) {
              files.push({
                type: 'csv',
                userDir: userDir,
                folder: folder,
                fileName: file,
                size: fileStats.size,
                createdAt: fileStats.birthtime,
                modifiedAt: fileStats.mtime,
                path: path.join(userDir, folder, file)
              })
            }
          }

          // 扫描media文件夹
          const mediaPath = path.join(folderPath, 'media')
          try {
            const mediaFiles = await fs.readdir(mediaPath)
            for (const file of mediaFiles) {
              const filePath = path.join(mediaPath, file)
              const fileStats = await fs.stat(filePath)

              if (fileStats.isFile()) {
                files.push({
                  type: 'media',
                  userDir: userDir,
                  folder: folder,
                  fileName: file,
                  size: fileStats.size,
                  createdAt: fileStats.birthtime,
                  modifiedAt: fileStats.mtime,
                  path: path.join(userDir, folder, 'media', file)
                })
              }
            }
          } catch {
            // media文件夹不存在，跳过
          }
        }
      }
    } catch (error) {
      // scrape_data目录不存在
      console.log('No scrape_data directory found')
    }

    return NextResponse.json({
      files,
      totalCount: files.length,
      totalSize: files.reduce((sum, f) => sum + f.size, 0)
    })
  } catch (error) {
    console.error('List files error:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}

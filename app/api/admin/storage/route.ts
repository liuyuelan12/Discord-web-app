import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { userQueries } from '@/lib/db'
import fs from 'fs/promises'
import path from 'path'

// GET - 获取存储统计信息
export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats: any = {
      users: [],
      totalFiles: 0,
      totalSize: 0,
      byFileType: {
        csv: { count: 0, size: 0 },
        media: { count: 0, size: 0 },
        tokens: { count: 0, size: 0 }
      }
    }

    // 获取所有用户
    const users = userQueries.getAll()

    for (const user of users) {
      const userDir = user.email.replace(/[@.]/g, '_')
      const userStats: any = {
        email: user.email,
        isExpired: userQueries.isExpired(user),
        files: {
          csv: [],
          media: [],
          tokens: []
        },
        totalSize: 0
      }

      // 扫描 scrape_data
      const scrapeDataPath = path.join(process.cwd(), 'scrape_data', userDir)
      try {
        const folders = await fs.readdir(scrapeDataPath)
        
        for (const folder of folders) {
          const folderPath = path.join(scrapeDataPath, folder)
          const folderStats = await fs.stat(folderPath)
          
          if (!folderStats.isDirectory()) continue

          // CSV文件
          const folderFiles = await fs.readdir(folderPath)
          for (const file of folderFiles) {
            const filePath = path.join(folderPath, file)
            const fileStats = await fs.stat(filePath)
            
            if (fileStats.isFile() && file.endsWith('.csv')) {
              userStats.files.csv.push({
                name: file,
                folder: folder,
                size: fileStats.size
              })
              userStats.totalSize += fileStats.size
              stats.byFileType.csv.count++
              stats.byFileType.csv.size += fileStats.size
            }
          }

          // 媒体文件
          const mediaPath = path.join(folderPath, 'media')
          try {
            const mediaFiles = await fs.readdir(mediaPath)
            for (const file of mediaFiles) {
              const filePath = path.join(mediaPath, file)
              const fileStats = await fs.stat(filePath)
              
              if (fileStats.isFile()) {
                userStats.files.media.push({
                  name: file,
                  folder: folder,
                  size: fileStats.size
                })
                userStats.totalSize += fileStats.size
                stats.byFileType.media.count++
                stats.byFileType.media.size += fileStats.size
              }
            }
          } catch {
            // media文件夹不存在
          }
        }
      } catch {
        // scrape_data目录不存在
      }

      // 扫描tokens
      const tokensPath = path.join(process.cwd(), 'tokens', userDir, 'tokens.json')
      try {
        const tokensStats = await fs.stat(tokensPath)
        userStats.files.tokens.push({
          name: 'tokens.json',
          size: tokensStats.size
        })
        userStats.totalSize += tokensStats.size
        stats.byFileType.tokens.count++
        stats.byFileType.tokens.size += tokensStats.size
      } catch {
        // tokens文件不存在
      }

      stats.users.push(userStats)
      stats.totalSize += userStats.totalSize
    }

    stats.totalFiles = 
      stats.byFileType.csv.count + 
      stats.byFileType.media.count + 
      stats.byFileType.tokens.count

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Get storage stats error:', error)
    return NextResponse.json({ error: 'Failed to get storage stats' }, { status: 500 })
  }
}

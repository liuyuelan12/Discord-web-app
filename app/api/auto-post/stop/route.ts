import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { processManager } from '@/lib/processManager'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { processId } = await request.json()

    if (!processId) {
      return NextResponse.json({ error: '缺少进程 ID' }, { status: 400 })
    }

    try {
      const success = processManager.killProcess(processId, session.userId!)
      
      if (success) {
        return NextResponse.json({
          success: true,
          message: '已停止任务'
        })
      } else {
        return NextResponse.json({
          success: false,
          error: '进程不存在或已结束'
        }, { status: 404 })
      }
    } catch (error: any) {
      if (error.message === '无权停止此进程') {
        return NextResponse.json({
          success: false,
          error: '无权停止此进程'
        }, { status: 403 })
      }
      throw error
    }
  } catch (error) {
    console.error('Stop process API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

// 获取用户的所有运行中进程
export async function GET() {
  try {
    const session = await getSession()

    if (!session || session.role !== 'user') {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const processes = processManager.getUserProcesses(session.userId!)

    return NextResponse.json({ processes })
  } catch (error) {
    console.error('Get processes API error:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

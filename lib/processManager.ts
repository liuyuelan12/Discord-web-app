import { ChildProcess } from 'child_process'

interface ProcessInfo {
  userId: number
  process: ChildProcess
  startTime: Date
  type: 'auto-post' | 'scrape'
}

// 全局进程管理器
class ProcessManager {
  private processes: Map<string, ProcessInfo> = new Map()

  // 生成进程 ID
  private generateProcessId(userId: number, type: string): string {
    return `${userId}-${type}-${Date.now()}`
  }

  // 注册进程
  registerProcess(userId: number, process: ChildProcess, type: 'auto-post' | 'scrape'): string {
    const processId = this.generateProcessId(userId, type)
    this.processes.set(processId, {
      userId,
      process,
      startTime: new Date(),
      type
    })

    // 进程结束时自动清理
    process.on('exit', () => {
      this.processes.delete(processId)
    })

    return processId
  }

  // 停止进程（带用户验证）
  killProcess(processId: string, userId: number): boolean {
    const processInfo = this.processes.get(processId)
    
    if (!processInfo) {
      return false // 进程不存在
    }

    if (processInfo.userId !== userId) {
      throw new Error('无权停止此进程') // 不是用户的进程
    }

    try {
      processInfo.process.kill('SIGTERM')
      this.processes.delete(processId)
      return true
    } catch (error) {
      console.error('Kill process error:', error)
      return false
    }
  }

  // 获取用户的所有进程
  getUserProcesses(userId: number): Array<{ id: string; type: string; startTime: Date }> {
    const userProcesses: Array<{ id: string; type: string; startTime: Date }> = []
    
    this.processes.forEach((info, id) => {
      if (info.userId === userId) {
        userProcesses.push({
          id,
          type: info.type,
          startTime: info.startTime
        })
      }
    })

    return userProcesses
  }

  // 清理超时进程（可选）
  cleanupStaleProcesses(maxAgeMinutes: number = 60) {
    const now = new Date().getTime()
    const maxAge = maxAgeMinutes * 60 * 1000

    this.processes.forEach((info, id) => {
      if (now - info.startTime.getTime() > maxAge) {
        try {
          info.process.kill('SIGTERM')
        } catch {}
        this.processes.delete(id)
      }
    })
  }
}

// 导出单例
export const processManager = new ProcessManager()

import { NextResponse } from 'next/server'

// 这是一个遗留端点，已废弃
// 保留此路由只是为了避免浏览器缓存的旧代码产生 404 错误
export async function GET() {
  return NextResponse.json({ deprecated: true, message: '此端点已废弃，请清除浏览器缓存' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ deprecated: true, message: '此端点已废弃，请清除浏览器缓存' }, { status: 410 })
}

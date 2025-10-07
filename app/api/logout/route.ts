import { NextRequest, NextResponse } from 'next/server'
import { deleteSession } from '@/lib/auth'

export async function POST() {
  await deleteSession()
  return NextResponse.json({ success: true })
}

export async function GET(request: NextRequest) {
  await deleteSession()
  
  const searchParams = request.nextUrl.searchParams
  const redirectTo = searchParams.get('redirect') || '/login'
  
  return NextResponse.redirect(new URL(redirectTo, request.url))
}

import { NextRequest, NextResponse } from 'next/server'
import { userQueries } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }

    // Check if user still exists
    const user = userQueries.findByEmail(email)

    if (!user) {
      return NextResponse.json({ valid: false })
    }

    // Check if user account has expired
    if (userQueries.isExpired(user)) {
      return NextResponse.json({ valid: false })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Error checking session:', error)
    return NextResponse.json({ valid: false }, { status: 500 })
  }
}

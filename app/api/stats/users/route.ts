import { userQueries } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET() {
  // Check authentication
  const session = await getSession()
  
  if (!session || session.role !== 'admin') {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const users = userQueries.getAll()
    const now = new Date()
    
    const activeUsers = users.filter(user => {
      const expiry = new Date(user.expiry_date)
      return now <= expiry
    })
    
    const expiredUsers = users.filter(user => {
      const expiry = new Date(user.expiry_date)
      return now > expiry
    })

    return Response.json({
      totalUsers: users.length,
      activeUsers: activeUsers.length,
      expiredUsers: expiredUsers.length,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        expiryDate: user.expiry_date,
        createdAt: user.created_at,
        isExpired: userQueries.isExpired(user)
      }))
    })
  } catch (error) {
    console.error('Error fetching user stats:', error)
    return Response.json({ error: 'Failed to fetch user statistics' }, { status: 500 })
  }
}

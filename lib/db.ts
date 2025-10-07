import Database from 'better-sqlite3'
import { join } from 'path'
import bcrypt from 'bcryptjs'
import type { User, Admin } from './types'

// Initialize database
const dbPath = join(process.cwd(), 'data', 'discord-bot.db')
const db = new Database(dbPath)

// Enable foreign keys
db.pragma('foreign_keys = ON')

// Initialize tables
function initDatabase() {
  // Create admins table
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `)

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      expiry_date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create discord_tokens table
  db.exec(`
    CREATE TABLE IF NOT EXISTS discord_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      token_name TEXT,
      is_valid BOOLEAN DEFAULT 1,
      last_tested TEXT,
      user_info TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Check if admin exists, if not create default admin
  try {
    const adminExists = db
      .prepare('SELECT COUNT(*) as count FROM admins WHERE username = ?')
      .get('fchow') as { count: number }

    if (adminExists.count === 0) {
      const passwordHash = bcrypt.hashSync('Discord.!2022', 10)
      db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run(
        'fchow',
        passwordHash
      )
      console.log('✅ Default admin account created')
    }
  } catch (error) {
    // Admin might already exist, ignore error
    console.log('Admin account already exists')
  }
}

// Initialize database on import
initDatabase()

// Admin queries
export const adminQueries = {
  findByUsername: (username: string): Admin | undefined => {
    return db
      .prepare('SELECT * FROM admins WHERE username = ?')
      .get(username) as Admin | undefined
  },
}

// User queries
export const userQueries = {
  findByEmail: (email: string): User | undefined => {
    return db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email) as User | undefined
  },

  create: (email: string, passwordHash: string, expiryDate: string): User => {
    const result = db
      .prepare(
        'INSERT INTO users (email, password_hash, expiry_date) VALUES (?, ?, ?) RETURNING *'
      )
      .get(email, passwordHash, expiryDate) as User

    return result
  },

  update: (email: string, passwordHash: string, expiryDate: string): void => {
    db.prepare('UPDATE users SET password_hash = ?, expiry_date = ? WHERE email = ?').run(
      passwordHash,
      expiryDate,
      email
    )
  },

  deleteByEmail: (email: string): void => {
    db.prepare('DELETE FROM users WHERE email = ?').run(email)
  },

  getAll: (): User[] => {
    return db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as User[]
  },

  isExpired: (user: User): boolean => {
    const now = new Date()
    const expiry = new Date(user.expiry_date)
    return now > expiry
  },
}

// Discord Token queries
export const discordTokenQueries = {
  create: (userId: number, token: string, tokenName?: string) => {
    return db
      .prepare('INSERT INTO discord_tokens (user_id, token, token_name) VALUES (?, ?, ?) RETURNING *')
      .get(userId, token, tokenName || null)
  },

  getByUserId: (userId: number) => {
    return db
      .prepare('SELECT * FROM discord_tokens WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId)
  },

  getById: (id: number) => {
    return db
      .prepare('SELECT * FROM discord_tokens WHERE id = ?')
      .get(id)
  },

  updateValidity: (id: number, isValid: boolean, userInfo?: string) => {
    return db
      .prepare("UPDATE discord_tokens SET is_valid = ?, last_tested = datetime('now'), user_info = ? WHERE id = ?")
      .run(isValid ? 1 : 0, userInfo || null, id)
  },

  delete: (id: number, userId: number) => {
    return db
      .prepare('DELETE FROM discord_tokens WHERE id = ? AND user_id = ?')
      .run(id, userId)
  },
}

export default db

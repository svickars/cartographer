import { neon } from '@neondatabase/serverless'

let cached: ReturnType<typeof neon> | null = null

export function getNeonSql() {
  const url = process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim()
  if (!url) return null
  if (!cached) cached = neon(url)
  return cached
}

import { PrismaClient } from '@/app/generated/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// IMPORTANT: Your DATABASE_URL must use:
// - Port 5432 (direct connection) OR
// - Port 6543 WITHOUT pgbouncer=true (session pooler)
//
// ❌ WRONG: ...pooler.supabase.com:6543/postgres?pgbouncer=true
// ✅ RIGHT: ...pooler.supabase.com:5432/postgres?sslmode=require
// ✅ RIGHT: ...pooler.supabase.com:6543/postgres?sslmode=require (no pgbouncer)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


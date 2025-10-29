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

// Optimize connection pool
prisma.$connect().catch((err) => {
  console.error('Failed to connect to database:', err);
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma


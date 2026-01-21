import type { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

export {}

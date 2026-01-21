const { PrismaClient } = require('@prisma/client');

const globalForPrisma: typeof globalThis & {
  __prisma?: import('@prisma/client').PrismaClient
} = globalThis;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = { prisma };


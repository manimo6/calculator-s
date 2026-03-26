const crypto = require('crypto');
const { prisma } = require('../db/prisma');
const { hashPassword } = require('./passwordUtils');

async function listManagedUsers() {
  return prisma.user.findMany({
    select: { username: true, role: true },
    orderBy: { username: 'asc' },
  });
}

async function createManagedUser({
  username,
  role,
}: {
  username: string
  role: string
}) {
  const initialPassword = '0';
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      username,
      role,
      ...hashPassword(initialPassword),
      mustChangePassword: true,
    },
  });
}

async function updateManagedUser({
  username,
  password,
  role,
}: {
  username: string
  password?: string
  role: string
}) {
  const updateData = {
    role,
    ...(password ? { ...hashPassword(password), mustChangePassword: true } : {}),
    tokenVersion: { increment: 1 },
  };
  return prisma.user.update({ where: { username }, data: updateData });
}

async function upsertManagedUser({
  username,
  password,
  role,
}: {
  username: string
  password?: string
  role: string
}) {
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) {
    await createManagedUser({ username, role });
    return 'created';
  }

  await updateManagedUser({ username, password, role });
  return 'updated';
}

async function deleteManagedUser(username: string) {
  return prisma.user.deleteMany({ where: { username } });
}

module.exports = {
  deleteManagedUser,
  listManagedUsers,
  updateManagedUser,
  upsertManagedUser,
};

// force-reset.ts
// 사용법: RESET_USER=username RESET_PASS=newpassword npx ts-node force-reset.ts
const { PrismaClient } = require('@prisma/client') as typeof import('@prisma/client');
const { hashPassword } = require('./services/passwordUtils');
const { randomUUID } = require('crypto') as typeof import('crypto');

const prisma = new PrismaClient();

const USERNAME = process.env.RESET_USER;
const NEW_PASSWORD = process.env.RESET_PASS;

if (!USERNAME || !NEW_PASSWORD) {
  console.error('사용법: RESET_USER=username RESET_PASS=newpassword npx ts-node force-reset.ts');
  process.exit(1);
}

async function main() {
  console.log(`Checking user: ${USERNAME}...`);
  const user = await prisma.user.findUnique({ where: { username: USERNAME } });

  if (user) {
    console.log(`User found (ID: ${user.id}). Updating password...`);
    const { salt, hash } = hashPassword(NEW_PASSWORD);
    await prisma.user.update({
      where: { username: USERNAME },
      data: { salt, hash },
    });
    console.log('SUCCESS: Password updated!');
  } else {
    console.log('User NOT found. Creating new user...');
    const { salt, hash } = hashPassword(NEW_PASSWORD);
    await prisma.user.create({
      data: {
        id: randomUUID(),
        username: USERNAME,
        role: 'master',
        salt,
        hash,
      },
    });
    console.log('SUCCESS: User created with password!');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());

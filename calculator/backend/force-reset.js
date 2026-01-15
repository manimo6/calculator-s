// force-reset.js
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

const USERNAME = 'haminone';
const NEW_PASSWORD = '1234';

function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    return {
        salt: salt.toString('base64'),
        hash: hash.toString('base64'),
        iterations: 100000,
        keylen: 32,
        digest: 'sha256',
    };
}

async function main() {
    console.log(`Checking user: ${USERNAME}...`);
    const user = await prisma.user.findUnique({ where: { username: USERNAME } });

    if (user) {
        console.log(`User found (ID: ${user.id}). Updating password to '${NEW_PASSWORD}'...`);
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
                username: USERNAME,
                role: 'master', // Assuming master role, change if needed
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

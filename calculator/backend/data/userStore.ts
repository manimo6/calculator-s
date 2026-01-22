const fs = require('fs').promises;
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');

type UserRecord = Record<string, unknown> & { username?: string }

async function readUsers(): Promise<UserRecord[]> {
  try {
    const data = await fs.readFile(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeUsers(users: UserRecord[]) {
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function findUser(username: string) {
  const users = await readUsers();
  return users.find((u) => u.username === username);
}

async function upsertUser(user: UserRecord) {
  const users = await readUsers();
  const idx = users.findIndex((u) => u.username === user.username);
  if (idx > -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  await writeUsers(users);
}

async function deleteUser(username: string) {
  const users = await readUsers();
  const filtered = users.filter((u) => u.username !== username);
  await writeUsers(filtered);
}

module.exports = {
  readUsers,
  writeUsers,
  findUser,
  upsertUser,
  deleteUser,
};

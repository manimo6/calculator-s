const { REDIS_URL } = process.env;

type RedisClient = {
  incr(key: string): Promise<number>
  pExpire(key: string, windowMs: number): Promise<void>
  del(key: string): Promise<void>
  on(event: string, handler: () => void): void
  connect(): Promise<void>
}

let redisClient: RedisClient | null = null;
let redisInitPromise: Promise<RedisClient | null> | null = null;

const localAttempts = new Map();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

function cleanupLocalAttempts() {
  const now = Date.now();
  for (const [key, entry] of localAttempts.entries()) {
    if (!entry || now > entry.resetAt) {
      localAttempts.delete(key);
    }
  }
}

const cleanupTimer = setInterval(cleanupLocalAttempts, CLEANUP_INTERVAL_MS);
if (typeof cleanupTimer.unref === 'function') {
  cleanupTimer.unref();
}

async function getRedisClient() {
  if (!REDIS_URL) return null;
  if (redisInitPromise) return redisInitPromise;
  const { createClient } = require('redis');
  const client = createClient({ url: REDIS_URL });
  client.on('error', () => {});
  redisClient = client as RedisClient;
  redisInitPromise = client
    .connect()
    .then(() => redisClient)
    .catch(() => null);
  return redisInitPromise;
}

function incrementLocal(key: string, windowMs: number) {
  const now = Date.now();
  const entry = localAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    localAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

async function increment(key: string, windowMs: number) {
  if (!key) return 0;
  const client = await getRedisClient();
  if (client) {
    try {
      const count = await client.incr(key);
      if (count === 1) {
        await client.pExpire(key, windowMs);
      }
      return count;
    } catch (err) {
      return incrementLocal(key, windowMs);
    }
  }
  return incrementLocal(key, windowMs);
}

async function reset(key: string) {
  if (!key) return;
  const client = await getRedisClient();
  if (client) {
    try {
      await client.del(key);
      return;
    } catch (err) {
      // fallback to local delete below
    }
  }
  localAttempts.delete(key);
}

async function isRateLimited(keys: string[], windowMs: number, max: number) {
  if (!Array.isArray(keys) || keys.length === 0) return false;
  const counts: number[] = await Promise.all(
    keys.map((key) => increment(key, windowMs))
  );
  return counts.some((count) => count > max);
}

async function clearAttempts(keys: string[]) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  await Promise.all(keys.map((key) => reset(key)));
}

module.exports = {
  isRateLimited,
  clearAttempts,
};

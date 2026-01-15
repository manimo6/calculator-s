const { REDIS_URL } = process.env;

let redisClient = null;
let redisInitPromise = null;

const localAttempts = new Map();

async function getRedisClient() {
  if (!REDIS_URL) return null;
  if (redisInitPromise) return redisInitPromise;
  const { createClient } = require('redis');
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', () => {});
  redisInitPromise = redisClient
    .connect()
    .then(() => redisClient)
    .catch(() => null);
  return redisInitPromise;
}

function incrementLocal(key, windowMs) {
  const now = Date.now();
  const entry = localAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    localAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

async function increment(key, windowMs) {
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

async function reset(key) {
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

async function isRateLimited(keys, windowMs, max) {
  if (!Array.isArray(keys) || keys.length === 0) return false;
  const counts = await Promise.all(keys.map((key) => increment(key, windowMs)));
  return counts.some((count) => count > max);
}

async function clearAttempts(keys) {
  if (!Array.isArray(keys) || keys.length === 0) return;
  await Promise.all(keys.map((key) => reset(key)));
}

module.exports = {
  isRateLimited,
  clearAttempts,
};

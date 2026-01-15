const { sign } = require('../services/authToken');
const { issueRefreshToken } = require('../services/refreshTokenService');
const { prisma } = require('../db/prisma');

const BASE_URL = process.env.SECURITY_TEST_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
const RATE_LIMIT_MAX = 10;
const TEST_USERNAME = process.env.SECURITY_TEST_USERNAME || 'haminone';
const TEST_ROLE = process.env.SECURITY_TEST_ROLE || 'master';
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || 'refresh_token';
const TEST_REFRESH = process.env.SECURITY_TEST_REFRESH === '1';

function parseSetCookie(headers) {
  const cookies = {};
  const setCookies = headers.getSetCookie ? headers.getSetCookie() : [];
  for (const line of setCookies) {
    const pair = line.split(';')[0] || '';
    const index = pair.indexOf('=');
    if (index > 0) {
      const name = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      cookies[name] = value;
    }
  }
  return cookies;
}

async function request(path, { method = 'GET', headers = {}, body, cookie } = {}) {
  const finalHeaders = { ...headers };
  if (cookie) finalHeaders.cookie = cookie;
  if (body && !finalHeaders['content-type']) {
    finalHeaders['content-type'] = 'application/json';
  }
  const resp = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body,
  });
  return resp;
}

async function main() {
  const now = Math.floor(Date.now() / 1000);
  const rawTokenVersion = process.env.SECURITY_TEST_TOKEN_VERSION;
  const parsedTokenVersion = Number.parseInt(rawTokenVersion, 10);
  const tokenVersion = Number.isInteger(parsedTokenVersion) ? parsedTokenVersion : 0;
  const token = await sign({
    username: TEST_USERNAME,
    role: TEST_ROLE,
    reauthAt: now,
    tokenVersion,
  });

  const results = {};

  const noAuth = await request('/api/auth/me');
  results.meNoAuth = noAuth.status;

  const meResp = await request('/api/auth/me', {
    cookie: `auth_token=${token}`,
  });
  results.meWithCookie = meResp.status;
  const meCookies = parseSetCookie(meResp.headers);
  results.csrfCookie = Boolean(meCookies.csrf_token);

  const logoutNoCsrf = await request('/api/auth/logout', {
    method: 'POST',
    cookie: `auth_token=${token}`,
  });
  results.logoutNoCsrf = logoutNoCsrf.status;

  const csrfToken = meCookies.csrf_token || 'csrf-test';
  const logoutOk = await request('/api/auth/logout', {
    method: 'POST',
    cookie: `auth_token=${token}; csrf_token=${csrfToken}`,
    headers: { 'X-CSRF-Token': csrfToken },
  });
  results.logoutWithCsrf = logoutOk.status;

  let rateLimitStatus = null;
  for (let i = 0; i < RATE_LIMIT_MAX + 1; i += 1) {
    const resp = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'invalid-user', password: 'invalid-pass' }),
    });
    rateLimitStatus = resp.status;
  }
  results.rateLimitStatus = rateLimitStatus;

  if (TEST_REFRESH) {
    const user = await prisma.user.findUnique({ where: { username: TEST_USERNAME } });
    if (!user) {
      results.refreshStatus = 'skipped';
    } else {
      const issued = await issueRefreshToken(user);
      const refreshResp = await request('/api/auth/refresh', {
        method: 'POST',
        cookie: `${REFRESH_COOKIE_NAME}=${issued.token}`,
      });
      results.refreshStatus = refreshResp.status;
    }
  }

  console.log(JSON.stringify(results, null, 2));

  const ok =
    results.meNoAuth === 401 &&
    results.meWithCookie === 200 &&
    results.csrfCookie === true &&
    results.logoutNoCsrf === 403 &&
    results.logoutWithCsrf === 200 &&
    results.rateLimitStatus === 429 &&
    (!TEST_REFRESH || results.refreshStatus === 200);

  if (!ok) {
    await prisma.$disconnect();
    process.exit(1);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  prisma.$disconnect().catch(() => {});
  process.exit(1);
});

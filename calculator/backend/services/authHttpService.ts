const { clearAttempts } = require('./rateLimiter');
const {
  setAuthCookies,
} = require('./authCookies');

const AUTH_MESSAGES = {
  loginRateLimited:
    '\uB85C\uADF8\uC778 \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
  reauthRateLimited:
    '\uC7AC\uC778\uC99D \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
  passwordRateLimited:
    '\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
  refreshRateLimited:
    '\uD1A0\uD070 \uAC31\uC2E0 \uC2DC\uB3C4\uAC00 \uB108\uBB34 \uB9CE\uC2B5\uB2C8\uB2E4. \uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.',
  missingCredentials:
    '\uC544\uC774\uB514\uC640 \uBE44\uBC00\uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.',
  invalidCredentials:
    '\uC544\uC774\uB514 \uB610\uB294 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  serverError:
    '\uC11C\uBC84 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  missingToken:
    '\uD1A0\uD070\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  invalidToken:
    '\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uD1A0\uD070\uC785\uB2C8\uB2E4.',
  missingPassword:
    '\uBE44\uBC00\uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.',
  missingAuth:
    '\uC778\uC99D \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.',
  passwordFieldsRequired:
    '\uD604\uC7AC \uBE44\uBC00\uBC88\uD638\uC640 \uC0C8 \uBE44\uBC00\uBC88\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.',
  invalidNewPassword:
    '\uC0C8 \uBE44\uBC00\uBC88\uD638\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
  passwordChangeFailed:
    '\uBE44\uBC00\uBC88\uD638 \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
  missingRefreshToken:
    '\uB9AC\uD504\uB808\uC2DC \uD1A0\uD070\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
  invalidRefreshToken:
    '\uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uB9AC\uD504\uB808\uC2DC \uD1A0\uD070\uC785\uB2C8\uB2E4.',
} as const;

function getClientIp(req: import('express').Request) {
  return req.ip || req.connection?.remoteAddress || '';
}

function fail(
  res: import('express').Response,
  statusCode: number,
  message: string
) {
  return res.status(statusCode).json({
    status: 'fail',
    message,
  });
}

async function sendSessionSuccess({
  res,
  session,
  rateLimitKeys = [],
}: {
  res: import('express').Response
  session: {
    accessToken: string
    refreshToken: string
    userPayload: Record<string, unknown>
  }
  rateLimitKeys?: string[]
}) {
  setAuthCookies(res, {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  if (rateLimitKeys.length) {
    await clearAttempts(rateLimitKeys);
  }
  return res.json({
    status: 'success',
    token: session.accessToken,
    user: session.userPayload,
  });
}

module.exports = {
  AUTH_MESSAGES,
  fail,
  getClientIp,
  sendSessionSuccess,
};

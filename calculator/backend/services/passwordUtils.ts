const crypto = require('crypto');

function hashPassword(
  password: string,
  iterations = 100000,
  keylen = 32,
  digest: string = 'sha256'
) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, iterations, keylen, digest);
  return {
    salt: salt.toString('base64'),
    hash: hash.toString('base64'),
    iterations,
    keylen,
    digest,
  };
}

module.exports = { hashPassword };

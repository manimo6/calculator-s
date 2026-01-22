const path = require('path');

// 프로젝트 루트 기준 경로
const ROOT_DIR = path.join(__dirname, '..');
const trustProxyRaw = process.env.TRUST_PROXY;
const TRUST_PROXY =
  trustProxyRaw === undefined
    ? 0
    : trustProxyRaw === 'true'
      ? 1
      : trustProxyRaw === 'false'
        ? 0
        : Number.isFinite(Number(trustProxyRaw))
          ? Number(trustProxyRaw)
          : 0;

module.exports = {
  DATA_FILE: process.env.COURSE_DATA_FILE || path.join(ROOT_DIR, 'data', 'courses.json'),
  COURSE_CONFIG_SETS_FILE:
    process.env.COURSE_CONFIG_SETS_DATA_FILE ||
    process.env.PRESETS_DATA_FILE ||
    path.join(ROOT_DIR, 'data', 'presets.json'),
  PAGE_SIZE: Number(process.env.PAGE_SIZE || 15),
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
  TRUST_PROXY,
  ROOT_DIR,
};

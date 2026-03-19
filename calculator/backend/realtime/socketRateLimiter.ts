/**
 * 소켓 전용 Rate Limiter
 * 이벤트별로 클라이언트 요청 빈도 제한
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const limits = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 10000; // 10초
const DEFAULT_MAX_REQUESTS = 30; // 윈도우당 최대 요청

// 5분마다 만료된 항목 정리
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of limits) {
    if (now > entry.resetAt) {
      limits.delete(key);
    }
  }
}, 300000);

/**
 * 소켓 이벤트 Rate Limit 체크
 * @returns true면 허용, false면 차단
 */
function checkSocketRateLimit(
  socketId: string,
  event: string,
  options?: { windowMs?: number; max?: number }
): boolean {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options?.max ?? DEFAULT_MAX_REQUESTS;
  const key = `${socketId}:${event}`;
  const now = Date.now();

  const entry = limits.get(key);
  if (!entry || now > entry.resetAt) {
    limits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  entry.count += 1;
  if (entry.count > max) {
    return false;
  }

  return true;
}

/**
 * 소켓 연결 해제 시 해당 소켓의 Rate Limit 항목 정리
 */
function clearSocketRateLimits(socketId: string): void {
  for (const key of limits.keys()) {
    if (key.startsWith(`${socketId}:`)) {
      limits.delete(key);
    }
  }
}

module.exports = {
  checkSocketRateLimit,
  clearSocketRateLimits,
};

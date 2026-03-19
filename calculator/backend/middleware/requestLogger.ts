/**
 * HTTP 요청 로깅 미들웨어
 * 메서드, URL, 상태코드, 응답시간 기록
 */

const requestLogger = (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
): void => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;

    if (status >= 400) {
      console.warn(`[HTTP] ${method} ${url} ${status} ${duration}ms`);
    } else {
      console.log(`[HTTP] ${method} ${url} ${status} ${duration}ms`);
    }
  });

  next();
};

module.exports = { requestLogger };

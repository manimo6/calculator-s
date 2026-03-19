/**
 * Express 글로벌 에러 핸들러
 * 모든 라우트에서 throw된 에러를 잡아 안전한 응답 반환
 */

const globalErrorHandler = (
  err: Error,
  req: import("express").Request,
  res: import("express").Response,
  _next: import("express").NextFunction
): void => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  const statusCode = (err as any).statusCode || 500;
  const userMessage = (err as any).userMessage || "서버 내부 오류가 발생했습니다.";

  res.status(statusCode).json({
    status: "실패",
    message: userMessage,
  });
};

module.exports = { globalErrorHandler };

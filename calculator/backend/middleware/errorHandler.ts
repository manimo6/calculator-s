/**
 * Express 글로벌 에러 핸들러
 * AppError면 userMessage를 클라이언트에 반환, 그 외는 제네릭 메시지
 */

const { getSafeErrorMessage, getSafeStatusCode } = require("../utils/apiError");

const globalErrorHandler = (
  err: Error,
  req: import("express").Request,
  res: import("express").Response,
  _next: import("express").NextFunction
): void => {
  const statusCode = getSafeStatusCode(err);
  const userMessage = getSafeErrorMessage(err);

  // 서버 로그에는 전체 에러 기록
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ${statusCode}:`, err.message || err);

  res.status(statusCode).json({
    status: "실패",
    message: userMessage,
  });
};

module.exports = { globalErrorHandler };

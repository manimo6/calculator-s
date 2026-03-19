/**
 * 커스텀 API 에러 클래스
 * userMessage: 클라이언트에 노출되는 한국어 메시지
 * 내부 에러 상세는 서버 로그에만 기록
 */

class AppError extends Error {
  statusCode: number;
  userMessage: string;

  constructor(statusCode: number, userMessage: string, internalMessage?: string) {
    super(internalMessage || userMessage);
    this.statusCode = statusCode;
    this.userMessage = userMessage;
    this.name = "AppError";
  }
}

class ValidationError extends AppError {
  constructor(userMessage: string, internalMessage?: string) {
    super(400, userMessage, internalMessage);
    this.name = "ValidationError";
  }
}

class NotFoundError extends AppError {
  constructor(userMessage: string = "요청한 데이터를 찾을 수 없습니다.", internalMessage?: string) {
    super(404, userMessage, internalMessage);
    this.name = "NotFoundError";
  }
}

class ForbiddenError extends AppError {
  constructor(userMessage: string = "권한이 없습니다.", internalMessage?: string) {
    super(403, userMessage, internalMessage);
    this.name = "ForbiddenError";
  }
}

/**
 * 에러 응답용 안전한 메시지 추출
 * AppError면 userMessage, 아니면 제네릭 메시지 반환
 */
function getSafeErrorMessage(error: unknown, fallback: string = "서버 내부 오류가 발생했습니다."): string {
  if (error instanceof AppError) return error.userMessage;
  return fallback;
}

function getSafeStatusCode(error: unknown, fallback: number = 500): number {
  if (error instanceof AppError) return error.statusCode;
  return fallback;
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  getSafeErrorMessage,
  getSafeStatusCode,
};

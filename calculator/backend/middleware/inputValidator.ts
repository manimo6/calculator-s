/**
 * 공통 입력값 검증 미들웨어
 * body 크기, 문자열 길이, 배열 크기 제한
 */

type Request = import("express").Request;
type Response = import("express").Response;
type NextFunction = import("express").NextFunction;

type StringRule = { field: string; max: number };
type ArrayRule = { field: string; max: number };

/**
 * 문자열 필드 길이 제한
 */
function validateStringFields(rules: StringRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    if (!body || typeof body !== "object") return next();

    for (const { field, max } of rules) {
      const value = body[field];
      if (typeof value === "string" && value.length > max) {
        return res.status(400).json({
          status: "실패",
          message: `${field} 값이 너무 깁니다. (최대 ${max}자)`,
        });
      }
    }
    return next();
  };
}

/**
 * 배열 필드 크기 제한
 */
function validateArrayFields(rules: ArrayRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;
    if (!body || typeof body !== "object") return next();

    for (const { field, max } of rules) {
      const value = body[field];
      if (Array.isArray(value) && value.length > max) {
        return res.status(400).json({
          status: "실패",
          message: `${field} 항목이 너무 많습니다. (최대 ${max}개)`,
        });
      }
    }
    return next();
  };
}

/**
 * 쿼리 파라미터 문자열 길이 제한
 */
function validateQueryLength(maxLength: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string" && value.length > maxLength) {
        return res.status(400).json({
          status: "실패",
          message: `쿼리 파라미터 ${key}가 너무 깁니다. (최대 ${maxLength}자)`,
        });
      }
    }
    return next();
  };
}

module.exports = {
  validateStringFields,
  validateArrayFields,
  validateQueryLength,
};

/**
 * 등록 API 입력 검증 규칙
 */

const { validateStringFields, validateArrayFields, validateQueryLength } =
  require("../middleware/inputValidator");

/** GET /api/registrations 쿼리 검증 */
const validateRegistrationQuery = validateQueryLength(200);

/** POST /api/registrations/:id/transfer 이관 검증 */
const validateTransferBody = validateStringFields([
  { field: "name", max: 100 },
  { field: "course", max: 200 },
  { field: "courseId", max: 100 },
  { field: "courseConfigSetName", max: 100 },
]);

/** PUT /api/registrations/:id/note 메모 검증 */
const validateNoteBody = validateStringFields([
  { field: "content", max: 5000 },
]);

/** PATCH /api/registrations/course-names 일괄 이름 변경 검증 */
const validateCourseNamesBody = validateArrayFields([
  { field: "changes", max: 1000 },
]);

module.exports = {
  validateRegistrationQuery,
  validateTransferBody,
  validateNoteBody,
  validateCourseNamesBody,
};

/**
 * 학생 API 입력 검증 규칙
 */

const { validateStringFields, validateArrayFields, validateQueryLength } =
  require("../middleware/inputValidator");

/** GET /api/students 쿼리 검증 */
const validateStudentQuery = validateQueryLength(200);

/** POST /api/students 단건/다건 등록 검증 */
const validateStudentBody = [
  validateStringFields([
    { field: "name", max: 100 },
    { field: "course", max: 200 },
    { field: "courseId", max: 100 },
    { field: "courseConfigSetName", max: 100 },
  ]),
  validateArrayFields([
    { field: "records", max: 500 },
  ]),
];

/** PUT /api/students/:id 수정 검증 */
const validateStudentUpdate = validateStringFields([
  { field: "name", max: 100 },
  { field: "course", max: 200 },
  { field: "courseId", max: 100 },
  { field: "courseConfigSetName", max: 100 },
]);

module.exports = {
  validateStudentQuery,
  validateStudentBody,
  validateStudentUpdate,
};

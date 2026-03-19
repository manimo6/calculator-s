/**
 * 프로세스 레벨 에러 핸들러
 * uncaughtException, unhandledRejection 처리
 */

function setupProcessErrorHandlers(): void {
  process.on("uncaughtException", (err: Error) => {
    console.error("[FATAL] uncaughtException:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason: unknown) => {
    console.error("[FATAL] unhandledRejection:", reason);
    process.exit(1);
  });
}

module.exports = { setupProcessErrorHandlers };

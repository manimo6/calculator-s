/**
 * Graceful shutdown 처리
 * SIGTERM/SIGINT 시 HTTP 서버 종료 + Prisma disconnect
 */

const { prisma } = require("../db/prisma");

type HttpServer = import("http").Server;

let isShuttingDown = false;

function setupGracefulShutdown(httpServer: HttpServer): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[SHUTDOWN] ${signal} 수신. 서버를 종료합니다...`);

    httpServer.close(() => {
      console.log("[SHUTDOWN] HTTP 서버 종료 완료.");
    });

    try {
      await prisma.$disconnect();
      console.log("[SHUTDOWN] Prisma 연결 해제 완료.");
    } catch (err) {
      console.error("[SHUTDOWN] Prisma 연결 해제 실패:", err);
    }

    setTimeout(() => {
      console.error("[SHUTDOWN] 강제 종료 (타임아웃 10초 초과).");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

module.exports = { setupGracefulShutdown };

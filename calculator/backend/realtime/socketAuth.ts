/**
 * 소켓 인증/권한 검증 로직
 * socket.ts에서 분리
 */

const { prisma } = require("../db/prisma");
const { verify } = require("../services/authToken");
const { AUTH_COOKIE_NAME } = require("../services/authCookies");
const { canUser } = require("../services/permissionService");

type SocketAuthUser = { id: string; username: string; role: string };

function parseCookies(cookieHeader?: string | null): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = String(cookieHeader).split(";");
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) continue;
    result[rawKey] = rawValue.join("=");
  }
  return result;
}

function getTokenFromSocket(socket: import("socket.io").Socket): string {
  const authToken = socket?.handshake?.auth?.token;
  if (authToken) return String(authToken);

  const headerAuth = socket?.handshake?.headers?.authorization;
  const authHeader = Array.isArray(headerAuth) ? headerAuth[0] : headerAuth;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  const cookieHeader = socket?.handshake?.headers?.cookie;
  const cookies = parseCookies(cookieHeader);
  if (cookies[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];

  return "";
}

async function loadUserFromToken(token: string): Promise<SocketAuthUser> {
  if (!token) throw new Error("Missing token.");
  const payload = await verify(token);
  if (payload?.tokenUse === "refresh") {
    throw new Error("Invalid token.");
  }

  const user = await prisma.user.findUnique({
    where: { username: payload.username },
    select: {
      id: true,
      username: true,
      role: true,
      tokenVersion: true,
      mustChangePassword: true,
    },
  });
  if (!user) {
    throw new Error("Missing token.");
  }

  const payloadVersion = Number.isInteger(payload.tokenVersion)
    ? payload.tokenVersion
    : null;
  if (payloadVersion === null || user.tokenVersion !== payloadVersion) {
    throw new Error("Invalid token.");
  }
  if (user.mustChangePassword) {
    throw new Error("Password change required.");
  }

  return { id: user.id, username: user.username, role: user.role };
}

async function attachAuthToSocket(socket: import("socket.io").Socket): Promise<void> {
  const token = getTokenFromSocket(socket);
  const user = await loadUserFromToken(token);
  const canAttendance = await canUser({
    userId: user.id,
    roleName: user.role,
    permissionKey: "tabs.attendance",
  });
  socket.data.authUser = user;
  socket.data.canAttendance = canAttendance;
}

module.exports = {
  parseCookies,
  getTokenFromSocket,
  loadUserFromToken,
  attachAuthToSocket,
};

const { Server } = require('socket.io');
const { prisma } = require('../db/prisma');
const { verify } = require('../services/authToken');
const { AUTH_COOKIE_NAME } = require('../services/authCookies');
const { canUser } = require('../services/permissionService');
const {
  buildCategoryAccessMap,
  buildCourseConfigSetIndexMap,
  getAccessForSet,
  isCategoryAllowed,
  isCategoryAccessBypassed,
  resolveCategoryForCourse,
} = require('../services/categoryAccessService');

let ioInstance = null;

function parseCookies(cookieHeader) {
  const result = {};
  if (!cookieHeader) return result;
  const parts = String(cookieHeader).split(';');
  for (const part of parts) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) continue;
    result[rawKey] = rawValue.join('=');
  }
  return result;
}

function getTokenFromSocket(socket) {
  const authToken = socket?.handshake?.auth?.token;
  if (authToken) return String(authToken);

  const headerAuth = socket?.handshake?.headers?.authorization;
  if (headerAuth && headerAuth.startsWith('Bearer ')) {
    return headerAuth.slice(7);
  }

  const cookieHeader = socket?.handshake?.headers?.cookie;
  const cookies = parseCookies(cookieHeader);
  if (cookies[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];

  return '';
}

async function loadUserFromToken(token) {
  if (!token) throw new Error('Missing token.');
  const payload = await verify(token);
  if (payload?.tokenUse === 'refresh') {
    throw new Error('Invalid token.');
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
    throw new Error('Missing token.');
  }

  const payloadVersion = Number.isInteger(payload.tokenVersion)
    ? payload.tokenVersion
    : null;
  if (payloadVersion === null || user.tokenVersion !== payloadVersion) {
    throw new Error('Invalid token.');
  }
  if (user.mustChangePassword) {
    throw new Error('Password change required.');
  }

  return { id: user.id, username: user.username, role: user.role };
}

async function attachAuthToSocket(socket) {
  const token = getTokenFromSocket(socket);
  const user = await loadUserFromToken(token);
  const canAttendance = await canUser({
    userId: user.id,
    roleName: user.role,
    permissionKey: 'tabs.attendance',
  });
  socket.data.authUser = user;
  socket.data.canAttendance = canAttendance;
}

function initSocket(httpServer, corsOrigins = []) {
  if (ioInstance) return ioInstance;
  const allowAll = Array.isArray(corsOrigins) && corsOrigins.includes('*');
  const cors = {
    origin: allowAll ? true : corsOrigins,
    credentials: true,
  };

  ioInstance = new Server(httpServer, { cors });

  ioInstance.use(async (socket, next) => {
    try {
      await attachAuthToSocket(socket);
      next();
    } catch (err) {
      next(err);
    }
  });

  ioInstance.on('connection', () => {
    // no-op for now
  });

  return ioInstance;
}

function getIo() {
  return ioInstance;
}

async function emitAttendanceUpdates({ updates = [], registrations = [] } = {}) {
  if (!ioInstance || updates.length === 0) return;
  if (!Array.isArray(registrations) || registrations.length === 0) return;

  const registrationMap = new Map(
    registrations.map((row) => [String(row.id), row])
  );
  const setNames = Array.from(
    new Set(
      registrations
        .map((row) => String(row.courseConfigSetName || '').trim())
        .filter(Boolean)
    )
  );

  const setRows = setNames.length
    ? await prisma.courseConfigSet.findMany({
        where: { name: { in: setNames } },
        select: { name: true, data: true },
      })
    : [];
  const indexMap = buildCourseConfigSetIndexMap(setRows);

  const sockets = ioInstance.sockets?.sockets || new Map();
  for (const socket of sockets.values()) {
    const authUser = socket?.data?.authUser;
    if (!authUser || !socket?.data?.canAttendance) continue;

    const bypass = isCategoryAccessBypassed(authUser);
    const accessRows = bypass
      ? []
      : await prisma.userCategoryAccess.findMany({
          where: {
            userId: authUser.id,
            courseConfigSetName: { in: setNames },
          },
          select: { courseConfigSetName: true, categoryKey: true, effect: true },
        });
    const accessMap = buildCategoryAccessMap(accessRows);

    const allowedUpdates = [];
    for (const update of updates) {
      const registrationId = String(update?.registrationId || '').trim();
      if (!registrationId) continue;
      const row = registrationMap.get(registrationId);
      if (!row) continue;

      const setName = String(row.courseConfigSetName || '').trim();
      if (!setName) {
        allowedUpdates.push(update);
        continue;
      }

      const index = indexMap.get(setName);
      if (!index) {
        allowedUpdates.push(update);
        continue;
      }

      const access = getAccessForSet(accessMap, setName, bypass);
      const category = resolveCategoryForCourse(
        { courseId: row.courseId, courseName: row.course },
        index
      );
      if (isCategoryAllowed(category, access)) {
        allowedUpdates.push(update);
      }
    }

    if (allowedUpdates.length > 0) {
      socket.emit('attendance:update', { updates: allowedUpdates });
    }
  }
}

module.exports = {
  initSocket,
  getIo,
  emitAttendanceUpdates,
};

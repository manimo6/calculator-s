const { Server } = require('socket.io');
const { prisma } = require('../db/prisma');
const {
  buildCategoryAccessMap,
  buildCourseConfigSetIndexMap,
  getAccessForSet,
  isCategoryAllowed,
  isCategoryAccessBypassed,
  resolveCategoryForCourse,
} = require('../services/categoryAccessService');
const { attachAuthToSocket } = require('./socketAuth');
const { checkSocketRateLimit, clearSocketRateLimits } = require('./socketRateLimiter');

type AttendanceUpdate = { registrationId?: string | number }
type RegistrationRow = {
  id?: string | number
  courseConfigSetName?: string
  courseId?: string
  course?: string
}

let ioInstance: import('socket.io').Server | null = null;

function initSocket(httpServer: import('http').Server, corsOrigins: string[] = []) {
  if (ioInstance) return ioInstance;
  const allowAll = Array.isArray(corsOrigins) && corsOrigins.includes('*');
  const cors = {
    origin: allowAll ? true : corsOrigins,
    credentials: true,
  };

  ioInstance = new Server(httpServer, { cors });
  const io = ioInstance as import('socket.io').Server;

  // 인증 미들웨어
  io.use(async (socket: import('socket.io').Socket, next: (err?: Error) => void) => {
    try {
      await attachAuthToSocket(socket);
      next();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unauthorized');
      next(error);
    }
  });

  io.on('connection', (socket: import('socket.io').Socket) => {
    socket.on('disconnect', () => {
      clearSocketRateLimits(socket.id || '');
    });
  });

  return io;
}

function getIo() {
  return ioInstance;
}

async function emitAttendanceUpdates(
  { updates = [], registrations = [] }: { updates?: AttendanceUpdate[]; registrations?: RegistrationRow[] } = {}
) {
  if (!ioInstance || updates.length === 0) return;
  if (!Array.isArray(registrations) || registrations.length === 0) return;
  const io = ioInstance as import('socket.io').Server;

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

  const sockets = io.sockets?.sockets || new Map();
  for (const socket of sockets.values()) {
    const authUser = socket?.data?.authUser;
    if (!authUser || !socket?.data?.canAttendance) continue;

    // Rate Limit 체크
    if (!checkSocketRateLimit(socket.id || '', 'attendance:update', { windowMs: 5000, max: 50 })) {
      continue;
    }

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

    const allowedUpdates: AttendanceUpdate[] = [];
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

// Node 20.6+ native env loading fallback
try { process.loadEnvFile(); } catch (e) { /* ignore if missing */ }

const express = require('express');
const { createServer } = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { CORS_ORIGIN, TRUST_PROXY } = require('./config');
const { csrfMiddleware } = require('./middleware/csrfMiddleware');
const { initSocket } = require('./realtime/socket');

const studentRoutes = require('./routes/students');
const courseRoutes = require('./routes/courses');
const courseConfigSetRoutes = require('./routes/courseConfigSets');
const authRoutes = require('./routes/auth');
const userAdminRoutes = require('./routes/userAdmin');
const settingsRoutes = require('./routes/settings');
const noticesRoutes = require('./routes/notices');
const permissionsRoutes = require('./routes/permissions');
const registrationsRoutes = require('./routes/registrations');
const mergesRoutes = require('./routes/merges');
const courseNotesRoutes = require('./routes/courseNotes');
const calendarNotesRoutes = require('./routes/calendarNotes');
const attendanceRoutes = require('./routes/attendance');
const registrationExtensionsRoutes = require('./routes/registrationExtensions');

const app = express();
const port = process.env.PORT || 3000;

if (TRUST_PROXY) {
  app.set('trust proxy', TRUST_PROXY);
}

const allowedOrigins = String(CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAnyOrigin = allowedOrigins.includes('*');
const corsOptions = {
  credentials: !allowAnyOrigin,
  origin(origin, callback) {
    if (allowAnyOrigin) return callback(null, true);
    if (!origin) return callback(null, false);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(csrfMiddleware);

app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/course-config-sets', courseConfigSetRoutes);
app.use('/api/presets', courseConfigSetRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userAdminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/registrations', registrationsRoutes);
app.use('/api/merges', mergesRoutes);
app.use('/api/course-notes', courseNotesRoutes);
app.use('/api/calendar-notes', calendarNotesRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/registration-extensions', registrationExtensionsRoutes);

const httpServer = createServer(app);
initSocket(httpServer, allowedOrigins);

httpServer.listen(port, () => {
  console.log(`
    ===============================================================
          🔥 백엔드 서버가 성공적으로 작동했습니다! 🔥
    ===============================================================
    - 호스트: 로컬
    - 포트: ${port}
    - 지금부터의 요청을 준비가 끝났습니다.
    - 테스트 URL: http://localhost:${port}/api/students
    ===============================================================
  `);
});

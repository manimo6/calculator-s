const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const { prisma } = require('../db/prisma');

function sha256(input) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw);
}

function normalizeCourseNote(note) {
  const courses = Array.isArray(note.courses)
    ? note.courses.filter(Boolean)
    : note.course
      ? [note.course].filter(Boolean)
      : [];

  return {
    id: note.id,
    category: note.category || '',
    courses,
    title: note.title || '',
    content: note.content || '',
    tags: Array.isArray(note.tags) ? note.tags.filter(Boolean) : [],
    updatedAt: note.updatedAt ? new Date(note.updatedAt) : new Date(),
  };
}

async function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const now = new Date();

  const coursesPath = path.join(dataDir, 'courses.json');
  const courseConfigSetsPath = path.join(dataDir, 'presets.json');
  const usersPath = path.join(dataDir, 'users.json');
  const settingsPath = path.join(dataDir, 'settings.json');
  const noticesPath = path.join(dataDir, 'notices.json');
  const mergeGroupsPath = path.join(dataDir, 'mergeGroups.json');
  const courseNotesPath = path.join(dataDir, 'courseNotes.json');

  const [courses, courseConfigSetsObj, users, settingsByUsername, notices, mergeGroups, courseNotes] =
    await Promise.all([
      readJson(coursesPath),
      readJson(courseConfigSetsPath),
      readJson(usersPath),
      readJson(settingsPath),
      readJson(noticesPath),
      readJson(mergeGroupsPath),
      readJson(courseNotesPath),
    ]);

  await prisma.courseConfig.createMany({
    data: [
      {
        key: 'courses',
        data: courses ?? {},
        updatedAt: now,
      },
    ],
    skipDuplicates: true,
  });

  const courseConfigSetRows = Object.entries(courseConfigSetsObj ?? {}).map(
    ([name, data]) => ({
    name,
    data,
    createdAt: now,
    updatedAt: now,
    })
  );
  if (courseConfigSetRows.length > 0) {
    await prisma.courseConfigSet.createMany({
      data: courseConfigSetRows,
      skipDuplicates: true,
    });
  }

  const userRows = Array.isArray(users)
    ? users
        .filter((u) => u && u.username && u.role && u.salt && u.hash)
        .map((u) => ({
          id: crypto.randomUUID(),
          username: String(u.username),
          role: String(u.role),
          salt: String(u.salt),
          hash: String(u.hash),
          iterations: Number(u.iterations || 100000),
          keylen: Number(u.keylen || 32),
          digest: String(u.digest || 'sha256'),
          createdAt: now,
          updatedAt: now,
        }))
    : [];
  if (userRows.length > 0) {
    await prisma.user.createMany({ data: userRows, skipDuplicates: true });
  }

  const dbUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
  });
  const userByUsername = new Map(dbUsers.map((u) => [u.username, u]));
  const adminUsers = dbUsers.filter((u) => u.role === 'admin');
  const adminUser = adminUsers.length === 1 ? adminUsers[0] : null;

  const settingsRows = [];
  const legacySettingsRows = [];

  for (const [usernameKey, settings] of Object.entries(settingsByUsername ?? {})) {
    const directUser = userByUsername.get(usernameKey);
    const resolvedUser =
      directUser ?? (usernameKey === 'admin' && adminUser ? adminUser : null);

    if (resolvedUser) {
      settingsRows.push({
        userId: resolvedUser.id,
        settings: settings ?? {},
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }

    legacySettingsRows.push({
      usernameKey,
      settings: settings ?? {},
      createdAt: now,
      updatedAt: now,
    });
  }

  if (settingsRows.length > 0) {
    await prisma.userSettings.createMany({ data: settingsRows, skipDuplicates: true });
  }
  if (legacySettingsRows.length > 0) {
    await prisma.legacyUserSettings.createMany({
      data: legacySettingsRows,
      skipDuplicates: true,
    });
  }

  const noticeRows = Array.isArray(notices)
    ? notices
        .filter((n) => n && n.id && n.title && n.body)
        .map((n) => ({
          id: String(n.id),
          title: String(n.title),
          body: String(n.body),
          targets: Array.isArray(n.targets) ? n.targets.map(String) : [],
          author: String(n.author || ''),
          createdAt: n.createdAt ? new Date(n.createdAt) : now,
          updatedAt: n.updatedAt ? new Date(n.updatedAt) : now,
        }))
    : [];
  if (noticeRows.length > 0) {
    await prisma.notice.createMany({ data: noticeRows, skipDuplicates: true });
  }

  const mergeRows = Array.isArray(mergeGroups)
    ? mergeGroups
        .filter((m) => m && m.id && Array.isArray(m.courses))
        .map((m) => ({
          id: String(m.id),
          name: String(m.name || ''),
          courses: Array.from(new Set(m.courses.map(String).filter(Boolean))),
          weekRanges: Array.isArray(m.weekRanges) ? m.weekRanges : [],
          createdAt: now,
          updatedAt: now,
        }))
    : [];
  if (mergeRows.length > 0) {
    await prisma.mergeGroup.createMany({ data: mergeRows, skipDuplicates: true });
  }

  const noteRows = Array.isArray(courseNotes)
    ? courseNotes
        .filter((n) => n && n.id && (n.title || '').trim())
        .map((n) => normalizeCourseNote(n))
    : [];
  if (noteRows.length > 0) {
    await prisma.courseNote.createMany({ data: noteRows, skipDuplicates: true });
  }

  const summary = {
    courses: 'courses (course_configs.key=courses)',
    courseConfigSets: courseConfigSetRows.length,
    users: userRows.length,
    settings: settingsRows.length,
    legacySettings: legacySettingsRows.length,
    notices: noticeRows.length,
    mergeGroups: mergeRows.length,
    courseNotes: noteRows.length,
  };

  console.log('[seedJsonToDb] done:', summary);

  const legacyMismatch =
    legacySettingsRows.length > 0
      ? legacySettingsRows.map((r) => r.usernameKey)
      : [];
  if (legacyMismatch.length > 0) {
    console.warn(
      '[seedJsonToDb] Legacy settings keys had no matching user (stored in legacy_user_settings):',
      legacyMismatch
    );
  }

  const adminKeyExists = Object.prototype.hasOwnProperty.call(
    settingsByUsername ?? {},
    'admin'
  );
  if (adminKeyExists && !userByUsername.has('admin') && adminUser) {
    console.warn(
      `[seedJsonToDb] settings.json key 'admin' mapped to role=admin user '${adminUser.username}'.`
    );
  }

  const importFingerprint = sha256(
    JSON.stringify({
      courses,
      courseConfigSets: Object.keys(courseConfigSetsObj ?? {}),
      users: Array.isArray(users) ? users.map((u) => u.username) : [],
      settingsKeys: Object.keys(settingsByUsername ?? {}),
      notices: Array.isArray(notices) ? notices.map((n) => n.id) : [],
      mergeGroups: Array.isArray(mergeGroups) ? mergeGroups.map((m) => m.id) : [],
      courseNotes: Array.isArray(courseNotes) ? courseNotes.map((n) => n.id) : [],
    })
  );
  console.log('[seedJsonToDb] input fingerprint:', importFingerprint);
}

main()
  .catch((err) => {
    console.error('[seedJsonToDb] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

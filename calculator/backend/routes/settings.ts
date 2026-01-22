const express = require('express') as typeof import('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { prisma } = require('../db/prisma');

const router = express.Router();

// GET /api/settings - 현재 사용자 설정 조회
router.get('/', authMiddleware(), async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ status: '실패', message: 'Missing auth.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      const legacy = await prisma.legacyUserSettings.findUnique({
        where: { usernameKey: username },
      });
      return res.json({ status: '성공', settings: legacy?.settings || {} });
    }

    const row = await prisma.userSettings.findUnique({ where: { userId: user.id } });
    if (row) return res.json({ status: '성공', settings: row.settings || {} });

    const legacy = await prisma.legacyUserSettings.findUnique({
      where: { usernameKey: username },
    });
    res.json({ status: '성공', settings: legacy?.settings || {} });
  } catch (error) {
    console.error('설정 조회 오류:', error);
    res.status(500).json({ status: '실패', message: '설정 조회 중 오류가 발생했습니다.' });
  }
});

// PUT /api/settings - 현재 사용자 설정 저장
router.put('/', authMiddleware(), async (req, res) => {
  try {
    const username = req.user?.username;
    if (!username) {
      return res.status(401).json({ status: '실패', message: 'Missing auth.' });
    }
    const settings = req.body?.settings;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ status: '실패', message: 'settings 객체가 필요합니다.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      const saved = await prisma.legacyUserSettings.upsert({
        where: { usernameKey: username },
        create: { usernameKey: username, settings },
        update: { settings },
      });
      return res.json({ status: '성공', settings: saved.settings || {} });
    }

    const saved = await prisma.userSettings.upsert({
      where: { userId: user.id },
      create: { userId: user.id, settings },
      update: { settings },
    });
    res.json({ status: '성공', settings: saved.settings || {} });
  } catch (error) {
    console.error('설정 저장 오류:', error);
    res.status(500).json({ status: '실패', message: '설정 저장 중 오류가 발생했습니다.' });
  }
});

module.exports = router;

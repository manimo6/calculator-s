const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

// GET /api/courses
router.get('/', authMiddleware(), requirePermissions('tabs.courses'), async (req, res) => {
  try {
    const row = await prisma.courseConfig.findUnique({ where: { key: 'courses' } });
    res.json(row?.data || {});
  } catch (error) {
    console.error('Error reading course data:', error);
    res.status(500).json({ status: '실패', message: '수업 데이터를 불러오는 과정에서 오류가 발생했습니다.' });
  }
});

// POST /api/courses
router.post('/', authMiddleware(), requirePermissions('tabs.courses'), async (req, res) => {
  try {
    const newData = req.body;
    await prisma.courseConfig.upsert({
      where: { key: 'courses' },
      create: { key: 'courses', data: newData },
      update: { data: newData },
    });
    console.log(`[${new Date().toISOString()}] 수업 데이터 업데이트 완료`);
    res.json({ status: '성공', message: '수업 데이터가 업데이트되었습니다.' });
  } catch (error) {
    console.error('Error writing course data:', error);
    res.status(500).json({ status: '실패', message: '수업 데이터를 저장하는 과정에서 오류가 발생했습니다.' });
  }
});

module.exports = router;

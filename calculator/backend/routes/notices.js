const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRecentAuth } = require('../middleware/reauthMiddleware');
const { prisma } = require('../db/prisma');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

async function updateNotice(id, updater) {
  try {
    return await prisma.notice.update({
      where: { id },
      data: updater,
    });
  } catch (error) {
    if (error?.code === 'P2025') return null;
    throw error;
  }
}

async function deleteNotice(id) {
  try {
    await prisma.notice.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error?.code === 'P2025') return false;
    throw error;
  }
}

// GET /api/notices
router.get('/', authMiddleware(), async (req, res) => {
  try {
    const role = req.user.role;
    const notices = await prisma.notice.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const filtered = notices.filter((n) => {
      if (!n.targets || n.targets.length === 0) return true;
      return n.targets.includes(role) || role === 'master';
    });
    res.json({ status: '성공', notices: filtered });
  } catch (error) {
    console.error('공지 목록 조회 오류:', error);
    res.status(500).json({ status: '실패', message: '공지 목록을 불러오지 못했습니다.' });
  }
});

// POST /api/notices (마스터 전용)
router.post('/', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { title, body, targets = [] } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ status: '실패', message: '제목과 내용을 입력하세요.' });
    }
    const now = new Date();
    const notice = {
      id: uuidv4(),
      title,
      body,
      targets: Array.isArray(targets) ? targets : [],
      author: req.user.username,
      createdAt: now,
      updatedAt: now,
    };
    await prisma.notice.create({ data: notice });
    res.json({ status: '성공', notice });
  } catch (error) {
    console.error('공지 생성 오류:', error);
    res.status(500).json({ status: '실패', message: '공지 생성에 실패했습니다.' });
  }
});

// PUT /api/notices/:id (마스터 전용)
router.put('/:id', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, body, targets = [] } = req.body || {};
    if (!title || !body) {
      return res.status(400).json({ status: '실패', message: '제목과 내용을 입력하세요.' });
    }
    const updated = await updateNotice(id, {
      title,
      body,
      targets: Array.isArray(targets) ? targets : [],
      updatedAt: new Date(),
    });
    if (!updated) return res.status(404).json({ status: '실패', message: '공지 없음' });
    res.json({ status: '성공', notice: updated });
  } catch (error) {
    console.error('공지 수정 오류:', error);
    res.status(500).json({ status: '실패', message: '공지 수정에 실패했습니다.' });
  }
});

// DELETE /api/notices/:id (마스터 전용)
router.delete('/:id', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const ok = await deleteNotice(id);
    if (!ok) return res.status(404).json({ status: '실패', message: '공지 없음' });
    res.json({ status: '성공' });
  } catch (error) {
    console.error('공지 삭제 오류:', error);
    res.status(500).json({ status: '실패', message: '공지 삭제에 실패했습니다.' });
  }
});

module.exports = router;

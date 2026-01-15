const express = require('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/permissions (master only)
router.get('/', authMiddleware(['master']), async (_req, res) => {
  try {
    const rows = await prisma.permission.findMany({
      select: { key: true, description: true, scopeType: true },
      orderBy: { key: 'asc' },
    });
    res.json({ status: 'success', permissions: rows });
  } catch (error) {
    console.error('Failed to load permissions:', error);
    res.status(500).json({ status: 'fail', message: 'Failed to load permissions.' });
  }
});

module.exports = router;

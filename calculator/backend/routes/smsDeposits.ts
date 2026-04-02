const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { getSafeErrorMessage } = require('../utils/apiError');
const {
  requireAnyPermissions,
} = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authMiddleware());
router.use(requireAnyPermissions(['tabs.registrations']));

// GET /api/sms-deposits — 입금 목록 조회
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.smsDeposit.findMany({
      orderBy: { receivedAt: 'desc' },
      take: 100,
    });

    const results = rows.map((row: any) => ({
      id: row.id,
      depositorName: row.depositorName,
      amount: row.amount,
      balance: row.balance,
      matchStatus: row.matchStatus,
      registrationId: row.registrationId,
      receivedAt: row.receivedAt?.toISOString() || '',
    }));

    return res.json({ status: 'success', results });
  } catch (error) {
    const message = getSafeErrorMessage(error, '입금 내역을 불러오지 못했습니다.');
    console.error('[SMS] 입금 목록 조회 오류:', error);
    return res.status(500).json({ status: 'fail', message });
  }
});

module.exports = router;

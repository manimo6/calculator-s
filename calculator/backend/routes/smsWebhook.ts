const express = require('express') as typeof import('express');
const crypto = require('crypto') as typeof import('crypto');
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { getSafeErrorMessage } = require('../utils/apiError');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireAnyPermissions } = require('../middleware/permissionMiddleware');

const router = express.Router();

const WEBHOOK_SECRET = process.env.SMS_WEBHOOK_SECRET || '';
const WEBHOOK_PATH = process.env.SMS_WEBHOOK_PATH || '/8229f3b7177e08cc3ddca5fe2c7a27b3';

/**
 * 신한은행 입금 문자 파싱
 * 예시: "[신한은행] 입금 150,000원 홍길동 잔액 1,234,567원"
 *       "[신한은행]08:32 입금 50,000원 잔액817,320원 홍길동"
 */
function parseShinhanSms(body: string): {
  amount: number;
  depositorName: string;
  balance: number | null;
} | null {
  if (!body || !body.includes('입금')) return null;

  // 금액 추출: "입금 150,000원" 또는 "입금150,000원"
  const amountMatch = body.match(/입금\s*([\d,]+)\s*원/);
  const amount = amountMatch ? Number(amountMatch[1].replace(/,/g, '')) : 0;
  if (!amount) return null;

  // 잔액 추출: "잔액 1,234,567원" 또는 "잔액1,234,567원"
  const balanceMatch = body.match(/잔액\s*([\d,]+)\s*원/);
  const balance = balanceMatch ? Number(balanceMatch[1].replace(/,/g, '')) : null;

  // 입금자명 추출: 금액/잔액/날짜/시간/은행명 제외한 나머지 한글 이름
  let cleaned = body
    .replace(/\[.*?\]/g, '')
    .replace(/입금\s*[\d,]+\s*원/g, '')
    .replace(/잔액\s*[\d,]+\s*원/g, '')
    .replace(/\d{2}:\d{2}/g, '')
    .replace(/\d{4}[-/.]\d{2}[-/.]\d{2}/g, '')
    .replace(/신한은행|신한/g, '')
    .trim();

  // 남은 텍스트에서 한글 이름 추출 (2~4자)
  const nameMatch = cleaned.match(/[가-힣]{2,4}/);
  const depositorName = nameMatch ? nameMatch[0] : '';

  return { amount, depositorName, balance };
}

// POST /api/sms-hook/8229f3b7177e08cc3ddca5fe2c7a27b3
router.post(WEBHOOK_PATH, async (req, res) => {
  try {
    // 시크릿 키 검증
    const secret = req.headers['x-webhook-secret'];
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return res.status(403).json({ status: 'fail', message: '인증 실패' });
    }

    const { body: smsBody, sender, time } = req.body || {};
    if (!smsBody || typeof smsBody !== 'string') {
      return res.status(400).json({ status: 'fail', message: '문자 내용이 없습니다.' });
    }

    // 입금 문자가 아니면 무시
    const parsed = parseShinhanSms(smsBody);
    if (!parsed) {
      return res.json({ status: 'success', message: '입금 문자가 아닙니다.', saved: false });
    }

    // 중복 방지: rawBody + sender 해시 기반, DB 유니크 제약으로 race condition 방지
    const dedupeKey = crypto.createHash('sha256').update(`${smsBody}|${sender || ''}`).digest('hex');

    let deposit;
    try {
      deposit = await prisma.smsDeposit.create({
        data: {
          id: uuidv4(),
          rawBody: smsBody,
          sender: String(sender || ''),
          depositorName: parsed.depositorName,
          amount: parsed.amount,
          balance: parsed.balance,
          dedupeHash: dedupeKey,
          matchStatus: 'unmatched',
          receivedAt: time ? new Date(time) : new Date(),
        },
      });
    } catch (err: unknown) {
      const code = (err as Record<string, unknown>)?.code;
      if (code === 'P2002') {
        return res.json({ status: 'success', message: '중복 문자입니다.', saved: false });
      }
      throw err;
    }

    console.log(
      `[SMS] 입금 감지: ${parsed.depositorName} ${parsed.amount.toLocaleString()}원 (id: ${deposit.id.slice(0, 8)})`
    );

    return res.json({
      status: 'success',
      saved: true,
      deposit: {
        id: deposit.id,
        depositorName: parsed.depositorName,
        amount: parsed.amount,
      },
    });
  } catch (error) {
    const message = getSafeErrorMessage(error, 'SMS 처리 중 오류가 발생했습니다.');
    console.error('[SMS] webhook 오류:', error);
    return res.status(500).json({ status: 'fail', message });
  }
});

// GET /api/sms-hook/deposits — 입금 목록 조회 (인증 + 권한 필요)
router.get('/deposits', authMiddleware(), requireAnyPermissions(['tabs.registrations']), async (req, res) => {
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
      rawBody: row.rawBody,
    }));

    return res.json({ status: 'success', results });
  } catch (error) {
    const message = getSafeErrorMessage(error, '입금 내역을 불러오지 못했습니다.');
    console.error('[SMS] 입금 목록 조회 오류:', error);
    return res.status(500).json({ status: 'fail', message });
  }
});

module.exports = router;

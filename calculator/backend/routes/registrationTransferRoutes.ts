const express = require('express') as typeof import('express');
const { getSafeErrorMessage } = require('../utils/apiError');
const {
  normalizeCourseId,
  normalizeCourseConfigSetName,
  parseDateOnly,
} = require('../utils/dateUtils');
const { parseWeeks } = require('../utils/parsers');
const {
  getRequestUser,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const { validateTransferBody } = require('../validators/registrationValidator');
const {
  cancelTransferRouteResult,
  createTransferRouteResult,
} = require('../services/registrationTransferService');

const router = express.Router();

router.post(
  '/:id/transfer',
  validateTransferBody,
  requirePermissions(['tabs.registrations', 'registrations.transfers.manage']),
  async (req, res) => {
    const { id } = req.params;
    const transferAt = parseDateOnly(req.body?.transferDate);
    const courseName = String(req.body?.course || '').trim();
    const courseId = normalizeCourseId(req.body?.courseId) || undefined;
    const courseConfigSetName =
      normalizeCourseConfigSetName(req.body?.courseConfigSetName) || undefined;
    const nextWeeks = parseWeeks(req.body?.weeks);

    if (!transferAt) {
      return res.status(400).json({
        status: 'fail',
        message: '\uC804\uBC18 \uB0A0\uC9DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.',
      });
    }

    if (!courseName) {
      return res.status(400).json({
        status: 'fail',
        message: '\uC804\uBC18 \uB300\uC0C1 \uACFC\uBAA9\uC744 \uC120\uD0DD\uD574 \uC8FC\uC138\uC694.',
      });
    }

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const result = await createTransferRouteResult({
        authUser,
        id,
        transferAt,
        courseName,
        courseId,
        courseConfigSetName,
        nextWeeks,
      });

      return res.status(result.statusCode).json(result.body);
    } catch (error) {
      console.error('\uC804\uBC18 \uCC98\uB9AC \uC2E4\uD328:', error);
      const message = getSafeErrorMessage(
        error,
        '\uC804\uBC18 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'
      );
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

router.post(
  '/:id/transfer/cancel',
  requirePermissions(['tabs.registrations', 'registrations.transfers.manage']),
  async (req, res) => {
    const { id } = req.params;

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const result = await cancelTransferRouteResult({
        authUser,
        id,
      });

      return res.status(result.statusCode).json(result.body);
    } catch (error) {
      console.error('\uC804\uBC18 \uCDE8\uC18C \uC2E4\uD328:', error);
      const message = getSafeErrorMessage(
        error,
        '\uC804\uBC18 \uCDE8\uC18C\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'
      );
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

module.exports = router;

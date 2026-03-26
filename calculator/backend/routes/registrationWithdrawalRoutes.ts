const express = require('express') as typeof import('express');
const { getSafeErrorMessage } = require('../utils/apiError');
const { formatDateOnly, parseDateOnly } = require('../utils/dateUtils');
const {
  getRequestUser,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const {
  isRegistrationAccessAllowed,
  loadRegistrationById,
  updateRegistrationWithdrawal,
} = require('../services/registrationRouteService');

const router = express.Router();

router.patch(
  '/:id/withdrawal',
  requirePermissions('tabs.registrations'),
  async (req, res) => {
    const { id } = req.params;
    const raw = req.body?.withdrawnAt;
    const withdrawnAt = raw === null || raw === '' ? null : parseDateOnly(raw);

    if (raw !== null && raw !== '' && !withdrawnAt) {
      return res.status(400).json({
        status: 'fail',
        message: '\uD1F4\uC6D0 \uB0A0\uC9DC\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.',
      });
    }

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const existing = await loadRegistrationById(id);
      if (!existing) {
        return res.status(404).json({
          status: 'fail',
          message: '\uD574\uB2F9 ID\uC758 \uB4F1\uB85D \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
        });
      }

      const canAccess = await isRegistrationAccessAllowed(authUser, [existing]);
      if (!canAccess) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }

      const updated = await updateRegistrationWithdrawal({
        id,
        withdrawnAt,
      });

      return res.json({
        status: 'success',
        withdrawnAt: formatDateOnly(updated.withdrawnAt),
      });
    } catch (error) {
      console.error('\uD1F4\uC6D0 \uCC98\uB9AC \uC2E4\uD328:', error);
      const message = getSafeErrorMessage(
        error,
        '\uD1F4\uC6D0 \uCC98\uB9AC\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'
      );
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

module.exports = router;

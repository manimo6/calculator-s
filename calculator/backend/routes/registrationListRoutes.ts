const express = require('express') as typeof import('express');
const { getSafeErrorMessage } = require('../utils/apiError');
const {
  getRequestUser,
  requireAnyPermissions,
} = require('../middleware/permissionMiddleware');
const { validateRegistrationQuery } = require('../validators/registrationValidator');
const {
  loadRegistrationListPayload,
} = require('../services/registrationRouteService');

const router = express.Router();

router.get(
  '/',
  validateRegistrationQuery,
  requireAnyPermissions(['tabs.registrations', 'tabs.attendance']),
  async (req, res) => {
    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const { results, activeMerges } = await loadRegistrationListPayload(authUser);
      return res.json({ status: 'success', results, activeMerges });
    } catch (error) {
      const message = getSafeErrorMessage(
        error,
        '\uB4F1\uB85D \uD604\uD669\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
      );
      console.error('\uB4F1\uB85D \uD604\uD669 \uC870\uD68C \uC2E4\uD328:', error);
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

module.exports = router;

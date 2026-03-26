const express = require('express') as typeof import('express');
const { getSafeErrorMessage } = require('../utils/apiError');
const {
  getRequestUser,
  requireAnyPermissions,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const { validateCourseNamesBody } = require('../validators/registrationValidator');
const {
  findForbiddenCourseName,
  listAllowedCourseNames,
  normalizeCourseNameChanges,
  renameCourseNames,
} = require('../services/registrationRouteService');

const router = express.Router();

router.get(
  '/course-names',
  requireAnyPermissions(['tabs.registrations', 'tabs.attendance']),
  async (req, res) => {
    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const courseConfigSetName = String(req.query?.courseConfigSetName || '').trim();
      if (!courseConfigSetName) {
        return res.status(400).json({
          status: 'fail',
          message: '\uC124\uC815\uC14B \uC774\uB984\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.',
        });
      }

      const results = await listAllowedCourseNames(authUser, courseConfigSetName);
      return res.json({ status: 'success', results });
    } catch (error) {
      console.error('\uACFC\uBAA9\uBA85 \uBAA9\uB85D \uC870\uD68C \uC2E4\uD328:', error);
      const message = getSafeErrorMessage(
        error,
        '\uACFC\uBAA9\uBA85 \uBAA9\uB85D\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.'
      );
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

router.patch(
  '/course-names',
  validateCourseNamesBody,
  requirePermissions('tabs.registrations'),
  async (req, res) => {
    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const courseConfigSetName = String(req.body?.courseConfigSetName || '').trim();
      const changes = Array.isArray(req.body?.changes) ? req.body.changes : [];

      if (!courseConfigSetName) {
        return res.status(400).json({
          status: 'fail',
          message: '\uC124\uC815\uC14B \uC774\uB984\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.',
        });
      }

      const normalized = normalizeCourseNameChanges(changes);
      if (normalized.length === 0) {
        return res.json({ status: 'success', updated: 0, details: [] });
      }

      const fromList = normalized.map((item) => item.from);
      const forbidden = await findForbiddenCourseName(
        authUser,
        courseConfigSetName,
        fromList
      );
      if (forbidden) {
        return res.status(403).json({
          status: 'fail',
          message: 'Permission denied.',
        });
      }

      const { updated, details } = await renameCourseNames(
        courseConfigSetName,
        normalized
      );

      return res.json({ status: 'success', updated, details });
    } catch (error) {
      console.error('\uACFC\uBAA9\uBA85 \uBCC0\uACBD \uC2E4\uD328:', error);
      const message = getSafeErrorMessage(
        error,
        '\uACFC\uBAA9\uBA85 \uBCC0\uACBD\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'
      );
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

module.exports = router;

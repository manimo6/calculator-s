const express = require('express') as typeof import('express');
const { getSafeErrorMessage } = require('../utils/apiError');
const {
  getRequestUser,
  requirePermissions,
} = require('../middleware/permissionMiddleware');
const { validateNoteBody } = require('../validators/registrationValidator');
const {
  isRegistrationAccessAllowed,
  loadRegistrationNoteRootContext,
  saveRegistrationNote,
} = require('../services/registrationRouteService');

const router = express.Router();

router.put(
  '/:id/note',
  validateNoteBody,
  requirePermissions('tabs.registrations'),
  async (req, res) => {
    const { id } = req.params;
    const content = String(req.body?.content || '').trim();

    try {
      const authUser = await getRequestUser(req);
      if (!authUser) {
        return res.status(401).json({ status: 'fail', message: 'Missing auth.' });
      }

      const noteContext = await loadRegistrationNoteRootContext(id);
      const existing = noteContext.existing;
      if (!existing) {
        return res.status(404).json({
          status: 'fail',
          message: '\uD574\uB2F9 ID\uC758 \uB4F1\uB85D \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
        });
      }

      const rootId = noteContext.rootId;
      const root = noteContext.root;
      if (!root) {
        return res.status(404).json({
          status: 'fail',
          message: '\uC804\uBC18 \uC6D0\uBCF8 \uB4F1\uB85D \uC815\uBCF4\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
        });
      }

      const canAccess = await isRegistrationAccessAllowed(authUser, [root]);
      if (!canAccess) {
        return res.status(403).json({ status: 'fail', message: 'Permission denied.' });
      }

      const saved = await saveRegistrationNote({ rootId, content });
      if (!saved) {
        return res.json({ status: 'success', note: '' });
      }

      return res.json({
        status: 'success',
        note: saved.content,
        noteUpdatedAt: saved.updatedAt.toISOString(),
      });
    } catch (error) {
      console.error('\uB4F1\uB85D \uBA54\uBAA8 \uC800\uC7A5 \uC2E4\uD328:', error);
      const message = getSafeErrorMessage(
        error,
        '\uBA54\uBAA8 \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.'
      );
      return res.status(500).json({
        status: 'fail',
        message,
      });
    }
  }
);

module.exports = router;

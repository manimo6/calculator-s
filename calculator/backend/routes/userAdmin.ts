const express = require('express') as typeof import('express');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requireRecentAuth } = require('../middleware/reauthMiddleware');
const {
  deleteManagedUser,
  listManagedUsers,
  updateManagedUser,
  upsertManagedUser,
} = require('../services/userAdminRouteService');
const {
  loadManagedUserPermissions,
  saveManagedUserPermissions,
} = require('../services/userPermissionAdminService');

const router = express.Router();

const USER_ADMIN_MESSAGES = {
  missingUsernameRole:
    'username\uACFC role\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.',
  missingRole:
    'role\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.',
  accountNotFound:
    '\uACC4\uC815\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  userNotFound:
    '\uC0AC\uC6A9\uC790\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.',
  userListFailed:
    '\uC0AC\uC6A9\uC790 \uC870\uD68C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  accountSaveSuccess:
    '\uACC4\uC815 \uC815\uBCF4\uB97C \uC800\uC7A5\uD588\uC2B5\uB2C8\uB2E4.',
  accountSaveFailed:
    '\uACC4\uC815 \uCC98\uB9AC \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  accountDeleteSuccess:
    '\uACC4\uC815\uC744 \uC0AD\uC81C\uD588\uC2B5\uB2C8\uB2E4.',
  accountDeleteFailed:
    '\uACC4\uC815 \uC0AD\uC81C \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.',
  loadPermissionsFailed:
    '\uC0AC\uC6A9\uC790 \uAD8C\uD55C\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.',
  updatePermissionsFailed:
    '\uC0AC\uC6A9\uC790 \uAD8C\uD55C \uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.',
} as const;

router.get('/', authMiddleware(['master', 'admin']), async (_req, res) => {
  try {
    const safe = await listManagedUsers();
    return res.json({ status: 'success', users: safe });
  } catch (error) {
    return res.status(500).json({
      status: 'fail',
      message: USER_ADMIN_MESSAGES.userListFailed,
    });
  }
});

router.post('/', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    if (!username || !role) {
      return res.status(400).json({
        status: 'fail',
        message: USER_ADMIN_MESSAGES.missingUsernameRole,
      });
    }

    await upsertManagedUser({ username, password, role });

    return res.json({
      status: 'success',
      message: USER_ADMIN_MESSAGES.accountSaveSuccess,
    });
  } catch (error) {
    console.error('\uACC4\uC815 \uC0DD\uC131/\uC218\uC815 \uC624\uB958:', error);
    return res.status(500).json({
      status: 'fail',
      message: USER_ADMIN_MESSAGES.accountSaveFailed,
    });
  }
});

router.put('/:username', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username } = req.params;
    const { password, role } = req.body || {};
    if (!role) {
      return res.status(400).json({
        status: 'fail',
        message: USER_ADMIN_MESSAGES.missingRole,
      });
    }

    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      return res.status(404).json({
        status: 'fail',
        message: USER_ADMIN_MESSAGES.accountNotFound,
      });
    }

    await updateManagedUser({ username, password, role });
    return res.json({
      status: 'success',
      message: USER_ADMIN_MESSAGES.accountSaveSuccess,
    });
  } catch (error) {
    console.error('\uACC4\uC815 \uC218\uC815 \uC624\uB958:', error);
    return res.status(500).json({
      status: 'fail',
      message: USER_ADMIN_MESSAGES.accountSaveFailed,
    });
  }
});

router.delete('/:username', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username } = req.params;
    await deleteManagedUser(username);
    return res.json({
      status: 'success',
      message: USER_ADMIN_MESSAGES.accountDeleteSuccess,
    });
  } catch (error) {
    console.error('\uACC4\uC815 \uC0AD\uC81C \uC624\uB958:', error);
    return res.status(500).json({
      status: 'fail',
      message: USER_ADMIN_MESSAGES.accountDeleteFailed,
    });
  }
});

router.get('/:username/permissions', authMiddleware(['master']), async (req, res) => {
  try {
    const { username } = req.params;
    const permissionPayload = await loadManagedUserPermissions(username);
    if (!permissionPayload) {
      return res.status(404).json({
        status: 'fail',
        message: USER_ADMIN_MESSAGES.userNotFound,
      });
    }

    return res.json({
      status: 'success',
      user: {
        username: permissionPayload.user.username,
        role: permissionPayload.user.role,
      },
      permissions: permissionPayload.permissions,
      categoryAccess: permissionPayload.categoryAccess,
    });
  } catch (error) {
    console.error('\uC0AC\uC6A9\uC790 \uAD8C\uD55C \uC870\uD68C \uC2E4\uD328:', error);
    return res.status(500).json({
      status: 'fail',
      message: USER_ADMIN_MESSAGES.loadPermissionsFailed,
    });
  }
});

router.put('/:username/permissions', authMiddleware(['master']), requireRecentAuth(), async (req, res) => {
  try {
    const { username } = req.params;
    const result = await saveManagedUserPermissions({
      username,
      rawPermissions: Array.isArray(req.body?.permissions) ? req.body.permissions : [],
      rawCategoryAccess: Array.isArray(req.body?.categoryAccess) ? req.body.categoryAccess : [],
    });

    if (result.status === 'missing-user') {
      return res.status(404).json({
        status: 'fail',
        message: USER_ADMIN_MESSAGES.userNotFound,
      });
    }

    if (result.status === 'invalid-category') {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid category keys: ${result.summary}`,
      });
    }

    if (result.status === 'invalid-permission') {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid permission keys: ${result.keys.join(', ')}`,
      });
    }

    return res.json({ status: 'success' });
  } catch (error) {
    console.error('\uC0AC\uC6A9\uC790 \uAD8C\uD55C \uC800\uC7A5 \uC2E4\uD328:', error);
    return res.status(500).json({
      status: 'fail',
      message: USER_ADMIN_MESSAGES.updatePermissionsFailed,
    });
  }
});

module.exports = router;

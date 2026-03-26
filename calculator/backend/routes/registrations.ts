const express = require('express') as typeof import('express');
const { authMiddleware } = require('../middleware/authMiddleware');

const registrationListRoutes = require('./registrationListRoutes');
const registrationTransferRoutes = require('./registrationTransferRoutes');
const registrationNoteRoutes = require('./registrationNoteRoutes');
const registrationWithdrawalRoutes = require('./registrationWithdrawalRoutes');
const registrationCourseNameRoutes = require('./registrationCourseNameRoutes');

const router = express.Router();

router.use(authMiddleware());
router.use('/', registrationListRoutes);
router.use('/', registrationTransferRoutes);
router.use('/', registrationNoteRoutes);
router.use('/', registrationWithdrawalRoutes);
router.use('/', registrationCourseNameRoutes);

module.exports = router;

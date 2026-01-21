const express = require('express') as typeof import('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { prisma } = require('../db/prisma');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermissions } = require('../middleware/permissionMiddleware');


router.use(authMiddleware());
router.use(requirePermissions('tabs.calendar'));

// GET /api/calendar-notes?month=YYYY-MM
router.get('/', async (req, res) => {
    try {
        const { month } = req.query;

        let where = {};
        if (month) {
            // month format: "2023-10"
            const startDate = new Date(`${month}-01`);
            if (Number.isNaN(startDate.getTime())) {
                return res.status(400).json({
                    status: '실패',
                    message: 'Invalid month format. Use YYYY-MM.',
                });
            }
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);

            where = {
                date: {
                    gte: startDate,
                    lt: endDate,
                }
            };
        }

        const notes = await prisma.calendarNote.findMany({
            where,
            orderBy: {
                createdAt: 'asc',
            },
        });
        res.json({ status: '성공', notes });
    } catch (error) {
        console.error('Error fetching calendar notes:', error);
        res.status(500).json({ status: '실패', message: 'Failed to fetch notes' });
    }
});


// POST /api/calendar-notes
router.post('/', async (req, res) => {
    try {
        const { date, content, author } = req.body;

        if (!date || !content) {
            return res.status(400).json({ status: '실패', message: 'Date and content are required' });
        }

        const parsedDate = new Date(date);
        if (Number.isNaN(parsedDate.getTime())) {
            return res.status(400).json({ status: '실패', message: 'Invalid date format.' });
        }

        const newNote = await prisma.calendarNote.create({
            data: {
                id: uuidv4(),
                date: parsedDate, // Expecting ISO string or YYYY-MM-DD
                content,
                author: author || '',
            },
        });
        res.json({ status: '성공', note: newNote });


    } catch (error) {
        console.error('Error creating calendar note:', error);
        res.status(500).json({ status: '실패', message: 'Failed to create note' });

    }
});

// PUT /api/calendar-notes/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body; // Usually only content is updated

        if (!content) {
            return res.status(400).json({ status: '실패', message: 'Content is required' });

        }

        const updatedNote = await prisma.calendarNote.update({
            where: { id },
            data: { content },
        });
        res.json({ status: '성공', note: updatedNote });

    } catch (error) {
        console.error('Error updating calendar note:', error);
        res.status(500).json({ status: '실패', message: 'Failed to update note' });

    }
});

// DELETE /api/calendar-notes/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.calendarNote.delete({
            where: { id },
        });
        res.json({ status: '성공' });

    } catch (error) {
        console.error('Error deleting calendar note:', error);
        res.status(500).json({ status: '실패', message: 'Failed to delete note' });

    }
});

module.exports = router;

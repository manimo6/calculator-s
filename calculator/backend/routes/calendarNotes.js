const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/authMiddleware');
const { requirePermissions } = require('../middleware/permissionMiddleware');

const prisma = new PrismaClient();

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
        res.json(notes);
    } catch (error) {
        console.error('Error fetching calendar notes:', error);
        res.status(500).json({ error: 'Failed to fetch notes' });
    }
});

// POST /api/calendar-notes
router.post('/', async (req, res) => {
    try {
        const { date, content, author } = req.body;

        if (!date || !content) {
            return res.status(400).json({ error: 'Date and content are required' });
        }

        const newNote = await prisma.calendarNote.create({
            data: {
                id: uuidv4(),
                date: new Date(date), // Expecting ISO string or YYYY-MM-DD
                content,
                author: author || '',
            },
        });
        res.json(newNote);
    } catch (error) {
        console.error('Error creating calendar note:', error);
        res.status(500).json({ error: 'Failed to create note' });
    }
});

// PUT /api/calendar-notes/:id
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body; // Usually only content is updated

        if (!content) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const updatedNote = await prisma.calendarNote.update({
            where: { id },
            data: { content },
        });
        res.json(updatedNote);
    } catch (error) {
        console.error('Error updating calendar note:', error);
        res.status(500).json({ error: 'Failed to update note' });
    }
});

// DELETE /api/calendar-notes/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.calendarNote.delete({
            where: { id },
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting calendar note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

module.exports = router;

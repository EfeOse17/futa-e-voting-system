const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyStudent = require('../middleware/studentAuthMiddleware');

// Get all elections
router.get('/', verifyStudent, async (req, res) => {
    try {

        const result = await pool.query(
            `SELECT
                e.election_id,
                e.election_title,
                e.election_status,
                e.start_date,
                e.end_date,

            EXISTS (
                SELECT 1
                FROM voter_participation vp
                WHERE vp.election_id = e.election_id
                AND vp.account_id = $1
                AND vp.has_voted = TRUE
            ) AS has_voted

            FROM elections e

            ORDER BY e.election_id DESC`,
            [req.student.account_id]
);
        return res.status(200).json({
            message: 'Elections retrieved successfully',
            elections: result.rows
        });

    } catch (error) {
        console.error('Retrieve elections error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve elections'
        });
    }
});

// Get a specific election
router.get('/:election_id', verifyStudent, async (req, res) => {
    try {
        const parsedElectionId = Number(req.params.election_id);

        // Validate election ID
        if (
            !Number.isSafeInteger(parsedElectionId) ||
            parsedElectionId <= 0
        ) {
            return res.status(400).json({
                message: 'Invalid election ID'
            });
        }

        const result = await pool.query(
            `SELECT election_id, election_title, election_status,
                    start_date, end_date
             FROM elections
             WHERE election_id = $1`,
            [parsedElectionId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Election not found'
            });
        }

        return res.status(200).json({
            message: 'Election retrieved successfully',
            election: result.rows[0]
        });

    } catch (error) {
        console.error('Retrieve election error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve election'
        });
    }
});

module.exports = router;
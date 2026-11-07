const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyStudent = require('../middleware/studentAuthMiddleware');

// Get candidates for a specific election
router.get('/election/:election_id', verifyStudent, async (req, res) => {
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

        // Check whether the election exists
        const electionResult = await pool.query(
            `SELECT election_id, election_title
             FROM elections
             WHERE election_id = $1`,
            [parsedElectionId]
        );

        if (electionResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Election not found'
            });
        }

        // Retrieve candidates for the election
        const candidateResult = await pool.query(
            `SELECT candidate_id, candidate_name, election_id
             FROM candidates
             WHERE election_id = $1
             ORDER BY candidate_id ASC`,
            [parsedElectionId]
        );

        return res.status(200).json({
            message: 'Candidates retrieved successfully',
            election: electionResult.rows[0],
            candidates: candidateResult.rows
        });

    } catch (error) {
        console.error('Retrieve candidates error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve candidates'
        });
    }
});

module.exports = router;
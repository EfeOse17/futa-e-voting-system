const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyStudent = require('../middleware/studentAuthMiddleware');

// Cast Vote
router.post('/', verifyStudent, async (req, res) => {
    let client;
    let transactionStarted = false;
    let transactionCommitted = false;

    try {
        const { election_id, candidate_id } = req.body;
        const account_id = req.student.account_id;

        // Validate input
        if (
            !Number.isSafeInteger(election_id) ||
            election_id <= 0 ||
            !Number.isSafeInteger(candidate_id) ||
            candidate_id <= 0
        ) {
            return res.status(400).json({
                message: 'Valid election ID and candidate ID are required'
            });
        }

        // Get database connection
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Check student eligibility and lock participation record
        const participation = await client.query(
            `SELECT vp.participation_id, vp.has_voted
             FROM voter_participation vp
             JOIN voter_accounts va
                ON vp.account_id = va.account_id
             WHERE vp.account_id = $1
             AND vp.election_id = $2
             AND va.is_verified = TRUE
             FOR UPDATE OF vp`,
            [account_id, election_id]
        );

        if (participation.rows.length === 0) {
            return res.status(403).json({
                message: 'You are not eligible to vote in this election'
            });
        }

        if (participation.rows[0].has_voted) {
            return res.status(409).json({
                message: 'You have already voted in this election'
            });
        }

        // Check election status and lock election record
        const election = await client.query(
            `SELECT election_id
             FROM elections
             WHERE election_id = $1
             AND election_status = 'ongoing'
             AND (start_date IS NULL OR start_date <= NOW())
             AND (end_date IS NULL OR end_date >= NOW())
             FOR SHARE`,
            [election_id]
        );

        if (election.rows.length === 0) {
            return res.status(400).json({
                message: 'This election is not currently open for voting'
            });
        }

        // Confirm candidate belongs to the selected election
        const candidate = await client.query(
            `SELECT candidate_id
             FROM candidates
             WHERE candidate_id = $1
             AND election_id = $2
             FOR SHARE`,
            [candidate_id, election_id]
        );

        if (candidate.rows.length === 0) {
            return res.status(400).json({
                message: 'The selected candidate does not belong to this election'
            });
        }

        // Mark student as having voted
        await client.query(
            `UPDATE voter_participation
             SET has_voted = TRUE
             WHERE participation_id = $1`,
            [participation.rows[0].participation_id]
        );

        // Record anonymous ballot
        await client.query(
            `INSERT INTO votes (election_id, candidate_id)
             VALUES ($1, $2)`,
            [election_id, candidate_id]
        );

        // Commit transaction
        await client.query('COMMIT');
        transactionCommitted = true;

        return res.status(201).json({
            message: 'Your vote has been cast successfully'
        });

    } catch (error) {
        console.error('Vote casting error:', error.message);

        return res.status(500).json({
            message: 'An error occurred while casting your vote'
        });

    } finally {
        // Roll back unsuccessful transactions
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError.message);
            }
        }

        // Release database connection
        if (client) {
            client.release();
        }
    }
});

module.exports = router;

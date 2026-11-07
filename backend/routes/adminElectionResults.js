const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyAdmin = require('../middleware/authMiddleware');

// Get Election Results (Admin)
router.get('/:election_id', verifyAdmin, async (req, res) => {

    let client;
    let transactionStarted = false;
    let transactionCommitted = false;

    try {

        const election_id = Number(req.params.election_id);

        // Validate election ID
        if (!Number.isSafeInteger(election_id) || election_id <= 0) {
            return res.status(400).json({
                message: 'A valid election ID is required'
            });
        }

        // Get database connection
        client = await pool.connect();

        // Start consistent, read-only transaction
        await client.query(
            'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'
        );

        transactionStarted = true;

        // Check whether election exists and is completed
        const electionResult = await client.query(
            `SELECT election_id, election_title, election_status
             FROM elections
             WHERE election_id = $1`,
            [election_id]
        );

        if (electionResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Election not found'
            });
        }

        const election = electionResult.rows[0];

        if (election.election_status !== 'completed') {
            return res.status(403).json({
                message: 'Results are not available until the election is completed'
            });
        }

        // Retrieve candidates and their vote counts
        const results = await client.query(
            `SELECT
                c.candidate_id,
                c.candidate_name,
                COUNT(v.vote_id)::INTEGER AS total_votes
             FROM candidates c
             LEFT JOIN votes v
                ON c.candidate_id = v.candidate_id
                AND v.election_id = c.election_id
             WHERE c.election_id = $1
             GROUP BY c.candidate_id, c.candidate_name
             ORDER BY total_votes DESC, c.candidate_id ASC`,
            [election_id]
        );

        // Calculate total votes cast
        const totalVotes = results.rows.reduce(
            (sum, candidate) => sum + candidate.total_votes,
            0
        );

        // Calculate each candidate's percentage
        const candidates = results.rows.map(candidate => ({
            ...candidate,
            percentage: totalVotes === 0
                ? 0
                : Number(
                    ((candidate.total_votes / totalVotes) * 100).toFixed(2)
                )
        }));

        // Commit transaction
        await client.query('COMMIT');

        transactionCommitted = true;

        return res.status(200).json({
            message: 'Election results retrieved successfully',
            election: election,
            total_votes: totalVotes,
            candidates: candidates
        });

    } catch (error) {

        console.error('Admin election results error:', error.message);

        return res.status(500).json({
            message: 'An error occurred while retrieving election results'
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
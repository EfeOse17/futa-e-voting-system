const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyAdmin = require('../middleware/authMiddleware');

// Get Total Registered Students
router.get('/students', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*)::INTEGER AS total_students
             FROM students`
        );

        return res.status(200).json({
            total_students: result.rows[0].total_students
        });

    } catch (error) {
        console.error('Dashboard students error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve student statistics'
        });
    }
});

// Get Total Registered Voter Accounts
router.get('/voters', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*)::INTEGER AS total_voters
             FROM voter_accounts`
        );

        return res.status(200).json({
            total_voters: result.rows[0].total_voters
        });

    } catch (error) {
        console.error('Dashboard voters error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve voter statistics'
        });
    }
});

// Get Verified and Unverified Voters
router.get('/verification-stats', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*) FILTER (WHERE is_verified = TRUE)::INTEGER
                    AS verified_voters,
                COUNT(*) FILTER (WHERE is_verified = FALSE)::INTEGER
                    AS unverified_voters
             FROM voter_accounts`
        );

        return res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Dashboard verification error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve verification statistics'
        });
    }
});

// Get Election Statistics
router.get('/election-stats', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                COUNT(*)::INTEGER AS total_elections,
                COUNT(*) FILTER (
                    WHERE election_status = 'upcoming'
                )::INTEGER AS upcoming_elections,
                COUNT(*) FILTER (
                    WHERE election_status = 'ongoing'
                )::INTEGER AS ongoing_elections,
                COUNT(*) FILTER (
                    WHERE election_status = 'completed'
                )::INTEGER AS completed_elections
             FROM elections`
        );

        return res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error('Dashboard election error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve election statistics'
        });
    }
});

// Get Total Votes Cast
router.get('/votes', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT COUNT(*)::INTEGER AS total_votes
             FROM votes`
        );

        return res.status(200).json({
            total_votes: result.rows[0].total_votes
        });

    } catch (error) {
        console.error('Dashboard votes error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve vote statistics'
        });
    }
});

// Get All Candidates and Their Election Details
router.get('/candidates', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                c.candidate_id,
                c.candidate_name,
                e.election_id,
                e.election_title,
                e.election_status
             FROM candidates c
             INNER JOIN elections e
                ON c.election_id = e.election_id
             ORDER BY e.election_id DESC, c.candidate_name ASC`
        );

        return res.status(200).json({
            total_candidates: result.rows.length,
            candidates: result.rows
        });

    } catch (error) {
        console.error('Dashboard candidates error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve candidate information'
        });
    }
});

// Get Recently Registered Voters
router.get('/recent-voters', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                va.account_id,
                va.matric_number,
                s.full_name,
                s.department,
                va.created_at,
                va.is_verified
             FROM voter_accounts va
             INNER JOIN students s
                ON va.matric_number = s.matric_number
             ORDER BY va.created_at DESC
             LIMIT 5`
        );

        return res.status(200).json({
            recent_voters: result.rows
        });

    } catch (error) {
        console.error('Recent voters error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve recent voters'
        });
    }
});

module.exports = router;
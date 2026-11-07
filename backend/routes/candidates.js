const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyAdmin = require('../middleware/authMiddleware');

// Validate candidate ID
const validateCandidateId = (req, res, next) => {
    const candidateId = Number(req.params.candidate_id);

    if (!Number.isSafeInteger(candidateId) || candidateId <= 0) {
        return res.status(400).json({
            message: 'A valid candidate ID is required'
        });
    }

    req.candidateId = candidateId;
    next();
};

// Validate election ID
const validateElectionId = (req, res, next) => {
    const electionId = Number(req.params.election_id);

    if (!Number.isInteger(electionId) || electionId <= 0) {
        return res.status(400).json({
            message: 'A valid election ID is required'
        });
    }

    req.electionId = electionId;
    next();
};

// Add a new candidate
// Candidates can only be added to upcoming elections
router.post('/', verifyAdmin, async (req, res) => {
    let client;
    let transactionStarted = false;
    let transactionCommitted = false;

    try {
        const { candidate_name, election_id } = req.body || {};
        const parsedElectionId = Number(election_id);

        // Validate candidate details
        if (
            typeof candidate_name !== 'string' ||
            !candidate_name.trim() ||
            candidate_name.trim().length > 100 ||
            election_id === null ||
            election_id === undefined ||
            election_id === '' ||
            !Number.isSafeInteger(parsedElectionId) ||
            parsedElectionId <= 0
        ) {
            return res.status(400).json({
                message: 'A valid candidate name and election ID are required'
            });
        }

        client = await pool.connect();

        await client.query('BEGIN');
        transactionStarted = true;

        // Lock election row before adding candidate
        const electionResult = await client.query(
            `SELECT election_id, election_status
             FROM elections
             WHERE election_id = $1
             FOR UPDATE`,
            [parsedElectionId]
        );

        // Check if election exists
        if (electionResult.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(404).json({
                message: 'Election not found'
            });
        }

        // Only upcoming elections can receive candidates
        if (electionResult.rows[0].election_status !== 'upcoming') {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(409).json({
                message: 'Candidates can only be added to upcoming elections'
            });
        }

        // Insert candidate
        const result = await client.query(
            `INSERT INTO candidates (candidate_name, election_id)
             VALUES ($1, $2)
             RETURNING *`,
            [candidate_name.trim(), parsedElectionId]
        );

        await client.query('COMMIT');
        transactionCommitted = true;

        return res.status(201).json({
            message: 'Candidate added successfully',
            candidate: result.rows[0]
        });

    } catch (error) {
        console.error('Candidate creation error:', error.message);

        return res.status(500).json({
            message: 'Failed to add candidate'
        });

    } finally {
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Rollback error:', rollbackError.message);
            }
        }

        if (client) {
            client.release();
        }
    }
});

// Get all candidates
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                candidates.candidate_id,
                candidates.candidate_name,
                candidates.election_id,
                elections.election_title
             FROM candidates
             INNER JOIN elections
             ON candidates.election_id = elections.election_id
             ORDER BY candidates.candidate_id DESC`
        );

        return res.status(200).json({
            message: 'Candidates retrieved successfully',
            candidates: result.rows
        });

    } catch (error) {
        console.error('Candidate retrieval error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve candidates'
        });
    }
});

// Get candidates by election ID
router.get(
    '/election/:election_id',
    verifyAdmin,
    validateElectionId,
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
                    candidate_id,
                    candidate_name,
                    election_id
                 FROM candidates
                 WHERE election_id = $1
                 ORDER BY candidate_id DESC`,
                [req.electionId]
            );

            return res.status(200).json({
                message: 'Candidates retrieved successfully',
                candidates: result.rows
            });

        } catch (error) {
            console.error('Candidates by election error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve candidates'
            });
        }
    }
);

// Get a candidate by ID
router.get(
    '/:candidate_id',
    verifyAdmin,
    validateCandidateId,
    async (req, res) => {
        try {
            const result = await pool.query(
                `SELECT
                    candidates.candidate_id,
                    candidates.candidate_name,
                    candidates.election_id,
                    elections.election_title
                 FROM candidates
                 INNER JOIN elections
                 ON candidates.election_id = elections.election_id
                 WHERE candidates.candidate_id = $1`,
                [req.candidateId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Candidate not found'
                });
            }

            return res.status(200).json({
                message: 'Candidate retrieved successfully',
                candidate: result.rows[0]
            });

        } catch (error) {
            console.error('Candidate retrieval error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve candidate'
            });
        }
    }
);

// Update candidate information
// Only candidates in upcoming elections can be modified
router.put(
    '/:candidate_id',
    verifyAdmin,
    validateCandidateId,
    async (req, res) => {
        let client;
        let transactionStarted = false;
        let transactionCommitted = false;

        try {
            const { candidate_name } = req.body || {};

            // Validate candidate name
            if (
                typeof candidate_name !== 'string' ||
                !candidate_name.trim() ||
                candidate_name.trim().length > 100
            ) {
                return res.status(400).json({
                    message: 'A valid candidate name is required'
                });
            }

            client = await pool.connect();

            await client.query('BEGIN');
            transactionStarted = true;

            // Find candidate and lock its associated election
            const candidateResult = await client.query(
                `SELECT
                    candidates.candidate_id,
                    candidates.election_id,
                    elections.election_status
                 FROM candidates
                 INNER JOIN elections
                 ON candidates.election_id = elections.election_id
                 WHERE candidates.candidate_id = $1
                 FOR UPDATE OF elections`,
                [req.candidateId]
            );

            // Check if candidate exists
            if (candidateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(404).json({
                    message: 'Candidate not found'
                });
            }

            // Only upcoming elections can be modified
            if (candidateResult.rows[0].election_status !== 'upcoming') {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(409).json({
                    message: 'Candidates can only be modified in upcoming elections'
                });
            }

            // Update candidate
            const result = await client.query(
                `UPDATE candidates
                 SET candidate_name = $1
                 WHERE candidate_id = $2
                 RETURNING *`,
                [candidate_name.trim(), req.candidateId]
            );

            await client.query('COMMIT');
            transactionCommitted = true;

            return res.status(200).json({
                message: 'Candidate updated successfully',
                candidate: result.rows[0]
            });

        } catch (error) {
            console.error('Candidate update error:', error.message);

            return res.status(500).json({
                message: 'Failed to update candidate'
            });

        } finally {
            if (client && transactionStarted && !transactionCommitted) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('Rollback error:', rollbackError.message);
                }
            }

            if (client) {
                client.release();
            }
        }
    }
);

// Delete a candidate
// Only candidates in upcoming elections can be deleted
router.delete(
    '/:candidate_id',
    verifyAdmin,
    validateCandidateId,
    async (req, res) => {
        let client;
        let transactionStarted = false;
        let transactionCommitted = false;

        try {
            client = await pool.connect();

            await client.query('BEGIN');
            transactionStarted = true;

            // Find candidate and lock its associated election
            const candidateResult = await client.query(
                `SELECT
                    candidates.candidate_id,
                    candidates.election_id,
                    elections.election_status
                 FROM candidates
                 INNER JOIN elections
                 ON candidates.election_id = elections.election_id
                 WHERE candidates.candidate_id = $1
                 FOR UPDATE OF elections`,
                [req.candidateId]
            );

            // Check if candidate exists
            if (candidateResult.rows.length === 0) {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(404).json({
                    message: 'Candidate not found'
                });
            }

            // Only upcoming elections can have candidates deleted
            if (candidateResult.rows[0].election_status !== 'upcoming') {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(409).json({
                    message: 'Candidates can only be deleted from upcoming elections'
                });
            }

            // Delete candidate
            const result = await client.query(
                `DELETE FROM candidates
                 WHERE candidate_id = $1
                 RETURNING *`,
                [req.candidateId]
            );

            await client.query('COMMIT');
            transactionCommitted = true;

            return res.status(200).json({
                message: 'Candidate deleted successfully',
                candidate: result.rows[0]
            });

        } catch (error) {
            console.error('Candidate deletion error:', error.message);

            if (error.code === '23503') {
                return res.status(409).json({
                    message: 'Cannot delete this candidate because votes are associated with them'
                });
            }

            return res.status(500).json({
                message: 'Failed to delete candidate'
            });

        } finally {
            if (client && transactionStarted && !transactionCommitted) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('Rollback error:', rollbackError.message);
                }
            }

            if (client) {
                client.release();
            }
        }
    }
);

module.exports = router;

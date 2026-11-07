const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const verifyAdmin = require('../middleware/authMiddleware');

// Validate election ID
const validateElectionId = (req, res, next) => {
    const electionId = Number(req.params.election_id);

    if (!Number.isSafeInteger(electionId) || electionId <= 0) {
        return res.status(400).json({
            message: 'A valid election ID is required'
        });
    }

    req.electionId = electionId;
    next();
};

// Validate timezone-aware date
const validateDate = (date) => {
    if (
        typeof date !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/i.test(date)
    ) {
        return false;
    }

    return !Number.isNaN(Date.parse(date));
};

// Validate election dates
const validateElectionDates = (start_date, end_date) => {
    if (
        !validateDate(start_date) ||
        !validateDate(end_date)
    ) {
        return false;
    }

    return new Date(end_date) > new Date(start_date);
};

// Create a new election
router.post('/', verifyAdmin, async (req, res) => {
    let client;

    try {
        const {
            election_title,
            start_date,
            end_date
        } = req.body || {};

        // Validate election title
        if (
            typeof election_title !== 'string' ||
            !election_title.trim() ||
            election_title.trim().length > 150
        ) {
            return res.status(400).json({
                message: 'Election title is required and must not exceed 150 characters'
            });
        }

        const hasStartDate = Object.prototype.hasOwnProperty.call(
            req.body || {},
            'start_date'
        );

        const hasEndDate = Object.prototype.hasOwnProperty.call(
            req.body || {},
            'end_date'
        );

        if (hasStartDate !== hasEndDate) {
            return res.status(400).json({
                message: 'Both start date and end date must be provided together'
            });
        }

        if (hasStartDate && hasEndDate) {
            if (
                start_date === null ||
                end_date === null
            ) {
                if (start_date !== null || end_date !== null) {
                    return res.status(400).json({
                        message: 'Both dates must be valid or both must be empty'
                    });
                }
            } else if (!validateElectionDates(start_date, end_date)) {
                return res.status(400).json({
                    message: 'Valid dates are required and the end date must be later than the start date'
                });
            }
        }

        client = await pool.connect();

        await client.query('BEGIN');

        // Create election
        const result = await client.query(
            `INSERT INTO elections (
                election_title,
                start_date,
                end_date
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [
                election_title.trim(),
                start_date || null,
                end_date || null
            ]
        );

        const electionId = result.rows[0].election_id;

        // Automatically create participation records for verified students
        await client.query(
            `INSERT INTO voter_participation (
                account_id,
                election_id
            )
            SELECT account_id, $1
            FROM voter_accounts
            WHERE is_verified = TRUE
            ON CONFLICT (account_id, election_id) DO NOTHING`,
            [electionId]
        );

        await client.query('COMMIT');

        return res.status(201).json({
            message: 'Election created successfully',
            election: result.rows[0]
        });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK').catch(() => {});
        }

        console.error('Election creation error:', error.message);

        return res.status(500).json({
            message: 'Failed to create election'
        });

    } finally {
        if (client) {
            client.release();
        }
    }
});

// Get all elections
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM elections ORDER BY election_id DESC'
        );

        return res.status(200).json({
            message: 'Elections retrieved successfully',
            elections: result.rows
        });

    } catch (error) {
        console.error('Election retrieval error:', error.message);

        return res.status(500).json({
            message: 'Failed to retrieve elections'
        });
    }
});

// Get an election by ID
router.get(
    '/:election_id',
    verifyAdmin,
    validateElectionId,
    async (req, res) => {
        try {
            const result = await pool.query(
                'SELECT * FROM elections WHERE election_id = $1',
                [req.electionId]
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
            console.error('Single election retrieval error:', error.message);

            return res.status(500).json({
                message: 'Failed to retrieve election'
            });
        }
    }
);

// Update election title and schedule
// Only upcoming elections can be modified
router.put(
    '/:election_id',
    verifyAdmin,
    validateElectionId,
    async (req, res) => {
        let client;

        try {
            const {
                election_title,
                start_date,
                end_date
            } = req.body || {};

            // Validate election title
            if (
                typeof election_title !== 'string' ||
                !election_title.trim() ||
                election_title.trim().length > 150
            ) {
                return res.status(400).json({
                    message: 'Election title is required and must not exceed 150 characters'
                });
            }

            const hasStartDate = Object.prototype.hasOwnProperty.call(
                req.body || {},
                'start_date'
            );

            const hasEndDate = Object.prototype.hasOwnProperty.call(
                req.body || {},
                'end_date'
            );

            // Both dates must be provided together
            if (hasStartDate !== hasEndDate) {
                return res.status(400).json({
                    message: 'Both start date and end date must be provided together'
                });
            }

            // Validate dates when supplied
            if (hasStartDate && hasEndDate) {
                if (
                    start_date === null ||
                    end_date === null
                ) {
                    if (start_date !== null || end_date !== null) {
                        return res.status(400).json({
                            message: 'Both dates must be valid or both must be empty'
                        });
                    }
                } else if (!validateElectionDates(start_date, end_date)) {
                    return res.status(400).json({
                        message: 'Valid dates are required and the end date must be later than the start date'
                    });
                }
            }

            client = await pool.connect();

            await client.query('BEGIN');

            // Lock election row before updating
            const electionResult = await client.query(
                `SELECT election_id, election_status
                 FROM elections
                 WHERE election_id = $1
                 FOR UPDATE`,
                [req.electionId]
            );

            if (electionResult.rows.length === 0) {
                await client.query('ROLLBACK');

                return res.status(404).json({
                    message: 'Election not found'
                });
            }

            if (electionResult.rows[0].election_status !== 'upcoming') {
                await client.query('ROLLBACK');

                return res.status(409).json({
                    message: 'Only upcoming elections can be modified'
                });
            }

            let result;

            if (hasStartDate && hasEndDate) {
                result = await client.query(
                    `UPDATE elections
                     SET
                        election_title = $1,
                        start_date = $2,
                        end_date = $3
                     WHERE election_id = $4
                     RETURNING *`,
                    [
                        election_title.trim(),
                        start_date,
                        end_date,
                        req.electionId
                    ]
                );
            } else {
                result = await client.query(
                    `UPDATE elections
                     SET election_title = $1
                     WHERE election_id = $2
                     RETURNING *`,
                    [
                        election_title.trim(),
                        req.electionId
                    ]
                );
            }

            await client.query('COMMIT');

            return res.status(200).json({
                message: 'Election updated successfully',
                election: result.rows[0]
            });

        } catch (error) {
            if (client) {
                try {
                    await client.query('ROLLBACK');
                } catch (rollbackError) {
                    console.error('Rollback error:', rollbackError.message);
                }
            }

            console.error('Election update error:', error.message);

            return res.status(500).json({
                message: 'Failed to update election'
            });

        } finally {
            if (client) {
                client.release();
            }
        }
    }
);

// Update election status
router.patch(
    '/:election_id/status',
    verifyAdmin,
    validateElectionId,
    async (req, res) => {
        let client;
        let transactionStarted = false;
        let transactionCommitted = false;

        try {
            const { election_status } = req.body || {};

            const allowedStatuses = [
                'upcoming',
                'ongoing',
                'completed'
            ];

            if (
                typeof election_status !== 'string' ||
                !allowedStatuses.includes(election_status)
            ) {
                return res.status(400).json({
                    message: 'Invalid election status'
                });
            }

            client = await pool.connect();

            await client.query('BEGIN');
            transactionStarted = true;

            // Lock election row to prevent conflicting status changes
            const electionResult = await client.query(
                `SELECT election_id, election_status, start_date, end_date
                 FROM elections
                 WHERE election_id = $1
                 FOR UPDATE`,
                [req.electionId]
            );

            if (electionResult.rows.length === 0) {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(404).json({
                    message: 'Election not found'
                });
            }

            const election = electionResult.rows[0];
            const currentStatus = election.election_status;

            // Completed elections cannot be changed
            if (currentStatus === 'completed') {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(409).json({
                    message: 'A completed election cannot be reopened or modified'
                });
            }

            // Allow unchanged status
            if (currentStatus === election_status) {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(200).json({
                    message: 'Election status is already set to this value',
                    election
                });
            }

            // Define permitted status transitions
            const validTransitions = {
                upcoming: ['ongoing', 'completed'],
                ongoing: ['completed']
            };

            if (
                !validTransitions[currentStatus] ||
                !validTransitions[currentStatus].includes(election_status)
            ) {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(409).json({
                    message: `Election status cannot be changed from ${currentStatus} to ${election_status}`
                });
            }

            // An election must have valid dates before becoming ongoing
            if (election_status === 'ongoing') {
                if (!election.start_date || !election.end_date) {
                    await client.query('ROLLBACK');
                    transactionStarted = false;

                    return res.status(400).json({
                        message: 'Start date and end date must be configured before opening an election'
                    });
                }

                const dateCheck = await client.query(
                    `SELECT
                        start_date <= NOW() AS has_started,
                        end_date >= NOW() AS has_not_ended
                     FROM elections
                     WHERE election_id = $1`,
                    [req.electionId]
                );

                if (
                    !dateCheck.rows[0].has_started ||
                    !dateCheck.rows[0].has_not_ended
                ) {
                    await client.query('ROLLBACK');
                    transactionStarted = false;

                    return res.status(400).json({
                        message: 'The current time must fall within the election start and end dates'
                    });
                }
            }

            // Update election status
            const result = await client.query(
                `UPDATE elections
                 SET election_status = $1
                 WHERE election_id = $2
                 RETURNING *`,
                [election_status, req.electionId]
            );

            await client.query('COMMIT');
            transactionCommitted = true;

            return res.status(200).json({
                message: 'Election status updated successfully',
                election: result.rows[0]
            });

        } catch (error) {
            console.error('Election status update error:', error.message);

            return res.status(500).json({
                message: 'Failed to update election status'
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

// Delete an election
// Only upcoming elections can be deleted
router.delete(
    '/:election_id',
    verifyAdmin,
    validateElectionId,
    async (req, res) => {
        let client;
        let transactionStarted = false;
        let transactionCommitted = false;

        try {
            client = await pool.connect();

            await client.query('BEGIN');
            transactionStarted = true;

            // Lock election row before deletion
            const electionResult = await client.query(
                `SELECT election_id, election_status
                 FROM elections
                 WHERE election_id = $1
                 FOR UPDATE`,
                [req.electionId]
            );

            // Check if election exists
            if (electionResult.rows.length === 0) {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(404).json({
                    message: 'Election not found'
                });
            }

            // Only upcoming elections can be deleted
            if (electionResult.rows[0].election_status !== 'upcoming') {
                await client.query('ROLLBACK');
                transactionStarted = false;

                return res.status(409).json({
                    message: 'Only upcoming elections can be deleted'
                });
            }

            // Delete election
            const result = await client.query(
                `DELETE FROM elections
                 WHERE election_id = $1
                 RETURNING *`,
                [req.electionId]
            );

            await client.query('COMMIT');
            transactionCommitted = true;

            return res.status(200).json({
                message: 'Election deleted successfully',
                election: result.rows[0]
            });

        } catch (error) {
            console.error('Election deletion error:', error.message);

            if (error.code === '23503') {
                return res.status(409).json({
                    message: 'This election cannot be deleted because it has associated records. Consider archiving it instead.'
                });
            }

            return res.status(500).json({
                message: 'Failed to delete election'
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
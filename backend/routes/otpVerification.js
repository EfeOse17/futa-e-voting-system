const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const bcrypt = require('bcrypt');

const {
    otpVerificationLimiter
} = require('../middleware/rateLimitMiddleware');

// Verify Student OTP
router.post('/', otpVerificationLimiter, async (req, res) => {
    let client;
    let transactionStarted = false;
    let transactionCommitted = false;

    try {
        const { matric_number, otp } = req.body;

        // Validate input
        if (
            typeof matric_number !== 'string' ||
            !matric_number.trim() ||
            matric_number.trim().length > 20 ||
            typeof otp !== 'string' ||
            !/^\d{6}$/.test(otp)
        ) {
            return res.status(400).json({
                message: 'A valid matric number and 6-digit OTP are required.'
            });
        }

        const matricNumber = matric_number.trim();

        // Get a database connection
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Find and lock the pending registration
        const pendingResult = await client.query(
            `SELECT
                matric_number,
                full_name,
                department,
                email,
                password_hash,
                otp_hash,
                expires_at,
                attempts
             FROM pending_registrations
             WHERE matric_number = $1
             FOR UPDATE`,
            [matricNumber]
        );

        if (pendingResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Pending registration not found. Please register again.'
            });
        }

        const pending = pendingResult.rows[0];

        // Check OTP attempt limit
        if (pending.attempts >= 5) {
            return res.status(400).json({
                message: 'Too many incorrect OTP attempts. Please request a new OTP.'
            });
        }

        // Check OTP expiry
        if (new Date(pending.expires_at) <= new Date()) {
            return res.status(400).json({
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Compare submitted OTP with stored hash
        const isOtpValid = await bcrypt.compare(
            otp,
            pending.otp_hash
        );

        // Handle incorrect OTP
        if (!isOtpValid) {
            const updatedPending = await client.query(
                `UPDATE pending_registrations
                 SET attempts = attempts + 1
                 WHERE matric_number = $1
                 RETURNING attempts`,
                [matricNumber]
            );

            const attempts = updatedPending.rows[0].attempts;

            // Commit failed attempt counter
            await client.query('COMMIT');
            transactionCommitted = true;

            if (attempts >= 5) {
                return res.status(400).json({
                    message: 'Too many incorrect OTP attempts. Please request a new OTP.'
                });
            }

            return res.status(400).json({
                message: `Invalid OTP. ${5 - attempts} attempts remaining.`
            });
        }

        // Create student record after successful OTP verification
        await client.query(
            `INSERT INTO students
             (matric_number, full_name, email, department)
             VALUES ($1, $2, $3, $4)`,
            [
                pending.matric_number,
                pending.full_name,
                pending.email,
                pending.department
            ]
        );

        // Create verified voter account
        const accountResult = await client.query(
            `INSERT INTO voter_accounts
             (matric_number, password_hash, is_verified)
             VALUES ($1, $2, TRUE)
             RETURNING account_id`,
            [
                pending.matric_number,
                pending.password_hash
            ]
        );

        const accountId = accountResult.rows[0].account_id;

        // Create participation records for upcoming and ongoing elections
        await client.query(
            `INSERT INTO voter_participation
             (account_id, election_id)
             SELECT $1, election_id
             FROM elections
             WHERE election_status IN ('upcoming', 'ongoing')
             ON CONFLICT (account_id, election_id) DO NOTHING`,
            [accountId]
        );

        // Remove completed pending registration
        await client.query(
            `DELETE FROM pending_registrations
             WHERE matric_number = $1`,
            [matricNumber]
        );

        // Commit successful verification
        await client.query('COMMIT');
        transactionCommitted = true;

        return res.status(200).json({
            message: 'OTP verified successfully. Your student account has been created and activated.',
            account: {
                matric_number: pending.matric_number,
                full_name: pending.full_name
            }
        });

    } catch (error) {
        console.error('OTP verification error:', error.message);

        // Handle duplicate student or account records
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'A student account with these details already exists.'
            });
        }

        return res.status(500).json({
            message: 'An error occurred during OTP verification.'
        });

    } finally {
        // Roll back unsuccessful transactions
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error(
                    'Transaction rollback error:',
                    rollbackError.message
                );
            }
        }

        // Always release database connection
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
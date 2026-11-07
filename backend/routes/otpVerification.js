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
                message: 'A valid matric number and 6-digit OTP are required'
            });
        }

        // Get a database connection
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Find and lock the student's account
        const accountResult = await client.query(
            `SELECT account_id, is_verified
             FROM voter_accounts
             WHERE matric_number = $1
             FOR UPDATE`,
            [matric_number.trim()]
        );

        if (accountResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Account not found'
            });
        }

        const account = accountResult.rows[0];

        // Check whether the account is already verified
        if (account.is_verified) {
            return res.status(400).json({
                message: 'This account has already been verified'
            });
        }

        // Retrieve the latest unused, unexpired OTP
        const otpResult = await client.query(
            `SELECT otp_id, otp_hash, expires_at, attempts
             FROM otp_verifications
             WHERE account_id = $1
             AND is_used = FALSE
             AND attempts < 5
             ORDER BY created_at DESC
             LIMIT 1
             FOR UPDATE`,
            [account.account_id]
        );

        if (otpResult.rows.length === 0) {
            return res.status(400).json({
                message: 'No active OTP found. Please request a new one.'
            });
        }

        const otpRecord = otpResult.rows[0];

        // Check whether OTP has expired
        if (new Date(otpRecord.expires_at) <= new Date()) {
            return res.status(400).json({
                message: 'OTP has expired. Please request a new one.'
            });
        }

        // Compare submitted OTP with stored hash
        const isOtpValid = await bcrypt.compare(
            otp,
            otpRecord.otp_hash
        );

        // Handle incorrect OTP
        if (!isOtpValid) {
            const updatedOtp = await client.query(
                `UPDATE otp_verifications
                 SET attempts = attempts + 1,
                     is_used = CASE
                         WHEN attempts + 1 >= 5 THEN TRUE
                         ELSE is_used
                     END
                 WHERE otp_id = $1
                 RETURNING attempts`,
                [otpRecord.otp_id]
            );

            const attempts = updatedOtp.rows[0].attempts;

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

        // Mark OTP as used
        await client.query(
            `UPDATE otp_verifications
             SET is_used = TRUE
             WHERE otp_id = $1`,
            [otpRecord.otp_id]
        );

        // Activate student account
        await client.query(
            `UPDATE voter_accounts
             SET is_verified = TRUE
             WHERE account_id = $1`,
            [account.account_id]
        );

        // Create participation records for upcoming and ongoing elections
        await client.query(
            `INSERT INTO voter_participation (account_id, election_id)
            SELECT $1, election_id
            FROM elections
            WHERE election_status IN ('upcoming', 'ongoing')
            ON CONFLICT (account_id, election_id) DO NOTHING`,
            [account.account_id]
        );

        // Commit successful verification
        await client.query('COMMIT');
        transactionCommitted = true;

        return res.status(200).json({
            message: 'OTP verified successfully. Your account is now active.'
        });

    } catch (error) {
        console.error('OTP verification error:', error.message);

        return res.status(500).json({
            message: 'An error occurred during OTP verification'
        });

    } finally {
        // Roll back unsuccessful transactions
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Transaction rollback error:', rollbackError.message);
            }
        }

        // Always release database connection
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const bcrypt = require('bcrypt');
const transporter = require('../config/email');

const {
    resendOtpLimiter
} = require('../middleware/rateLimitMiddleware');

// Resend OTP
router.post('/', resendOtpLimiter, async (req, res) => {
    let client;
    let transactionStarted = false;
    let transactionCommitted = false;

    try {
        const { matric_number } = req.body;

        // Validate input
        if (
            typeof matric_number !== 'string' ||
            !matric_number.trim() ||
            matric_number.trim().length > 20
        ) {
            return res.status(400).json({
                message: 'A valid matric number is required.'
            });
        }

        const matricNumber = matric_number.trim();

        // Connect to database
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Find and lock pending registration
        const result = await client.query(
            `SELECT matric_number, email
             FROM pending_registrations
             WHERE matric_number = $1
             FOR UPDATE`,
            [matricNumber]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Pending registration not found. Please register again.'
            });
        }

        const pending = result.rows[0];

        // Generate and hash a new OTP
        const otp = crypto.randomInt(100000, 1000000).toString();

        const otpHash = await bcrypt.hash(otp, 10);

        // Update pending registration with new OTP
        // Reset expiry and incorrect attempt counter
        await client.query(
            `UPDATE pending_registrations
             SET otp_hash = $1,
                 expires_at = NOW() + INTERVAL '5 minutes',
                 attempts = 0,
                 created_at = CURRENT_TIMESTAMP
             WHERE matric_number = $2`,
            [otpHash, matricNumber]
        );

        // Commit transaction
        await client.query('COMMIT');
        transactionCommitted = true;

        // Release database connection before sending email
        client.release();
        client = null;

        // Send new OTP
        try {
            await transporter.sendMail({
                from: `"FUTA E-Voting" <${process.env.EMAIL_USER}>`,
                to: pending.email,
                subject: 'Your New FUTA E-Voting Verification Code',
                text: `Your new OTP verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`
            });

            return res.status(200).json({
                message: 'A new OTP has been sent to your registered email address.',
                otp_delivery: 'successful'
            });

        } catch (emailError) {
            console.error(
                'OTP email delivery error:',
                emailError.message
            );

            // Expire the new OTP if email delivery fails
            try {
                await pool.query(
                    `UPDATE pending_registrations
                     SET expires_at = NOW()
                     WHERE matric_number = $1
                     AND otp_hash = $2`,
                    [matricNumber, otpHash]
                );
            } catch (updateError) {
                console.error(
                    'Failed to invalidate OTP:',
                    updateError.message
                );
            }

            return res.status(503).json({
                message: 'Email delivery failed. Please request a new OTP later.',
                otp_delivery: 'failed'
            });
        }

    } catch (error) {
        console.error('Resend OTP error:', error.message);

        return res.status(500).json({
            message: 'An error occurred while requesting a new OTP.'
        });

    } finally {
        // Roll back unsuccessful transactions
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error(
                    'Rollback error:',
                    rollbackError.message
                );
            }
        }

        // Release database connection
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
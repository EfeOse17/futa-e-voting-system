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

        if (
            typeof matric_number !== 'string' ||
            !matric_number.trim() ||
            matric_number.trim().length > 20
        ) {
            return res.status(400).json({
                message: 'A valid matric number is required'
            });
        }

        // Connect to the database
        client = await pool.connect();

        // Start transaction
        await client.query('BEGIN');
        transactionStarted = true;

        // Find and lock the student account
        const result = await client.query(
            `SELECT
                va.account_id,
                va.is_verified,
                s.email
             FROM voter_accounts va
             JOIN students s
                ON va.matric_number = s.matric_number
             WHERE va.matric_number = $1
             FOR UPDATE OF va`,
            [matric_number.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Account not found'
            });
        }

        const account = result.rows[0];

        // Check whether the account is already verified
        if (account.is_verified) {
            return res.status(400).json({
                message: 'This account has already been verified'
            });
        }

        // Generate and hash a new OTP
        const otp = crypto.randomInt(100000, 1000000).toString();
        const otpHash = await bcrypt.hash(otp, 10);

        // Invalidate previous unused OTPs
        await client.query(
            `UPDATE otp_verifications
             SET is_used = TRUE
             WHERE account_id = $1
             AND is_used = FALSE`,
            [account.account_id]
        );

        // Store the new OTP
        // attempts automatically starts at 0 because of the database DEFAULT
        const otpInsert = await client.query(
            `INSERT INTO otp_verifications
             (account_id, otp_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
             RETURNING otp_id`,
            [account.account_id, otpHash]
        );
        const newOtpId = otpInsert.rows[0].otp_id;

        // Commit transaction
        await client.query('COMMIT');
        transactionCommitted = true;

        // Release the database connection before sending the email
        client.release();
        client = null;

        // Send OTP to registered email
        try {
            await transporter.sendMail({
                from: `"FUTA E-Voting" <${process.env.EMAIL_USER}>`,
                to: account.email,
                subject: 'Your New FUTA E-Voting Verification Code',
                text: `Your new OTP verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`
            });

            return res.status(200).json({
                message: 'A new OTP has been sent to your registered email address'
            });

        } catch (emailError) {
            console.error('OTP email delivery error:', emailError.message);

            //Invalidate the otp because the email failed
            try {
                await pool.query(
                    `UPDATE otp_verifications
                    SET is_used = TRUE
                    WHERE otp_id = $1`,
                    [newOtpId]
                );
            } catch (updateError) {
                console.error('Failed to invalidate OTP:', updateError.message);
            }

            return res.status(503).json({
                message: 'Email delivery failed. Please try requesting a new OTP later.',
                otp_delivery: 'failed'
            });
        }

    } catch (error) {
        console.error('Resend OTP error:', error.message);

        return res.status(500).json({
            message: 'An error occurred while requesting a new OTP'
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

module.exports = router;
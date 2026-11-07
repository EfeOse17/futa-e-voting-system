const crypto = require('crypto');
const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const bcrypt = require('bcrypt');
const transporter = require('../config/email');

const {
    registrationLimiter
} = require('../middleware/rateLimitMiddleware');

// Student Account Registration
router.post('/', registrationLimiter, async (req, res) => {
    let client;
    let transactionStarted = false;
    let transactionCommitted = false;

    try {
        const { matric_number, email, password } = req.body;

        // Validate input
        if (
            typeof matric_number !== 'string' ||
            !matric_number.trim() ||
            matric_number.trim().length > 20 ||
            typeof email !== 'string' ||
            !email.trim() ||
            email.trim().length > 254 ||
            typeof password !== 'string' ||
            !password
        ) {
            return res.status(400).json({
                message: 'Invalid registration details'
            });
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({
                message: 'Please provide a valid email address'
            });
        }

        // Validate password length
        if (
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and must not exceed 72 bytes.'
            });
        }

        // Check approved student records
        const result = await pool.query(
            `SELECT matric_number, full_name, email
             FROM students
             WHERE matric_number = $1
             AND LOWER(email) = LOWER($2)`,
            [matric_number.trim(), email.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'The provided details could not be verified'
            });
        }

        const student = result.rows[0];

        // Check for an existing account
        const account = await pool.query(
            `SELECT account_id, password_hash, is_verified
            FROM voter_accounts
            WHERE matric_number = $1`,
            [student.matric_number]
        );

        if (account.rows.length > 0) {

            const existingAccount = account.rows[0];

            // Check whether account is already verified
            if (existingAccount.is_verified) {
                return res.status(409).json({
                    message: 'Your account is already verified. Please log in.'
                });
            }

            // Verify the submitted password
            const passwordMatches = await bcrypt.compare(
                password,
                existingAccount.password_hash
            );

            if (!passwordMatches) {
                return res.status(401).json({
                    message: 'Incorrect password for this existing account.'
                });
            }

            // Generate a fresh OTP
            const otp = crypto.randomInt(100000, 1000000).toString();
            const otpHash = await bcrypt.hash(otp, 10);

            // Start transaction
            client = await pool.connect();

            await client.query('BEGIN');
            transactionStarted = true;

            // Invalidate previous unused OTPs
            await client.query(
                `UPDATE otp_verifications
                SET is_used = TRUE
                WHERE account_id = $1
                AND is_used = FALSE`,
                [existingAccount.account_id]
            );

            // Store new OTP
            const otpInsert = await client.query(
                `INSERT INTO otp_verifications
                (account_id, otp_hash, expires_at)
                VALUES ($1, $2, NOW() + INTERVAL '5 minutes')
                RETURNING otp_id`,
                [existingAccount.account_id, otpHash]
            );

            const newOtpId = otpInsert.rows[0].otp_id;

            // Commit transaction
            await client.query('COMMIT');
            transactionCommitted = true;

            client.release();
            client = null;

            // Send fresh OTP
            try {

                await transporter.sendMail({
                    from: `"FUTA E-Voting" <${process.env.EMAIL_USER}>`,
                    to: student.email,
                    subject: 'Your FUTA E-Voting Verification Code',
                    text: `Your OTP verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`
                });

            } catch (emailError) {

                console.error('OTP email delivery failed:', emailError.message);

                await pool.query(
                    `UPDATE otp_verifications
                    SET is_used = TRUE
                    WHERE otp_id = $1`,
                    [newOtpId]
                );

                    return res.status(503).json({
                        message: 'OTP delivery failed. Please try again.',
                        otp_delivery: 'failed'
                    });
            }

                    return res.status(200).json({
                        message: 'Your account is not yet verified. A new OTP has been sent to your email.',
                        account: {
                            matric_number: student.matric_number,
                            full_name: student.full_name
                        },
                        otp_delivery: 'successful'
                    });
            }

        // Hash password and generate OTP
        const passwordHash = await bcrypt.hash(password, 12);

        const otp = crypto.randomInt(100000, 1000000).toString();

        const otpHash = await bcrypt.hash(otp, 10);

        // Start database transaction
        client = await pool.connect();

        await client.query('BEGIN');
        transactionStarted = true;

        // Create voter account
        const newAccount = await client.query(
            `INSERT INTO voter_accounts
             (matric_number, password_hash)
             VALUES ($1, $2)
             RETURNING account_id`,
            [student.matric_number, passwordHash]
        );

        // Store hashed OTP
        await client.query(
            `INSERT INTO otp_verifications
             (account_id, otp_hash, expires_at)
             VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
            [newAccount.rows[0].account_id, otpHash]
        );

        // Commit database changes
        await client.query('COMMIT');
        transactionCommitted = true;

        // Send OTP after successful database commit
        try {
            await transporter.sendMail({
            from: `"FUTA E-Voting" <${process.env.EMAIL_USER}>`,
            to: student.email,
            subject: 'Your FUTA E-Voting Verification Code',
            text: `Your OTP verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`
            });
        } catch (emailError) {
            console.error('OTP email delivery failed:', emailError.message);

            return res.status(201).json({
                message: 'Account created, but OTP delivery failed. Please request a new OTP.',
                account: {
                matric_number: student.matric_number,
                full_name: student.full_name
                },
                
                otp_delivery: 'failed'
            });
        }

        return res.status(201).json ({
            message: 'Registration successful. Please check your email for the OTP.',
            account : {
                matric_number: student.matric_number,
                full_name: student.full_name
            },
            otp_delivery: 'successful'
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        // Handle duplicate account errors
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'An account already exists for this student'
            });
        }

        return res.status(500).json({
            message: 'An error occurred during registration'
        });

    } finally {
        // Roll back if the transaction did not commit
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Registration rollback error:', rollbackError.message);
            }
        }

        // Release database connection
        if (client) {
            client.release();
        }
    }
});

module.exports = router;
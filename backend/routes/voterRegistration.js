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
        const {
            full_name,
            department,
            matric_number,
            email,
            password
        } = req.body;

        // Validate input
        if (
            typeof full_name !== 'string' ||
            !full_name.trim() ||
            full_name.trim().length > 100 ||

            typeof department !== 'string' ||
            !department.trim() ||
            department.trim().length > 100 ||

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
                message: 'Please provide valid registration details.'
            });
        }

        // Normalize submitted details
        const studentName = full_name.trim();
        const studentDepartment = department.trim();
        const matricNumber = matric_number.trim();
        const studentEmail = email.trim().toLowerCase();

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail)) {
            return res.status(400).json({
                message: 'Please provide a valid email address.'
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

        // Check whether matric number or email already belongs to a student
        const existingStudent = await pool.query(
            `SELECT matric_number, email
             FROM students
             WHERE matric_number = $1
             OR LOWER(email) = LOWER($2)`,
            [matricNumber, studentEmail]
        );

        if (existingStudent.rows.length > 0) {
            return res.status(409).json({
                message: 'This matric number or email address is already registered.'
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

        // Save pending registration.
        // A repeat submission using the same matric number and email
        // refreshes the existing pending registration.
        const pendingRegistration = await client.query(
            `INSERT INTO pending_registrations
             (
                matric_number,
                full_name,
                department,
                email,
                password_hash,
                otp_hash,
                expires_at,
                attempts
             )
             VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '5 minutes', 0)

             ON CONFLICT (matric_number)
             DO UPDATE SET
                full_name = EXCLUDED.full_name,
                department = EXCLUDED.department,
                password_hash = EXCLUDED.password_hash,
                otp_hash = EXCLUDED.otp_hash,
                expires_at = EXCLUDED.expires_at,
                attempts = 0,
                created_at = CURRENT_TIMESTAMP

             WHERE LOWER(pending_registrations.email) =
                   LOWER(EXCLUDED.email)

             RETURNING matric_number, full_name`,
            [
                matricNumber,
                studentName,
                studentDepartment,
                studentEmail,
                passwordHash,
                otpHash
            ]
        );

        // No row means the matric number already has a pending
        // registration associated with a different email address.
        if (pendingRegistration.rows.length === 0) {
            await client.query('ROLLBACK');
            transactionStarted = false;

            return res.status(409).json({
                message: 'This matric number already has a pending registration with a different email address.'
            });
        }

        // Commit pending registration
        await client.query('COMMIT');
        transactionCommitted = true;

        client.release();
        client = null;

        // Send OTP after saving the pending registration
        try {
            await transporter.sendMail({
                from: `"FUTA E-Voting" <${process.env.EMAIL_USER}>`,
                to: studentEmail,
                subject: 'Your FUTA E-Voting Verification Code',
                text: `Your OTP verification code is ${otp}. It expires in 5 minutes. Do not share this code with anyone.`
            });

        } catch (emailError) {
            console.error(
                'OTP email delivery failed:',
                emailError.message
            );

            return res.status(503).json({
                message: 'Registration was saved, but OTP delivery failed. Please request a new OTP.',
                otp_delivery: 'failed'
            });
        }

        return res.status(201).json({
            message: 'Registration submitted successfully. Please check your email for the OTP.',
            account: {
                matric_number: matricNumber,
                full_name: studentName
            },
            otp_delivery: 'successful'
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        // Handle database uniqueness violations
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'This matric number or email address is already registered or has a pending registration.'
            });
        }

        return res.status(500).json({
            message: 'An error occurred during registration.'
        });

    } finally {
        // Roll back if transaction did not commit
        if (client && transactionStarted && !transactionCommitted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error(
                    'Registration rollback error:',
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
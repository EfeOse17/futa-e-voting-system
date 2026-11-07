const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { studentLoginLimiter } = require('../middleware/rateLimitMiddleware');

// Student Login
router.post('/login', studentLoginLimiter, async (req, res) => {
    try {
        const { matric_number, password } = req.body;

        // Validate input
        if (
            typeof matric_number !== 'string' ||
            !matric_number.trim() ||
            matric_number.trim().length > 20 ||
            typeof password !== 'string' ||
            !password ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                message: 'Valid matric number and password are required'
            });
        }

        // Find student account
        const result = await pool.query(
            `SELECT account_id, matric_number, password_hash, is_verified
             FROM voter_accounts
             WHERE matric_number = $1`,
            [matric_number.trim()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'Invalid matric number or password'
            });
        }

        const student = result.rows[0];

        // Check password
        const isPasswordValid = await bcrypt.compare(
            password,
            student.password_hash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid matric number or password'
            });
        }

        // Check OTP verification status
        if (!student.is_verified) {
            return res.status(403).json({
                message: 'Please verify your email before logging in'
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                account_id: student.account_id,
                matric_number: student.matric_number,
                role: 'student'
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h',
                algorithm: 'HS256'
            }
        );

        return res.status(200).json({
            message: 'Student login successful',
            token: token,
            student: {
                account_id: student.account_id,
                matric_number: student.matric_number
            }
        });

    } catch (error) {
        console.error('Student login error:', error.message);

        return res.status(500).json({
            message: 'An error occurred during login'
        });
    }
});

const verifyStudent = require('../middleware/studentAuthMiddleware');

// Protected Student Dashboard
router.get('/dashboard', verifyStudent, async (req, res) => {
    try {
        // Retrieve the student's information from the database
        const result = await pool.query(
            `SELECT matric_number, full_name, email, department
             FROM students
             WHERE matric_number = $1`,
            [req.student.matric_number]
        );

        // Check whether the student exists
        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Student record not found.'
            });
        }

        const student = result.rows[0];

        return res.status(200).json({
            message: 'Welcome to your Student Dashboard!',
            student: {
                account_id: req.student.account_id,
                matric_number: student.matric_number,
                full_name: student.full_name,
                email: student.email,
                department: student.department
            }
        });

    } catch (error) {
        console.error('Student Dashboard Error:', error.message);

        return res.status(500).json({
            message: 'Unable to load student dashboard.'
        });
    }
});

module.exports = router;

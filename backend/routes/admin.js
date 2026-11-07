const express = require('express');
const router = express.Router();

const verifyAdmin = require('../middleware/authMiddleware');
const { verifySuperAdmin } = require('../middleware/authMiddleware');
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { adminLoginLimiter } = require('../middleware/rateLimitMiddleware');

// Admin Login
router.post('/login', adminLoginLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== 'string' ||
            !email.trim() ||
            email.trim().length > 254 ||
            typeof password !== 'string' ||
            !password ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                message: 'Valid email and password are required'
            });
        }


        const result = await pool.query(
            `SELECT admin_id, full_name, email, password_hash, role
            FROM admins
            WHERE email = $1`,
            [email.trim().toLowerCase()]
        );


        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const admin = result.rows[0];

        const isPasswordValid = await bcrypt.compare(
            password,
            admin.password_hash
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                admin_id: admin.admin_id,
                email: admin.email,
                role: admin.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1h',
                algorithm: 'HS256'
            }
        );

        return res.status(200).json({
            message: 'Admin login successful',
            token: token,
            admin: {
                admin_id: admin.admin_id,
                full_name: admin.full_name,
                email: admin.email,
                role: admin.role
            }
        });

    } catch (error) {
        console.error('Admin login error:', error.message);

        return res.status(500).json({
            message: 'An error occurred during login'
        });
    }
});


// Create Administrator Account (Super Admin Only)
router.post('/create', verifyAdmin, verifySuperAdmin, async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        // Validate input
        if (
            typeof full_name !== 'string' ||
            !full_name.trim() ||
            full_name.trim().length > 100 ||
            typeof email !== 'string' ||
            !email.trim() ||
            email.trim().length > 254 ||
            typeof password !== 'string' ||
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            return res.status(400).json({
                message: 'Please provide a valid name, email and password of at least 8 characters.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check whether email already exists
        const existingAdmin = await pool.query(
            'SELECT admin_id FROM admins WHERE email = $1',
            [normalizedEmail]
        );

        if (existingAdmin.rows.length > 0) {
            return res.status(409).json({
                message: 'An administrator with this email already exists.'
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create regular administrator account
        const result = await pool.query(
            `INSERT INTO admins (full_name, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING admin_id, full_name, email, role, created_at`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash,
                'admin'
            ]
        );

        return res.status(201).json({
            message: 'Administrator account created successfully.',
            admin: result.rows[0]
        });

    } catch (error) {
        console.error('Admin creation error:', error.message);

        if (error.code === '23505') {
            return res.status(409).json({
                message: 'An administrator with this email already exists.'
            });
        }

        return res.status(500).json({
            message: 'An error occurred while creating the administrator account.'
        });
    }
});


// Protected Admin Dashboard
router.get('/dashboard', verifyAdmin, (req, res) => {
    res.status(200).json({
        message: 'Welcome to the Admin Dashboard!',
        admin: req.admin
    });
});

module.exports = router;
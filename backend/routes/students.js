const verifyAdmin = require('../middleware/authMiddleware');
const express = require('express');
const router = express.Router();

const pool = require('../config/db');

// Get all students
router.get('/', verifyAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT matric_number, full_name, email, department FROM students'
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: 'Failed to retrieve students'
        });
    }
});

// Get a student by matric number
router.get('/:matric_number', verifyAdmin, async (req, res) => {
    try {
        const { matric_number } = req.params;

        const result = await pool.query(
            `SELECT matric_number, full_name, email, department
             FROM students
             WHERE matric_number = $1`,
            [matric_number]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Student not found'
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error.message);

        res.status(500).json({
            message: 'Failed to retrieve student'
        });
    }
});

// Register a new student
router.post('/', verifyAdmin, async (req, res) => {
    try {
        const { matric_number, full_name, email, department } = req.body;

        // Validate input types and required fields
        if (
            typeof matric_number !== 'string' ||
            !matric_number.trim() ||
            typeof full_name !== 'string' ||
            !full_name.trim() ||
            typeof email !== 'string' ||
            !email.trim() ||
            typeof department !== 'string' ||
            !department.trim()
        ) {
            return res.status(400).json({
                message: 'All fields are required and must be valid text'
            });
        }

        //Validate field lengths
        if (
            matric_number.trim().length > 20 ||
            full_name.trim().length > 100 ||
            email.trim().length > 254 ||
            department.trim().length > 100
        ) {
            return res.status(400).json({
                message: 'One or more fields exceed the allowed character limit'
            })
        }
        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return res.status(400).json({
                message: 'Please provide a valid email address'
            });
        }

        // Clean input values
        const cleanMatricNumber = matric_number.trim();
        const cleanFullName = full_name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanDepartment = department.trim();

        // Insert student into database
        const result = await pool.query(
            `INSERT INTO students
            (matric_number, full_name, email, department)
            VALUES ($1, $2, $3, $4)
            RETURNING matric_number, full_name, email, department`,
            [
                cleanMatricNumber,
                cleanFullName,
                cleanEmail,
                cleanDepartment
            ]
        );

        return res.status(201).json({
            message: 'Student registered successfully',
            student: result.rows[0]
        });

    } catch (error) {
        console.error('Registration error:', error.message);

        if (error.code === '23505') {
            return res.status(409).json({
                message: 'A student with this matric number or email already exists'
            });
        }

        return res.status(500).json({
            message: 'Failed to register student'
        });
    }
});

// Export router
module.exports = router;

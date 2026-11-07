const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Verify administrator token
const verifyAdmin = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {

            return res.status(401).json({
                message: 'Access denied. No token provided.'
            });

        }


        const token = authHeader.split(' ')[1];

        if (!token) {

            return res.status(401).json({
                message: 'Access denied. Invalid token.'
            });

        }


        // Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256']
            }
        );


        // Validate administrator information inside JWT
        if (
            !Number.isInteger(decoded.admin_id) ||
            decoded.admin_id <= 0 ||
            typeof decoded.email !== 'string' ||
            !decoded.email.trim() ||
            !['admin', 'super_admin'].includes(decoded.role)
        ) {

            return res.status(403).json({
                message: 'Access denied. Invalid administrator token.'
            });

        }


        // Retrieve current administrator information from database
        const result = await pool.query(
            `SELECT admin_id, full_name, email, role
             FROM admins
             WHERE admin_id = $1`,
            [decoded.admin_id]
        );


        // Check whether administrator still exists
        if (result.rows.length === 0) {

            return res.status(401).json({
                message: 'Administrator account no longer exists.'
            });

        }

        const admin = result.rows[0];


        // Attach current administrator information to request
        req.admin = {
            admin_id: admin.admin_id,
            full_name: admin.full_name,
            email: admin.email,
            role: admin.role
        };


        next();


    } catch (error) {

        if (error.name === 'JsonWebTokenError' ||
            error.name === 'TokenExpiredError' ||
            error.name === 'NotBeforeError') {

            return res.status(401).json({
                message: 'Invalid or expired token.'
            });

        }

        console.error('Admin authentication error:', error.message);

        return res.status(500).json({
            message: 'An error occurred during authentication.'
        });

    }

};


// Verify Super Admin privileges
const verifySuperAdmin = (req, res, next) => {

    if (!req.admin || req.admin.role !== 'super_admin') {

        return res.status(403).json({
            message: 'Access denied. Super Admin privileges required.'
        });

    }

    next();

};

module.exports = verifyAdmin;
module.exports.verifySuperAdmin = verifySuperAdmin;
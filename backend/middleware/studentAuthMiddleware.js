const jwt = require('jsonwebtoken');

// Verify Student Token
const verifyStudent = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Access denied. No token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256']
            }
        );

        // Ensure this is a student token
        if (!Number.isInteger(decoded.account_id) ||
            decoded.account_id <= 0 ||
            typeof decoded.matric_number !== 'string' ||
            !decoded.matric_number.trim() ||
            decoded.matric_number.length > 20 ||
            decoded.role !== 'student'
        ) {
            return res.status(403).json({
                message: 'Access denied. Invalid student token.'
            });
        }

        req.student = decoded;

        next();

    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired token.'
        });
    }
};

module.exports = verifyStudent;
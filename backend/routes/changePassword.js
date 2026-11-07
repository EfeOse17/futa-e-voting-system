const express = require('express');
const router = express.Router();

const pool = require('../config/db');
const bcrypt = require('bcrypt');

const verifyStudent = require('../middleware/studentAuthMiddleware');

const {
    changePasswordLimiter
} = require('../middleware/rateLimitMiddleware');


// Change Student Password
router.post(
    '/change-password',
    verifyStudent,
    changePasswordLimiter,
    async (req, res) => {
        try {
            const { current_password, new_password } = req.body;

            // Validate required fields
            if (
                typeof current_password !== 'string' ||
                typeof new_password !== 'string' ||
                !current_password ||
                !new_password
            ) {
                return res.status(400).json({
                    message: 'Please provide your current password and new password.'
                });
            }

            // Validate new password
            if (
                new_password.length < 8 ||
                Buffer.byteLength(new_password, 'utf8') > 72
            ) {
                return res.status(400).json({
                    message: 'New password must be at least 8 characters long and must not exceed 72 bytes.'
                });
            }

            // Get authenticated student's account ID
            const accountId = req.student.account_id;

            // Retrieve current password hash
            const result = await pool.query(
                `SELECT password_hash
                 FROM voter_accounts
                 WHERE account_id = $1
                 AND is_verified = TRUE`,
                [accountId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    message: 'Student account not found or not verified.'
                });
            }

            const storedPasswordHash = result.rows[0].password_hash;

            // Verify current password
            const isPasswordCorrect = await bcrypt.compare(
                current_password,
                storedPasswordHash
            );

            if (!isPasswordCorrect) {
                return res.status(401).json({
                    message: 'Your current password is incorrect.'
                });
            }

            // Prevent reusing the current password
            const isSamePassword = await bcrypt.compare(
                new_password,
                storedPasswordHash
            );

            if (isSamePassword) {
                return res.status(400).json({
                    message: 'Your new password must be different from your current password.'
                });
            }

            // Hash new password
            const newPasswordHash = await bcrypt.hash(
                new_password,
                12
            );

            // Update password
            await pool.query(
                `UPDATE voter_accounts
                 SET password_hash = $1
                 WHERE account_id = $2`,
                [newPasswordHash, accountId]
            );

            return res.status(200).json({
                message: 'Your password has been changed successfully.'
            });

        } catch (error) {
            console.error('Change password error:', error);

            return res.status(500).json({
                message: 'An error occurred while changing your password.'
            });
        }
    }
);

module.exports = router;
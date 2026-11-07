const rateLimit = require('express-rate-limit');

// Limit OTP verification attempts
const otpVerificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many OTP verification attempts. Please try again later.'
    }
});

// Limit OTP resend requests
const resendOtpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many OTP requests. Please try again later.'
    }
});


// Limit account registration requests
const isProduction = process.env.NODE_ENV === 'production';
const registrationLimiter = rateLimit({
    windowMs: isProduction
        ? 60 * 60 * 1000
        : 15 * 60 * 1000,

    limit: isProduction ? 5 : 30,

    standardHeaders: true,
    legacyHeaders: false,

    message: {
        message: 'Too many registration attempts. Please try again later.'
    }
});


// Limit student login attempts
const studentLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many login attempts. Please try again later.'
    }
});

// Limit admin login attempts
const adminLoginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many login attempts. Please try again later.'
    }
});

// Limit student password change attempts
const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: 'Too many password change attempts. Please try again later.'
    }
});

module.exports = {
    otpVerificationLimiter,
    resendOtpLimiter,
    registrationLimiter,
    studentLoginLimiter,
    adminLoginLimiter,
    changePasswordLimiter
};

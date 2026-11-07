const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');
const { error } = require('console');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Create email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.error('Email server connection failed:', error.message);
    } else {
        console.log('Email server is ready to send messages.');
    }
});

module.exports = transporter;
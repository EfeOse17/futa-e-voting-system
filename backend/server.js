require('dotenv').config();

if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is missing from the environment variable.');
    process.exit(1);
}

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// General middleware
app.use(express.json({ limit: '10kb' }));

// CORS configuration
    app.use(cors({
        origin: [
            'http://127.0.0.1:5500',
            'http://127.0.0.1:56755'
        ]
    }));
    
// Import student routes
const studentRoutes = require('./routes/students');
const adminRoutes = require('./routes/admin');
const electionRoutes = require('./routes/elections');
const candidateRoutes = require('./routes/candidates');
const voterRegistrationRoutes = require('./routes/voterRegistration');
const otpVerificationRoutes = require('./routes/otpVerification');
const studentLoginRoutes = require('./routes/studentLogin');
const studentElectionsRoutes = require('./routes/studentElections');
const studentCandidatesRoutes = require('./routes/studentCandidates');
const resendOtpRoutes = require('./routes/resendOtp');
const castVoteRoutes = require('./routes/castVote');
const electionResultsRoutes = require('./routes/electionResults');
const adminDashboardRoutes = require('./routes/adminDashboard');
const adminElectionResultsRoutes = require('./routes/adminElectionResults');
const changePasswordRoutes = require('./routes/changePassword');

// Homepage
app.get('/', (req, res) => {
    res.send('Welcome to FUTA E-Voting Platform!');
});

// Use student routes
app.use('/api/students', studentRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/elections', electionRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/voter-registration', voterRegistrationRoutes);
app.use('/api/otp-verification', otpVerificationRoutes);
app.use('/api/student', studentLoginRoutes);
app.use('/api/student/elections', studentElectionsRoutes);
app.use('/api/student/candidates', studentCandidatesRoutes);
app.use('/api/resend-otp', resendOtpRoutes);
app.use('/api/vote', castVoteRoutes);
app.use('/api/election-results', electionResultsRoutes);
app.use('/api/admin-election-results', adminElectionResultsRoutes);
app.use('/api/admin-dashboard', adminDashboardRoutes);
app.use('/api/student', changePasswordRoutes);

// Test database connection
async function startServer() {
    try {
        const result = await pool.query('SELECT NOW()');

        console.log('PostgreSQL connected successfully!');
        console.log('Database time:', result.rows[0].now);

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
}

startServer();

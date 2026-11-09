require('dotenv').config();

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
const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://127.0.0.1:56755',
    'http://localhost:5500',
    'http://localhost:56755',
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins
}));

// Import routes
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

// Database health check
app.get('/api/health', async (req, res) => {
    try {
        await pool.query('SELECT NOW()');

        return res.status(200).json({
            status: 'success',
            message: 'Database connected successfully'
        });

    } catch (error) {
        console.error('Database health check failed:', error.message);

        return res.status(500).json({
            status: 'error',
            message: 'Database connection failed'
        });
    }
});

// Register routes
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

// Export Express app for Vercel
module.exports = app;

// Start server locally only
if (require.main === module) {

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
}
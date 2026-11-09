const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({
    path: path.resolve(__dirname, '../.env')
});

// Create database connection pool
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,

    // Neon PostgreSQL SSL
    ssl: {
        rejectUnauthorized: false
    },

    // Connection pool settings for Vercel
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000
});

// Export the pool
module.exports = pool;
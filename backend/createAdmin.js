const readline = require('readline');
const bcrypt = require('bcrypt');
const pool = require('./config/db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createAdmin() {
    try {
        const full_name = await askQuestion("Enter admin's full name: ");
        const email = await askQuestion("Enter admin's email: ");
        const password = await askQuestion("Enter admin's password: ");

        // Validate required fields
        if (!full_name.trim() || !email.trim() || !password) {
            throw new Error('All fields are required.');
        }

        // Validate email format
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            throw new Error('Please provide a valid email address.');
        }

        // Validate password length
        if (
            password.length < 8 ||
            Buffer.byteLength(password, 'utf8') > 72
        ) {
            throw new Error(
                'Password must be at least 8 characters and must not exceed 72 bytes.'
            );
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 12);

        // Create administrator account
        await pool.query(
            `INSERT INTO admins (full_name, email, password_hash)
             VALUES ($1, $2, $3)`,
            [
                full_name.trim(),
                email.trim().toLowerCase(),
                password_hash
            ]
        );

        console.log('Administrator account created successfully!');

    } catch (error) {
        console.error('Admin creation failed:', error.message);

    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();

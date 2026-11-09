const loginForm = document.getElementById('loginForm');
const matricNumberInput = document.getElementById('matric_number');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('loginButton');
const loginMessage = document.getElementById('loginMessage');

const API_URL = 'https://futa-e-voting-system.vercel.app';

// Display login messages
function showMessage(message, color) {
    loginMessage.textContent = message;
    loginMessage.style.color = color;
}

// Handle student login
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const matric_number = matricNumberInput.value.trim();
    const password = passwordInput.value;

    if (!matric_number || !password) {
        showMessage('Please enter your matric number and password.', 'red');
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = 'Signing in...';

    showMessage('', '');

    try {
        const response = await fetch(`${API_URL}/api/student/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                matric_number,
                password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed. Please try again.');
        }

        // Save the authentication token
        sessionStorage.setItem('studentToken', data.token);

        // Save student information
        sessionStorage.setItem('studentMatricNumber', data.student.matric_number);

        showMessage('Login successful! Redirecting...', 'green');

        // Redirect to student dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (error) {
        showMessage(error.message, 'red');
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Sign In';
    }
});
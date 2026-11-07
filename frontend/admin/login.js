const adminLoginForm = document.getElementById('adminLoginForm');
const errorMessage = document.getElementById('errorMessage');
const loginButton = document.getElementById('loginButton');

adminLoginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Get the values entered by the admin
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    // Clear previous error messages
    errorMessage.textContent = '';

    // Prevent multiple submissions
    loginButton.disabled = true;
    loginButton.textContent = 'Logging in...';

    try {
        // Send login details to the backend
        const response = await fetch('http://localhost:3000/api/admins/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        //Validate the backend response
        if (
            !data.token ||
            !data.admin ||
            !data.admin.admin_id ||
            !data.admin.full_name ||
            !['admin', 'super_admin'].includes(data.admin.role)
        ) {
            throw new Error('Invalid login response from server.')
        }
        
        // Store the authentication token for this browser session
        sessionStorage.setItem('adminToken', data.token);

        // Store the administrator's details
        sessionStorage.setItem('adminDetails', JSON.stringify(data.admin));

        // Redirect to dashboard
        window.location.href = 'dashboard.html';

    } catch (error) {
        errorMessage.style.color = 'red';
        errorMessage.textContent = error.message;

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = 'Login';
    }
});
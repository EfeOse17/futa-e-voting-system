// ==========================================
// STUDENT REGISTRATION
// ==========================================


// API URL
const API_URL = 'https://futa-e-voting-system.onrender.com/api';


// ==========================================
// DOM ELEMENTS
// ==========================================

const registrationForm = document.getElementById('registrationForm');

const fullNameInput = document.getElementById('fullName');
const departmentInput = document.getElementById('department');
const matricNumberInput = document.getElementById('matricNumber');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');

const registrationMessage = document.getElementById('registrationMessage');
const registerButton = document.getElementById('registerButton');


// ==========================================
// DISPLAY MESSAGE
// ==========================================

const showMessage = (message, type) => {

    registrationMessage.textContent = message;

    if (type === 'success') {
        registrationMessage.style.color = '#00843D';
    } else {
        registrationMessage.style.color = '#dc3545';
    }
};


// ==========================================
// FORM SUBMISSION
// ==========================================

registrationForm.addEventListener('submit', async (event) => {

    event.preventDefault();


    // Collect form values
    const full_name = fullNameInput.value.trim();
    const department = departmentInput.value.trim();
    const matric_number = matricNumberInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;


    // ======================================
    // CLIENT-SIDE VALIDATION
    // ======================================

    if (
        !full_name ||
        !department ||
        !matric_number ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        showMessage('Please complete all fields.', 'error');

        return;
    }


    if (full_name.length > 100 || department.length > 100) {

        showMessage(
            'Full name and department must not exceed 100 characters.',
            'error'
        );

        return;
    }


    if (matric_number.length > 20) {

        showMessage(
            'Matric number must not exceed 20 characters.',
            'error'
        );

        return;
    }


    if (email.length > 254) {

        showMessage(
            'Email address must not exceed 254 characters.',
            'error'
        );

        return;
    }


    // Check password length
    if (password.length < 8) {

        showMessage(
            'Password must be at least 8 characters long.',
            'error'
        );

        return;
    }


    // Check bcrypt's 72-byte password limit
    const passwordBytes = new TextEncoder().encode(password).length;

    if (passwordBytes > 72) {

        showMessage(
            'Password must not exceed 72 bytes.',
            'error'
        );

        return;
    }


    // Check password confirmation
    if (password !== confirmPassword) {

        showMessage(
            'Passwords do not match.',
            'error'
        );

        return;
    }


    // ======================================
    // SEND REGISTRATION REQUEST
    // ======================================

    try {

        registerButton.disabled = true;

        registerButton.textContent = 'Creating Account...';

        showMessage(
            'Please wait while we process your registration.',
            'success'
        );


        const response = await fetch(`${API_URL}/voter-registration`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                full_name,
                department,
                matric_number,
                email,
                password
            })

        });


        const data = await response.json();


        // ==================================
        // HANDLE OTP DELIVERY FAILURE
        // ==================================

        if (
            response.status === 503 &&
            data.otp_delivery === 'failed'
        ) {

            sessionStorage.setItem(
                'pendingMatricNumber',
                matric_number
            );

            showMessage(
                'Your registration was saved, but OTP delivery failed. Redirecting you to request another OTP...',
                'error'
            );

            setTimeout(() => {

                window.location.href = 'verify-otp.html';

            }, 2500);

            return;
        }


        // ==================================
        // HANDLE OTHER REGISTRATION ERRORS
        // ==================================

        if (!response.ok) {

            showMessage(
                data.message || 'Registration failed. Please try again.',
                'error'
            );

            return;
        }


        // ==================================
        // SAVE PENDING VERIFICATION DETAILS
        // ==================================

        sessionStorage.setItem(
            'pendingMatricNumber',
            data.account?.matric_number || matric_number
        );


        // ==================================
        // DISPLAY SUCCESS MESSAGE
        // ==================================

        showMessage(
            'Registration successful! Your OTP has been sent to your email.',
            'success'
        );


        // Redirect to OTP verification page
        setTimeout(() => {

            window.location.href = 'verify-otp.html';

        }, 2000);


    } catch (error) {

        console.error('Registration error:', error);

        showMessage(
            'Unable to connect to the server. Please try again.',
            'error'
        );

    } finally {

        registerButton.disabled = false;

        registerButton.textContent = 'Create Account';

    }

});
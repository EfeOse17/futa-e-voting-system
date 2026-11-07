// ==========================================
// STUDENT REGISTRATION
// ==========================================


// API URL
const API_URL = 'http://https://futa-e-voting-system.onrender.com/api';


// ==========================================
// DOM ELEMENTS
// ==========================================

const registrationForm = document.getElementById('registrationForm');
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
    const matric_number = matricNumberInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;


    // ======================================
    // CLIENT-SIDE VALIDATION
    // ======================================

    if (
        !matric_number ||
        !email ||
        !password ||
        !confirmPassword
    ) {

        showMessage('Please complete all fields.', 'error');

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

        showMessage('Please wait while we create your account.', 'success');


        const response = await fetch(`${API_URL}/voter-registration`, {

            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                matric_number,
                email,
                password
            })

        });


        const data = await response.json();


        // ==================================
        // HANDLE REGISTRATION ERRORS
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
            data.account.matric_number
        );


        // ==================================
        // HANDLE OTP EMAIL DELIVERY
        // ==================================

        if (data.otp_delivery === 'failed') {

            showMessage(
                'Your account was created, but OTP delivery failed. Redirecting you to request another OTP...',
                'error'
            );

        } else {

            showMessage(
                'Registration successful! Your OTP has been sent to your email.',
                'success'
            );

        }


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
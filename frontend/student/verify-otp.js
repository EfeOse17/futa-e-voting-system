// Get HTML Elements
const otpForm = document.getElementById('otpForm');
const matricNumberInput = document.getElementById('matricNumber');
const otpInput = document.getElementById('otp');
const verificationMessage = document.getElementById('verificationMessage');
const verifyButton = document.getElementById('verifyButton');
const resendOtpButton = document.getElementById('resendOtpButton');


// Retrieve Matric Number from Session Storage
const savedMatricNumber = sessionStorage.getItem('pendingMatricNumber');

if (savedMatricNumber) {
    matricNumberInput.value = savedMatricNumber;
}


// Display Messages
function showMessage(message, type) {

    verificationMessage.textContent = message;

    if (type === 'success') {
        verificationMessage.style.color = '#15803d';
    } else {
        verificationMessage.style.color = '#dc2626';
    }

}


// Handle OTP Form Submission
otpForm.addEventListener('submit', async (e) => {

    e.preventDefault();

    // Get Input Values
    const matric_number = matricNumberInput.value.trim();
    const otp = otpInput.value.trim();


    // Validate Matric Number
    if (!matric_number) {
        showMessage('Please enter your matriculation number.', 'error');
        return;
    }


    // Validate OTP
    if (!/^[0-9]{6}$/.test(otp)) {
        showMessage('Please enter a valid 6-digit OTP.', 'error');
        return;
    }


    // Disable Button During Verification
    verifyButton.disabled = true;
    verifyButton.textContent = 'Verifying...';

    verificationMessage.textContent = '';


    try {

        // Send OTP to Backend
        const response = await fetch(
            'http://localhost:3000/api/otp-verification',
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify({
                    matric_number,
                    otp
                })
            }
        );


        const data = await response.json();


        // Handle Failed Verification
        if (!response.ok) {

            showMessage(
                data.message || 'OTP verification failed. Please try again.',
                'error'
            );

            return;
        }


        // Successful Verification
        showMessage(
            data.message || 'Your account has been successfully verified!',
            'success'
        );


        // Remove Saved Matric Number
        sessionStorage.removeItem('pendingMatricNumber');


        // Redirect After Successful Verification
        setTimeout(() => {

            window.location.href = 'login.html';

        }, 2000);


    } catch (error) {

        console.error('OTP Verification Error:', error);

        showMessage(
            'Unable to connect to the server. Please try again.',
            'error'
        );

    } finally {

        // Restore Button
        verifyButton.disabled = false;
        verifyButton.textContent = 'Verify Account';

    }

});

// Resend OTP
resendOtpButton.addEventListener('click', async () => {

    const matric_number = matricNumberInput.value.trim();

    if (!matric_number) {
        showMessage('Please enter your matriculation number.', 'error');
        return;
    }

    resendOtpButton.disabled = true;
    resendOtpButton.textContent = 'Sending...';

    verificationMessage.textContent = '';

    try {
        const response = await fetch(
            'http://localhost:3000/api/resend-otp',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ matric_number })
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            showMessage(
                data.message || 'Unable to resend OTP. Please try again.',
                'error'
            );

            resendOtpButton.disabled = false;
            resendOtpButton.textContent = 'Resend OTP';
            return;
        }

        showMessage(data.message, 'success');

        resendOtpButton.textContent = 'OTP Sent';

        // Prevent repeated requests for 60 seconds
        setTimeout(() => {
            resendOtpButton.disabled = false;
            resendOtpButton.textContent = 'Resend OTP';
        }, 60000);

    } catch (error) {
        console.error('Resend OTP Error:', error);

        showMessage(
            'Unable to connect to the server. Please try again.',
            'error'
        );

        resendOtpButton.disabled = false;
        resendOtpButton.textContent = 'Resend OTP';
    }
});
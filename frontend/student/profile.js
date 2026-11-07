// ========================================
// DOM ELEMENTS
// ========================================

// Topbar
const topAvatar = document.getElementById('topAvatar');
const topStudentName = document.getElementById('topStudentName');
const topMatricNumber = document.getElementById('topMatricNumber');

// Profile overview
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileMatric = document.getElementById('profileMatric');

// Personal information
const fullName = document.getElementById('fullName');
const matricNumber = document.getElementById('matricNumber');
const emailAddress = document.getElementById('emailAddress');
const department = document.getElementById('department');

// Voting activity
const votingActivity = document.getElementById('votingActivity');

// Logout
const logoutButton = document.getElementById('logoutButton');

// Change Password
const changePasswordForm = document.getElementById('changePasswordForm');
const currentPassword = document.getElementById('currentPassword');
const newPassword = document.getElementById('newPassword');
const confirmPassword = document.getElementById('confirmPassword');

const changePasswordButton = document.getElementById('changePasswordButton');
const changePasswordMessage = document.getElementById('changePasswordMessage');


// ========================================
// AUTHENTICATION
// ========================================
const studentToken = sessionStorage.getItem('studentToken');

if (!studentToken) {
    window.location.href = 'login.html';
}


// ========================================
// API CONFIGURATION
// ========================================
const API_URL = 'http://localhost:3000';


// ========================================
// SHOW / HIDE PASSWORD
// ========================================
document.querySelectorAll('.toggle-password').forEach(button => {

    button.addEventListener('click', () => {

        const targetId = button.dataset.target;
        const passwordInput = document.getElementById(targetId);

        if (passwordInput.type === 'password') {

            passwordInput.type = 'text';
            button.textContent = 'Hide';

        } else {

            passwordInput.type = 'password';
            button.textContent = 'Show';

        }

    });

});


// ========================================
// AUTHENTICATION ERROR HANDLING
// ========================================
function handleAuthenticationError() {

    sessionStorage.removeItem('studentToken');
    sessionStorage.removeItem('studentMatricNumber');

    window.location.href = 'login.html';

}


// ========================================
// GET STUDENT INITIALS
// ========================================
function getInitials(name) {

    return name
        .trim()
        .split(/\s+/)
        .map(part => part.charAt(0))
        .slice(0, 2)
        .join('')
        .toUpperCase();

}


// ========================================
// LOAD STUDENT INFORMATION
// ========================================
async function loadStudentProfile() {

    try {

        const response = await fetch(
            `${API_URL}/api/student/dashboard`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${studentToken}`
                }
            }
        );

        const data = await response.json();


        if (response.status === 401 || response.status === 403) {

            handleAuthenticationError();

            return;
        }


        if (!response.ok) {

            throw new Error(
                data.message || 'Unable to load student information.'
            );

        }


        const student = data.student;

        const studentName = student.full_name || 'Student';
        const studentMatric = student.matric_number || 'Not available';
        const studentEmail = student.email || 'Not available';
        const studentDepartment = student.department || 'Not available';


        // Display topbar information
        topStudentName.textContent = studentName;
        topMatricNumber.textContent = studentMatric;


        // Display profile overview
        profileName.textContent = studentName;
        profileMatric.textContent = studentMatric;


        // Display personal information
        fullName.textContent = studentName;
        matricNumber.textContent = studentMatric;
        emailAddress.textContent = studentEmail;
        department.textContent = studentDepartment;


        // Generate student initials
        const initials = getInitials(studentName);


        topAvatar.textContent = initials;
        profileAvatar.textContent = initials;


        // Load voting activity
        await loadVotingActivity();


    } catch (error) {

        console.error('Profile Loading Error:', error);

        alert(
            'Unable to load your profile. Please refresh the page.'
        );

    }

}


// ========================================
// LOAD STUDENT VOTING ACTIVITY
// ========================================
async function loadVotingActivity() {

    try {

        const response = await fetch(
            `${API_URL}/api/student/elections`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${studentToken}`
                }
            }
        );

        const data = await response.json();


        if (response.status === 401 || response.status === 403) {

            handleAuthenticationError();

            return;
        }


        if (!response.ok) {

            throw new Error(
                data.message || 'Unable to load voting activity.'
            );

        }


        const elections = data.elections || [];


        // Clear previous content
        votingActivity.innerHTML = '';


        // Handle empty elections
        if (elections.length === 0) {

            const emptyMessage = document.createElement('p');

            emptyMessage.className = 'empty-message';

            emptyMessage.textContent =
                'No election participation records are available yet.';

            votingActivity.appendChild(emptyMessage);

            return;
        }


        // Display election participation
        elections.forEach(election => {

            const activityItem = document.createElement('div');

            activityItem.className = 'activity-item';


            // Election information
            const information = document.createElement('div');

            information.className = 'activity-information';


            const title = document.createElement('h4');

            title.textContent =
                election.election_title || 'Untitled Election';


            const description = document.createElement('p');

            description.textContent = 'Your participation status';


            information.appendChild(title);

            information.appendChild(description);


            // Voting status
            const status = document.createElement('span');

            status.className = election.has_voted
                ? 'activity-status voted'
                : 'activity-status not-voted';


            status.textContent = election.has_voted
                ? '✓ Voted'
                : 'Not yet voted';


            activityItem.appendChild(information);

            activityItem.appendChild(status);


            votingActivity.appendChild(activityItem);

        });


    } catch (error) {

        console.error('Voting Activity Error:', error);

        votingActivity.innerHTML = '';

        const errorMessage = document.createElement('p');

        errorMessage.className = 'empty-message';

        errorMessage.textContent =
            'Unable to load voting activity. Please refresh the page.';

        votingActivity.appendChild(errorMessage);

    }

}


// ========================================
// CHANGE STUDENT PASSWORD
// ========================================

// Display password messages
function showPasswordMessage(message, type) {

    changePasswordMessage.textContent = message;

    changePasswordMessage.className = `form-message ${type}`;

}


// Handle password change
changePasswordForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const current = currentPassword.value;
    const newPass = newPassword.value;
    const confirmPass = confirmPassword.value;


    // Validate required fields
    if (!current || !newPass || !confirmPass) {

        showPasswordMessage(
            'Please complete all password fields.',
            'error'
        );

        return;
    }


    // Validate password length
    if (
        newPass.length < 8 ||
        new TextEncoder().encode(newPass).length > 72
    ) {

        showPasswordMessage(
            'Your new password must be at least 8 characters and must not exceed 72 bytes.',
            'error'
        );

        return;
    }


    // Confirm new password
    if (newPass !== confirmPass) {

        showPasswordMessage(
            'Your new passwords do not match.',
            'error'
        );

        return;
    }


    // Prevent using the current password again
    if (current === newPass) {

        showPasswordMessage(
            'Your new password must be different from your current password.',
            'error'
        );

        return;
    }


    // Disable button during submission
    changePasswordButton.disabled = true;

    changePasswordButton.textContent = 'Changing Password...';


    try {

        const response = await fetch(
            `${API_URL}/api/student/change-password`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${studentToken}`
                },

                body: JSON.stringify({
                    current_password: current,
                    new_password: newPass
                })
            }
        );


        const data = await response.json();


        if (!response.ok) {

            throw new Error(
                data.message || 'Unable to change password.'
            );

        }


        // Successful password change
        showPasswordMessage(
            data.message || 'Your password has been changed successfully.',
            'success'
        );


        // Clear password fields
        changePasswordForm.reset();


        // Reset all password visibility buttons
        document.querySelectorAll('.toggle-password').forEach(button => {

            const target = document.getElementById(button.dataset.target);

            target.type = 'password';

            button.textContent = 'Show';

        });


    } catch (error) {

        console.error('Change Password Error:', error);

        showPasswordMessage(
            error.message || 'Something went wrong. Please try again.',
            'error'
        );

    } finally {

        changePasswordButton.disabled = false;
        changePasswordButton.textContent = 'Change Password';

    }

});


// ========================================
// MOBILE SIDEBAR CONTROLS
// ========================================
const menuToggle = document.getElementById('menuToggle');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');


function openSidebar() {

    sidebar.classList.add('active');

    sidebarOverlay.classList.add('active');

    document.body.style.overflow = 'hidden';

}


function closeSidebarMenu() {

    sidebar.classList.remove('active');

    sidebarOverlay.classList.remove('active');

    document.body.style.overflow = '';

}


menuToggle.addEventListener('click', openSidebar);
closeSidebar.addEventListener('click', closeSidebarMenu);
sidebarOverlay.addEventListener('click', closeSidebarMenu);


// Close sidebar after selecting a navigation link
document.querySelectorAll('.sidebar .nav-link').forEach(link => {

    link.addEventListener('click', () => {

        if (window.innerWidth <= 700) {

            closeSidebarMenu();

        }

    });

});


// Close sidebar when screen becomes desktop-sized
window.addEventListener('resize', () => {

    if (window.innerWidth > 700) {

        closeSidebarMenu();

    }

});


// ========================================
// LOGOUT
// ========================================
logoutButton.addEventListener('click', () => {

    const confirmLogout = confirm(
        'Are you sure you want to log out?'
    );


    if (confirmLogout) {

        sessionStorage.removeItem('studentToken');

        sessionStorage.removeItem('studentMatricNumber');

        window.location.href = 'login.html';

    }

});


// ========================================
// INITIALIZE PROFILE PAGE
// ========================================
if (studentToken) {

    loadStudentProfile();

}
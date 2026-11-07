const menuToggle = document.getElementById('menuToggle');
const sidebarNav = document.querySelector('.sidebar-nav');
const logoutButton = document.querySelector('.logout-button');

const adminManagementSection = document.getElementById('adminManagementSection');
const adminName = document.getElementById('adminName');

// Administrator creation form elements
const createAdminForm = document.getElementById('createAdminForm');
const createAdminButton = document.getElementById('createAdminButton');
const adminFormMessage = document.getElementById('adminFormMessage');

// Get the stored administrator token
const adminToken = sessionStorage.getItem('adminToken');

// Get stored administrator details
let adminDetails = null;

try {
    adminDetails = JSON.parse(sessionStorage.getItem('adminDetails'));
} catch (error) {
    console.error('Unable to read administrator details:', error);
}


// Check whether an administrator token exists
if (!adminToken) {
    window.location.href = 'login.html';
}


// Admin Logout
if (logoutButton) {

    logoutButton.addEventListener('click', () => {

        // Remove administrator authentication details
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminDetails');

        // Redirect to admin login page
        window.location.href = 'login.html';

    });

}


// Mobile Navigation
if (menuToggle && sidebarNav && logoutButton) {

    menuToggle.addEventListener('click', () => {

        const isOpen = sidebarNav.classList.toggle('show');

        logoutButton.classList.toggle('show');

        // Change hamburger to X and back
        menuToggle.textContent = isOpen ? 'X' : '☰';

        // Update accessibility state
        menuToggle.setAttribute('aria-expanded', isOpen);

    });

}


// Display Administrator Information
function displayAdminInformation() {

    if (!adminDetails) {
        return;
    }

    const fullName = adminDetails.full_name || 'Administrator';
    const role = adminDetails.role;

    // Display administrator name and role
    if (adminName) {

        const roleLabel = role === 'super_admin'
            ? 'Super Admin'
            : 'Administrator';

        adminName.textContent = `${fullName} (${roleLabel})`;

    }

    // Show Admin Management only to Super Admin
    if (adminManagementSection) {

        adminManagementSection.hidden = role !== 'super_admin';

    }

}


// Adding animation to the numbers
function animateNumber(element, targetValue, duration = 1000) {

    if (!element) {
        return;
    }

    const startValue = Number(element.textContent) || 0;
    const endValue = Number(targetValue) || 0;

    // Respect users who prefer reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {

        element.textContent = endValue;
        return;

    }

    const startTime = performance.now();

    function updateNumber(currentTime) {

        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Smooth easing effect
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(
            startValue + (endValue - startValue) * easedProgress
        );

        element.textContent = currentValue;

        if (progress < 1) {

            requestAnimationFrame(updateNumber);

        }

    }

    requestAnimationFrame(updateNumber);

}


// Load Dashboard Statistics
async function loadDashboardStats() {
    try {

        const headers = {
            'Authorization': `Bearer ${adminToken}`
        };

        const [
            studentsResponse,
            electionsResponse,
            candidatesResponse,
            votersResponse,
            verificationResponse,
            votesResponse
        ] = await Promise.all([

            fetch('http://localhost:3000/api/admin-dashboard/students', { headers }),
            fetch('http://localhost:3000/api/admin-dashboard/election-stats', { headers }),
            fetch('http://localhost:3000/api/admin-dashboard/candidates', { headers }),
            fetch('http://localhost:3000/api/admin-dashboard/voters', { headers }),
            fetch('http://localhost:3000/api/admin-dashboard/verification-stats', { headers }),
            fetch('http://localhost:3000/api/admin-dashboard/votes', { headers })

        ]);


        // Check whether any request failed
        if (
            !studentsResponse.ok ||
            !electionsResponse.ok ||
            !candidatesResponse.ok ||
            !votersResponse.ok ||
            !verificationResponse.ok ||
            !votesResponse.ok
        ) {

            throw new Error('Failed to load dashboard statistics');

        }


        // Convert responses to JSON
        const students = await studentsResponse.json();
        const elections = await electionsResponse.json();
        const candidates = await candidatesResponse.json();
        const voters = await votersResponse.json();
        const verification = await verificationResponse.json();
        const votes = await votesResponse.json();


        // Update dashboard statistics
        animateNumber(
            document.getElementById('totalStudents'),
            students.total_students
        );

        animateNumber(
            document.getElementById('totalElections'),
            elections.total_elections
        );

        animateNumber(
            document.getElementById('totalCandidates'),
            candidates.total_candidates
        );

        animateNumber(
            document.getElementById('activeElections'),
            elections.ongoing_elections
        );

        animateNumber(
            document.getElementById('totalVoters'),
            voters.total_voters
        );

        animateNumber(
            document.getElementById('verifiedVoters'),
            verification.verified_voters
        );

        animateNumber(
            document.getElementById('totalVotes'),
            votes.total_votes
        );


    } catch (error) {

        console.error('Dashboard statistics error:', error);

    }

}


// Load Recent Registrations
async function loadRecentVoters() {
    const tableBody = document.getElementById('recentVotersTable');

    if (!tableBody) {
        return;
    }

    try {

        const response = await fetch(
            'http://localhost:3000/api/admin-dashboard/recent-voters',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );


        if (!response.ok) {

            throw new Error('Failed to load recent registrations.');

        }


        const data = await response.json();


        // Clear the loading message
        tableBody.replaceChildren();


        // Check whether there are registered voters
        if (!data.recent_voters || data.recent_voters.length === 0) {

            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 4;
            cell.textContent = 'No registrations found.';

            row.appendChild(cell);
            tableBody.appendChild(row);

            return;

        }


        // Display each voter
        data.recent_voters.forEach(voter => {

            const row = document.createElement('tr');
            const nameCell = document.createElement('td');
            const matricCell = document.createElement('td');
            const departmentCell = document.createElement('td');
            const statusCell = document.createElement('td');


            nameCell.textContent = voter.full_name;
            matricCell.textContent = voter.matric_number;
            departmentCell.textContent = voter.department || 'Not specified';


            statusCell.textContent = voter.is_verified
                ? 'Verified'
                : 'Unverified';


            row.append(
                nameCell,
                matricCell,
                departmentCell,
                statusCell
            );


            tableBody.appendChild(row);

        });


    } catch (error) {

        console.error('Recent registrations error:', error);
        tableBody.replaceChildren();

        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 4;

        cell.textContent = 'Unable to load recent registrations.';

        row.appendChild(cell);

        tableBody.appendChild(row);

    }

}

// Create New Administrator
if (createAdminForm) {

    createAdminForm.addEventListener('submit', async (event) => {

        event.preventDefault();

        // Ensure the logged-in administrator is a Super Admin
        if (!adminDetails || adminDetails.role !== 'super_admin') {

            adminFormMessage.style.color = '#dc2626';
            adminFormMessage.textContent =
                'Access denied. Only Super Admins can create administrators.';

            return;

        }

        // Collect form values
        const fullName = document.getElementById('adminFullName').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        // Clear previous feedback
        adminFormMessage.textContent = '';

        // Prevent multiple submissions
        createAdminButton.disabled = true;
        createAdminButton.textContent = 'Creating Administrator...';

        try {

            // Send administrator details to the backend
            const response = await fetch(
                'http://localhost:3000/api/admins/create',
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${adminToken}`
                    },

                    body: JSON.stringify({
                        full_name: fullName,
                        email: email,
                        password: password
                    })
                }
            );

            const data = await response.json();

            // Handle unsuccessful requests
            if (!response.ok) {

                throw new Error(
                    data.message || 'Unable to create administrator.'
                );

            }

            // Display success message
            adminFormMessage.style.color = '#15803d';

            adminFormMessage.textContent =
                data.message || 'Administrator created successfully.';

            // Clear the form after successful creation
            createAdminForm.reset();

        } catch (error) {

            console.error('Administrator creation error:', error);

            adminFormMessage.style.color = '#dc2626';
            adminFormMessage.textContent = error.message;

        } finally {

            // Restore button
            createAdminButton.disabled = false;
            createAdminButton.textContent = 'Create Administrator';

        }

    });

}

// Verify Administrator Access
async function verifyAdminAccess() {
    try {

        const response = await fetch(
            'http://localhost:3000/api/admins/dashboard',
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${adminToken}`
                }
            }
        );


        // Reject invalid or expired tokens
        if (!response.ok) {

            sessionStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminDetails');
            window.location.href = 'login.html';

            return;

        }

        const data = await response.json();

        console.log('Admin dashboard data:', data);

        // Ensure the backend returned administrator information
        if (
            !data.admin ||
            !['admin', 'super_admin'].includes(data.admin.role)
        ) {

            sessionStorage.removeItem('adminToken');
            sessionStorage.removeItem('adminDetails');

            window.location.href = 'login.html';

            return;

        }

        // Update administrator details using verified backend information
        adminDetails = data.admin;

        sessionStorage.setItem(
            'adminDetails',
            JSON.stringify(adminDetails)
        );

        // Display verified administrator information
        displayAdminInformation();


        // Load dashboard information
        await loadDashboardStats();
        await loadRecentVoters();


    } catch (error) {

        console.error('Dashboard authentication error:', error);

    }

}


// Run the authentication check
if (adminToken) {

    verifyAdminAccess();

}
// ========================================
// DOM ELEMENTS
// ========================================
const welcomeName = document.getElementById('welcomeName');
const topStudentName = document.getElementById('topStudentName');
const topMatricNumber = document.getElementById('topMatricNumber');

const profileName = document.getElementById('profileName');
const profileMatric = document.getElementById('profileMatric');
const profileEmail = document.getElementById('profileEmail');
const profileDepartment = document.getElementById('profileDepartment');

const electionsContainer = document.getElementById('electionsContainer');
const availableElections = document.getElementById('availableElections');

const logoutButton = document.getElementById('logoutButton');


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
// FORMAT ELECTION DATES
// ========================================
function formatElectionDate(date) {

    if (!date) {
        return 'Not scheduled';
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return 'Not scheduled';
    }

    return parsedDate.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

}


// ========================================
// FETCH AUTHENTICATED STUDENT INFORMATION
// ========================================
async function loadStudentDashboard() {

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

            sessionStorage.removeItem('studentToken');
            sessionStorage.removeItem('studentMatricNumber');

            window.location.href = 'login.html';

            return;
        }


        if (!response.ok) {
            throw new Error(data.message || 'Unable to load dashboard.');
        }


        const student = data.student;

        const fullName = student.full_name;
        const matricNumber = student.matric_number;


        // Display student's full name
        welcomeName.textContent = fullName;
        topStudentName.textContent = fullName;
        profileName.textContent = fullName;


        // Display matriculation number
        topMatricNumber.textContent = matricNumber;
        profileMatric.textContent = matricNumber;


        // Display student's email and department
        profileEmail.textContent = student.email;
        profileDepartment.textContent = student.department;


        // Display student's initials
        const initials = fullName
            .trim()
            .split(/\s+/)
            .map(name => name.charAt(0))
            .slice(0, 2)
            .join('')
            .toUpperCase();


        document.querySelectorAll('.profile-avatar, .large-avatar').forEach(
            avatar => avatar.textContent = initials
        );


        // Load elections
        await loadElections();


    } catch (error) {

        console.error('Dashboard Error:', error);

        alert('Unable to load your dashboard. Please try again.');

    }

}


// ========================================
// FETCH AND DISPLAY AVAILABLE ELECTIONS
// ========================================
async function loadElections() {

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

            sessionStorage.removeItem('studentToken');
            sessionStorage.removeItem('studentMatricNumber');

            window.location.href = 'login.html';

            return;
        }


        if (!response.ok) {
            throw new Error(data.message || 'Unable to load elections.');
        }


        const elections = data.elections || [];


        // Update election count
        availableElections.textContent = elections.length;


        // Clear previous election cards
        electionsContainer.innerHTML = '';


        // Handle empty elections
        if (elections.length === 0) {

            const emptyMessage = document.createElement('div');

            emptyMessage.className = 'empty-message';

            emptyMessage.textContent =
                'No elections are currently available.';

            electionsContainer.appendChild(emptyMessage);

            return;
        }


        // Display each election
        elections.forEach(election => {


            // Create clickable election card
            const card = document.createElement('a');

            card.className = 'election-card';

            card.href = `election-details.html?election_id=${encodeURIComponent(election.election_id)}`;

            card.style.textDecoration = 'none';

            card.style.color = 'inherit';

            card.style.display = 'block';


            // Election title
            const title = document.createElement('h3');

            title.textContent =
                election.election_title || 'Untitled Election';


            // Election status
            const status = document.createElement('span');

            const electionStatus = (
                election.election_status || 'unknown'
            ).toLowerCase();

            status.className = `election-status ${electionStatus}`;


            const statusLabels = {
                upcoming: 'Upcoming',
                ongoing: 'Ongoing',
                active: 'Ongoing',
                completed: 'Completed',
                cancelled: 'Cancelled'
            };


            status.textContent =
                statusLabels[electionStatus] ||
                electionStatus.replace(/_/g, ' ');


            // Election dates
            const dates = document.createElement('div');

            dates.className = 'election-dates';


            // Start date
            const startParagraph = document.createElement('p');

            const startLabel = document.createElement('strong');

            startLabel.textContent = 'Starts: ';

            const startDate = document.createElement('span');

            startDate.textContent =
                formatElectionDate(election.start_date);

            startParagraph.appendChild(startLabel);

            startParagraph.appendChild(startDate);


            // End date
            const endParagraph = document.createElement('p');

            const endLabel = document.createElement('strong');

            endLabel.textContent = 'Ends: ';

            const endDate = document.createElement('span');

            endDate.textContent =
                formatElectionDate(election.end_date);

            endParagraph.appendChild(endLabel);

            endParagraph.appendChild(endDate);


            dates.appendChild(startParagraph);

            dates.appendChild(endParagraph);


            // Student voting participation
            const votingStatus = document.createElement('div');

            votingStatus.className = election.has_voted
                ? 'voting-status voted'
                : 'voting-status not-voted';

            votingStatus.textContent = election.has_voted
                ? '✓ You have voted'
                : '○ Not yet voted';


            // Add elements to clickable card
            card.appendChild(title);

            card.appendChild(status);

            card.appendChild(dates);

            card.appendChild(votingStatus);


            // Add card to elections container
            electionsContainer.appendChild(card);

        });


    } catch (error) {

        console.error('Election Loading Error:', error);

        electionsContainer.innerHTML = '';

        const errorMessage = document.createElement('div');

        errorMessage.className = 'empty-message';

        errorMessage.textContent =
            'Unable to load elections. Please refresh the page.';

        electionsContainer.appendChild(errorMessage);

    }

}


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
// INITIALIZE DASHBOARD
// ========================================
if (studentToken) {
    loadStudentDashboard();
}
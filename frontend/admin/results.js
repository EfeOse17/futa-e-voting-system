// ==========================================
// RESULTS MANAGEMENT
// ==========================================


// Admin authentication
const adminToken = sessionStorage.getItem('adminToken');

const API_URL = 'http://localhost:3000/api';


// ==========================================
// DOM ELEMENTS
// ==========================================

// Statistics
const totalCompletedElections = document.getElementById('totalCompletedElections');
const totalVotesCast = document.getElementById('totalVotesCast');
const selectedElectionName = document.getElementById('selectedElectionName');

// Election Selection
const electionSelect = document.getElementById('electionSelect');

// Election Information
const resultsElectionTitle = document.getElementById('resultsElectionTitle');
const resultsElectionStatus = document.getElementById('resultsElectionStatus');

// Results Table
const resultsTableBody = document.getElementById('resultsTableBody');

// Sidebar
const menuToggle = document.getElementById('menuToggle');
const sidebarNav = document.querySelector('.sidebar-nav');
const logoutButton = document.getElementById('logoutButton');


// ==========================================
// STORE COMPLETED ELECTIONS
// ==========================================

let completedElections = [];


// ==========================================
// CHECK ADMIN AUTHENTICATION
// ==========================================

const checkAdminAuthentication = async () => {

    if (!adminToken) {
        window.location.href = 'login.html';
        return false;
    }

    try {

        const response = await fetch(`${API_URL}/admins/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            sessionStorage.removeItem('adminToken');
            window.location.href = 'login.html';
            return false;
        }

        return true;

    } catch (error) {

        console.error('Authentication error:', error);

        alert('Unable to connect to the server.');

        return false;
    }
};


// ==========================================
// API REQUEST HELPER
// ==========================================

const apiRequest = async (endpoint, options = {}) => {

    const response = await fetch(`${API_URL}${endpoint}`, {

        ...options,

        headers: {
            'Authorization': `Bearer ${adminToken}`,
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...options.headers
        }

    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401) {

        sessionStorage.removeItem('adminToken');

        window.location.href = 'login.html';

        throw new Error('Your session has expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong.');
    }

    return data;
};


// ==========================================
// LOAD COMPLETED ELECTIONS
// ==========================================

const loadCompletedElections = async () => {

    try {

        electionSelect.innerHTML = `
            <option value="">Loading completed elections...</option>
        `;

        const data = await apiRequest('/elections');

        completedElections = data.elections.filter(
            election => election.election_status === 'completed'
        );

        // Update completed elections statistics
        totalCompletedElections.textContent = completedElections.length;

        electionSelect.innerHTML = '';

        // Check if completed elections exist
        if (completedElections.length === 0) {

            electionSelect.innerHTML = `
                <option value="">No completed elections available</option>
            `;

            selectedElectionName.textContent = 'None';

            resultsElectionTitle.textContent = 'No Completed Elections';

            resultsElectionStatus.textContent =
                'There are currently no completed elections to display.';

            resultsTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="results-message">
                        No completed elections available.
                    </td>
                </tr>
            `;

            totalVotesCast.textContent = '0';

            return;
        }

        // Default dropdown option
        const defaultOption = document.createElement('option');

        defaultOption.value = '';
        defaultOption.textContent = 'Choose an election';

        electionSelect.appendChild(defaultOption);

        // Populate dropdown
        completedElections.forEach(election => {

            const option = document.createElement('option');

            option.value = election.election_id;
            option.textContent = election.election_title;

            electionSelect.appendChild(option);
        });

    } catch (error) {

        console.error('Failed to load completed elections:', error);

        electionSelect.innerHTML = `
            <option value="">Failed to load elections</option>
        `;

        resultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="results-message">
                    Failed to load completed elections.
                </td>
            </tr>
        `;

        alert(error.message);
    }
};


// ==========================================
// LOAD SELECTED ELECTION RESULTS
// ==========================================

const loadElectionResults = async (electionId) => {

    try {

        resultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="results-message">
                    Loading election results...
                </td>
            </tr>
        `;

        const data = await apiRequest(
            `/admin-election-results/${electionId}`
        );

        // Update election information
        resultsElectionTitle.textContent = data.election.election_title;

        resultsElectionStatus.textContent =
            `Status: ${data.election.election_status}`;

        selectedElectionName.textContent = data.election.election_title;

        // Update total votes
        totalVotesCast.textContent =
            Number(data.total_votes).toLocaleString();

        // Display candidate results
        displayResults(data.candidates);

    } catch (error) {

        console.error('Failed to load election results:', error);

        resultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="results-message">
                    Failed to load election results.
                </td>
            </tr>
        `;

        alert(error.message);
    }
};


// ==========================================
// DISPLAY CANDIDATE RESULTS
// ==========================================

const displayResults = (candidates) => {

    resultsTableBody.innerHTML = '';

    if (!candidates || candidates.length === 0) {

        resultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="results-message">
                    No candidates or results found for this election.
                </td>
            </tr>
        `;

        return;
    }

    candidates.forEach((candidate, index) => {

        const row = document.createElement('tr');

        // Position
        const positionCell = document.createElement('td');

        positionCell.textContent = `#${index + 1}`;

        // Candidate Name
        const nameCell = document.createElement('td');

        nameCell.textContent = candidate.candidate_name;

        // Total Votes
        const votesCell = document.createElement('td');

        votesCell.textContent =
            Number(candidate.total_votes).toLocaleString();

        // Percentage
        const percentageCell = document.createElement('td');

        percentageCell.textContent =
            `${Number(candidate.percentage).toFixed(2)}%`;

        percentageCell.classList.add('results-percentage');

        row.append(
            positionCell,
            nameCell,
            votesCell,
            percentageCell
        );

        resultsTableBody.appendChild(row);
    });
};


// ==========================================
// ELECTION DROPDOWN EVENT
// ==========================================

electionSelect.addEventListener('change', () => {

    const electionId = electionSelect.value;

    if (!electionId) {

        selectedElectionName.textContent = 'None';

        resultsElectionTitle.textContent = 'No Election Selected';

        resultsElectionStatus.textContent =
            'Select a completed election to view its results.';

        totalVotesCast.textContent = '0';

        resultsTableBody.innerHTML = `
            <tr>
                <td colspan="4" class="results-message">
                    Select an election to view its results.
                </td>
            </tr>
        `;

        return;
    }

    loadElectionResults(electionId);
});


// ==========================================
// MOBILE SIDEBAR
// ==========================================

menuToggle.addEventListener('click', () => {

    sidebarNav.classList.toggle('show');

    logoutButton.classList.toggle('show');

    menuToggle.classList.toggle('active');

    const isExpanded = sidebarNav.classList.contains('show');

    menuToggle.setAttribute('aria-expanded', isExpanded);
});


// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener('click', () => {

    sessionStorage.removeItem('adminToken');

    window.location.href = 'login.html';
});


// ==========================================
// INITIALIZE PAGE
// ==========================================

const initializePage = async () => {

    const isAuthenticated = await checkAdminAuthentication();

    if (!isAuthenticated) {
        return;
    }

    await loadCompletedElections();
};

initializePage();
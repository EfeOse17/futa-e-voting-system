// ==========================================
// ADMIN AUTHENTICATION
// ==========================================

const adminToken = sessionStorage.getItem('adminToken');

if (!adminToken) {
    window.location.href = 'login.html';
}

// API base URL
const API_URL = 'https://futa-e-voting-system.vercel.app';


// ==========================================
// DOM ELEMENTS
// ==========================================

// Sidebar
const menuToggle = document.getElementById('menuToggle');
const sidebarNav = document.querySelector('.sidebar-nav');
const logoutButton = document.getElementById('logoutButton');

// Statistics
const totalCandidates = document.getElementById('totalCandidates');
const electionsWithCandidates = document.getElementById('electionsWithCandidates');
const upcomingElections = document.getElementById('upcomingElections');

// Table
const candidatesTableBody = document.getElementById('candidatesTableBody');

// Add Candidate Modal
const addCandidateBtn = document.getElementById('addCandidateBtn');
const addCandidateModal = document.getElementById('addCandidateModal');
const closeAddModalBtn = document.getElementById('closeAddModalBtn');
const cancelAddModalBtn = document.getElementById('cancelAddModalBtn');
const addCandidateForm = document.getElementById('addCandidateForm');

const candidateName = document.getElementById('candidateName');
const candidateElection = document.getElementById('candidateElection');
const saveCandidateBtn = document.getElementById('saveCandidateBtn');

// Edit Candidate Modal
const editCandidateModal = document.getElementById('editCandidateModal');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const cancelEditModalBtn = document.getElementById('cancelEditModalBtn');
const editCandidateForm = document.getElementById('editCandidateForm');

const editCandidateId = document.getElementById('editCandidateId');
const editCandidateName = document.getElementById('editCandidateName');
const editCandidateElection = document.getElementById('editCandidateElection');
const updateCandidateBtn = document.getElementById('updateCandidateBtn');


// Store elections for use throughout the page
let allElections = [];
let allCandidates = [];


// ==========================================
// AUTHENTICATION CHECK
// ==========================================

const checkAdminAuthentication = async () => {
    try {
        const response = await fetch(`${API_URL}/api/admins/dashboard`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${adminToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

    } catch (error) {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminDetails');

        window.location.href = 'login.html';
    }
};


// ==========================================
// API HELPER
// ==========================================

const apiRequest = async (url, options = {}) => {

    const response = await fetch(`${API_URL}${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
            ...options.headers
        }
    });

    const data = await response.json();

    if (response.status === 401) {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminDetails');

        window.location.href = 'login.html';

        throw new Error('Your session has expired. Please log in again.');
    }

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};


// ==========================================
// LOAD CANDIDATES AND ELECTIONS
// ==========================================

const loadCandidates = async () => {

    try {
        const [candidateData, electionData] = await Promise.all([

            apiRequest('/api/candidates'),

            apiRequest('/api/elections')

        ]);

        allCandidates = candidateData.candidates;
        allElections = electionData.elections;

        displayCandidates();
        updateStatistics();
        populateElectionDropdown();

    } catch (error) {

        console.error('Loading candidates error:', error);

        candidatesTableBody.innerHTML = `
            <tr>
                <td colspan="4">
                    Failed to load candidates: ${error.message}
                </td>
            </tr>
        `;
    }
};


// ==========================================
// DISPLAY CANDIDATES
// ==========================================

const displayCandidates = () => {

    candidatesTableBody.innerHTML = '';

    if (allCandidates.length === 0) {

        candidatesTableBody.innerHTML = `
            <tr>
                <td colspan="4">No candidates have been added yet.</td>
            </tr>
        `;

        return;
    }

    allCandidates.forEach(candidate => {

        const election = allElections.find(
            item => item.election_id === candidate.election_id
        );

        const isUpcoming = election &&
            election.election_status === 'upcoming';

        const row = document.createElement('tr');

        const idCell = document.createElement('td');
        idCell.textContent = candidate.candidate_id;

        const nameCell = document.createElement('td');
        nameCell.textContent = candidate.candidate_name;

        const electionCell = document.createElement('td');
        electionCell.textContent = candidate.election_title;

        const actionsCell = document.createElement('td');

        if (isUpcoming) {

            const actionContainer = document.createElement('div');
            actionContainer.className = 'action-buttons';

            const editButton = document.createElement('button');
            editButton.className = 'edit-btn';
            editButton.textContent = 'Edit';

            editButton.addEventListener('click', () => {
                openEditModal(candidate);
            });

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.textContent = 'Delete';

            deleteButton.addEventListener('click', () => {
                deleteCandidate(candidate);
            });

            actionContainer.appendChild(editButton);
            actionContainer.appendChild(deleteButton);

            actionsCell.appendChild(actionContainer);

        } else {

            actionsCell.textContent = '—';

        }

        row.appendChild(idCell);
        row.appendChild(nameCell);
        row.appendChild(electionCell);
        row.appendChild(actionsCell);

        candidatesTableBody.appendChild(row);

    });
};


// ==========================================
// UPDATE STATISTICS
// ==========================================

const updateStatistics = () => {

    totalCandidates.textContent = allCandidates.length;

    const electionsWithCandidatesCount = new Set(
        allCandidates.map(candidate => candidate.election_id)
    ).size;

    electionsWithCandidates.textContent = electionsWithCandidatesCount;

    const upcomingCount = allElections.filter(
        election => election.election_status === 'upcoming'
    ).length;

    upcomingElections.textContent = upcomingCount;
};


// ==========================================
// POPULATE ELECTION DROPDOWN
// ==========================================

const populateElectionDropdown = () => {

    candidateElection.innerHTML = `
        <option value="">Select an upcoming election</option>
    `;

    const upcomingElectionList = allElections.filter(
        election => election.election_status === 'upcoming'
    );

    if (upcomingElectionList.length === 0) {

        candidateElection.innerHTML = `
            <option value="">No upcoming elections available</option>
        `;

        saveCandidateBtn.disabled = true;

        return;
    }

    saveCandidateBtn.disabled = false;

    upcomingElectionList.forEach(election => {

        const option = document.createElement('option');

        option.value = election.election_id;
        option.textContent = election.election_title;

        candidateElection.appendChild(option);

    });
};


// ==========================================
// ADD CANDIDATE MODAL
// ==========================================

const openAddModal = () => {

    addCandidateForm.reset();

    addCandidateModal.classList.add('show');

};

const closeAddModal = () => {

    addCandidateModal.classList.remove('show');

};

addCandidateBtn.addEventListener('click', openAddModal);

closeAddModalBtn.addEventListener('click', closeAddModal);

cancelAddModalBtn.addEventListener('click', closeAddModal);


// ==========================================
// ADD CANDIDATE
// ==========================================

addCandidateForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const name = candidateName.value.trim();
    const electionId = candidateElection.value;

    if (!name || !electionId) {

        alert('Please enter the candidate name and select an election.');

        return;
    }

    try {

        saveCandidateBtn.disabled = true;
        saveCandidateBtn.textContent = 'Adding...';

        const result = await apiRequest('/api/candidates', {

            method: 'POST',

            body: JSON.stringify({
                candidate_name: name,
                election_id: Number(electionId)
            })

        });

        alert(result.message);

        closeAddModal();

        addCandidateForm.reset();

        await loadCandidates();

    } catch (error) {

        alert(error.message);

    } finally {

        saveCandidateBtn.disabled = false;
        saveCandidateBtn.textContent = 'Add Candidate';

    }

});

// ==========================================
// EDIT CANDIDATE MODAL
// ==========================================

const openEditModal = (candidate) => {

    editCandidateId.value = candidate.candidate_id;

    editCandidateName.value = candidate.candidate_name;

    editCandidateElection.value = candidate.election_title;

    editCandidateModal.classList.add('show');

};

const closeEditModal = () => {

    editCandidateModal.classList.remove('show');

};

closeEditModalBtn.addEventListener('click', closeEditModal);

cancelEditModalBtn.addEventListener('click', closeEditModal);


// ==========================================
// UPDATE CANDIDATE
// ==========================================

editCandidateForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const candidateId = editCandidateId.value;

    const name = editCandidateName.value.trim();

    if (!name) {

        alert('Please enter a valid candidate name.');

        return;
    }

    try {

        updateCandidateBtn.disabled = true;
        updateCandidateBtn.textContent = 'Saving...';

        const result = await apiRequest(
            `/api/candidates/${candidateId}`,
            {
                method: 'PUT',

                body: JSON.stringify({
                    candidate_name: name
                })
            }
        );

        alert(result.message);

        closeEditModal();

        await loadCandidates();

    } catch (error) {

        alert(error.message);

    } finally {

        updateCandidateBtn.disabled = false;
        updateCandidateBtn.textContent = 'Save Changes';

    }

});

// ==========================================
// DELETE CANDIDATE
// ==========================================

const deleteCandidate = async (candidate) => {

    const confirmDelete = confirm(
        `Are you sure you want to delete ${candidate.candidate_name}?`
    );

    if (!confirmDelete) {
        return;
    }

    try {

        const result = await apiRequest(
            `/api/candidates/${candidate.candidate_id}`,
            {
                method: 'DELETE'
            }
        );

        alert(result.message);

        await loadCandidates();

    } catch (error) {

        alert(error.message);

    }

};

// ==========================================
// MODAL ESCAPE KEY
// ==========================================

document.addEventListener('keydown', (event) => {

    if (event.key === 'Escape') {

        closeAddModal();

        closeEditModal();

    }

});

// ==========================================
// MOBILE SIDEBAR
// ==========================================

menuToggle.addEventListener('click', () => {

    sidebarNav.classList.toggle('show');

    logoutButton.classList.toggle('show');

    const isExpanded = sidebarNav.classList.contains('show');

    menuToggle.setAttribute('aria-expanded', isExpanded);

    menuToggle.textContent = isExpanded ? '✕' : '☰';

});

// ==========================================
// LOGOUT
// ==========================================

logoutButton.addEventListener('click', () => {

    sessionStorage.removeItem('adminToken');

    sessionStorage.removeItem('adminDetails');

    window.location.href = 'login.html';

});

// ==========================================
// INITIALIZE PAGE
// ==========================================

const initializePage = async () => {

    await checkAdminAuthentication();

    if (!sessionStorage.getItem('adminToken')) {
        return;
    }

    await loadCandidates();

};

initializePage();